import json
import re
from datetime import date
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.ai.capture import draft_from_text
from app.ai.limits import LimitError, hit_rate_limit
from app.ai.router import route_message
from app.ai.tools import search_items, spend_by_category, top_merchants
from app.core.config import Settings
from app.services.recap import get_budget, month_bounds, put_budget
from app.services.transactions import delete_transaction

COFFEE = ["kopi", "coffee", "latte", "americano"]
MONTHS = {
    "january": 1,
    "januari": 1,
    "february": 2,
    "februari": 2,
    "march": 3,
    "maret": 3,
    "april": 4,
    "may": 5,
    "mei": 5,
    "june": 6,
    "juni": 6,
    "july": 7,
    "juli": 7,
    "august": 8,
    "agustus": 8,
    "september": 9,
    "october": 10,
    "oktober": 10,
    "november": 11,
    "december": 12,
    "desember": 12,
}


def send_message(connection: Connection, user_id: UUID, message: str, settings: Settings, thread_id: UUID | None = None) -> dict:
    if len(message) > 2000:
        raise ValueError("length")
    hit_rate_limit(user_id, settings.chat_requests_per_minute)
    _charge(connection, user_id, settings, tokens=len(message.split()) + 1)
    previous = None
    if thread_id is None:
        thread_id = uuid4()
        connection.execute(
            text(
                """
                INSERT INTO chat_threads (id, user_id)
                VALUES (:id, :user_id)
                """
            ),
            {"id": thread_id, "user_id": user_id},
        )
    else:
        row = connection.execute(
            text("SELECT route FROM chat_threads WHERE id = :id AND user_id = :user_id"),
            {"id": thread_id, "user_id": user_id},
        ).first()
        if row is None:
            return None
        previous = row[0]
    route = route_message(message, previous=previous)
    pending = None
    if route == "capture":
        answer, pending = _capture(connection, user_id, message)
    elif route == "insights":
        answer = _insights(connection, user_id, message)
    elif route == "budget":
        answer, pending = _budget(connection, user_id, message)
    elif route == "refuse":
        answer = "I can't help with that. I only track your own expenses."
    else:
        answer = "I can log an expense, answer spending questions, or set a monthly budget."
    connection.execute(
        text(
            """
            INSERT INTO chat_messages (thread_id, user_id, role, content)
            VALUES (:thread_id, :user_id, 'user', :content),
                   (:thread_id, :user_id, 'assistant', :answer)
            """
        ),
        {"thread_id": thread_id, "user_id": user_id, "content": message, "answer": answer},
    )
    connection.execute(
        text(
            """
            UPDATE chat_threads
            SET route = :route, pending_action = CAST(:pending AS jsonb), updated_at = now()
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {
            "id": thread_id,
            "user_id": user_id,
            "route": route,
            "pending": json.dumps(pending) if pending else None,
        },
    )
    return {"thread_id": thread_id, "route": route, "message": answer, "pending_action": pending}


def confirm(connection: Connection, user_id: UUID, thread_id: UUID, decision: str, payload: dict | None) -> dict | None:
    row = connection.execute(
        text(
            """
            SELECT pending_action FROM chat_threads
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {"id": thread_id, "user_id": user_id},
    ).first()
    if row is None:
        return None
    pending = row[0]
    if decision == "reject" or not pending:
        _clear_pending(connection, user_id, thread_id, "Nothing was saved.")
        return {"status": "rejected"}
    action = dict(pending)
    if decision == "edit" and payload:
        action["payload"] = payload
    result = _commit(connection, user_id, action)
    _clear_pending(connection, user_id, thread_id, "Saved." if result.get("status") == "approved" else "Nothing was saved.")
    return result


def _capture(connection, user_id, message: str) -> tuple[str, dict | None]:
    lowered = message.lower()
    if "delete" in lowered or "hapus" in lowered:
        latest = connection.execute(
            text(
                """
                SELECT id, merchant FROM transactions
                WHERE user_id = :user_id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
                """
            ),
            {"user_id": user_id},
        ).first()
        if latest is None:
            return "There is no expense to delete.", None
        pending = {
            "kind": "delete_expense",
            "payload": {"transaction_id": str(latest[0])},
            "summary": f"Delete {latest[1]}?",
        }
        return pending["summary"], pending
    draft = draft_from_text(message)
    if draft.total_minor is None:
        return "I couldn't find an amount. Try something like 'nasi goreng 25rb'.", None
    pending = {
        "kind": "create_expense",
        "payload": draft.model_dump(mode="json"),
        "summary": f"Save {draft.total_minor} IDR as {draft.category}?",
    }
    return pending["summary"], pending


def _budget(connection, user_id, message: str) -> tuple[str, dict | None]:
    from app.ai.money import amount_in_text

    if "set" in message.lower() or "jadi" in message.lower():
        total = amount_in_text(message)
        if total is None:
            return "Tell me the monthly budget amount, for example 'set budget 4 juta'.", None
        month = _month_in_text(message) or date.today().strftime("%Y-%m")
        pending = {
            "kind": "set_budget",
            "payload": {"month": month, "total_minor": total},
            "summary": f"Set the {month} budget to {total} IDR?",
        }
        return pending["summary"], pending
    month = _month_in_text(message) or date.today().strftime("%Y-%m")
    body = get_budget(connection, user_id, month)
    if body["limit_minor"] is None:
        return f"No budget is set for {month}. Spent {body['spent_minor']} IDR.", None
    return (
        f"{month}: spent {body['spent_minor']} of {body['limit_minor']} IDR. {body['label']}.",
        None,
    )


def _insights(connection, user_id, message: str) -> str:
    start, end, label = _period(message)
    lowered = message.lower()
    if any(term in lowered for term in COFFEE):
        found = search_items(connection, user_id, COFFEE, start, end)
        return (
            f"Coffee items from {label} total {found['total_minor']} IDR "
            f"across {found['count']} lines."
        )
    if "merchant" in lowered:
        rows = top_merchants(connection, user_id, start, end, limit=1)
        if not rows:
            return f"No expenses in {label}."
        top = rows[0]
        return f"In {label} the top merchant is {top['merchant']} at {top['total_minor']} IDR."
    rows = spend_by_category(connection, user_id, start, end)
    category = _category_in_text(lowered)
    if category:
        total = next((row["total_minor"] for row in rows if row["category"] == category), 0)
        return f"{category} in {label} is {total} IDR."
    spent = sum(row["total_minor"] for row in rows)
    if spent == 0:
        return f"No expenses in {label}."
    return f"Spent {spent} IDR in {label}."


def _commit(connection, user_id, action: dict) -> dict:
    kind = action.get("kind")
    payload = action.get("payload") or {}
    if kind == "create_expense":
        from app.schemas.transaction import ItemIn, TransactionCreate
        from app.services.transactions import create_transaction

        draft = payload
        if draft.get("total_minor") is None or draft.get("date") is None:
            draft["date"] = draft.get("date") or date.today().isoformat()
        created = create_transaction(
            connection,
            user_id,
            TransactionCreate(
                merchant=draft.get("merchant") or (draft.get("items") or [{"name": "Expense"}])[0]["name"],
                date=draft["date"],
                total_minor=draft["total_minor"],
                category=draft.get("category") or "Other",
                source="chat",
                items=[
                    ItemIn(
                        name=item["name"],
                        qty=item.get("qty"),
                        line_total_minor=item["line_total_minor"],
                    )
                    for item in draft.get("items") or []
                    if item.get("line_total_minor") is not None
                ],
            ),
        )
        return {"status": "approved", "transaction_id": str(created.id)}
    if kind == "delete_expense":
        deleted = delete_transaction(connection, user_id, UUID(payload["transaction_id"]))
        return {"status": "approved" if deleted else "rejected"}
    if kind == "set_budget":
        put_budget(connection, user_id, payload["month"], int(payload["total_minor"]))
        return {"status": "approved"}
    return {"status": "rejected"}


def _clear_pending(connection, user_id, thread_id, note: str) -> None:
    connection.execute(
        text(
            """
            UPDATE chat_threads SET pending_action = NULL, updated_at = now()
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {"id": thread_id, "user_id": user_id},
    )
    connection.execute(
        text(
            """
            INSERT INTO chat_messages (thread_id, user_id, role, content)
            VALUES (:thread_id, :user_id, 'assistant', :content)
            """
        ),
        {"thread_id": thread_id, "user_id": user_id, "content": note},
    )


def _charge(connection, user_id, settings: Settings, tokens: int) -> None:
    day = date.today()
    row = connection.execute(
        text(
            """
            INSERT INTO llm_usage (user_id, day, requests, tokens)
            VALUES (:user_id, :day, 1, :tokens)
            ON CONFLICT (user_id, day)
            DO UPDATE SET requests = llm_usage.requests + 1, tokens = llm_usage.tokens + :tokens
            RETURNING tokens
            """
        ),
        {"user_id": user_id, "day": day, "tokens": tokens},
    ).scalar_one()
    if int(row) > settings.daily_token_budget:
        raise LimitError("budget_exceeded", "The daily token budget is used up.")


def _period(message: str) -> tuple[date, date, str]:
    month = _month_in_text(message)
    if month:
        start, end = month_bounds(month)
        return start, end, month
    year = date.today().year
    match = re.search(r"(20\d{2})", message)
    if match:
        year = int(match.group(1))
    return date(year, 1, 1), date(year + 1, 1, 1), str(year)


def _month_in_text(message: str) -> str | None:
    lowered = message.lower()
    found = next((number for name, number in MONTHS.items() if name in lowered), None)
    if found is None:
        match = re.search(r"(20\d{2})-(\d{2})", message)
        return match.group(0) if match else None
    year_match = re.search(r"(20\d{2})", message)
    year = int(year_match.group(1)) if year_match else date.today().year
    return f"{year}-{found:02d}"


def _category_in_text(message: str) -> str | None:
    for category in ("Groceries", "Dining", "Transport", "Shopping", "Bills", "Other"):
        if category.lower() in message:
            return category
    return None

import json
import re
from datetime import date
from uuid import UUID, uuid4

from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.ai.capture import draft_from_text
from app.ai.limits import LimitError, hit_rate_limit
from app.ai.money import find_amount, format_idr
from app.ai.period import in_label, month_label, resolve_period
from app.ai.router import FOLLOWUPS, route_message
from app.ai.tools import search_items, spend_by_category, top_merchants
from app.core.clock import today_jakarta
from app.core.config import Settings
from app.schemas.transaction import MAX_MINOR, ItemIn, TransactionCreate
from app.services.recap import get_budget, put_budget
from app.services.transactions import create_transaction, delete_transaction

COFFEE = ["kopi", "coffee", "latte", "americano"]
CATEGORY_LABELS = {
    "Dining": "Food & Drink",
    "Groceries": "Groceries",
    "Transport": "Transport",
    "Shopping": "Shopping",
    "Bills": "Bills",
    "Other": "Other",
}
# What people say for each category, and the short word used in the answer.
CATEGORY_TERMS = [
    ("Dining", ("dining", "food", "makan", "makanan", "minum", "resto", "restaurant"), "food"),
    ("Groceries", ("groceries", "grocery", "belanja", "sembako"), "groceries"),
    ("Transport", ("transport", "transportasi", "ojek", "bensin", "parkir"), "transport"),
    ("Shopping", ("shopping", "fashion", "baju"), "shopping"),
    ("Bills", ("bills", "bill", "tagihan", "listrik"), "bills"),
    ("Other", ("other", "lainnya"), "other things"),
]


class ChatActionError(ValueError):
    """A confirmed action that cannot be carried out as given (becomes a 422)."""


def send_message(connection: Connection, user_id: UUID, message: str, settings: Settings, thread_id: UUID | None = None) -> dict | None:
    if len(message) > 2000:
        raise ValueError("length")
    hit_rate_limit(user_id, settings.chat_requests_per_minute)
    _charge(connection, user_id, settings, tokens=len(message.split()) + 1)
    previous = None
    previous_text = None
    if thread_id is None:
        thread_id = uuid4()
        connection.execute(
            text("INSERT INTO chat_threads (id, user_id) VALUES (:id, :user_id)"),
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
        last = connection.execute(
            text(
                """
                SELECT content FROM chat_messages
                WHERE thread_id = :thread_id AND user_id = :user_id AND role = 'user'
                ORDER BY created_at DESC, id DESC
                LIMIT 1
                """
            ),
            {"thread_id": thread_id, "user_id": user_id},
        ).first()
        previous_text = last[0] if last else None
    route = route_message(message, previous=previous)
    pending = None
    if route == "capture":
        answer, pending = _capture(connection, user_id, message)
    elif route == "insights":
        answer = _insights(connection, user_id, message, previous_text)
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
        text("SELECT pending_action FROM chat_threads WHERE id = :id AND user_id = :user_id"),
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
        # Fields in the edit replace the proposed ones; anything left out keeps its proposed value.
        action["payload"] = {**(action.get("payload") or {}), **payload}
    # Commit first: if the edit is invalid the proposal stays so it can be corrected and retried.
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
            "payload": {"transaction_id": str(latest[0]), "merchant": latest[1]},
            "summary": f"Delete {latest[1]}?",
        }
        return pending["summary"], pending
    draft = draft_from_text(message)
    if draft.total_minor is None:
        return "I couldn't find an amount. Try something like 'nasi goreng 25rb'.", None
    pending = {
        "kind": "create_expense",
        "payload": draft.model_dump(mode="json"),
        "summary": f"Save {format_idr(draft.total_minor)} as {CATEGORY_LABELS[draft.category]}?",
    }
    return "Got it. Here's what I'll log:", pending


def _budget(connection, user_id, message: str) -> tuple[str, dict | None]:
    period = resolve_period(message, today_jakarta())
    month = period.start.strftime("%Y-%m")
    lowered = message.lower()
    if re.search(r"\b(set|jadi|jadikan)\b", lowered):
        found = find_amount(message)
        if found is None:
            return "Tell me the monthly budget amount, for example 'set budget 4 juta'.", None
        if found[0] > MAX_MINOR:
            return "That budget is too large.", None
        pending = {
            "kind": "set_budget",
            "payload": {"month": month, "total_minor": found[0]},
            "summary": f"Set your {month_label(month)} budget to {format_idr(found[0])}?",
        }
        return pending["summary"], pending
    body = get_budget(connection, user_id, month)
    if body["limit_minor"] is None:
        return f"No budget is set for {month_label(month)}. You've spent {format_idr(body['spent_minor'])} so far.", None
    return (
        f"For {month_label(month)} you've spent {format_idr(body['spent_minor'])} of "
        f"{format_idr(body['limit_minor'])}. {body['label']}.",
        None,
    )


def _compare(current: int, previous: int, previous_label: str) -> str:
    if previous <= 0:
        return ""
    change = round(abs(current - previous) / previous * 100)
    if change == 0:
        return f", the same as {previous_label}"
    return f", about {change}% {'more' if current > previous else 'less'} than {previous_label}"


def _category_in(text_: str) -> tuple[str, str] | None:
    words = set(re.findall(r"[a-z]+", text_.lower()))
    for category, terms, word in CATEGORY_TERMS:
        if any(term in words for term in terms):
            return category, word
    return None


def _category_total(connection, user_id, category: str, start: date, end: date) -> int:
    rows = spend_by_category(connection, user_id, start, end)
    return next((row["total_minor"] for row in rows if row["category"] == category), 0)


def _insights(connection, user_id, message: str, previous_text: str | None = None) -> str:
    cleaned = " ".join(message.lower().split())
    # "and last month?" keeps the subject of the question before it and only changes the period.
    subject = (previous_text or message) if cleaned in FOLLOWUPS else message
    period = resolve_period(message, today_jakarta())
    when = in_label(period.label)
    lowered = subject.lower()
    if any(term in lowered for term in COFFEE):
        found = search_items(connection, user_id, COFFEE, period.start, period.end)
        if found["count"] == 0:
            return f"You haven't spent anything on coffee {when}."
        return f"You spent {format_idr(found['total_minor'])} on coffee {when}, across {found['count']} items."
    if "merchant" in lowered:
        rows = top_merchants(connection, user_id, period.start, period.end, limit=1)
        if not rows:
            return f"You have no expenses {when}."
        return f"Your top merchant {when} is {rows[0]['merchant']}, at {format_idr(rows[0]['total_minor'])}."
    matched = _category_in(subject)
    if matched:
        category, word = matched
        total = _category_total(connection, user_id, category, period.start, period.end)
        if total == 0:
            return f"You haven't spent anything on {word} {when}."
        before = _category_total(connection, user_id, category, period.previous_start, period.previous_end)
        return f"You spent {format_idr(total)} on {word} {when}{_compare(total, before, period.previous_label)}."
    total = sum(row["total_minor"] for row in spend_by_category(connection, user_id, period.start, period.end))
    if total == 0:
        return f"You have no expenses {when}."
    before = sum(row["total_minor"] for row in spend_by_category(connection, user_id, period.previous_start, period.previous_end))
    return f"You spent {format_idr(total)} {when}{_compare(total, before, period.previous_label)}."


def _commit(connection, user_id, action: dict) -> dict:
    kind = action.get("kind")
    payload = action.get("payload") or {}
    if kind == "create_expense":
        items = payload.get("items") or []
        try:
            first_name = items[0]["name"] if items else None
            created = create_transaction(
                connection,
                user_id,
                TransactionCreate(
                    merchant=payload.get("merchant") or first_name or "Expense",
                    date=payload.get("date") or today_jakarta().isoformat(),
                    total_minor=payload.get("total_minor"),
                    category=payload.get("category") or "Other",
                    source="chat",
                    items=[
                        ItemIn(name=item["name"], qty=item.get("qty"), line_total_minor=item["line_total_minor"])
                        for item in items
                        if item.get("line_total_minor") is not None
                    ],
                ),
            )
        except ValidationError as exc:
            first = exc.errors()[0]
            where = ".".join(str(part) for part in first["loc"])
            raise ChatActionError(f"{where}: {first['msg']}" if where else first["msg"])
        except (KeyError, TypeError, AttributeError):
            raise ChatActionError("The expense is not valid. It needs a merchant or item, a date, and a total.")
        return {"status": "approved", "transaction_id": str(created.id)}
    if kind == "delete_expense":
        try:
            transaction_id = UUID(str(payload.get("transaction_id")))
        except ValueError:
            raise ChatActionError("transaction_id must be a valid id")
        deleted = delete_transaction(connection, user_id, transaction_id)
        return {"status": "approved" if deleted else "rejected"}
    if kind == "set_budget":
        month = str(payload.get("month", ""))
        total = payload.get("total_minor")
        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month):
            raise ChatActionError("month must be YYYY-MM")
        if not isinstance(total, int) or isinstance(total, bool) or not 0 <= total <= MAX_MINOR:
            raise ChatActionError("total_minor must be a whole number of rupiah")
        put_budget(connection, user_id, month, total)
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
    day = today_jakarta()
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

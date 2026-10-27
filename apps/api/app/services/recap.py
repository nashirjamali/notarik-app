import calendar
from datetime import date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.core.categories import INSIGHT_WORDS
from app.core.clock import today_jakarta

JAKARTA = ZoneInfo("Asia/Jakarta")
# An insight needs something to compare with, and a move big enough to matter.
MIN_INSIGHT_BASE = 50_000
MIN_INSIGHT_CHANGE = 5


def month_bounds(month: str) -> tuple[date, date]:
    year, value = month.split("-")
    start = date(int(year), int(value), 1)
    if start.month == 12:
        end = date(start.year + 1, 1, 1)
    else:
        end = date(start.year, start.month + 1, 1)
    return start, end


def _totals_by_category(connection: Connection, user_id: UUID, start: date, end: date) -> dict[str, tuple[int, int]]:
    rows = connection.execute(
        text(
            """
            SELECT category, COALESCE(SUM(total_minor), 0) AS total, COUNT(*) AS count
            FROM transactions
            WHERE user_id = :user_id AND date >= :start AND date < :end
            GROUP BY category
            ORDER BY total DESC
            """
        ),
        {"user_id": user_id, "start": start, "end": end},
    ).mappings()
    return {row["category"]: (int(row["total"]), int(row["count"])) for row in rows}


def _previous_window(month: str, today: date) -> tuple[date, date]:
    """Last month's matching days: the whole month once it is over, the same number of days so far."""
    start, end = month_bounds(month)
    previous_start = (start - timedelta(days=1)).replace(day=1)
    length = (start - previous_start).days
    if start <= today < end:
        return previous_start, previous_start + timedelta(days=min(today.day, length))
    return previous_start, start


def recap(connection: Connection, user_id: UUID, month: str, today: date | None = None) -> dict:
    today = today or today_jakarta()
    start, end = month_bounds(month)
    totals = _totals_by_category(connection, user_id, start, end)
    categories = [
        {"category": name, "total_minor": total, "count": count} for name, (total, count) in totals.items()
    ]
    spent = sum(item["total_minor"] for item in categories)
    count = sum(item["count"] for item in categories)
    for item in categories:
        item["share"] = item["total_minor"] / spent if spent else 0
    previous_start, previous_end = _previous_window(month, today)
    previous = _totals_by_category(connection, user_id, previous_start, previous_end)
    return {
        "month": month,
        "currency": "IDR",
        "total_minor": spent,
        "count": count,
        "previous_total_minor": sum(total for total, _ in previous.values()),
        "insight": _insight(totals, previous),
        "categories": categories,
    }


def _insight(current: dict[str, tuple[int, int]], previous: dict[str, tuple[int, int]]) -> dict | None:
    """The biggest move against last month, worth saying out loud."""
    best = None
    for category, (before, _) in previous.items():
        if before < MIN_INSIGHT_BASE:
            continue
        now = current.get(category, (0, 0))[0]
        change = round((now - before) / before * 100)
        if abs(change) < MIN_INSIGHT_CHANGE:
            continue
        if best is None or abs(change) > abs(best[1]):
            best = (category, change)
    if best is None:
        return None
    category, change = best
    word = INSIGHT_WORDS[category]
    text_ = (
        f"{word} is down {abs(change)}% vs last month. Nice!"
        if change < 0
        else f"{word} is up {change}% vs last month."
    )
    return {"category": category, "change_percent": change, "text": text_}


def get_budget(connection: Connection, user_id: UUID, month: str) -> dict:
    start, _end = month_bounds(month)
    row = connection.execute(
        text(
            """
            SELECT total_minor FROM budgets
            WHERE user_id = :user_id AND month = :month
            """
        ),
        {"user_id": user_id, "month": start},
    ).first()
    totals = _totals_by_category(connection, user_id, start, month_bounds(month)[1])
    spent = sum(total for total, _ in totals.values())
    limit = int(row[0]) if row else None
    return _budget_body(month, limit, spent)


def put_budget(connection: Connection, user_id: UUID, month: str, total_minor: int) -> dict:
    start, _end = month_bounds(month)
    connection.execute(
        text(
            """
            INSERT INTO budgets (user_id, month, total_minor)
            VALUES (:user_id, :month, :total_minor)
            ON CONFLICT (user_id, month)
            DO UPDATE SET total_minor = EXCLUDED.total_minor
            """
        ),
        {"user_id": user_id, "month": start, "total_minor": total_minor},
    )
    return get_budget(connection, user_id, month)


def projection(connection: Connection, user_id: UUID, month: str, today: date | None = None) -> dict:
    start, end = month_bounds(month)
    if today is None:
        today = datetime.now(JAKARTA).date()
    body = recap(connection, user_id, month)
    days_in_month = calendar.monthrange(start.year, start.month)[1]
    if today < start:
        day_index = 0
    elif today >= end:
        day_index = days_in_month
    else:
        day_index = today.day
    spent = body["total_minor"]
    if body["count"] == 0 or day_index == 0:
        projected = None
    else:
        projected = int(round(spent / day_index * days_in_month))
    return {
        "month": month,
        "currency": "IDR",
        "spent_minor": spent,
        "day_index": day_index,
        "days_in_month": days_in_month,
        "projected_minor": projected,
        "ready": projected is not None,
        "method": "estimate",
        "detail": (
            "Straight-line estimate: spent so far divided by the day of the month, "
            "times the number of days in the month. Asia/Jakarta decides which day it is. "
            "This is not a promise."
        ),
    }


def days_left(month: str, today: date | None = None) -> int:
    start, end = month_bounds(month)
    today = today or today_jakarta()
    length = calendar.monthrange(start.year, start.month)[1]
    if today >= end:
        return 0
    if today < start:
        return length
    return length - today.day


def _budget_body(month: str, limit: int | None, spent: int) -> dict:
    if limit is None or limit == 0:
        percent = 0
        status = "unset"
        label = "No budget"
        remaining = None
    else:
        percent = round(spent / limit * 100)
        if percent > 100:
            status = "over"
            label = "Over budget"
        elif percent >= 80:
            status = "near-limit"
            label = "Near limit"
        else:
            status = "on-track"
            label = "On track"
        remaining = limit - spent
    return {
        "month": month,
        "currency": "IDR",
        "limit_minor": limit,
        "spent_minor": spent,
        "remaining_minor": remaining,
        "percent_used": percent,
        "status": status,
        "label": label,
        "days_left": days_left(month),
    }


def category_budgets(connection: Connection, user_id: UUID, month: str) -> list[dict]:
    """Every category that has spending or a limit this month, with how it is going."""
    start, end = month_bounds(month)
    spent = {name: total for name, (total, _) in _totals_by_category(connection, user_id, start, end).items()}
    limits = {
        row["category"]: int(row["total_minor"])
        for row in connection.execute(
            text(
                """
                SELECT category, total_minor FROM category_budgets
                WHERE user_id = :user_id AND month = :month
                """
            ),
            {"user_id": user_id, "month": start},
        ).mappings()
    }
    rows = []
    for category in set(spent) | set(limits):
        total = spent.get(category, 0)
        limit = limits.get(category)
        rows.append(
            {
                "category": category,
                "spent_minor": total,
                "limit_minor": limit,
                "over_minor": max(total - limit, 0) if limit is not None else None,
                "percent_used": round(total / limit * 100) if limit else None,
            }
        )
    return sorted(rows, key=lambda row: (-row["spent_minor"], row["category"]))


def put_category_budget(
    connection: Connection, user_id: UUID, month: str, category: str, total_minor: int | None
) -> list[dict]:
    start, _end = month_bounds(month)
    if total_minor is None:
        connection.execute(
            text(
                "DELETE FROM category_budgets WHERE user_id = :user_id AND month = :month AND category = :category"
            ),
            {"user_id": user_id, "month": start, "category": category},
        )
    else:
        connection.execute(
            text(
                """
                INSERT INTO category_budgets (user_id, month, category, total_minor)
                VALUES (:user_id, :month, :category, :total_minor)
                ON CONFLICT (user_id, month, category)
                DO UPDATE SET total_minor = EXCLUDED.total_minor
                """
            ),
            {"user_id": user_id, "month": start, "category": category, "total_minor": total_minor},
        )
    return category_budgets(connection, user_id, month)

import calendar
from datetime import date, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.engine import Connection

JAKARTA = ZoneInfo("Asia/Jakarta")


def month_bounds(month: str) -> tuple[date, date]:
    year, value = month.split("-")
    start = date(int(year), int(value), 1)
    if start.month == 12:
        end = date(start.year + 1, 1, 1)
    else:
        end = date(start.year, start.month + 1, 1)
    return start, end


def recap(connection: Connection, user_id: UUID, month: str) -> dict:
    start, end = month_bounds(month)
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
    categories = [
        {"category": row["category"], "total_minor": int(row["total"]), "count": int(row["count"])}
        for row in rows
    ]
    spent = sum(item["total_minor"] for item in categories)
    count = sum(item["count"] for item in categories)
    for item in categories:
        item["share"] = item["total_minor"] / spent if spent else 0
    return {
        "month": month,
        "currency": "IDR",
        "total_minor": spent,
        "count": count,
        "categories": categories,
    }


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
    spent = recap(connection, user_id, month)["total_minor"]
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
    }

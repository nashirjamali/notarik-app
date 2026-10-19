from datetime import date
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.ai.memory import normalize_merchant, rank_memory


def spend_by_category(connection: Connection, user_id: UUID, start: date, end: date) -> list[dict]:
    rows = connection.execute(
        text(
            """
            SELECT category, COALESCE(SUM(total_minor), 0) AS total
            FROM transactions
            WHERE user_id = :user_id AND date >= :start AND date < :end
            GROUP BY category
            ORDER BY total DESC
            """
        ),
        {"user_id": user_id, "start": start, "end": end},
    ).mappings()
    return [{"category": row["category"], "total_minor": int(row["total"]), "currency": "IDR"} for row in rows]


def top_merchants(connection: Connection, user_id: UUID, start: date, end: date, limit: int = 10) -> list[dict]:
    rows = connection.execute(
        text(
            """
            SELECT merchant, COALESCE(SUM(total_minor), 0) AS total, COUNT(*) AS count
            FROM transactions
            WHERE user_id = :user_id AND date >= :start AND date < :end
            GROUP BY merchant
            ORDER BY total DESC
            LIMIT :limit
            """
        ),
        {"user_id": user_id, "start": start, "end": end, "limit": limit},
    ).mappings()
    return [
        {
            "merchant": row["merchant"],
            "total_minor": int(row["total"]),
            "count": int(row["count"]),
            "currency": "IDR",
        }
        for row in rows
    ]


def compare_periods(
    connection: Connection,
    user_id: UUID,
    a_start: date,
    a_end: date,
    b_start: date,
    b_end: date,
) -> list[dict]:
    left = {row["category"]: row["total_minor"] for row in spend_by_category(connection, user_id, a_start, a_end)}
    right = {row["category"]: row["total_minor"] for row in spend_by_category(connection, user_id, b_start, b_end)}
    categories = sorted(set(left) | set(right))
    return [
        {
            "category": category,
            "a_total_minor": left.get(category, 0),
            "b_total_minor": right.get(category, 0),
            "delta_minor": right.get(category, 0) - left.get(category, 0),
            "currency": "IDR",
        }
        for category in categories
    ]


def search_items(connection: Connection, user_id: UUID, terms: list[str], start: date, end: date) -> dict:
    if not terms:
        return {"total_minor": 0, "count": 0, "currency": "IDR", "period": [start.isoformat(), end.isoformat()]}
    clauses = " OR ".join(f"transaction_items.name ILIKE :term_{index}" for index in range(len(terms)))
    params = {"user_id": user_id, "start": start, "end": end}
    for index, term in enumerate(terms):
        params[f"term_{index}"] = f"%{term}%"
    row = connection.execute(
        text(
            f"""
            SELECT COALESCE(SUM(transaction_items.line_total_minor), 0) AS total, COUNT(*) AS count
            FROM transaction_items
            JOIN transactions ON transactions.id = transaction_items.transaction_id
            WHERE transaction_items.user_id = :user_id
              AND transactions.user_id = :user_id
              AND transactions.date >= :start AND transactions.date < :end
              AND ({clauses})
            """
        ),
        params,
    ).mappings().one()
    return {
        "total_minor": int(row["total"]),
        "count": int(row["count"]),
        "currency": "IDR",
        "period": [start.isoformat(), end.isoformat()],
    }


def search_spending_memory(connection: Connection, user_id: UUID, query: str, k: int = 5) -> list[dict]:
    rows = connection.execute(
        text(
            """
            SELECT kind, source_id, merchant_normalized, text, embedding::text AS embedding
            FROM spending_memory
            WHERE user_id = :user_id
            """
        ),
        {"user_id": user_id},
    ).mappings()
    loaded = []
    for row in rows:
        item = dict(row)
        item["embedding"] = _parse_vector(item.get("embedding"))
        loaded.append(item)
    ranked = rank_memory(loaded, query, k)
    return [
        {
            "kind": row["kind"],
            "source_id": str(row["source_id"]) if row["source_id"] else None,
            "merchant": row["merchant_normalized"],
            "text": row["text"],
        }
        for row in ranked
    ]


def _parse_vector(value) -> list[float]:
    if isinstance(value, list):
        return [float(item) for item in value]
    if not isinstance(value, str) or not value.strip("{}"):
        return []
    return [float(part) for part in value.strip("{}").split(",") if part]


def remembered_category(connection: Connection, user_id: UUID, merchant: str | None) -> str | None:
    if not merchant:
        return None
    normalized = normalize_merchant(merchant)
    row = connection.execute(
        text(
            """
            SELECT category FROM merchant_memory
            WHERE user_id = :user_id AND merchant_normalized = :merchant AND confirmed_count >= 1
            """
        ),
        {"user_id": user_id, "merchant": normalized},
    ).first()
    if row:
        return row[0]
    hits = search_spending_memory(connection, user_id, normalized, k=1)
    for hit in hits:
        if hit["merchant"] == normalized and " | " in hit["text"]:
            return hit["text"].rsplit(" | ", 1)[-1]
    return None

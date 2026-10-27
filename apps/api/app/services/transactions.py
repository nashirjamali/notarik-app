from base64 import urlsafe_b64decode, urlsafe_b64encode
from datetime import date, datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.schemas.transaction import (
    ItemIn,
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
)

_INSERT = """
INSERT INTO transactions (
  user_id, merchant, date, total_minor, category, source, payment_method, note
)
VALUES (
  :user_id, :merchant, :date, :total_minor, :category, :source, :payment_method, :note
)
RETURNING id, merchant, date, total_minor, currency, category, source,
  payment_method, note, extraction_run_id AS receipt_run_id, created_at
"""

_INSERT_ITEM = """
INSERT INTO transaction_items (user_id, transaction_id, name, qty, line_total_minor)
VALUES (:user_id, :transaction_id, :name, :qty, :line_total_minor)
"""


def _like(search: str | None) -> str | None:
    """A contains-pattern for ILIKE, with the user's own % and _ taken literally."""
    term = (search or "").strip()
    if not term:
        return None
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def encode_cursor(day: date, created_at: datetime, transaction_id: UUID) -> str:
    raw = f"{day.isoformat()}|{created_at.isoformat()}|{transaction_id}"
    return urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def decode_cursor(cursor: str) -> tuple[date, datetime, UUID]:
    padded = cursor + "=" * (-len(cursor) % 4)
    day_raw, created_at_raw, id_raw = urlsafe_b64decode(padded.encode()).decode().split("|", 2)
    return date.fromisoformat(day_raw), datetime.fromisoformat(created_at_raw), UUID(id_raw)


def _load_items(
    connection: Connection, user_id: UUID, transaction_id: UUID
) -> list[dict]:
    rows = connection.execute(
        text(
            """
            SELECT id, name, qty, line_total_minor
            FROM transaction_items
            WHERE transaction_id = :transaction_id AND user_id = :user_id
            ORDER BY id
            """
        ),
        {"transaction_id": transaction_id, "user_id": user_id},
    ).mappings()
    return [dict(row) for row in rows]


def _read(connection: Connection, user_id: UUID, row) -> TransactionRead:
    data = dict(row)
    data["items"] = _load_items(connection, user_id, data["id"])
    return TransactionRead.model_validate(data)


def _insert_items(
    connection: Connection, user_id: UUID, transaction_id: UUID, items: list[ItemIn]
) -> None:
    for item in items:
        connection.execute(
            text(_INSERT_ITEM),
            {
                "user_id": user_id,
                "transaction_id": transaction_id,
                "name": item.name,
                "qty": item.qty,
                "line_total_minor": item.line_total_minor,
            },
        )


def create_transaction(
    connection: Connection, user_id: UUID, body: TransactionCreate
) -> TransactionRead:
    row = connection.execute(
        text(_INSERT),
        {
            "user_id": user_id,
            "merchant": body.merchant,
            "date": body.date,
            "total_minor": body.total_minor,
            "category": body.category,
            "source": body.source,
            "payment_method": body.payment_method,
            "note": (body.note or "").strip() or None,
        },
    ).mappings().one()
    _insert_items(connection, user_id, row["id"], body.items)
    return _read(connection, user_id, row)


def get_transaction(
    connection: Connection, user_id: UUID, transaction_id: UUID
) -> TransactionRead | None:
    row = connection.execute(
        text(
            """
            SELECT id, merchant, date, total_minor, currency, category, source, payment_method, note,
                   extraction_run_id AS receipt_run_id, created_at
            FROM transactions
            WHERE id = :id AND user_id = :user_id
            """
        ),
        {"id": transaction_id, "user_id": user_id},
    ).mappings().one_or_none()
    if row is None:
        return None
    return _read(connection, user_id, row)


def list_transactions(
    connection: Connection,
    *,
    user_id: UUID,
    limit: int,
    month: date | None,
    category: str | None,
    cursor: tuple[date, datetime, UUID] | None,
    search: str | None = None,
) -> tuple[list[TransactionRead], str | None]:
    cursor_date = cursor[0] if cursor else None
    cursor_created_at = cursor[1] if cursor else None
    cursor_id = cursor[2] if cursor else None
    rows = connection.execute(
        text(
            """
            SELECT id, merchant, date, total_minor, currency, category, source, payment_method, note,
                   extraction_run_id AS receipt_run_id, created_at
            FROM transactions
            WHERE user_id = :user_id
            AND (CAST(:month AS date) IS NULL OR (
              date >= CAST(:month AS date)
              AND date < (CAST(:month AS date) + INTERVAL '1 month')
            ))
            AND (CAST(:category AS text) IS NULL OR category = :category)
            AND (
              CAST(:pattern AS text) IS NULL
              OR merchant ILIKE :pattern ESCAPE '\\'
              OR note ILIKE :pattern ESCAPE '\\'
              OR EXISTS (
                SELECT 1 FROM transaction_items
                WHERE transaction_items.transaction_id = transactions.id
                  AND transaction_items.user_id = :user_id
                  AND transaction_items.name ILIKE :pattern ESCAPE '\\'
              )
            )
            AND (
              CAST(:cursor_created_at AS timestamptz) IS NULL
              OR (date, created_at, id) < (
                CAST(:cursor_date AS date),
                CAST(:cursor_created_at AS timestamptz),
                CAST(:cursor_id AS uuid)
              )
            )
            ORDER BY date DESC, created_at DESC, id DESC
            LIMIT :limit
            """
        ),
        {
            "user_id": user_id,
            "month": month,
            "category": category,
            "pattern": _like(search),
            "cursor_date": cursor_date,
            "cursor_created_at": cursor_created_at,
            "cursor_id": cursor_id,
            "limit": limit + 1,
        },
    ).mappings().all()
    has_more = len(rows) > limit
    page = rows[:limit]
    items = [_read(connection, user_id, row) for row in page]
    next_cursor = (
        encode_cursor(items[-1].date, items[-1].created_at, items[-1].id) if has_more and items else None
    )
    return items, next_cursor


def update_transaction(
    connection: Connection,
    user_id: UUID,
    transaction_id: UUID,
    body: TransactionUpdate,
) -> TransactionRead | None:
    current = get_transaction(connection, user_id, transaction_id)
    if current is None:
        return None
    fields = body.model_dump(exclude_unset=True)
    items = fields.pop("items", None)
    allowed = {"merchant", "date", "total_minor", "category", "source", "payment_method", "note"}
    fields = {key: value for key, value in fields.items() if key in allowed}
    if "note" in fields:
        fields["note"] = (fields["note"] or "").strip() or None
    if fields:
        assignments = ", ".join(f"{column} = :{column}" for column in fields)
        connection.execute(
            text(
                f"UPDATE transactions SET {assignments} WHERE id = :id AND user_id = :user_id"
            ),
            {**fields, "id": transaction_id, "user_id": user_id},
        )
    if items is not None:
        connection.execute(
            text(
                """
                DELETE FROM transaction_items
                WHERE transaction_id = :id AND user_id = :user_id
                """
            ),
            {"id": transaction_id, "user_id": user_id},
        )
        _insert_items(connection, user_id, transaction_id, body.items or [])
    return get_transaction(connection, user_id, transaction_id)


def delete_transaction(
    connection: Connection, user_id: UUID, transaction_id: UUID
) -> bool:
    deleted = connection.execute(
        text(
            """
            DELETE FROM transactions
            WHERE id = :id AND user_id = :user_id
            RETURNING id
            """
        ),
        {"id": transaction_id, "user_id": user_id},
    ).scalar_one_or_none()
    return deleted is not None


def export_rows(connection: Connection, user_id: UUID) -> list[tuple]:
    """Every expense of the caller, newest first, as plain tuples for the CSV export."""
    rows = connection.execute(
        text(
            """
            SELECT date, merchant, category, total_minor, payment_method, source, note
            FROM transactions
            WHERE user_id = :user_id
            ORDER BY date DESC, created_at DESC, id DESC
            """
        ),
        {"user_id": user_id},
    ).all()
    return [tuple(row) for row in rows]

from typing import Annotated
from uuid import UUID

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.engine import Connection

from app.core.validation import parse_month
from app.dependencies import current_user, user_connection
from app.schemas.transaction import (
    Category,
    TransactionBatchCreate,
    TransactionBatchRead,
    TransactionCreate,
    TransactionPage,
    TransactionRead,
    TransactionUpdate,
)
from app.services.transactions import (
    create_transaction,
    create_transactions,
    decode_cursor,
    delete_transaction,
    get_transaction,
    export_rows,
    list_transactions,
    update_transaction,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=404,
        detail={"code": "not_found", "message": "Transaction not found"},
    )


def _month_or_none(value: str | None):
    return None if value is None else parse_month(value)


@router.post("", response_model=TransactionRead, status_code=201)
def create(
    body: TransactionCreate,
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    return create_transaction(connection, user_id, body)


@router.post("/batch", response_model=TransactionBatchRead, status_code=201)
def create_batch(
    body: TransactionBatchCreate,
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    return TransactionBatchRead(items=create_transactions(connection, user_id, body.transactions))


@router.get("", response_model=TransactionPage)
def list_rows(
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
    month: Annotated[str | None, Query()] = None,
    category: Category | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    decoded = None
    if cursor is not None:
        try:
            decoded = decode_cursor(cursor)
        except (ValueError, UnicodeError):
            raise HTTPException(
                status_code=422,
                detail={"code": "validation_error", "message": "cursor is invalid"},
            )
    items, next_cursor = list_transactions(
        connection,
        user_id=user_id,
        limit=limit,
        month=_month_or_none(month),
        category=category,
        search=q,
        cursor=decoded,
    )
    return TransactionPage(items=items, next_cursor=next_cursor)


def _safe_cell(value):
    # A cell starting with = + - or @ would run as a formula in Excel or Sheets,
    # and merchant and note text is untrusted.
    if isinstance(value, str) and value[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


@router.get("/export")
def export(
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["date", "merchant", "category", "amount_idr", "payment_method", "source", "note"]
    )
    for row in export_rows(connection, user_id):
        writer.writerow([_safe_cell(value) if value is not None else "" for value in row])
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="notarik-expenses.csv"'},
    )


@router.get("/{transaction_id}", response_model=TransactionRead)
def read_one(
    transaction_id: UUID,
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    row = get_transaction(connection, user_id, transaction_id)
    if row is None:
        raise _not_found()
    return row


@router.patch("/{transaction_id}", response_model=TransactionRead)
def patch_one(
    transaction_id: UUID,
    body: TransactionUpdate,
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    row = update_transaction(connection, user_id, transaction_id, body)
    if row is None:
        raise _not_found()
    return row


@router.delete("/{transaction_id}", status_code=204)
def delete_one(
    transaction_id: UUID,
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    if not delete_transaction(connection, user_id, transaction_id):
        raise _not_found()

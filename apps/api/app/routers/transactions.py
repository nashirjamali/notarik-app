from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.engine import Connection

from app.dependencies import current_user, user_connection
from app.schemas.transaction import (
    Category,
    TransactionCreate,
    TransactionPage,
    TransactionRead,
    TransactionUpdate,
)
from app.services.transactions import (
    create_transaction,
    decode_cursor,
    delete_transaction,
    get_transaction,
    list_transactions,
    update_transaction,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=404,
        detail={"code": "not_found", "message": "Transaction not found"},
    )


def parse_month(value: str | None):
    if value is None:
        return None
    try:
        parsed = datetime.strptime(value, "%Y-%m").date()
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "month must be YYYY-MM"},
        )
    return parsed


@router.post("", response_model=TransactionRead, status_code=201)
def create(
    body: TransactionCreate,
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    return create_transaction(connection, user_id, body)


@router.get("", response_model=TransactionPage)
def list_rows(
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
    month: Annotated[str | None, Query()] = None,
    category: Category | None = None,
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
        month=parse_month(month),
        category=category,
        cursor=decoded,
    )
    return TransactionPage(items=items, next_cursor=next_cursor)


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

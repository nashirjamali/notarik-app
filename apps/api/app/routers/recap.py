import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.engine import Connection

from app.dependencies import current_user, user_connection
from app.schemas.transaction import MAX_MINOR
from app.services.recap import get_budget, projection, put_budget, recap

router = APIRouter(tags=["recap"])


class BudgetBody(BaseModel):
    month: str
    total_minor: int = Field(ge=0, le=MAX_MINOR)


def _month(value: str) -> str:
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", value):
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "month must be YYYY-MM"},
        )
    return value


@router.get("/recap")
def read_recap(
    month: str = Query(),
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    return recap(connection, user_id, _month(month))


@router.get("/budget")
def read_budget(
    month: str = Query(),
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    return get_budget(connection, user_id, _month(month))


@router.put("/budget")
def write_budget(
    body: BudgetBody,
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    return put_budget(connection, user_id, _month(body.month), body.total_minor)


@router.get("/projection")
def read_projection(
    month: str = Query(),
    connection: Connection = Depends(user_connection),
    user_id: UUID = Depends(current_user),
):
    return projection(connection, user_id, _month(month))

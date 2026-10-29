from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.engine import Connection

from app.dependencies import current_user, user_connection
from app.core.validation import parse_month
from app.schemas.transaction import MAX_MINOR
from app.schemas.transaction import Category
from app.services.recap import (
    category_budgets,
    get_budget,
    projection,
    put_budget,
    put_category_budget,
    recap,
)

router = APIRouter(tags=["recap"])


class BudgetBody(BaseModel):
    month: str
    total_minor: int = Field(ge=0, le=MAX_MINOR)


class CategoryBudgetBody(BaseModel):
    month: str
    category: Category
    # None removes the limit for that category.
    total_minor: int | None = Field(default=None, ge=0, le=MAX_MINOR)


def _month(value: str) -> str:
    parse_month(value)
    return value


@router.get("/recap")
def read_recap(
    month: str = Query(),
    connection: Connection = Depends(user_connection, scope="function"),
    user_id: UUID = Depends(current_user),
):
    return recap(connection, user_id, _month(month))


@router.get("/budget")
def read_budget(
    month: str = Query(),
    connection: Connection = Depends(user_connection, scope="function"),
    user_id: UUID = Depends(current_user),
):
    return get_budget(connection, user_id, _month(month))


@router.put("/budget")
def write_budget(
    body: BudgetBody,
    connection: Connection = Depends(user_connection, scope="function"),
    user_id: UUID = Depends(current_user),
):
    return put_budget(connection, user_id, _month(body.month), body.total_minor)


@router.get("/budget/categories")
def read_category_budgets(
    month: str = Query(),
    connection: Connection = Depends(user_connection, scope="function"),
    user_id: UUID = Depends(current_user),
):
    return category_budgets(connection, user_id, _month(month))


@router.put("/budget/categories")
def write_category_budget(
    body: CategoryBudgetBody,
    connection: Connection = Depends(user_connection, scope="function"),
    user_id: UUID = Depends(current_user),
):
    return put_category_budget(connection, user_id, _month(body.month), body.category, body.total_minor)


@router.get("/projection")
def read_projection(
    month: str = Query(),
    connection: Connection = Depends(user_connection, scope="function"),
    user_id: UUID = Depends(current_user),
):
    return projection(connection, user_id, _month(month))

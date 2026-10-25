from datetime import date as Date
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

Category = Literal[
    "Groceries", "Dining", "Transport", "Shopping", "Bills", "Other"
]
Source = Literal["photo", "pdf", "manual", "chat"]


def _sane_date(value: Date) -> Date:
    latest = Date.today() + timedelta(days=366)
    if value < Date(2000, 1, 1) or value > latest:
        raise ValueError("date is out of range")
    return value


class ItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    qty: Decimal | None = Field(default=None, gt=0)
    line_total_minor: int = Field(ge=0)


class ItemRead(BaseModel):
    id: UUID
    name: str
    qty: Decimal | None
    line_total_minor: int


class TransactionCreate(BaseModel):
    merchant: str = Field(min_length=1, max_length=200)
    date: Date
    total_minor: int = Field(ge=0)
    category: Category
    source: Source = "manual"
    items: list[ItemIn] = Field(default_factory=list)

    @field_validator("date")
    @classmethod
    def date_in_range(cls, value: Date) -> Date:
        return _sane_date(value)


class TransactionUpdate(BaseModel):
    merchant: str | None = Field(default=None, min_length=1, max_length=200)
    date: Date | None = None
    total_minor: int | None = Field(default=None, ge=0)
    category: Category | None = None
    source: Source | None = None
    items: list[ItemIn] | None = None

    @field_validator("date")
    @classmethod
    def date_in_range(cls, value: Date | None) -> Date | None:
        if value is None:
            return None
        return _sane_date(value)


class TransactionRead(BaseModel):
    id: UUID
    merchant: str
    date: Date
    total_minor: int
    currency: str
    category: Category
    source: Source
    items: list[ItemRead]
    created_at: datetime


class TransactionPage(BaseModel):
    items: list[TransactionRead]
    next_cursor: str | None

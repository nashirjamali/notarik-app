from datetime import date as Date
from typing import Literal

from pydantic import BaseModel, Field

Category = Literal["Groceries", "Dining", "Transport", "Shopping", "Bills", "Other"]
Source = Literal["photo", "pdf", "manual", "chat"]
IssueCode = Literal[
    "ITEMS_SUM_MISMATCH",
    "TOTAL_LT_SUBTOTAL",
    "DATE_IN_FUTURE",
    "DATE_TOO_OLD",
    "MISSING_TOTAL",
    "ITEM_PRICE_IS_UNIT_PRICE",
    "SCHEMA_INVALID",
]


class ItemDraft(BaseModel):
    name: str
    qty: float | None = None
    line_total_minor: int | None = None


class ExpenseDraft(BaseModel):
    merchant: str | None = None
    date: Date | None = None
    total_minor: int | None = None
    subtotal_minor: int | None = None
    # Sum of discounts printed as their own lines (promo, voucher, diskon). Positive; total_minor is already net of it.
    discount_minor: int | None = None
    category: Category = "Other"
    items: list[ItemDraft] = Field(default_factory=list)
    source: Source = "photo"
    field_confidence: dict[str, float] = Field(default_factory=dict)


class ValidationIssue(BaseModel):
    code: IssueCode
    field: str
    detail: str


class ExtractionFailure(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message

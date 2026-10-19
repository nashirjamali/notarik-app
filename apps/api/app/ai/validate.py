from datetime import date, timedelta

from app.ai.drafts import ExpenseDraft, ValidationIssue

SUM_TOLERANCE = 100
MAX_AGE = timedelta(days=365 * 5)


def validate_draft(draft: ExpenseDraft, today: date | None = None) -> list[ValidationIssue]:
    today = today or date.today()
    issues: list[ValidationIssue] = []
    if draft.total_minor is None:
        issues.append(
            ValidationIssue(
                code="MISSING_TOTAL",
                field="total_minor",
                detail="The final payable total is missing. Read the amount due, not the subtotal.",
            )
        )
    if draft.date is not None and draft.date > today:
        issues.append(
            ValidationIssue(
                code="DATE_IN_FUTURE",
                field="date",
                detail="The date is in the future.",
            )
        )
    if draft.date is not None and draft.date < today - MAX_AGE:
        issues.append(
            ValidationIssue(
                code="DATE_TOO_OLD",
                field="date",
                detail="The date is more than five years ago.",
            )
        )
    item_sum = _item_sum(draft)
    if (
        draft.subtotal_minor is not None
        and draft.total_minor is not None
        and draft.total_minor + SUM_TOLERANCE < draft.subtotal_minor
    ):
        issues.append(
            ValidationIssue(
                code="TOTAL_LT_SUBTOTAL",
                field="total_minor",
                detail="The payable total is below the subtotal. Tax and service charge can raise the total, not lower it.",
            )
        )
    if item_sum is not None and draft.items:
        target = draft.subtotal_minor if draft.subtotal_minor is not None else draft.total_minor
        if target is not None and abs(item_sum - target) > SUM_TOLERANCE:
            issues.append(
                ValidationIssue(
                    code="ITEMS_SUM_MISMATCH",
                    field="items",
                    detail=(
                        f"Item line totals sum to {item_sum} but the "
                        f"{'subtotal' if draft.subtotal_minor is not None else 'total'} is {target}. "
                        "Use each printed line total, the rightmost amount, not the unit price."
                    ),
                )
            )
    for index, item in enumerate(draft.items):
        if _looks_like_unit_price(item.qty, item.line_total_minor, draft):
            issues.append(
                ValidationIssue(
                    code="ITEM_PRICE_IS_UNIT_PRICE",
                    field=f"items.{index}.line_total_minor",
                    detail=(
                        f"Item '{item.name}' looks like a unit price. "
                        "Use the rightmost line total. Do not multiply quantity by unit price."
                    ),
                )
            )
    return issues


def _item_sum(draft: ExpenseDraft) -> int | None:
    totals = [item.line_total_minor for item in draft.items if item.line_total_minor is not None]
    if not totals:
        return None
    return sum(totals)


def _looks_like_unit_price(qty: float | None, line_total: int | None, draft: ExpenseDraft) -> bool:
    if qty is None or line_total is None or qty <= 1:
        return False
    extended = int(round(line_total * qty))
    for target in (draft.subtotal_minor, draft.total_minor):
        if target is not None and abs(extended - target) <= SUM_TOLERANCE:
            return True
    return False

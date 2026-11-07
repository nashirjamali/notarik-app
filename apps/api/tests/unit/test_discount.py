from app.ai.drafts import ExpenseDraft, ItemDraft
from app.ai.extract import _draft
from app.ai.validate import validate_draft


def _draft_with(discount):
    return ExpenseDraft(
        merchant="Alfamart",
        total_minor=45_000,
        subtotal_minor=50_000,
        discount_minor=discount,
        items=[ItemDraft(name="Susu", qty=1, line_total_minor=30_000), ItemDraft(name="Roti", qty=1, line_total_minor=20_000)],
    )


def test_discount_line_is_not_a_total_error():
    # Items sum to the subtotal; total = subtotal - discount.
    assert validate_draft(_draft_with(5_000)) == []


def test_total_below_subtotal_without_discount_is_flagged():
    codes = {issue.code for issue in validate_draft(_draft_with(None))}
    assert "TOTAL_LT_SUBTOTAL" in codes


def test_negative_discount_from_the_model_becomes_positive():
    draft = _draft({"merchant": "X", "total_minor": 1, "items": [], "discount": -5000}, "photo")
    assert draft.discount_minor == 5000

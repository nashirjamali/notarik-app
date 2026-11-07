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


def test_common_model_key_aliases_are_mapped():
    draft = _draft(
        {"establishment": "ALFAMART", "total_minor": 5, "items": [{"item": "Susu", "qty": 2, "line_total_minor": 5}]},
        "photo",
    )
    assert draft.merchant == "ALFAMART"
    assert draft.items[0].name == "Susu"


def test_negative_item_is_moved_to_discount():
    draft = _draft(
        {"merchant": "X", "total_minor": 50_000, "items": [
            {"name": "A", "line_total_minor": 56_000}, {"name": "Diskon Promo", "line_total_minor": -6_000}]},
        "photo",
    )
    assert [item.name for item in draft.items] == ["A"]
    assert draft.discount_minor == 6_000

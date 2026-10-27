from datetime import date
from uuid import uuid4

from app.ai.capture import draft_from_text
from app.ai.drafts import ExpenseDraft, ExtractionFailure, ItemDraft
from app.ai.graph import run_until_review
from app.ai.limits import LimitError, hit_rate_limit, reset_limits
from app.ai.memory import embed_text, rank_memory
from app.ai.models import ScriptedModel
from app.ai.money import parse_amount
from app.ai.router import route_message
from app.ai.score import aggregate, score_receipt
from app.ai.validate import validate_draft
from app.services.recap import projection


def test_amount_suffixes():
    assert parse_amount("25rb") == 25_000
    assert parse_amount("1,5jt") == 1_500_000
    assert parse_amount("25.000") == 25_000
    assert parse_amount("-5") is None


def test_validator_flags_each_issue_and_passes_a_good_receipt():
    good = ExpenseDraft(
        merchant="Warung",
        date=date(2026, 10, 17),
        total_minor=20_000,
        subtotal_minor=20_000,
        items=[ItemDraft(name="Nasi", qty=1, line_total_minor=20_000)],
    )
    assert validate_draft(good, today=date(2026, 10, 17)) == []
    cases = {
        "MISSING_TOTAL": good.model_copy(update={"total_minor": None}),
        "DATE_IN_FUTURE": good.model_copy(update={"date": date(2027, 1, 1)}),
        "DATE_TOO_OLD": good.model_copy(update={"date": date(2010, 1, 1)}),
        "TOTAL_LT_SUBTOTAL": good.model_copy(update={"total_minor": 10_000, "subtotal_minor": 20_000}),
        "ITEMS_SUM_MISMATCH": good.model_copy(
            update={"items": [ItemDraft(name="Nasi", qty=1, line_total_minor=5_000)]}
        ),
        "ITEM_PRICE_IS_UNIT_PRICE": good.model_copy(
            update={
                "total_minor": 20_000,
                "subtotal_minor": 20_000,
                "items": [ItemDraft(name="Beras", qty=2, line_total_minor=10_000)],
            }
        ),
    }
    for code, draft in cases.items():
        assert code in {issue.code for issue in validate_draft(draft, today=date(2026, 10, 17))}
    rounded = good.model_copy(
        update={"items": [ItemDraft(name="Nasi", qty=1, line_total_minor=19_950)]}
    )
    assert validate_draft(rounded, today=date(2026, 10, 17)) == []


def test_scorer_known_inputs_including_a_missing_total():
    label = {
        "total": 15000,
        "date": "2026-10-17",
        "category": "Dining",
        "items": [{"name": "Nasi", "line_total": 15000}],
    }
    perfect = score_receipt(label, {"total_minor": 15000, "date": "2026-10-17", "category": "Dining", "items": label["items"]})
    assert perfect["total_exact"] and perfect["item_recall"] == 1
    missing = score_receipt({"total": None, "date": None, "category": "Other", "items": []}, None)
    assert missing["parsed"] is False
    assert aggregate([perfect, missing])["parse_failures"] == 1


def test_receipt_graph_repairs_once_and_stops_at_the_attempt_cap():
    bad = {
        "merchant": "Toko",
        "date": "2026-10-17",
        "total_minor": 1000,
        "subtotal_minor": 5000,
        "category": "Groceries",
        "items": [{"name": "Beras", "qty": 1, "line_total_minor": 5000}],
    }
    fixed = dict(bad, total_minor=5000)
    state = run_until_review(b"img", "image/png", "photo", ScriptedModel([bad, fixed]))
    assert state["attempts"] == 1
    assert state["draft"]["total_minor"] == 5000
    assert state["trace"][-1]["step"] == "review"
    looping = ScriptedModel([bad, bad, bad, bad])
    exhausted = run_until_review(b"img", "image/png", "photo", looping)
    assert exhausted["attempts"] == 2


def test_schema_failure_is_a_typed_result():
    state = run_until_review(
        b"img",
        "image/png",
        "photo",
        ScriptedModel([ExtractionFailure("schema_invalid", "nope")]),
    )
    assert state["issues"][0]["code"] == "SCHEMA_INVALID"


def test_capture_text_does_not_write_and_parses_the_amount():
    draft = draft_from_text("nasi goreng 25rb gojek")
    assert draft.total_minor == 25_000
    assert draft.category == "Dining"
    assert draft.source == "chat"


def test_router_examples_and_follow_up():
    assert route_message("nasi goreng 25rb gojek") == "capture"
    assert route_message("", ["receipt.jpg"]) == "capture"
    assert route_message("berapa pengeluaran dining bulan ini?") == "insights"
    assert route_message("and last month?", previous="insights") == "insights"
    assert route_message("set budget bulan ini jadi 4 juta") == "budget"
    assert route_message("hi") == "smalltalk"
    assert route_message("which stocks should I buy") == "refuse"
    assert route_message("kopi 18rb, was that too much?") == "capture"


def test_memory_rank_exact_near_and_none():
    rows = [
        {"merchant_normalized": "indomaret", "embedding": embed_text("indomaret"), "text": "a"},
        {"merchant_normalized": "warung", "embedding": embed_text("warung"), "text": "b"},
    ]
    assert rank_memory(rows, "Indomaret")[0]["text"] == "a"
    assert rank_memory(rows, "zzzz-unknown") == []


def test_rate_limit_blocks_the_31st_call():
    reset_limits()
    user = "00000000-0000-0000-0000-000000000001"
    from uuid import UUID

    identity = UUID(user)
    for _ in range(30):
        hit_rate_limit(identity, 30, now=1)
    try:
        hit_rate_limit(identity, 30, now=1)
        raised = False
    except LimitError as exc:
        raised = exc.code == "rate_limited"
    assert raised


def test_projection_refuses_an_empty_month():
    class Conn:
        def execute(self, *_args, **_kwargs):
            class Result:
                def mappings(self):
                    return self

                def __iter__(self):
                    return iter(())

            return Result()

    body = projection(Conn(), uuid4(), "2026-10", today=date(2026, 10, 17))
    assert body["ready"] is False
    assert "estimate" in body["method"]


def test_find_amount_prefers_a_suffixed_number_and_ignores_quantities():
    from app.ai.money import find_amount, format_idr

    assert find_amount("kopi 25rb")[0] == 25_000
    assert find_amount("2 nasi goreng 30rb")[0] == 30_000
    assert find_amount("nasi 25.000")[0] == 25_000
    assert find_amount("beli 1,5jt")[0] == 1_500_000
    assert find_amount("2 packs of tea") is None
    assert find_amount("35 kopi") is None
    assert format_idr(342_500) == "Rp 342.500"
    assert format_idr(-1_500) == "-Rp 1.500"


def test_capture_reads_merchant_date_and_category():
    today = date(2026, 10, 27)
    draft = draft_from_text("makan siang 35rb di warteg kemarin", today)
    assert (draft.merchant, str(draft.date), draft.total_minor, draft.category) == (
        "Warteg",
        "2026-10-26",
        35_000,
        "Dining",
    )
    assert draft.items[0].name == "Makan siang"
    later = draft_from_text("kopi 25rb tadi pagi", today)
    assert (later.merchant, str(later.date), later.items[0].name) == (None, "2026-10-27", "Kopi")
    assert draft_from_text("bayar listrik 450rb", today).category == "Bills"
    assert draft_from_text("2 packs of tea", today).total_minor is None


def test_router_asks_for_a_missing_price_but_does_not_log_quantities():
    assert route_message("nasi goreng") == "capture"
    assert route_message("2 packs of tea") == "smalltalk"
    assert route_message("beli baju 150k") == "capture"
    assert route_message("how much did I spend on food this week?") == "insights"


def test_periods_for_week_month_and_named_months():
    from app.ai.period import resolve_period

    today = date(2026, 10, 27)  # a Tuesday
    week = resolve_period("food this week", today)
    assert (str(week.start), str(week.end), week.previous_label) == ("2026-10-26", "2026-11-02", "last week")
    last_month = resolve_period("bulan lalu", today)
    assert (str(last_month.start), str(last_month.end)) == ("2026-09-01", "2026-10-01")
    assert str(resolve_period("in March 2025", today).start) == "2025-03-01"
    default = resolve_period("how much did I spend", today)
    assert (default.label, str(default.start)) == ("this month", "2026-10-01")
    january = resolve_period("last month", date(2026, 1, 15))
    assert (str(january.start), str(january.end)) == ("2025-12-01", "2026-01-01")


def test_recap_insight_picks_the_biggest_meaningful_move():
    from app.services.recap import _insight

    previous = {"Dining": (1_000_000, 10), "Groceries": (400_000, 4), "Bills": (10_000, 1)}
    current = {"Dining": (880_000, 9), "Groceries": (600_000, 5), "Bills": (500_000, 1)}
    # Bills moved most, but its base is too small to compare with.
    assert _insight(current, previous) == {
        "category": "Groceries",
        "change_percent": 50,
        "text": "Groceries is up 50% vs last month.",
    }
    assert _insight({"Dining": (960_000, 9)}, {"Dining": (1_000_000, 10)}) is None  # -4%: not worth saying
    assert _insight({"Dining": (500, 1)}, {}) is None


def test_days_left_and_the_like_for_like_window():
    from app.services.recap import _previous_window, days_left

    assert days_left("2026-10", date(2026, 10, 22)) == 9
    assert days_left("2026-10", date(2026, 10, 31)) == 0
    assert days_left("2026-10", date(2026, 11, 3)) == 0
    assert days_left("2026-10", date(2026, 9, 3)) == 31
    # Midway through October is compared with the first 22 days of September, not all of it.
    assert _previous_window("2026-10", date(2026, 10, 22)) == (date(2026, 9, 1), date(2026, 9, 23))
    assert _previous_window("2026-03", date(2026, 3, 31)) == (date(2026, 2, 1), date(2026, 3, 1))
    assert _previous_window("2026-09", date(2026, 10, 22)) == (date(2026, 8, 1), date(2026, 9, 1))

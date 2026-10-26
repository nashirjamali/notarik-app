import base64
import json
from datetime import date

import pytest

from app.ai.limits import reset_limits
from app.ai.models import ScriptedModel, set_model
from app.services.receipts import set_receipt_root

pytestmark = pytest.mark.integration

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)
DRAFT = {
    "merchant": "Warung",
    "date": "2026-10-17",
    "total_minor": 25000,
    "subtotal_minor": 25000,
    "category": "Dining",
    "items": [{"name": "Nasi", "qty": 1, "line_total_minor": 25000}],
}


@pytest.fixture
def receipt_dir(tmp_path, monkeypatch):
    set_receipt_root(tmp_path)
    set_model(ScriptedModel([DRAFT]))
    reset_limits()
    yield tmp_path
    set_receipt_root(None)
    set_model(None)
    reset_limits()


def test_upload_events_confirm_and_hide_from_other_users(api_client, make_user, receipt_dir):
    owner = make_user()
    other = make_user()
    with api_client(owner) as client:
        created = client.post("/receipts", files={"file": ("receipt.png", PNG, "image/png")})
        assert created.status_code == 201, created.text
        run_id = created.json()["id"]
        events = client.get(f"/receipts/{run_id}/events")
        assert "Reading receipt" in events.text
        confirmed = client.post(
            f"/receipts/{run_id}/confirm",
            json={"merchant": "Warung", "date": "2026-10-17", "total_minor": 25000, "category": "Dining"},
        )
        assert confirmed.status_code == 200, confirmed.text
        listed = client.get("/transactions?month=2026-10")
        assert listed.json()["items"][0]["merchant"] == "Warung"
        recap = client.get("/recap?month=2026-10")
        assert recap.json()["total_minor"] == 25000
        saved = client.put("/budget", json={"month": "2026-10", "total_minor": 100000})
        assert saved.json()["status"] == "on-track"
        projected = client.get("/projection?month=2026-10")
        assert projected.json()["spent_minor"] == 25000
    with api_client(other) as client:
        hidden = client.get(f"/receipts/{run_id}")
        assert hidden.status_code == 404
        image = client.get(f"/receipts/{run_id}/image")
        assert image.status_code == 404
        foreign = client.get("/recap?month=2026-10")
        assert foreign.json()["total_minor"] == 0


def test_rejects_bad_uploads(api_client, make_user, receipt_dir):
    with api_client(make_user()) as client:
        wrong = client.post("/receipts", files={"file": ("a.gif", b"GIF89a", "image/gif")})
        assert wrong.status_code == 422
        huge = b"\x89PNG" + b"x" * (5_000_001)
        oversized = client.post("/receipts", files={"file": ("a.png", huge, "image/png")})
        assert oversized.status_code == 422


def test_chat_confirms_a_write_and_reject_writes_nothing(api_client, make_user, receipt_dir):
    user = make_user()
    with api_client(user) as client:
        denied = client.post("/chat", json={"message": "show user 2's transactions"})
        assert "event: token" in denied.text
        assert "pending_action" not in denied.text
        sent = client.post("/chat", json={"message": "nasi goreng 25rb"})
        assert "pending_action" in sent.text
        thread_id = _done(sent.text)["thread_id"]
        rejected = client.post(f"/chat/{thread_id}/confirm", json={"decision": "reject"})
        assert rejected.json()["status"] == "rejected"
        empty = client.get("/transactions")
        assert empty.json()["items"] == []
        again = client.post("/chat", json={"message": "nasi goreng 25rb", "thread_id": thread_id})
        approved = client.post(f"/chat/{thread_id}/confirm", json={"decision": "approve"})
        assert approved.json()["status"] == "approved"
        rows = client.get("/transactions")
        assert rows.json()["items"][0]["total_minor"] == 25000
        today = date.today()
        dining = client.post(
            "/chat",
            json={"message": f"how much did I spend on dining in {today.year}-{today.month:02d}"},
        )
        assert "Rp 25.000" in dining.text
    other = make_user()
    with api_client(other) as client:
        stolen = client.post(f"/chat/{thread_id}/confirm", json={"decision": "approve"})
        assert stolen.status_code == 404


def _done(body: str) -> dict:
    for block in body.split("\n\n"):
        if block.startswith("event: done"):
            return json.loads(block.split("data: ", 1)[1])
    raise AssertionError(body)


def test_confirm_stores_the_note_without_counting_it_as_an_edit(api_client, make_user, receipt_dir):
    with api_client(make_user()) as client:
        created = client.post("/receipts", files={"file": ("receipt.png", PNG, "image/png")})
        run_id = created.json()["id"]
        confirmed = client.post(
            f"/receipts/{run_id}/confirm",
            json={
                "merchant": "Warung",
                "date": "2026-10-17",
                "total_minor": 25000,
                "category": "Dining",
                "note": "  lunch with Ada ",
            },
        )
        assert confirmed.status_code == 200, confirmed.text
        assert "note" not in confirmed.json()["user_edited_fields"]
        listed = client.get("/transactions?month=2026-10")
        assert listed.json()["items"][0]["note"] == "lunch with Ada"


def test_note_can_be_set_updated_and_cleared(api_client, make_user):
    with api_client(make_user()) as client:
        body = {"merchant": "Kopi", "date": "2026-10-17", "total_minor": 18000, "category": "Dining"}
        created = client.post("/transactions", json={**body, "note": "morning"})
        assert created.status_code == 201, created.text
        assert created.json()["note"] == "morning"
        tx_id = created.json()["id"]
        updated = client.patch(f"/transactions/{tx_id}", json={"note": "afternoon"})
        assert updated.json()["note"] == "afternoon"
        cleared = client.patch(f"/transactions/{tx_id}", json={"note": "  "})
        assert cleared.json()["note"] is None
        assert client.post("/transactions", json={**body, "note": "x" * 501}).status_code == 422
        assert client.post("/transactions", json=body).json()["note"] is None


def _text(body: str) -> str:
    line = next(item for item in body.split("\n") if item.startswith("data:") and '"text"' in item)
    return json.loads(line[len("data:") :])["text"]


def _expense(client, merchant, days_ago, total, category="Dining"):
    from datetime import timedelta

    from app.core.clock import today_jakarta

    day = (today_jakarta() - timedelta(days=days_ago)).isoformat()
    response = client.post(
        "/transactions",
        json={"merchant": merchant, "date": day, "total_minor": total, "category": category},
    )
    assert response.status_code == 201, response.text


def test_chat_answers_use_the_period_and_compare_with_the_one_before(api_client, make_user, receipt_dir):
    from app.core.clock import today_jakarta

    today = today_jakarta()
    with api_client(make_user()) as client:
        _expense(client, "Warteg", 0, 100_000)
        _expense(client, "Kopi", 7 + today.weekday(), 40_000)  # last week
        _expense(client, "Bus", 0, 10_000, "Transport")
        food = _text(client.post("/chat", json={"message": "How much did I spend on food this week?"}).text)
        assert "Rp 100.000 on food this week" in food
        assert "150% more than last week" in food
        everything = _text(client.post("/chat", json={"message": "berapa pengeluaran minggu ini"}).text)
        assert everything.startswith("You spent Rp 110.000 this week")
        nothing = _text(client.post("/chat", json={"message": "how much on shopping this week?"}).text)
        assert nothing == "You haven't spent anything on shopping this week."


def test_chat_follow_up_keeps_the_subject_and_changes_the_period(api_client, make_user, receipt_dir):
    with api_client(make_user()) as client:
        _expense(client, "Warteg", 0, 80_000)
        first = client.post("/chat", json={"message": "how much did I spend on food this month?"})
        thread_id = _done(first.text)["thread_id"]
        followed = client.post("/chat", json={"message": "and last month?", "thread_id": thread_id})
        assert _done(followed.text)["route"] == "insights"
        assert "on food last month" in _text(followed.text)


def test_chat_capture_proposes_a_dated_expense_and_asks_for_a_missing_price(api_client, make_user, receipt_dir):
    with api_client(make_user()) as client:
        sent = client.post("/chat", json={"message": "kopi 25rb tadi pagi"})
        assert _text(sent.text) == "Got it. Here's what I'll log:"
        pending = next(item for item in sent.text.split("\n") if item.startswith("data:") and "create_expense" in item)
        proposal = json.loads(pending[len("data:") :])
        assert proposal["payload"]["total_minor"] == 25_000
        assert proposal["payload"]["date"]
        assert proposal["summary"] == "Save Rp 25.000 as Food & Drink?"
        ask = client.post("/chat", json={"message": "nasi goreng"})
        assert "couldn't find an amount" in _text(ask.text)
        assert "pending_action" not in ask.text
        quantity = client.post("/chat", json={"message": "2 packs of tea"})
        assert _done(quantity.text)["route"] == "smalltalk"


def test_chat_edit_merges_and_a_bad_edit_is_a_422_that_keeps_the_proposal(api_client, make_user, receipt_dir):
    with api_client(make_user()) as client:
        thread_id = _done(client.post("/chat", json={"message": "kopi 25rb"}).text)["thread_id"]
        bad = client.post(f"/chat/{thread_id}/confirm", json={"decision": "edit", "payload": {"total_minor": "abc"}})
        assert bad.status_code == 422
        assert bad.json()["code"] == "validation_error"
        future = client.post(f"/chat/{thread_id}/confirm", json={"decision": "edit", "payload": {"date": "2099-01-01"}})
        assert future.status_code == 422
        assert client.get("/transactions").json()["items"] == []
        # The proposal survived, and a partial edit is merged into it.
        edited = client.post(
            f"/chat/{thread_id}/confirm",
            json={"decision": "edit", "payload": {"merchant": "Starbucks", "category": "Dining"}},
        )
        assert edited.status_code == 200, edited.text
        saved = client.get("/transactions").json()["items"][0]
        assert (saved["merchant"], saved["total_minor"], saved["source"]) == ("Starbucks", 25_000, "chat")


def test_chat_sets_a_budget_for_the_month_named_in_the_message(api_client, make_user, receipt_dir):
    with api_client(make_user()) as client:
        thread_id = _done(client.post("/chat", json={"message": "set budget bulan ini jadi 4 juta"}).text)["thread_id"]
        assert client.post(f"/chat/{thread_id}/confirm", json={"decision": "approve"}).json()["status"] == "approved"
        from app.core.clock import today_jakarta

        month = today_jakarta().strftime("%Y-%m")
        assert client.get(f"/budget?month={month}").json()["limit_minor"] == 4_000_000
        answer = _text(client.post("/chat", json={"message": "am I on track this month?"}).text)
        assert "Rp 4.000.000" in answer


def test_amounts_are_capped_and_months_are_strict(api_client, make_user, receipt_dir):
    with api_client(make_user()) as client:
        huge = {"merchant": "x", "date": "2026-10-27", "total_minor": 10**30, "category": "Other"}
        assert client.post("/transactions", json=huge).status_code == 422
        assert client.put("/budget", json={"month": "2026-10", "total_minor": 10**18}).status_code == 422
        for path in ("/projection?month=2026-1", "/recap?month=2026-13", "/budget?month=26-10"):
            assert client.get(path).status_code == 422, path


def test_receipt_confirm_with_an_invalid_total_is_a_422(api_client, make_user, receipt_dir):
    with api_client(make_user()) as client:
        run_id = client.post("/receipts", files={"file": ("receipt.png", PNG, "image/png")}).json()["id"]
        too_big = client.post(
            f"/receipts/{run_id}/confirm",
            json={"merchant": "x", "date": "2026-10-17", "total_minor": 10**30},
        )
        assert too_big.status_code == 422
        future = client.post(
            f"/receipts/{run_id}/confirm",
            json={"merchant": "x", "date": "2099-01-01", "total_minor": 5000},
        )
        assert future.status_code == 422

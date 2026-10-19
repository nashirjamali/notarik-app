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
        assert "25000" in dining.text
    other = make_user()
    with api_client(other) as client:
        stolen = client.post(f"/chat/{thread_id}/confirm", json={"decision": "approve"})
        assert stolen.status_code == 404


def _done(body: str) -> dict:
    for block in body.split("\n\n"):
        if block.startswith("event: done"):
            return json.loads(block.split("data: ", 1)[1])
    raise AssertionError(body)

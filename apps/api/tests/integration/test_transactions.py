from datetime import datetime, timezone

import pytest
from sqlalchemy import text

pytestmark = pytest.mark.integration


def _payload(merchant: str, **extra):
    body = {
        "merchant": merchant,
        "date": "2026-10-15",
        "total_minor": 25000,
        "category": "Dining",
        "items": [{"name": "Nasi goreng", "line_total_minor": 25000}],
    }
    body.update(extra)
    return body


def test_crud_and_hidden_rows_are_404(api_client, make_user, admin_connection):
    owner = make_user()
    other = make_user()
    with api_client(owner) as client:
        created = client.post("/transactions", json=_payload("Warung"))
        assert created.status_code == 201
        transaction_id = created.json()["id"]
        assert created.json()["items"][0]["name"] == "Nasi goreng"
        assert created.json()["total_minor"] == 25000

        listed = client.get("/transactions")
        assert listed.status_code == 200
        assert [row["id"] for row in listed.json()["items"]] == [transaction_id]

        patched = client.patch(
            f"/transactions/{transaction_id}",
            json={"merchant": "Warung Baru", "total_minor": 30000},
        )
        assert patched.status_code == 200
        assert patched.json()["merchant"] == "Warung Baru"

        fetched = client.get(f"/transactions/{transaction_id}")
        assert fetched.json()["merchant"] == "Warung Baru"

    with api_client(other) as client:
        assert client.get(f"/transactions/{transaction_id}").status_code == 404
        assert (
            client.patch(
                f"/transactions/{transaction_id}", json={"merchant": "Stolen"}
            ).status_code
            == 404
        )
        assert client.delete(f"/transactions/{transaction_id}").status_code == 404

    with api_client(owner) as client:
        assert client.delete(f"/transactions/{transaction_id}").status_code == 204
        assert client.get(f"/transactions/{transaction_id}").status_code == 404

    remaining = admin_connection.execute(
        text("SELECT count(*) FROM transaction_items WHERE transaction_id = :id"),
        {"id": transaction_id},
    ).scalar_one()
    assert remaining == 0


def test_validation_error_names_the_field(api_client, make_user):
    with api_client(make_user()) as client:
        response = client.post(
            "/transactions",
            json=_payload("Warung", total_minor=-1, category="Rent"),
        )
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert "total_minor" in body["message"]
    assert "category" in body["message"]


def test_month_and_category_filters(api_client, make_user):
    with api_client(make_user()) as client:
        client.post("/transactions", json=_payload("October dining"))
        client.post(
            "/transactions",
            json=_payload(
                "November groceries",
                date="2026-11-02",
                category="Groceries",
            ),
        )
        filtered = client.get(
            "/transactions", params={"month": "2026-10", "category": "Dining"}
        )
    merchants = [row["merchant"] for row in filtered.json()["items"]]
    assert merchants == ["October dining"]


def test_cursor_stays_stable_when_a_newer_row_is_inserted(
    api_client, make_user, admin_engine
):
    user_id = make_user()
    names = ["oldest", "middle", "newest"]
    created_ids = {}
    with api_client(user_id) as client:
        for name in names:
            response = client.post("/transactions", json=_payload(name, items=[]))
            assert response.status_code == 201
            created_ids[name] = response.json()["id"]

    stamps = {
        "oldest": datetime(2026, 10, 1, tzinfo=timezone.utc),
        "middle": datetime(2026, 10, 2, tzinfo=timezone.utc),
        "newest": datetime(2026, 10, 3, tzinfo=timezone.utc),
    }
    with admin_engine.connect() as connection:
        with connection.begin():
            for name, stamp in stamps.items():
                connection.execute(
                    text("UPDATE transactions SET created_at = :stamp WHERE id = :id"),
                    {"stamp": stamp, "id": created_ids[name]},
                )

    try:
        with api_client(user_id) as client:
            first = client.get("/transactions", params={"limit": 2})
            assert [row["merchant"] for row in first.json()["items"]] == [
                "newest",
                "middle",
            ]
            extra = client.post("/transactions", json=_payload("later", items=[]))
            extra_id = extra.json()["id"]
            with admin_engine.connect() as connection:
                with connection.begin():
                    connection.execute(
                        text(
                            "UPDATE transactions SET created_at = :stamp WHERE id = :id"
                        ),
                        {
                            "stamp": datetime(2026, 10, 4, tzinfo=timezone.utc),
                            "id": extra_id,
                        },
                    )
            second = client.get(
                "/transactions",
                params={"limit": 2, "cursor": first.json()["next_cursor"]},
            )
            assert [row["merchant"] for row in second.json()["items"]] == ["oldest"]
            assert second.json()["next_cursor"] is None
    finally:
        with api_client(user_id) as client:
            for transaction_id in list(created_ids.values()):
                client.delete(f"/transactions/{transaction_id}")
            if "extra_id" in locals():
                client.delete(f"/transactions/{extra_id}")


def test_payment_method_is_validated_and_can_be_changed_or_cleared(api_client, make_user):
    with api_client(make_user()) as client:
        created = client.post("/transactions", json=_payload("Warung", payment_method="QRIS"))
        assert created.status_code == 201, created.text
        assert created.json()["payment_method"] == "QRIS"
        transaction_id = created.json()["id"]
        assert client.post("/transactions", json=_payload("Warung")).json()["payment_method"] is None
        changed = client.patch(f"/transactions/{transaction_id}", json={"payment_method": "Cash"})
        assert changed.json()["payment_method"] == "Cash"
        cleared = client.patch(f"/transactions/{transaction_id}", json={"payment_method": None})
        assert cleared.json()["payment_method"] is None
        assert client.patch(f"/transactions/{transaction_id}", json={"payment_method": "Bitcoin"}).status_code == 422
        assert client.post("/transactions", json=_payload("x", payment_method="nope")).status_code == 422


def test_search_matches_merchant_note_and_item_names_and_takes_wildcards_literally(api_client, make_user):
    with api_client(make_user()) as client:
        client.post("/transactions", json=_payload("Indomaret Kemang", items=[{"name": "Telur", "line_total_minor": 25000}]))
        client.post("/transactions", json=_payload("Warung", note="lunch with Ada", items=[]))
        client.post("/transactions", json=_payload("Kopi 100% arabica", items=[]))

        def found(term):
            return sorted(row["merchant"] for row in client.get("/transactions", params={"q": term}).json()["items"])

        assert found("indomaret") == ["Indomaret Kemang"]
        assert found("ADA") == ["Warung"]
        assert found("telur") == ["Indomaret Kemang"]
        assert found("100%") == ["Kopi 100% arabica"]
        assert found("%") == ["Kopi 100% arabica"]
        assert found("_") == []
        assert len(found("   ")) == 3
        assert client.get("/transactions", params={"q": "x" * 101}).status_code == 422


def test_listing_requires_a_real_month_and_exposes_the_receipt_link(api_client, make_user):
    with api_client(make_user()) as client:
        assert client.get("/transactions", params={"month": "2026-1"}).status_code == 422
        assert client.get("/transactions", params={"month": "2026-13"}).status_code == 422
        created = client.post("/transactions", json=_payload("Warung"))
        assert created.json()["receipt_run_id"] is None


def test_list_is_ordered_by_the_day_it_happened_and_pages_without_gaps(api_client, make_user):
    # Added out of order: the newest day must still come first, whatever was typed last.
    days = ["2026-10-20", "2026-10-22", "2026-10-21", "2026-10-22", "2026-10-20"]
    with api_client(make_user()) as client:
        for index, day in enumerate(days):
            created = client.post("/transactions", json=_payload(f"Row {index}", date=day, items=[]))
            assert created.status_code == 201, created.text
        everything = client.get("/transactions", params={"limit": 100}).json()["items"]
        assert [row["date"] for row in everything] == sorted(days, reverse=True)

        seen = []
        cursor = None
        while True:
            params = {"limit": 2, **({"cursor": cursor} if cursor else {})}
            page = client.get("/transactions", params=params).json()
            seen += [row["id"] for row in page["items"]]
            cursor = page["next_cursor"]
            if cursor is None:
                break
        assert seen == [row["id"] for row in everything]
        assert client.get("/transactions", params={"cursor": "bm9wZQ"}).status_code == 422

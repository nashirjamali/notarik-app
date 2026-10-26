from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

pytestmark = pytest.mark.integration


def test_signup_login_and_refresh(anon_client, api_client):
    email = f"ada-{uuid4()}@example.com"
    created = anon_client.post(
        "/auth/signup", json={"email": email, "password": "correct-horse"}
    )
    assert created.status_code == 201
    body = created.json()
    assert body["token_type"] == "bearer"
    with api_client(body["user_id"]) as client:
        me = client.get("/me")
    assert me.status_code == 200
    assert me.json()["user_id"] == body["user_id"]

    logged_in = anon_client.post(
        "/auth/login", json={"email": email, "password": "correct-horse"}
    )
    assert logged_in.status_code == 200
    refreshed = anon_client.post(
        "/auth/refresh",
        json={"refresh_token": logged_in.json()["refresh_token"]},
    )
    assert refreshed.status_code == 200
    assert refreshed.json()["user_id"] == body["user_id"]
    used = anon_client.post(
        "/auth/refresh",
        json={"refresh_token": logged_in.json()["refresh_token"]},
    )
    assert used.status_code == 401


def test_duplicate_email_is_409(anon_client):
    payload = {"email": f"grace-{uuid4()}@example.com", "password": "correct-horse"}
    assert anon_client.post("/auth/signup", json=payload).status_code == 201
    again = anon_client.post("/auth/signup", json=payload)
    assert again.status_code == 409
    assert again.json()["code"] == "conflict"


def test_short_password_is_422(anon_client):
    response = anon_client.post(
        "/auth/signup", json={"email": "short@example.com", "password": "tiny"}
    )
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert "password" in response.json()["message"]


def test_logout_revokes_refresh_token(anon_client):
    created = anon_client.post(
        "/auth/signup",
        json={"email": f"logout-{uuid4()}@example.com", "password": "correct-horse"},
    )
    token = created.json()["refresh_token"]
    assert anon_client.post("/auth/logout", json={"refresh_token": token}).status_code == 204
    refused = anon_client.post("/auth/refresh", json={"refresh_token": token})
    assert refused.status_code == 401


def test_app_user_cannot_read_password_hashes(db_connection):
    with pytest.raises(DBAPIError):
        db_connection.execute(text("SELECT * FROM users"))


def _signup_and_get_me(anon_client, api_client, **extra):
    created = anon_client.post(
        "/auth/signup",
        json={
            "email": f"name-{uuid4()}@example.com",
            "password": "correct-horse",
            **extra,
        },
    )
    assert created.status_code == 201
    with api_client(created.json()["user_id"]) as client:
        return client.get("/me").json()


def test_signup_stores_trimmed_name(anon_client, api_client):
    me = _signup_and_get_me(anon_client, api_client, name="  Ada Lovelace ")
    assert me["name"] == "Ada Lovelace"


def test_signup_without_name_leaves_it_empty(anon_client, api_client):
    assert _signup_and_get_me(anon_client, api_client)["name"] is None
    assert _signup_and_get_me(anon_client, api_client, name="   ")["name"] is None


def test_overlong_name_is_422(anon_client):
    response = anon_client.post(
        "/auth/signup",
        json={
            "email": f"long-{uuid4()}@example.com",
            "password": "correct-horse",
            "name": "x" * 81,
        },
    )
    assert response.status_code == 422
    assert "name" in response.json()["message"]

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.dependencies import google_key_client, settings
from app.main import app

pytestmark = pytest.mark.integration

WEB_ID = "test-web.apps.googleusercontent.com"
NONCE = "nonce-abc"
_private = rsa.generate_private_key(public_exponent=65537, key_size=2048)


class FakeKeys:
    def get_signing_key_from_jwt(self, token: str):
        return SimpleNamespace(key=_private.public_key())


@pytest.fixture(autouse=True)
def google(monkeypatch):
    monkeypatch.setattr(settings, "google_web_client_id", WEB_ID)
    monkeypatch.setattr(settings, "google_ios_client_id", "")
    app.dependency_overrides[google_key_client] = lambda: FakeKeys()
    yield
    app.dependency_overrides.pop(google_key_client, None)


def id_token(email: str, *, sub: str | None = None, verified=True, **overrides) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "iss": "https://accounts.google.com",
        "aud": WEB_ID,
        "sub": sub or f"g-{uuid4()}",
        "email": email,
        "email_verified": verified,
        "name": "Ada Lovelace",
        "nonce": NONCE,
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    claims.update(overrides)
    return jwt.encode(claims, _private, algorithm="RS256", headers={"kid": "k1"})


def sign_in(client, token: str, nonce: str = NONCE):
    return client.post(
        "/auth/social", json={"provider": "google", "id_token": token, "nonce": nonce}
    )


def test_new_google_user_is_created_and_can_use_the_api(anon_client, api_client):
    email = f"new-{uuid4()}@example.com"
    response = sign_in(anon_client, id_token(email))
    assert response.status_code == 200
    body = response.json()
    with api_client(body["user_id"]) as client:
        me = client.get("/me")
    assert me.json()["email"] == email
    assert me.json()["name"] == "Ada Lovelace"


def test_same_google_account_signs_in_to_the_same_user(anon_client):
    email = f"again-{uuid4()}@example.com"
    sub = f"g-{uuid4()}"
    first = sign_in(anon_client, id_token(email, sub=sub)).json()
    second = sign_in(anon_client, id_token(email, sub=sub)).json()
    assert first["user_id"] == second["user_id"]


def test_verified_email_links_to_the_existing_password_account(anon_client):
    email = f"linked-{uuid4()}@example.com"
    created = anon_client.post(
        "/auth/signup", json={"email": email, "password": "correct-horse"}
    ).json()
    social = sign_in(anon_client, id_token(email))
    assert social.status_code == 200
    assert social.json()["user_id"] == created["user_id"]
    login = anon_client.post(
        "/auth/login", json={"email": email, "password": "correct-horse"}
    )
    assert login.status_code == 200
    assert login.json()["user_id"] == created["user_id"]


def test_unverified_email_never_links_to_an_existing_account(anon_client):
    email = f"victim-{uuid4()}@example.com"
    anon_client.post("/auth/signup", json={"email": email, "password": "correct-horse"})
    response = sign_in(anon_client, id_token(email, verified=False))
    assert response.status_code == 401


def test_unverified_email_does_not_claim_the_address(anon_client):
    email = f"squat-{uuid4()}@example.com"
    assert sign_in(anon_client, id_token(email, verified=False)).status_code == 401
    signup = anon_client.post(
        "/auth/signup", json={"email": email, "password": "correct-horse"}
    )
    assert signup.status_code == 201


def test_password_login_on_a_google_only_account_fails_generically(anon_client):
    email = f"social-{uuid4()}@example.com"
    assert sign_in(anon_client, id_token(email)).status_code == 200
    response = anon_client.post(
        "/auth/login", json={"email": email, "password": "anything-at-all"}
    )
    assert response.status_code == 401
    assert response.json()["message"] == "Wrong email or password"


def test_wrong_nonce_audience_or_provider_is_refused(anon_client):
    email = f"bad-{uuid4()}@example.com"
    assert sign_in(anon_client, id_token(email), nonce="other").status_code == 401
    wrong_aud = id_token(email, aud="someone-else.apps.googleusercontent.com")
    assert sign_in(anon_client, wrong_aud).status_code == 401
    unknown = anon_client.post(
        "/auth/social",
        json={"provider": "apple", "id_token": id_token(email), "nonce": NONCE},
    )
    assert unknown.status_code == 422


def test_garbage_token_is_401(anon_client):
    assert sign_in(anon_client, "not-a-token").status_code == 401


def test_app_user_cannot_read_identities_directly(db_connection):
    with pytest.raises(DBAPIError):
        db_connection.execute(text("SELECT * FROM user_identities"))

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.config import Settings
from app.core.security import TokenError, verify_google_token

WEB_ID = "web-client.apps.googleusercontent.com"
IOS_ID = "ios-client.apps.googleusercontent.com"
NONCE = "nonce-123"

_private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_other = rsa.generate_private_key(public_exponent=65537, key_size=2048)


class FakeKeys:
    def __init__(self, key=_private.public_key(), error: Exception | None = None):
        self.key = key
        self.error = error

    def get_signing_key_from_jwt(self, token: str):
        if self.error:
            raise self.error
        return SimpleNamespace(key=self.key)


def settings(*ids: str) -> Settings:
    return Settings(
        google_web_client_id=ids[0] if ids else "",
        google_ios_client_id=ids[1] if len(ids) > 1 else "",
    )


def make_token(key=_private, algorithm="RS256", **overrides) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "iss": "https://accounts.google.com",
        "aud": WEB_ID,
        "sub": "google-sub-1",
        "email": "ada@example.com",
        "email_verified": True,
        "name": "Ada",
        "nonce": NONCE,
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    claims.update(overrides)
    claims = {k: v for k, v in claims.items() if v is not None}
    return jwt.encode(claims, key, algorithm=algorithm, headers={"kid": "k1"})


def verify(token: str, *, ids=(WEB_ID, IOS_ID), nonce=NONCE, keys=None):
    return verify_google_token(token, nonce, settings(*ids), keys or FakeKeys())


def test_valid_token_returns_the_identity():
    identity = verify(make_token())
    assert identity.subject == "google-sub-1"
    assert identity.email == "ada@example.com"
    assert identity.email_verified is True
    assert identity.name == "Ada"


def test_either_client_id_is_accepted():
    assert verify(make_token(aud=IOS_ID)).subject == "google-sub-1"


def test_issuer_without_scheme_is_accepted():
    assert verify(make_token(iss="accounts.google.com")).subject == "google-sub-1"


def test_email_verified_as_string_true():
    assert verify(make_token(email_verified="true")).email_verified is True
    assert verify(make_token(email_verified="false")).email_verified is False
    assert verify(make_token(email_verified=False)).email_verified is False


@pytest.mark.parametrize(
    "overrides",
    [
        {"aud": "someone-elses-app.apps.googleusercontent.com"},
        {"iss": "https://evil.example.com"},
        {"exp": datetime.now(timezone.utc) - timedelta(minutes=5)},
        {"nonce": "another-nonce"},
        {"nonce": None},
        {"email": None},
        {"sub": None},
    ],
)
def test_bad_claims_are_rejected(overrides):
    with pytest.raises(TokenError):
        verify(make_token(**overrides))


def test_token_signed_by_another_key_is_rejected():
    with pytest.raises(TokenError):
        verify(make_token(key=_other))


def test_unsigned_token_is_rejected():
    with pytest.raises(TokenError):
        verify(make_token(key=None, algorithm="none"))


def test_hs256_token_is_rejected():
    with pytest.raises(TokenError):
        verify(make_token(key="any-shared-secret-of-sufficient-length-1234", algorithm="HS256"))


def test_unknown_key_id_is_rejected():
    keys = FakeKeys(error=jwt.PyJWKClientError("no such kid"))
    with pytest.raises(TokenError):
        verify(make_token(), keys=keys)


def test_empty_client_id_list_rejects_everything():
    with pytest.raises(TokenError):
        verify(make_token(), ids=())


def test_empty_nonce_is_rejected():
    with pytest.raises(TokenError):
        verify(make_token(nonce=""), nonce="")

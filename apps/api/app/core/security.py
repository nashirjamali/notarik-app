import hmac
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol
from uuid import UUID

import jwt

from app.core.config import Settings


class TokenError(Exception):
    pass


def verify_access_token(token: str, settings: Settings) -> UUID:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            audience=settings.jwt_audience,
            options={"require": ["exp", "sub", "aud"]},
        )
        return UUID(payload["sub"])
    except (jwt.InvalidTokenError, ValueError) as error:
        raise TokenError from error


def issue_access_token(user_id: UUID, settings: Settings, *, minutes: int = 15) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "aud": settings.jwt_audience,
        "iat": now,
        "exp": now + timedelta(minutes=minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"]


@dataclass(frozen=True)
class GoogleIdentity:
    subject: str
    email: str
    email_verified: bool
    name: str | None


class SigningKeyClient(Protocol):
    def get_signing_key_from_jwt(self, token: str) -> Any: ...


# PyJWKClient fetches Google's public keys, picks one by the token's `kid` and caches them.
_google_keys = jwt.PyJWKClient(GOOGLE_JWKS_URL, cache_keys=True, lifespan=3600)


def verify_google_token(
    token: str,
    nonce: str,
    settings: Settings,
    key_client: SigningKeyClient | None = None,
) -> GoogleIdentity:
    """Check a Google ID token and return who it is for.

    RS256 only: accepting HS256 would let anyone sign a token with Google's public key
    as the secret. An empty client ID list rejects everything instead of accepting everything.
    """
    client_ids = settings.google_client_ids
    if not client_ids or not nonce:
        raise TokenError
    try:
        signing_key = (key_client or _google_keys).get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_ids,
            issuer=GOOGLE_ISSUERS,
            options={"require": ["exp", "iat", "iss", "aud", "sub"]},
        )
    except jwt.PyJWTError as error:
        raise TokenError from error
    token_nonce = payload.get("nonce")
    if not isinstance(token_nonce, str) or not hmac.compare_digest(token_nonce, nonce):
        raise TokenError
    email = payload.get("email")
    if not isinstance(email, str) or not email:
        raise TokenError
    verified = payload.get("email_verified")
    name = payload.get("name")
    return GoogleIdentity(
        subject=str(payload["sub"]),
        email=email,
        # Google has sent this as a boolean and as the string "true".
        email_verified=verified is True or verified == "true",
        name=name if isinstance(name, str) else None,
    )

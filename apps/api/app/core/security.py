from datetime import datetime, timedelta, timezone
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

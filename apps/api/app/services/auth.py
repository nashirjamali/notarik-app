import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.core.config import Settings
from app.core.passwords import hash_password, verify_password
from app.core.security import issue_access_token
from app.schemas.auth import TokenPair

_REFRESH_DAYS = 30


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _issue(connection: Connection, user_id: UUID, settings: Settings) -> TokenPair:
    refresh_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=_REFRESH_DAYS)
    connection.execute(
        text(
            """
            SELECT auth.store_refresh_token(:user_id, :token_hash, :expires_at)
            """
        ),
        {
            "user_id": user_id,
            "token_hash": _token_hash(refresh_token),
            "expires_at": expires_at,
        },
    )
    return TokenPair(
        access_token=issue_access_token(user_id, settings),
        refresh_token=refresh_token,
        user_id=user_id,
    )


def create_account(
    connection: Connection,
    email: str,
    password: str,
    settings: Settings,
    name: str | None = None,
) -> TokenPair | None:
    user_id = connection.execute(
        text("SELECT auth.create_user(:email, :password_hash, :name)"),
        {
            "email": email,
            "password_hash": hash_password(password),
            "name": name,
        },
    ).scalar_one()
    if user_id is None:
        return None
    return _issue(connection, user_id, settings)


def login(
    connection: Connection, email: str, password: str, settings: Settings
) -> TokenPair | None:
    row = connection.execute(
        text(
            """
            SELECT user_id, password_hash
            FROM auth.credentials_for_email(:email)
            """
        ),
        {"email": email},
    ).one_or_none()
    if row is None or not verify_password(password, row.password_hash):
        return None
    return _issue(connection, row.user_id, settings)


def refresh(
    connection: Connection, refresh_token: str, settings: Settings
) -> TokenPair | None:
    user_id = connection.execute(
        text("SELECT auth.take_refresh_token(:token_hash)"),
        {"token_hash": _token_hash(refresh_token)},
    ).scalar_one()
    if user_id is None:
        return None
    return _issue(connection, user_id, settings)


def logout(connection: Connection, refresh_token: str) -> None:
    connection.execute(
        text("SELECT auth.revoke_refresh_token(:token_hash)"),
        {"token_hash": _token_hash(refresh_token)},
    )

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException

from app.core.config import Settings
from app.core.security import TokenError, verify_access_token
from app.db.database import engine, user_session

settings = Settings()


def google_key_client() -> None:
    # None means "use Google's real key set"; tests override this with a fake.
    return None


def db_connection():
    try:
        connection = engine.connect()
    except Exception:
        raise HTTPException(status_code=503, detail="database unavailable")
    try:
        yield connection
    finally:
        connection.close()


def current_user(authorization: Annotated[str | None, Header()] = None) -> UUID:
    if authorization is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="unauthorized")
    try:
        return verify_access_token(token.strip(), settings)
    except TokenError:
        raise HTTPException(status_code=401, detail="unauthorized")


def write_connection():
    try:
        connection = engine.connect()
    except Exception:
        raise HTTPException(status_code=503, detail="database unavailable")
    try:
        with connection.begin():
            yield connection
    finally:
        connection.close()


def user_connection(user_id: UUID = Depends(current_user)):
    try:
        connection = engine.connect()
    except Exception:
        raise HTTPException(status_code=503, detail="database unavailable")
    try:
        with user_session(connection, user_id):
            yield connection
    finally:
        connection.close()

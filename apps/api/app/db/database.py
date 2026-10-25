from collections.abc import Iterator
from contextlib import contextmanager
from json import dumps
from uuid import UUID

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

from app.core.config import Settings

settings = Settings()
engine: Engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 3},
)


def set_request_claims(connection: Connection, user_id: UUID) -> None:
    connection.execute(
        text("SELECT set_config('request.jwt.claims', :claims, true)"),
        {"claims": dumps({"sub": str(user_id)})},
    )


@contextmanager
def user_session(connection: Connection, user_id: UUID) -> Iterator[Connection]:
    transaction = connection.begin()
    try:
        set_request_claims(connection, user_id)
        yield connection
        transaction.commit()
    except Exception:
        if transaction.is_active:
            transaction.rollback()
        raise

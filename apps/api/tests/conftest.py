from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID, uuid4

import pytest
from sqlalchemy import Engine
from sqlalchemy.engine import Connection


@pytest.fixture
def make_user():
    def _make_user() -> UUID:
        return uuid4()

    return _make_user


@pytest.fixture(scope="session")
def engines() -> Iterator[tuple[Engine, Engine]]:
    from sqlalchemy import create_engine

    from support import prepare_test_database

    admin_url, app_url = prepare_test_database()
    admin_engine = create_engine(
        admin_url, pool_pre_ping=True, connect_args={"connect_timeout": 3}
    )
    app_engine = create_engine(
        app_url, pool_pre_ping=True, connect_args={"connect_timeout": 3}
    )
    yield admin_engine, app_engine
    app_engine.dispose()
    admin_engine.dispose()


@pytest.fixture(scope="session")
def admin_engine(engines: tuple[Engine, Engine]) -> Engine:
    return engines[0]


@pytest.fixture(scope="session")
def app_engine(engines: tuple[Engine, Engine]) -> Engine:
    return engines[1]


@pytest.fixture
def admin_connection(admin_engine: Engine) -> Iterator[Connection]:
    from support import rollback_connection

    with rollback_connection(admin_engine) as connection:
        yield connection


@pytest.fixture
def db_connection(app_engine: Engine) -> Iterator[Connection]:
    from support import rollback_connection

    with rollback_connection(app_engine) as connection:
        yield connection


@pytest.fixture
def api_client(app_engine: Engine):
    from fastapi import Depends
    from fastapi.testclient import TestClient

    from app.core.config import Settings
    from app.db.database import user_session
    from app.dependencies import (
        current_user,
        db_connection,
        user_connection,
        write_connection,
    )
    from app.main import app
    from support import access_token

    settings = Settings()

    def override_db():
        connection = app_engine.connect()
        try:
            yield connection
        finally:
            connection.close()

    def override_write():
        connection = app_engine.connect()
        try:
            with connection.begin():
                yield connection
        finally:
            connection.close()

    def override_user_connection(verified: UUID = Depends(current_user)):
        connection = app_engine.connect()
        try:
            with user_session(connection, verified):
                yield connection
        finally:
            connection.close()

    @contextmanager
    def _open(user_id: UUID) -> Iterator[TestClient]:
        previous = dict(app.dependency_overrides)
        app.dependency_overrides[db_connection] = override_db
        app.dependency_overrides[write_connection] = override_write
        app.dependency_overrides[user_connection] = override_user_connection
        client = TestClient(app)
        client.headers["Authorization"] = "Bearer " + access_token(
            user_id,
            secret=settings.jwt_secret,
            audience=settings.jwt_audience,
        )
        try:
            yield client
        finally:
            app.dependency_overrides.clear()
            app.dependency_overrides.update(previous)

    return _open


@pytest.fixture
def anon_client(app_engine: Engine):
    from fastapi.testclient import TestClient

    from app.dependencies import db_connection, user_connection, write_connection
    from app.main import app

    def override_db():
        connection = app_engine.connect()
        try:
            yield connection
        finally:
            connection.close()

    def override_write():
        connection = app_engine.connect()
        try:
            with connection.begin():
                yield connection
        finally:
            connection.close()

    app.dependency_overrides[db_connection] = override_db
    app.dependency_overrides[write_connection] = override_write
    app.dependency_overrides[user_connection] = override_write
    client = TestClient(app)
    try:
        yield client
    finally:
        app.dependency_overrides.pop(db_connection, None)
        app.dependency_overrides.pop(write_connection, None)
        app.dependency_overrides.pop(user_connection, None)

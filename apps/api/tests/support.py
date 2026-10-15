from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import psycopg
from alembic import command
from alembic.config import Config
from psycopg import sql
from sqlalchemy import Engine
from sqlalchemy.engine import Connection
from sqlalchemy.engine.url import URL, make_url

from settings import TestSettings

API_ROOT = Path(__file__).resolve().parents[1]


def prepare_test_database() -> tuple[URL, URL]:
    settings = TestSettings()
    admin_url = make_url(settings.test_database_url)
    if not admin_url.database:
        raise RuntimeError("TEST_DATABASE_URL must include a database name")
    app_url = admin_url.set(
        username="app_user", password=settings.app_user_password
    )
    _ensure_database(admin_url, settings.app_user_password)
    _migrate(admin_url)
    return admin_url, app_url


def _ensure_database(admin_url: URL, app_password: str) -> None:
    db_name = admin_url.database
    with psycopg.connect(_raw_url(admin_url, "postgres"), autocommit=True) as conn:
        if (
            conn.execute(
                "SELECT 1 FROM pg_roles WHERE rolname = %s", ("app_user",)
            ).fetchone()
            is None
        ):
            conn.execute(
                sql.SQL("CREATE ROLE app_user LOGIN PASSWORD {}").format(
                    sql.Literal(app_password)
                )
            )
        if (
            conn.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s", (db_name,)
            ).fetchone()
            is None
        ):
            conn.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name))
            )
        conn.execute(
            sql.SQL("REVOKE ALL ON DATABASE {} FROM PUBLIC").format(
                sql.Identifier(db_name)
            )
        )
        conn.execute(
            sql.SQL("GRANT CONNECT ON DATABASE {} TO app_user").format(
                sql.Identifier(db_name)
            )
        )

    with psycopg.connect(_raw_url(admin_url, db_name), autocommit=True) as conn:
        conn.execute("GRANT USAGE ON SCHEMA public TO app_user")


def _migrate(admin_url: URL) -> None:
    cfg = Config(str(API_ROOT / "alembic.ini"))
    cfg.set_main_option(
        "sqlalchemy.url",
        admin_url.render_as_string(hide_password=False).replace("%", "%%"),
    )
    command.upgrade(cfg, "head")


def _raw_url(url: URL, database: str) -> str:
    return url.set(drivername="postgresql", database=database).render_as_string(
        hide_password=False
    )


@contextmanager
def rollback_connection(engine: Engine) -> Iterator[Connection]:
    connection = engine.connect()
    connection.begin()
    savepoint = connection.begin_nested()

    def commit() -> None:
        nonlocal savepoint
        savepoint.commit()
        savepoint = connection.begin_nested()

    connection.commit = commit
    try:
        yield connection
    finally:
        connection.rollback()
        connection.close()

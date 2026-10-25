import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.db.database import set_request_claims, user_session

pytestmark = pytest.mark.integration

TABLES = (
    "extraction_runs",
    "transactions",
    "transaction_items",
    "budgets",
    "merchant_memory",
)
RLS_TABLES = TABLES + (
    "users",
    "refresh_tokens",
    "spending_memory",
    "chat_threads",
    "chat_messages",
    "llm_usage",
)


def insert_row(connection, table: str, user_id) -> None:
    if table == "extraction_runs":
        connection.execute(
            text(
                """
                INSERT INTO extraction_runs (user_id, model, graph_version)
                VALUES (:user_id, 'test-model', 'v0')
                """
            ),
            {"user_id": user_id},
        )
        return
    if table == "transactions":
        connection.execute(
            text(
                """
                INSERT INTO transactions (
                    user_id, merchant, date, total_minor, category, source
                )
                VALUES (
                    :user_id, 'rls-probe', DATE '2026-10-15', 15000,
                    'Groceries', 'manual'
                )
                """
            ),
            {"user_id": user_id},
        )
        return
    if table == "transaction_items":
        transaction_id = connection.execute(
            text(
                """
                INSERT INTO transactions (
                    user_id, merchant, date, total_minor, category, source
                )
                VALUES (
                    :user_id, 'rls-probe', DATE '2026-10-15', 15000,
                    'Groceries', 'manual'
                )
                RETURNING id
                """
            ),
            {"user_id": user_id},
        ).scalar_one()
        connection.execute(
            text(
                """
                INSERT INTO transaction_items (
                    user_id, transaction_id, name, line_total_minor
                )
                VALUES (:user_id, :transaction_id, 'item', 15000)
                """
            ),
            {"user_id": user_id, "transaction_id": transaction_id},
        )
        return
    if table == "budgets":
        connection.execute(
            text(
                """
                INSERT INTO budgets (user_id, month, total_minor)
                VALUES (:user_id, DATE '2026-10-01', 100000)
                """
            ),
            {"user_id": user_id},
        )
        return
    if table == "merchant_memory":
        connection.execute(
            text(
                """
                INSERT INTO merchant_memory (
                    user_id, merchant_normalized, category
                )
                VALUES (:user_id, 'rls-probe', 'Groceries')
                """
            ),
            {"user_id": user_id},
        )
        return
    raise AssertionError(table)


def clear_request_claims(connection) -> None:
    connection.execute(text("SELECT set_config('request.jwt.claims', '', true)"))


def test_rls_is_enabled_and_forced(admin_connection):
    rows = admin_connection.execute(
        text(
            """
            SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = ANY(:tables)
            """
        ),
        {"tables": list(RLS_TABLES)},
    ).all()
    assert {row.relname for row in rows} == set(RLS_TABLES)
    assert all(row.relrowsecurity and row.relforcerowsecurity for row in rows)


def test_policies_use_auth_uid_for_read_and_write(admin_connection):
    rows = admin_connection.execute(
        text(
            """
            SELECT tablename, cmd, qual, with_check
            FROM pg_policies
            WHERE schemaname = 'public' AND policyname = 'own_rows'
            """
        )
    ).all()
    assert {row.tablename for row in rows} == set(RLS_TABLES)
    for row in rows:
        assert row.cmd == "ALL"
        assert "auth.uid()" in row.qual
        assert "auth.uid()" in row.with_check


@pytest.mark.parametrize("table", TABLES)
def test_user_cannot_read_or_change_another_users_rows(
    db_connection, make_user, table
):
    user_a = make_user()
    user_b = make_user()
    set_request_claims(db_connection, user_b)
    insert_row(db_connection, table, user_b)

    set_request_claims(db_connection, user_a)
    visible = db_connection.execute(text(f"SELECT count(*) FROM {table}")).scalar_one()
    updated = db_connection.execute(
        text(f"UPDATE {table} SET user_id = :user_id"),
        {"user_id": user_a},
    )
    deleted = db_connection.execute(text(f"DELETE FROM {table}"))
    assert visible == 0
    assert updated.rowcount == 0
    assert deleted.rowcount == 0

    set_request_claims(db_connection, user_b)
    remaining = db_connection.execute(
        text(f"SELECT count(*) FROM {table}")
    ).scalar_one()
    assert remaining == 1


@pytest.mark.parametrize("table", TABLES)
def test_user_cannot_insert_another_users_id(db_connection, make_user, table):
    user_a = make_user()
    user_b = make_user()
    set_request_claims(db_connection, user_a)
    with pytest.raises(DBAPIError, match="row-level security"):
        if table == "transaction_items":
            transaction_id = db_connection.execute(
                text(
                    """
                    INSERT INTO transactions (
                        user_id, merchant, date, total_minor, category, source
                    )
                    VALUES (
                        :user_id, 'rls-parent', DATE '2026-10-15', 15000,
                        'Groceries', 'manual'
                    )
                    RETURNING id
                    """
                ),
                {"user_id": user_a},
            ).scalar_one()
            db_connection.execute(
                text(
                    """
                    INSERT INTO transaction_items (
                        user_id, transaction_id, name, line_total_minor
                    )
                    VALUES (:user_id, :transaction_id, 'item', 15000)
                    """
                ),
                {"user_id": user_b, "transaction_id": transaction_id},
            )
        else:
            insert_row(db_connection, table, user_b)


@pytest.mark.parametrize("table", TABLES)
def test_no_claim_sees_zero_rows(db_connection, make_user, table):
    owner = make_user()
    set_request_claims(db_connection, owner)
    insert_row(db_connection, table, owner)
    clear_request_claims(db_connection)
    assert db_connection.execute(text("SELECT auth.uid()")).scalar_one() is None
    count = db_connection.execute(text(f"SELECT count(*) FROM {table}")).scalar_one()
    assert count == 0


def test_me_ignores_another_users_id(api_client, make_user):
    user_id = make_user()
    other = make_user()
    with api_client(user_id) as client:
        response = client.get("/me", params={"user_id": str(other)})
    assert response.status_code == 200
    assert response.json() == {"user_id": str(user_id)}


def test_claims_do_not_leak_across_transactions_on_one_connection(
    app_engine, make_user
):
    user_a = make_user()
    user_b = make_user()
    connection = app_engine.connect()
    try:
        with user_session(connection, user_a):
            connection.execute(
                text(
                    """
                    INSERT INTO transactions (
                        user_id, merchant, date, total_minor, category, source
                    )
                    VALUES (
                        :user_id, 'pool-a', DATE '2026-10-15', 1000,
                        'Groceries', 'manual'
                    )
                    """
                ),
                {"user_id": user_a},
            )
        with connection.begin():
            assert connection.execute(text("SELECT auth.uid()")).scalar_one() is None
            leaked = connection.execute(
                text("SELECT count(*) FROM transactions WHERE merchant = 'pool-a'")
            ).scalar_one()
            assert leaked == 0
        with user_session(connection, user_b):
            seen = connection.execute(text("SELECT merchant FROM transactions")).scalars().all()
            assert seen == []
            connection.execute(
                text(
                    """
                    INSERT INTO transactions (
                        user_id, merchant, date, total_minor, category, source
                    )
                    VALUES (
                        :user_id, 'pool-b', DATE '2026-10-15', 2000,
                        'Dining', 'manual'
                    )
                    """
                ),
                {"user_id": user_b},
            )
            seen = connection.execute(
                text("SELECT merchant FROM transactions")
            ).scalars().all()
            assert seen == ["pool-b"]
    finally:
        with user_session(connection, user_a):
            connection.execute(
                text("DELETE FROM transactions WHERE merchant = 'pool-a'")
            )
        with user_session(connection, user_b):
            connection.execute(
                text("DELETE FROM transactions WHERE merchant = 'pool-b'")
            )
        connection.close()

import pytest
from sqlalchemy import text

pytestmark = pytest.mark.integration


def test_db_connection_is_app_user(db_connection):
    row = db_connection.execute(
        text(
            """
            SELECT current_user AS name, rolsuper
            FROM pg_roles
            WHERE rolname = current_user
            """
        )
    ).one()
    assert row.name == "app_user"
    assert row.rolsuper is False


def test_admin_connection_is_not_app_user(admin_connection):
    name = admin_connection.execute(text("SELECT current_user")).scalar_one()
    assert name != "app_user"

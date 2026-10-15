import pytest
from sqlalchemy import text

pytestmark = pytest.mark.integration

MERCHANT = "isolation-probe"


def test_inserted_row_is_visible_in_this_test(db_connection, make_user):
    db_connection.execute(
        text(
            """
            INSERT INTO transactions (
                user_id, merchant, date, total_minor, category, source
            )
            VALUES (
                :user_id, :merchant, DATE '2026-10-15', 15000, 'Groceries', 'manual'
            )
            """
        ),
        {"user_id": make_user(), "merchant": MERCHANT},
    )
    db_connection.commit()
    count = db_connection.execute(
        text("SELECT count(*) FROM transactions WHERE merchant = :merchant"),
        {"merchant": MERCHANT},
    ).scalar_one()
    assert count == 1


def test_inserted_row_is_not_visible_in_the_next_test(db_connection):
    count = db_connection.execute(
        text("SELECT count(*) FROM transactions WHERE merchant = :merchant"),
        {"merchant": MERCHANT},
    ).scalar_one()
    assert count == 0

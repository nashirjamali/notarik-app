from typing import Sequence, Union

from alembic import op

revision: str = "0007_payment_budgets"
down_revision: Union[str, Sequence[str], None] = "0006_transaction_note"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PAYMENT_METHODS = "'Cash', 'QRIS', 'Debit card', 'Credit card', 'E-wallet', 'Bank transfer', 'Other'"
CATEGORIES = "'Groceries', 'Dining', 'Transport', 'Shopping', 'Bills', 'Other'"


def upgrade() -> None:
    op.execute(
        f"""
        ALTER TABLE transactions
          ADD COLUMN payment_method text
          CONSTRAINT ck_transactions_payment_method CHECK (payment_method IN ({PAYMENT_METHODS}))
        """
    )
    op.execute(
        f"""
        CREATE TABLE category_budgets (
          user_id uuid NOT NULL,
          month date NOT NULL,
          category text NOT NULL,
          total_minor bigint NOT NULL,
          PRIMARY KEY (user_id, month, category),
          CONSTRAINT ck_category_budgets_total CHECK (total_minor >= 0),
          CONSTRAINT ck_category_budgets_month CHECK (EXTRACT(DAY FROM month) = 1),
          CONSTRAINT ck_category_budgets_category CHECK (category IN ({CATEGORIES}))
        )
        """
    )
    op.execute("ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE category_budgets FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY own_rows ON category_budgets
          USING (user_id = (select auth.uid()))
          WITH CHECK (user_id = (select auth.uid()))
        """
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON category_budgets TO app_user")


def downgrade() -> None:
    op.execute("DROP TABLE category_budgets")
    op.execute("ALTER TABLE transactions DROP COLUMN payment_method")

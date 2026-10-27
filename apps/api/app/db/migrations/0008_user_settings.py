from typing import Sequence, Union

from alembic import op

revision: str = "0008_user_settings"
down_revision: Union[str, Sequence[str], None] = "0007_payment_budgets"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE user_settings (
          user_id uuid PRIMARY KEY,
          auto_read_receipts boolean NOT NULL DEFAULT true,
          notifications boolean NOT NULL DEFAULT true
        )
        """
    )
    op.execute("ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE user_settings FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY own_rows ON user_settings
          USING (user_id = (select auth.uid()))
          WITH CHECK (user_id = (select auth.uid()))
        """
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO app_user")
    # Like current_name(): app_user cannot read users, so the caller's own email
    # goes through a definer function.
    op.execute(
        """
        CREATE FUNCTION auth.current_email()
        RETURNS text
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        STABLE
        AS $$
          SELECT email FROM users WHERE id = auth.uid();
        $$
        """
    )
    op.execute("REVOKE ALL ON FUNCTION auth.current_email() FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION auth.current_email() TO app_user")


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS auth.current_email()")
    op.execute("DROP TABLE user_settings")

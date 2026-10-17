from typing import Sequence, Union

from alembic import op

revision: str = "0002_rls"
down_revision: Union[str, Sequence[str], None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = (
    "extraction_runs",
    "transactions",
    "transaction_items",
    "budgets",
    "merchant_memory",
)


def upgrade() -> None:
    op.execute("CREATE SCHEMA auth")
    op.execute("REVOKE ALL ON SCHEMA auth FROM PUBLIC")
    op.execute("GRANT USAGE ON SCHEMA auth TO app_user")
    op.execute(
        """
        CREATE FUNCTION auth.uid() RETURNS uuid
        LANGUAGE sql
        STABLE
        AS $$
          SELECT (
            NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
          )::uuid
        $$
        """
    )
    op.execute("REVOKE ALL ON FUNCTION auth.uid() FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION auth.uid() TO app_user")
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY own_rows ON {table}
              USING (user_id = (select auth.uid()))
              WITH CHECK (user_id = (select auth.uid()))
            """
        )


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"DROP POLICY IF EXISTS own_rows ON {table}")
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
    op.execute("DROP FUNCTION auth.uid()")
    op.execute("DROP SCHEMA auth")

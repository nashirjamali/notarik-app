from typing import Sequence, Union

from alembic import op

revision: str = "0005_user_name"
down_revision: Union[str, Sequence[str], None] = "0004_features"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable: accounts created before this migration have no name.
    op.execute(
        "ALTER TABLE users ADD COLUMN name text CHECK (char_length(name) <= 80)"
    )
    op.execute("DROP FUNCTION auth.create_user(text, text)")
    op.execute(
        """
        CREATE FUNCTION auth.create_user(
          p_email text,
          p_password_hash text,
          p_name text DEFAULT NULL
        )
        RETURNS uuid
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
          new_id uuid;
        BEGIN
          INSERT INTO users (email, password_hash, name)
          VALUES (
            lower(btrim(p_email)),
            p_password_hash,
            nullif(btrim(p_name), '')
          )
          RETURNING id INTO new_id;
          RETURN new_id;
        EXCEPTION
          WHEN unique_violation THEN
            RETURN NULL;
        END;
        $$
        """
    )
    # app_user cannot read the users table, so the name goes through a
    # definer function that only ever returns the caller's own row.
    op.execute(
        """
        CREATE FUNCTION auth.current_name()
        RETURNS text
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        STABLE
        AS $$
          SELECT name FROM users WHERE id = auth.uid();
        $$
        """
    )
    for name in ("auth.create_user(text, text, text)", "auth.current_name()"):
        op.execute(f"REVOKE ALL ON FUNCTION {name} FROM PUBLIC")
        op.execute(f"GRANT EXECUTE ON FUNCTION {name} TO app_user")


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS auth.current_name()")
    op.execute("DROP FUNCTION IF EXISTS auth.create_user(text, text, text)")
    op.execute(
        """
        CREATE FUNCTION auth.create_user(p_email text, p_password_hash text)
        RETURNS uuid
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
          new_id uuid;
        BEGIN
          INSERT INTO users (email, password_hash)
          VALUES (lower(btrim(p_email)), p_password_hash)
          RETURNING id INTO new_id;
          RETURN new_id;
        EXCEPTION
          WHEN unique_violation THEN
            RETURN NULL;
        END;
        $$
        """
    )
    op.execute("REVOKE ALL ON FUNCTION auth.create_user(text, text) FROM PUBLIC")
    op.execute("GRANT EXECUTE ON FUNCTION auth.create_user(text, text) TO app_user")
    op.execute("ALTER TABLE users DROP COLUMN name")

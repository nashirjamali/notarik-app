from typing import Sequence, Union

from alembic import op

revision: str = "0003_users"
down_revision: Union[str, Sequence[str], None] = "0002_rls"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text NOT NULL UNIQUE,
          password_hash text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE refresh_tokens (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
          token_hash text NOT NULL UNIQUE,
          expires_at timestamptz NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE users FORCE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY own_rows ON users
          USING (id = (select auth.uid()))
          WITH CHECK (id = (select auth.uid()))
        """
    )
    op.execute(
        """
        CREATE POLICY own_rows ON refresh_tokens
          USING (user_id = (select auth.uid()))
          WITH CHECK (user_id = (select auth.uid()))
        """
    )
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
    op.execute(
        """
        CREATE FUNCTION auth.credentials_for_email(p_email text)
        RETURNS TABLE (user_id uuid, password_hash text)
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        STABLE
        AS $$
          SELECT id, users.password_hash
          FROM users
          WHERE email = lower(btrim(p_email));
        $$
        """
    )
    op.execute(
        """
        CREATE FUNCTION auth.store_refresh_token(
          p_user_id uuid,
          p_token_hash text,
          p_expires_at timestamptz
        ) RETURNS void
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        AS $$
          INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
          VALUES (p_user_id, p_token_hash, p_expires_at);
        $$
        """
    )
    op.execute(
        """
        CREATE FUNCTION auth.take_refresh_token(p_token_hash text)
        RETURNS uuid
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
          found_user uuid;
          found_exp timestamptz;
        BEGIN
          DELETE FROM refresh_tokens
          WHERE token_hash = p_token_hash
          RETURNING user_id, expires_at INTO found_user, found_exp;
          IF found_user IS NULL OR found_exp <= now() THEN
            RETURN NULL;
          END IF;
          RETURN found_user;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE FUNCTION auth.revoke_refresh_token(p_token_hash text)
        RETURNS void
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        AS $$
          DELETE FROM refresh_tokens WHERE token_hash = p_token_hash;
        $$
        """
    )
    for name in (
        "auth.create_user(text, text)",
        "auth.credentials_for_email(text)",
        "auth.store_refresh_token(uuid, text, timestamptz)",
        "auth.take_refresh_token(text)",
        "auth.revoke_refresh_token(text)",
    ):
        op.execute(f"REVOKE ALL ON FUNCTION {name} FROM PUBLIC")
        op.execute(f"GRANT EXECUTE ON FUNCTION {name} TO app_user")


def downgrade() -> None:
    for name in (
        "auth.revoke_refresh_token(text)",
        "auth.take_refresh_token(text)",
        "auth.store_refresh_token(uuid, text, timestamptz)",
        "auth.credentials_for_email(text)",
        "auth.create_user(text, text)",
    ):
        op.execute(f"DROP FUNCTION IF EXISTS {name}")
    op.execute("DROP TABLE IF EXISTS refresh_tokens")
    op.execute("DROP TABLE IF EXISTS users")

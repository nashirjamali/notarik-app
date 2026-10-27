from typing import Sequence, Union

from alembic import op

revision: str = "0009_identities"
down_revision: Union[str, Sequence[str], None] = "0008_user_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FUNCTIONS = (
    "auth.user_for_identity(text, text)",
    "auth.user_id_for_email(text)",
    "auth.create_social_user(text, text, text, text)",
    "auth.link_identity(uuid, text, text, text)",
)


def upgrade() -> None:
    # Accounts created with Google have no password.
    op.execute("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL")
    op.execute(
        """
        CREATE TABLE user_identities (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
          provider text NOT NULL,
          provider_subject text NOT NULL,
          email text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (provider, provider_subject)
        )
        """
    )
    op.execute("CREATE INDEX user_identities_user_id_idx ON user_identities (user_id)")
    op.execute("ALTER TABLE user_identities ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE user_identities FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY own_rows ON user_identities
          USING (user_id = (select auth.uid()))
          WITH CHECK (user_id = (select auth.uid()))
        """
    )
    # Sign-in happens before there is a user, so app_user reaches these tables
    # only through definer functions, like the password flow does.
    op.execute(
        """
        CREATE FUNCTION auth.user_for_identity(p_provider text, p_subject text)
        RETURNS uuid
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        STABLE
        AS $$
          SELECT user_id FROM user_identities
          WHERE provider = p_provider AND provider_subject = p_subject;
        $$
        """
    )
    op.execute(
        """
        CREATE FUNCTION auth.user_id_for_email(p_email text)
        RETURNS uuid
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        STABLE
        AS $$
          SELECT id FROM users WHERE email = lower(btrim(p_email));
        $$
        """
    )
    op.execute(
        """
        CREATE FUNCTION auth.link_identity(
          p_user_id uuid,
          p_provider text,
          p_subject text,
          p_email text
        ) RETURNS void
        LANGUAGE sql
        SECURITY DEFINER
        SET search_path = public
        AS $$
          INSERT INTO user_identities (user_id, provider, provider_subject, email)
          VALUES (p_user_id, p_provider, p_subject, lower(btrim(p_email)))
          ON CONFLICT (provider, provider_subject) DO NOTHING;
        $$
        """
    )
    op.execute(
        """
        CREATE FUNCTION auth.create_social_user(
          p_email text,
          p_name text,
          p_provider text,
          p_subject text
        ) RETURNS uuid
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
            NULL,
            left(nullif(btrim(p_name), ''), 80)
          )
          RETURNING id INTO new_id;
          INSERT INTO user_identities (user_id, provider, provider_subject, email)
          VALUES (new_id, p_provider, p_subject, lower(btrim(p_email)));
          RETURN new_id;
        EXCEPTION
          WHEN unique_violation THEN
            RETURN NULL;
        END;
        $$
        """
    )
    for name in FUNCTIONS:
        op.execute(f"REVOKE ALL ON FUNCTION {name} FROM PUBLIC")
        op.execute(f"GRANT EXECUTE ON FUNCTION {name} TO app_user")


def downgrade() -> None:
    for name in reversed(FUNCTIONS):
        op.execute(f"DROP FUNCTION IF EXISTS {name}")
    op.execute("DROP TABLE IF EXISTS user_identities")
    # Accounts without a password cannot exist in the old schema.
    op.execute("DELETE FROM users WHERE password_hash IS NULL")
    op.execute("ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL")

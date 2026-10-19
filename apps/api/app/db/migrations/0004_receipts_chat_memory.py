from typing import Sequence, Union

from alembic import op

revision: str = "0004_features"
down_revision: Union[str, Sequence[str], None] = "0003_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("spending_memory", "chat_threads", "chat_messages", "llm_usage")


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        """
        ALTER TABLE extraction_runs
          ADD COLUMN status text NOT NULL DEFAULT 'needs_review',
          ADD COLUMN draft jsonb,
          ADD COLUMN issues jsonb,
          ADD COLUMN trace jsonb,
          ADD COLUMN image_path text,
          ADD COLUMN attempts integer NOT NULL DEFAULT 0,
          ADD COLUMN content_type text
        """
    )
    op.execute(
        """
        ALTER TABLE extraction_runs
          ADD CONSTRAINT ck_extraction_runs_status
          CHECK (status IN ('needs_review', 'confirmed', 'failed'))
        """
    )
    op.execute(
        """
        CREATE TABLE spending_memory (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL,
          kind text NOT NULL,
          source_id uuid,
          merchant_normalized text,
          text text NOT NULL,
          embedding double precision[] NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT ck_spending_memory_kind CHECK (kind IN ('transaction', 'correction'))
        )
        """
    )
    op.execute(
        "CREATE INDEX ix_spending_memory_user_id ON spending_memory (user_id)"
    )
    op.execute(
        """
        CREATE INDEX ix_spending_memory_merchant
        ON spending_memory USING gin (merchant_normalized gin_trgm_ops)
        """
    )
    op.execute(
        """
        CREATE TABLE chat_threads (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL,
          route text,
          pending_action jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX ix_chat_threads_user_id ON chat_threads (user_id)")
    op.execute(
        """
        CREATE TABLE chat_messages (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          thread_id uuid NOT NULL REFERENCES chat_threads (id) ON DELETE CASCADE,
          user_id uuid NOT NULL,
          role text NOT NULL,
          content text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT ck_chat_messages_role CHECK (role IN ('user', 'assistant'))
        )
        """
    )
    op.execute(
        "CREATE INDEX ix_chat_messages_thread_id ON chat_messages (thread_id)"
    )
    op.execute(
        """
        CREATE TABLE llm_usage (
          user_id uuid NOT NULL,
          day date NOT NULL,
          requests integer NOT NULL DEFAULT 0,
          tokens integer NOT NULL DEFAULT 0,
          PRIMARY KEY (user_id, day),
          CONSTRAINT ck_llm_usage_requests CHECK (requests >= 0),
          CONSTRAINT ck_llm_usage_tokens CHECK (tokens >= 0)
        )
        """
    )
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
    op.execute(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON {', '.join(TABLES)} TO app_user"
    )


def downgrade() -> None:
    op.execute(f"REVOKE ALL ON {', '.join(TABLES)} FROM app_user")
    for table in TABLES:
        op.execute(f"DROP POLICY IF EXISTS own_rows ON {table}")
        op.execute(f"DROP TABLE {table}")
    op.execute(
        """
        ALTER TABLE extraction_runs
          DROP CONSTRAINT ck_extraction_runs_status,
          DROP COLUMN status,
          DROP COLUMN draft,
          DROP COLUMN issues,
          DROP COLUMN trace,
          DROP COLUMN image_path,
          DROP COLUMN attempts,
          DROP COLUMN content_type
        """
    )

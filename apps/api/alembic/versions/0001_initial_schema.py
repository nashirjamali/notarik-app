from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CATEGORIES = "'Groceries', 'Dining', 'Transport', 'Shopping', 'Bills', 'Other'"
SOURCES = "'photo', 'pdf', 'manual', 'chat'"
TABLES = (
    "extraction_runs, transactions, transaction_items, budgets, merchant_memory"
)


def upgrade() -> None:
    op.create_table(
        "extraction_runs",
        sa.Column(
            "id",
            sa.Uuid(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("model", sa.Text(), nullable=False),
        sa.Column("graph_version", sa.Text(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("cost_usd", sa.Numeric(12, 6), nullable=True),
        sa.Column("validator_result", postgresql.JSONB(), nullable=True),
        sa.Column("user_edited_fields", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "latency_ms IS NULL OR latency_ms >= 0",
            name="ck_extraction_runs_latency_ms",
        ),
        sa.CheckConstraint(
            "cost_usd IS NULL OR cost_usd >= 0",
            name="ck_extraction_runs_cost_usd",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_extraction_runs_user_id", "extraction_runs", ["user_id"]
    )

    op.create_table(
        "transactions",
        sa.Column(
            "id",
            sa.Uuid(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("merchant", sa.Text(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("total_minor", sa.BigInteger(), nullable=False),
        sa.Column(
            "currency",
            sa.Text(),
            server_default=sa.text("'IDR'"),
            nullable=False,
        ),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("receipt_image_path", sa.Text(), nullable=True),
        sa.Column("extraction_run_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "total_minor >= 0", name="ck_transactions_total_minor"
        ),
        sa.CheckConstraint(
            f"category IN ({CATEGORIES})", name="ck_transactions_category"
        ),
        sa.CheckConstraint(
            f"source IN ({SOURCES})", name="ck_transactions_source"
        ),
        sa.CheckConstraint("currency = 'IDR'", name="ck_transactions_currency"),
        sa.ForeignKeyConstraint(
            ["extraction_run_id"],
            ["extraction_runs.id"],
            name="fk_transactions_extraction_run_id",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])
    op.create_index(
        "ix_transactions_user_id_date", "transactions", ["user_id", "date"]
    )

    op.create_table(
        "transaction_items",
        sa.Column(
            "id",
            sa.Uuid(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("transaction_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("qty", sa.Numeric(), nullable=True),
        sa.Column("line_total_minor", sa.BigInteger(), nullable=False),
        sa.CheckConstraint(
            "line_total_minor >= 0",
            name="ck_transaction_items_line_total_minor",
        ),
        sa.ForeignKeyConstraint(
            ["transaction_id"],
            ["transactions.id"],
            name="fk_transaction_items_transaction_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_transaction_items_user_id", "transaction_items", ["user_id"]
    )
    op.create_index(
        "ix_transaction_items_transaction_id",
        "transaction_items",
        ["transaction_id"],
    )

    op.create_table(
        "budgets",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("month", sa.Date(), nullable=False),
        sa.Column("total_minor", sa.BigInteger(), nullable=False),
        sa.CheckConstraint("total_minor >= 0", name="ck_budgets_total_minor"),
        sa.CheckConstraint(
            "EXTRACT(DAY FROM month) = 1", name="ck_budgets_month_start"
        ),
        sa.PrimaryKeyConstraint("user_id", "month"),
    )

    op.create_table(
        "merchant_memory",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("merchant_normalized", sa.Text(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column(
            "confirmed_count",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.CheckConstraint(
            f"category IN ({CATEGORIES})", name="ck_merchant_memory_category"
        ),
        sa.CheckConstraint(
            "confirmed_count >= 0", name="ck_merchant_memory_confirmed_count"
        ),
        sa.PrimaryKeyConstraint("user_id", "merchant_normalized"),
    )

    op.execute(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON {TABLES} TO app_user"
    )


def downgrade() -> None:
    op.execute(f"REVOKE ALL ON {TABLES} FROM app_user")
    op.drop_table("merchant_memory")
    op.drop_table("budgets")
    op.drop_table("transaction_items")
    op.drop_table("transactions")
    op.drop_table("extraction_runs")

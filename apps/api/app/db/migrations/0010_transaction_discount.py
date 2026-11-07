from typing import Sequence, Union

from alembic import op

revision: str = "0010_transaction_discount"
down_revision: Union[str, Sequence[str], None] = "0009_identities"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Total of the discounts printed on a receipt, in IDR minor units. total_minor stays the amount actually paid,
    # so every recap and budget keeps working unchanged. RLS on the table already covers the new column.
    op.execute(
        "ALTER TABLE transactions ADD COLUMN discount_minor bigint NOT NULL DEFAULT 0 CHECK (discount_minor >= 0)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE transactions DROP COLUMN discount_minor")

from typing import Sequence, Union

from alembic import op

revision: str = "0006_transaction_note"
down_revision: Union[str, Sequence[str], None] = "0005_user_name"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable free text; existing rows simply have no note. RLS on the table already covers it.
    op.execute(
        "ALTER TABLE transactions ADD COLUMN note text CHECK (char_length(note) <= 500)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE transactions DROP COLUMN note")

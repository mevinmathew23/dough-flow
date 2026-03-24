"""add payment and adjustment transaction types

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-24 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL requires explicit ALTER TYPE to add new enum values.
    # SQLite stores enums as strings, so no migration action is needed there.
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'payment'")
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'adjustment'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an enum type.
    # A full recreation of the enum would be needed for a true downgrade.
    pass

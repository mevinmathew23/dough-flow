"""add positive_means_expense to csv_mappings

Revision ID: c7e2a94f1b83
Revises: f68c31568ad7
Create Date: 2026-04-30 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c7e2a94f1b83'
down_revision: Union[str, None] = 'f68c31568ad7'
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('csv_mappings', sa.Column('positive_means_expense', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('csv_mappings', 'positive_means_expense')

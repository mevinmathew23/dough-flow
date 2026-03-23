"""add currency to users

Revision ID: a1b2c3d4e5f6
Revises: e0f4cf9dcd41
Create Date: 2026-03-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e0f4cf9dcd41'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('currency', sa.String(3), nullable=False, server_default='USD'))


def downgrade() -> None:
    op.drop_column('users', 'currency')

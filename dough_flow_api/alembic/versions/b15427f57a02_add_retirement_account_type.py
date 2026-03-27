"""add retirement account type

Revision ID: b15427f57a02
Revises: f68c31568ad7
Create Date: 2026-03-26 23:35:42.004447
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b15427f57a02'
down_revision: Union[str, None] = 'f68c31568ad7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE accounttype ADD VALUE IF NOT EXISTS 'retirement'")


def downgrade() -> None:
    pass

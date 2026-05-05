"""merge heads

Revision ID: c4d67d5b6c19
Revises: b15427f57a02, c7e2a94f1b83
Create Date: 2026-05-04 21:01:56.062421
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4d67d5b6c19'
down_revision: Union[str, None] = ('b15427f57a02', 'c7e2a94f1b83')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

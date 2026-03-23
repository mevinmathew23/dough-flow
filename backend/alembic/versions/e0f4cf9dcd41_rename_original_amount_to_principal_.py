"""rename original_amount to principal_amount and add compounding_frequency

Revision ID: e0f4cf9dcd41
Revises: 35d85fe0efa6
Create Date: 2026-03-22 23:04:39.683357
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e0f4cf9dcd41'
down_revision: Union[str, None] = '35d85fe0efa6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('debts', 'original_amount', new_column_name='principal_amount')
    compounding_freq = sa.Enum(
        'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY',
        'QUARTERLY', 'SEMIANNUALLY', 'ANNUALLY',
        name='compoundingfrequency',
    )
    compounding_freq.create(op.get_bind(), checkfirst=True)
    op.add_column('debts', sa.Column(
        'compounding_frequency',
        compounding_freq,
        nullable=False,
        server_default='MONTHLY',
    ))


def downgrade() -> None:
    op.drop_column('debts', 'compounding_frequency')
    op.alter_column('debts', 'principal_amount', new_column_name='original_amount')
    op.execute("DROP TYPE IF EXISTS compoundingfrequency")

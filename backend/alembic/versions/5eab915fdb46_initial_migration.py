"""initial migration

Revision ID: 5eab915fdb46
Revises: 
Create Date: 2026-09-14 19:55:08.351049
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5eab915fdb46'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

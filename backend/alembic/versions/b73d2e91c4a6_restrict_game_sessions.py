"""Enable row-level security for game sessions.

Revision ID: b73d2e91c4a6
Revises: a82f14c7d930
Create Date: 2026-10-06

"""
from typing import Sequence, Union

from alembic import op


revision: str = "b73d2e91c4a6"
down_revision: Union[str, None] = "a82f14c7d930"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.execute("ALTER TABLE public.game_sessions DISABLE ROW LEVEL SECURITY")
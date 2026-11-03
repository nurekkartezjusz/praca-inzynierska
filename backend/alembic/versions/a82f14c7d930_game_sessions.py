"""add persistent game sessions

Revision ID: a82f14c7d930
Revises: 6c567eb6f930
Create Date: 2026-10-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a82f14c7d930"
down_revision: Union[str, None] = "6c567eb6f930"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "game_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invitation_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("state", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("phase", sa.String(), nullable=False, server_default="awaiting_roll"),
        sa.Column("resume_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["invitation_id"], ["game_invitations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("invitation_id"),
    )
    op.create_index("ix_game_sessions_id", "game_sessions", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_game_sessions_id", table_name="game_sessions")
    op.drop_table("game_sessions")
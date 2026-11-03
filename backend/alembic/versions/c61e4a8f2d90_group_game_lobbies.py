"""Add shared room references to game invitations.

Revision ID: c61e4a8f2d90
Revises: b73d2e91c4a6
Create Date: 2026-10-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c61e4a8f2d90"
down_revision: Union[str, None] = "b73d2e91c4a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("game_invitations", sa.Column("room_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_game_invitations_room_id",
        "game_invitations",
        "game_invitations",
        ["room_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_game_invitations_room_id", "game_invitations", ["room_id"])


def downgrade() -> None:
    op.drop_index("ix_game_invitations_room_id", table_name="game_invitations")
    op.drop_constraint("fk_game_invitations_room_id", "game_invitations", type_="foreignkey")
    op.drop_column("game_invitations", "room_id")

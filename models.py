from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, UniqueConstraint
from database import Base
from datetime import datetime, timezone
import enum


class FriendshipStatus(enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class GameInvitationStatus(enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    avatar = Column(Text, nullable=True)  # JSON z konfiguracją awatara


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_friendship_pair"),
    )

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    addressee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(FriendshipStatus), default=FriendshipStatus.PENDING)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class GameInvitation(Base):
    __tablename__ = "game_invitations"

    id = Column(Integer, primary_key=True, index=True)
    inviter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invitee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game_type = Column(String, nullable=False)
    status = Column(Enum(GameInvitationStatus), default=GameInvitationStatus.PENDING)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

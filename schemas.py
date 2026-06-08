from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from datetime import datetime
from typing import Literal, Optional


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

    @field_validator("username")
    def username_alphanumeric(cls, v):
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Nazwa użytkownika może zawierać tylko litery, cyfry, _ i -")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    avatar: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


class DeleteAccountRequest(BaseModel):
    password: str


class AvatarUpdate(BaseModel):
    avatar: str


class ProfileUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50)
    email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = Field(None, min_length=6)

    @field_validator("username")
    def username_alphanumeric(cls, v):
        if v and not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Nazwa użytkownika może zawierać tylko litery, cyfry, _ i -")
        return v


class FriendRequest(BaseModel):
    addressee_username: str


class FriendshipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    requester: UserResponse
    addressee: UserResponse
    status: str
    created_at: datetime
    updated_at: datetime


class FriendResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    avatar: str | None = None
    friendship_status: str
    friendship_id: int


VALID_GAME_TYPES = Literal["wielka-studencka-batalla", "kolko-i-krzyzyk", "sudoku"]


class GameInvitationCreate(BaseModel):
    invitee_username: str
    game_type: VALID_GAME_TYPES


class GameInvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    inviter: UserResponse
    invitee: UserResponse
    game_type: str
    status: str
    created_at: datetime

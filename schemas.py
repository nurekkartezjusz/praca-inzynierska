from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    
    @field_validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Nazwa użytkownika może zawierać tylko litery, cyfry, _ i -')
        return v
    
    @field_validator('email')
    def email_valid(cls, v):
        if not v or '@' not in v:
            raise ValueError('Nieprawidłowy adres e-mail')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    avatar: str | None = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


class AvatarUpdate(BaseModel):
    avatar: str  # JSON jako string


class ProfileUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50)
    email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = Field(None, min_length=6)
    
    @field_validator('username')
    def username_alphanumeric(cls, v):
        if v and not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Nazwa użytkownika może zawierać tylko litery, cyfry, _ i -')
        return v


# Schematy dla znajomych
class FriendRequest(BaseModel):
    addressee_username: str  # Nazwa użytkownika osoby, do której wysyłamy zaproszenie


class FriendshipResponse(BaseModel):
    id: int
    requester: UserResponse
    addressee: UserResponse
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FriendResponse(BaseModel):
    id: int
    username: str
    email: str
    avatar: str | None = None
    friendship_status: str
    friendship_id: int

    class Config:
        from_attributes = True


# Schematy dla zaproszeń do gier
class GameInvitationCreate(BaseModel):
    invitee_username: str
    game_type: str  # 'wielka-studencka-batalla', 'kolko-i-krzyzyk', 'sudoku'


class GameInvitationResponse(BaseModel):
    id: int
    inviter: UserResponse
    invitee: UserResponse
    game_type: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

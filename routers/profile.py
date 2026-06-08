import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_password_hash, verify_password
from database import get_db
from dependencies import get_current_user
from models import User
from schemas import AvatarUpdate, DeleteAccountRequest, ProfileUpdate, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["profile"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/avatar")
def update_avatar(
    avatar_data: AvatarUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.avatar = avatar_data.avatar
    db.commit()
    logger.info("Zapisano awatar dla: %s", current_user.email)
    return {"message": "Awatar zapisany pomyślnie"}


@router.put("/profile")
def update_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not profile_data.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Podaj obecne hasło aby dokonać zmian",
        )
    if not verify_password(profile_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nieprawidłowe obecne hasło",
        )

    if profile_data.username and profile_data.username != current_user.username:
        if db.query(User).filter(User.username == profile_data.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ta nazwa użytkownika jest już zajęta",
            )
        current_user.username = profile_data.username

    if profile_data.email and profile_data.email != current_user.email:
        if db.query(User).filter(User.email == profile_data.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ten adres email jest już zajęty",
            )
        current_user.email = profile_data.email

    if profile_data.new_password:
        current_user.hashed_password = get_password_hash(profile_data.new_password)

    db.commit()
    db.refresh(current_user)
    logger.info("Zaktualizowano profil dla: %s", current_user.email)
    return {
        "message": "Profil zaktualizowany pomyślnie",
        "user": UserResponse.model_validate(current_user),
    }


@router.delete("/account")
def delete_account(
    body: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowe hasło",
        )
    username = current_user.username
    email = current_user.email
    db.delete(current_user)
    db.commit()
    logger.info("Usunięto konto: %s (%s)", username, email)
    return {"message": "Konto zostało usunięte pomyślnie"}

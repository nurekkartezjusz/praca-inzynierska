import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    get_password_hash,
    verify_password,
)
from database import get_db
from dependencies import get_current_user
from models import User
from schemas import (
    PasswordReset,
    PasswordResetRequest,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
)

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")

router = APIRouter(tags=["auth"])


def _send_email(to_address: str, subject: str, html_content: str) -> None:
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = BREVO_API_KEY
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_address}],
        sender={"name": "Wielka Studencka Batalia", "email": os.getenv("BREVO_SENDER_EMAIL", "")},
        subject=subject,
        html_content=html_content,
    )
    api_instance.send_transac_email(send_smtp_email)


@router.get("/")
def read_root():
    return {"message": "Wielka Studencka Batalla API"}


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email już zarejestrowany",
        )
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nazwa użytkownika już zajęta",
        )
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info("Zarejestrowano: %s (ID: %s)", new_user.email, new_user.id)
    return new_user


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy email lub hasło",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/verify-token", response_model=UserResponse)
def verify_token(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/password-reset-request")
def request_password_reset(
    reset_request: PasswordResetRequest, db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == reset_request.email).first()
    if not user:
        return {"message": "Jeśli email istnieje w systemie, wysłano link do resetowania hasła"}

    reset_token = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    user.reset_token = reset_token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.commit()

    if BREVO_API_KEY:
        try:
            _send_email(
                to_address=user.email,
                subject="Wielka Studencka Batalia - Kod resetowania hasła",
                html_content=_build_reset_email_html(reset_token),
            )
            logger.info("Email z kodem wysłany do %s", user.email)
            return {
                "message": "Kod resetowania został wysłany na podany adres email",
                "email_sent": True,
            }
        except ApiException as e:
            logger.error("Błąd wysyłania emaila (Brevo): %s", e)
            return {"message": "Błąd wysyłania emaila", "email_sent": False}
    else:
        logger.debug(
            "Reset token dla %s: %s (ważny do: %s)",
            user.email,
            reset_token,
            user.reset_token_expires,
        )
        return {
            "message": "Jeśli email istnieje w systemie, wysłano link do resetowania hasła",
            "email_sent": False,
        }


@router.post("/password-reset")
def reset_password(reset_data: PasswordReset, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == reset_data.token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nieprawidłowy token resetowania",
        )

    token_expires = user.reset_token_expires
    if token_expires.tzinfo is None:
        token_expires = token_expires.replace(tzinfo=timezone.utc)
    if token_expires < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token resetowania wygasł",
        )

    user.hashed_password = get_password_hash(reset_data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    logger.info("Zresetowano hasło dla: %s", user.email)
    return {"message": "Hasło zostało zresetowane pomyślnie"}


def _build_reset_email_html(reset_token: str) -> str:
    return f"""
    <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🎮 Wielka Studencka Batalia</h1>
                </div>
                <div style="padding: 30px;">
                    <h2 style="color: #333; margin-top: 0;">Resetowanie hasła</h2>
                    <p style="color: #666; line-height: 1.6;">Otrzymałeś tę wiadomość, ponieważ zażądano zresetowania hasła do Twojego konta.</p>
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 10px; text-align: center; margin: 25px 0;">
                        <p style="color: white; margin: 0 0 10px 0; font-size: 14px;">Twój kod resetowania:</p>
                        <div style="background-color: white; border-radius: 8px; padding: 15px; display: inline-block;">
                            <h1 style="margin: 0; font-size: 42px; letter-spacing: 8px; color: #667eea; font-weight: bold;">{reset_token}</h1>
                        </div>
                    </div>
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #856404;"><strong>⏰ Kod jest ważny przez 15 minut.</strong></p>
                    </div>
                    <p style="color: #666; line-height: 1.6;">Wpisz ten kod w formularzu resetowania hasła, aby ustawić nowe hasło.</p>
                </div>
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
                    <p style="font-size: 12px; color: #999; margin: 0;">Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
                </div>
            </div>
        </body>
    </html>
    """

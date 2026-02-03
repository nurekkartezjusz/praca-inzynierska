from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone
import secrets
import os
import resend

from database import engine, get_db, Base
from models import User, Friendship, FriendshipStatus
from schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    PasswordResetRequest, PasswordReset, AvatarUpdate, ProfileUpdate,
    FriendRequest, FriendshipResponse, FriendResponse
)
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

# Tworzenie tabel w bazie danych
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Wielka Studencka Batalla - API", version="1.0.0")

# Konfiguracja Resend
resend.api_key = os.getenv("RESEND_API_KEY", "")

# CORS - umożliwić żądania z frontendu
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:3000",
    "http://localhost:5500",
    "http://localhost:5501",
    "http://127.0.0.1",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5501",
    "file://",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Pozwól wszystkim origin podczas developmentu
    allow_credentials=True,
    allow_methods=["*"],  # Pozwól wszystkim metodom
    allow_headers=["*"],  # Pozwól wszystkim nagłówkom
    expose_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Wielka Studencka Batalla API"}


@app.post("/api/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    print("🔍 DEBUG: Otrzymano żądanie rejestracji")
    print(f"🔍 DEBUG: Email: {user_data.email}, Username: {user_data.username}")
    
    # Sprawdzić czy użytkownik już istnieje
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email już zarejestrowany",
        )

    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nazwa użytkownika już zajęta",
        )

    # Haszować hasło i tworzyć nowego użytkownika
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    print(f"✅ Zarejestrowano: {new_user.email} (ID: {new_user.id})")

    return new_user


@app.post("/api/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    # Znaleźć użytkownika po emailu
    user = db.query(User).filter(User.email == user_data.email).first()

    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy email lub hasło",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Tworzyć JWT token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/verify-token")
def verify_token(token: str):
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token",
        )
    return {"email": email}


@app.get("/api/me", response_model=UserResponse)
def get_current_user(token: str, db: Session = Depends(get_db)):
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token",
        )

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony",
        )

    return user


@app.post("/api/password-reset-request")
async def request_password_reset(reset_request: PasswordResetRequest, db: Session = Depends(get_db)):
    """Generuje token resetowania hasła i wysyła email"""
    user = db.query(User).filter(User.email == reset_request.email).first()
    
    # Zawsze zwracamy sukces, żeby nie ujawniać czy email istnieje w bazie
    if not user:
        return {"message": "Jeśli email istnieje w systemie, wysłano link do resetowania hasła"}
    
    # Generuj token resetowania (6-cyfrowy kod)
    reset_token = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    # Token ważny przez 15 minut
    user.reset_token = reset_token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    db.commit()
    
    # Sprawdź, czy Resend API jest skonfigurowany
    if resend.api_key:
        try:
            # Wysyłanie emaila przez Resend
            html_body = f"""
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
            
            params = {
                "from": "Wielka Studencka Batalia <onboarding@resend.dev>",
                "to": [user.email],
                "subject": "Wielka Studencka Batalia - Kod resetowania hasła",
                "html": html_body,
            }
            
            email_response = resend.Emails.send(params)
            print(f"✅ Email z kodem wysłany do {user.email}")
            print(f"   ID emaila: {email_response.get('id')}")
            
            return {
                "message": "Kod resetowania został wysłany na podany adres email",
                "email_sent": True
            }
        except Exception as e:
            print(f"❌ Błąd wysyłania emaila: {e}")
            # Fallback: pokaż token w odpowiedzi
            return {
                "message": "Błąd wysyłania emaila",
                "token": reset_token,
                "email_sent": False
            }
    else:
        # Tryb deweloperski - zwróć token w odpowiedzi
        print(f"🔑 Token resetowania dla {user.email}: {reset_token}")
        print(f"   Ważny do: {user.reset_token_expires}")
        print("⚠️  Email nie skonfigurowany - zwracam token w odpowiedzi")
        
        return {
            "message": "Jeśli email istnieje w systemie, wysłano link do resetowania hasła",
            "token": reset_token,  # TYLKO DLA DEV! Usuń na produkcji
            "email_sent": False
        }


@app.post("/api/password-reset")
def reset_password(reset_data: PasswordReset, db: Session = Depends(get_db)):
    """Resetuje hasło używając tokenu"""
    user = db.query(User).filter(User.reset_token == reset_data.token).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nieprawidłowy token resetowania"
        )
    
    # Sprawdź czy token nie wygasł
    # Konwersja na timezone-aware jeśli jest naive (dla starych rekordów)
    token_expires = user.reset_token_expires
    if token_expires.tzinfo is None:
        token_expires = token_expires.replace(tzinfo=timezone.utc)
    
    if token_expires < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token resetowania wygasł"
        )
    
    # Zmień hasło
    user.hashed_password = get_password_hash(reset_data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    
    db.commit()
    
    print(f"✅ Zresetowano hasło dla: {user.email}")
    
    return {"message": "Hasło zostało zresetowane pomyślnie"}


@app.post("/api/avatar")
def update_avatar(avatar_data: AvatarUpdate, token: str, db: Session = Depends(get_db)):
    """Zapisuje awatar użytkownika"""
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token",
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony",
        )
    
    # Zapisz awatar (JSON jako string)
    user.avatar = avatar_data.avatar
    db.commit()
    
    print(f"✅ Zapisano awatar dla: {user.email}")
    
    return {"message": "Awatar zapisany pomyślnie"}


@app.put("/api/profile")
def update_profile(profile_data: ProfileUpdate, token: str = Query(...), db: Session = Depends(get_db)):
    """Aktualizuje dane profilu użytkownika"""
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token",
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony",
        )
    
    # Weryfikuj obecne hasło jeśli podano jakiekolwiek zmiany
    if profile_data.current_password:
        if not verify_password(profile_data.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nieprawidłowe obecne hasło",
            )
    else:
        # Wymaga hasła do jakichkolwiek zmian
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Podaj obecne hasło aby dokonać zmian",
        )
    
    # Sprawdź czy nowy username nie jest zajęty
    if profile_data.username and profile_data.username != user.username:
        existing_user = db.query(User).filter(User.username == profile_data.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ta nazwa użytkownika jest już zajęta",
            )
        user.username = profile_data.username
    
    # Sprawdź czy nowy email nie jest zajęty
    if profile_data.email and profile_data.email != user.email:
        existing_user = db.query(User).filter(User.email == profile_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ten adres email jest już zajęty",
            )
        user.email = profile_data.email
    
    # Zmień hasło jeśli podano nowe
    if profile_data.new_password:
        user.hashed_password = get_password_hash(profile_data.new_password)
    
    db.commit()
    db.refresh(user)
    
    print(f"✅ Zaktualizowano profil dla: {user.email}")
    
    return {
        "message": "Profil zaktualizowany pomyślnie",
        "user": UserResponse.model_validate(user)
    }


@app.delete("/api/account")
def delete_account(
    token: str = Query(...),
    password: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Usuń konto użytkownika po potwierdzeniu hasła
    """
    # Dekoduj token
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token"
        )
    
    # Pobierz użytkownika
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony"
        )
    
    # Sprawdź hasło
    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowe hasło"
        )
    
    # Usuń użytkownika
    username = user.username
    db.delete(user)
    db.commit()
    
    print(f"🗑️  Usunięto konto: {username} ({email})")
    
    return {
        "message": "Konto zostało usunięte pomyślnie"
    }


# ============================================
# ENDPOINTY DLA ZNAJOMYCH
# ============================================

@app.post("/api/friends/request")
def send_friend_request(
    friend_request: FriendRequest,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Wysyła zaproszenie do znajomych"""
    # Sprawdź token
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token"
        )
    
    # Pobierz użytkownika wysyłającego
    requester = db.query(User).filter(User.email == email).first()
    if not requester:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony"
        )
    
    # Znajdź użytkownika, do którego wysyłamy zaproszenie
    addressee = db.query(User).filter(
        User.username == friend_request.addressee_username
    ).first()
    
    if not addressee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony"
        )
    
    # Nie można zaprosić samego siebie
    if requester.id == addressee.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nie możesz zaprosić samego siebie"
        )
    
    # Sprawdź czy zaproszenie już istnieje
    existing_friendship = db.query(Friendship).filter(
        ((Friendship.requester_id == requester.id) & (Friendship.addressee_id == addressee.id)) |
        ((Friendship.requester_id == addressee.id) & (Friendship.addressee_id == requester.id))
    ).first()
    
    if existing_friendship:
        if existing_friendship.status == FriendshipStatus.ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Już jesteście znajomymi"
            )
        elif existing_friendship.status == FriendshipStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Zaproszenie już zostało wysłane"
            )
    
    # Utwórz nowe zaproszenie
    new_friendship = Friendship(
        requester_id=requester.id,
        addressee_id=addressee.id,
        status=FriendshipStatus.PENDING
    )
    
    db.add(new_friendship)
    db.commit()
    db.refresh(new_friendship)
    
    print(f"✅ Wysłano zaproszenie: {requester.username} -> {addressee.username}")
    
    return {
        "message": f"Wysłano zaproszenie do {addressee.username}",
        "friendship_id": new_friendship.id
    }


@app.get("/api/friends/requests")
def get_friend_requests(
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Pobiera oczekujące zaproszenia do znajomych"""
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony"
        )
    
    # Pobierz zaproszenia skierowane do tego użytkownika
    requests = db.query(Friendship).filter(
        (Friendship.addressee_id == user.id) &
        (Friendship.status == FriendshipStatus.PENDING)
    ).all()
    
    result = []
    for req in requests:
        requester = db.query(User).filter(User.id == req.requester_id).first()
        result.append({
            "friendship_id": req.id,
            "requester": UserResponse.model_validate(requester),
            "created_at": req.created_at
        })
    
    return result


@app.post("/api/friends/accept/{friendship_id}")
def accept_friend_request(
    friendship_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Akceptuje zaproszenie do znajomych"""
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony"
        )
    
    # Pobierz zaproszenie
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zaproszenie nie znalezione"
        )
    
    # Sprawdź czy to zaproszenie jest skierowane do tego użytkownika
    if friendship.addressee_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie możesz zaakceptować tego zaproszenia"
        )
    
    if friendship.status != FriendshipStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To zaproszenie zostało już przetworzone"
        )
    
    # Akceptuj zaproszenie
    friendship.status = FriendshipStatus.ACCEPTED
    friendship.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    requester = db.query(User).filter(User.id == friendship.requester_id).first()
    print(f"✅ Zaakceptowano zaproszenie: {user.username} <-> {requester.username}")
    
    return {
        "message": f"Zaakceptowano zaproszenie od {requester.username}",
        "friend": UserResponse.model_validate(requester)
    }


@app.post("/api/friends/reject/{friendship_id}")
def reject_friend_request(
    friendship_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Odrzuca zaproszenie do znajomych"""
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony"
        )
    
    # Pobierz zaproszenie
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zaproszenie nie znalezione"
        )
    
    # Sprawdź czy to zaproszenie jest skierowane do tego użytkownika
    if friendship.addressee_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie możesz odrzucić tego zaproszenia"
        )
    
    if friendship.status != FriendshipStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To zaproszenie zostało już przetworzone"
        )
    
    # Usuń zaproszenie zamiast zmieniać status
    db.delete(friendship)
    db.commit()
    
    requester = db.query(User).filter(User.id == friendship.requester_id).first()
    print(f"❌ Odrzucono zaproszenie: {user.username} <- {requester.username}")
    
    return {"message": "Odrzucono zaproszenie"}


@app.get("/api/friends")
def get_friends(
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Pobiera listę znajomych"""
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony"
        )
    
    # Pobierz zaakceptowane znajomości
    friendships = db.query(Friendship).filter(
        ((Friendship.requester_id == user.id) | (Friendship.addressee_id == user.id)) &
        (Friendship.status == FriendshipStatus.ACCEPTED)
    ).all()
    
    friends = []
    for friendship in friendships:
        # Znajdź drugiego użytkownika (nie tego zalogowanego)
        friend_id = friendship.addressee_id if friendship.requester_id == user.id else friendship.requester_id
        friend = db.query(User).filter(User.id == friend_id).first()
        
        friends.append({
            "id": friend.id,
            "username": friend.username,
            "email": friend.email,
            "avatar": friend.avatar,
            "friendship_id": friendship.id,
            "friendship_status": "accepted"
        })
    
    return friends


@app.delete("/api/friends/{friendship_id}")
def remove_friend(
    friendship_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Usuwa znajomego"""
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony"
        )
    
    # Pobierz znajomość
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Znajomość nie znaleziona"
        )
    
    # Sprawdź czy użytkownik jest częścią tej znajomości
    if friendship.requester_id != user.id and friendship.addressee_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie możesz usunąć tej znajomości"
        )
    
    # Usuń znajomość
    db.delete(friendship)
    db.commit()
    
    print(f"🗑️  Usunięto znajomość ID: {friendship_id}")
    
    return {"message": "Usunięto znajomego"}


@app.get("/api/users/search")
def search_users(
    query: str = Query(..., min_length=1),
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Wyszukuje użytkowników po nazwie użytkownika"""
    email = decode_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy token"
        )
    
    current_user = db.query(User).filter(User.email == email).first()
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony"
        )
    
    # Wyszukaj użytkowników (max 10 wyników)
    users = db.query(User).filter(
        User.username.ilike(f"%{query}%"),
        User.id != current_user.id  # Nie pokazuj siebie
    ).limit(10).all()
    
    results = []
    for user in users:
        # Sprawdź status znajomości
        friendship = db.query(Friendship).filter(
            ((Friendship.requester_id == current_user.id) & (Friendship.addressee_id == user.id)) |
            ((Friendship.requester_id == user.id) & (Friendship.addressee_id == current_user.id))
        ).first()
        
        friendship_status = "none"
        friendship_id = None
        
        if friendship:
            if friendship.status == FriendshipStatus.ACCEPTED:
                friendship_status = "friends"
            elif friendship.status == FriendshipStatus.PENDING:
                if friendship.requester_id == current_user.id:
                    friendship_status = "pending_sent"
                else:
                    friendship_status = "pending_received"
            friendship_id = friendship.id
        
        results.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatar": user.avatar,
            "friendship_status": friendship_status,
            "friendship_id": friendship_id
        })
    
    return results


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import decode_token
from models import GameInvitation, User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["game_ws"])


class GameRoom:
    def __init__(self):
        # Mapuje user_id -> WebSocket
        self.connections: dict[int, WebSocket] = {}

    def add(self, user_id: int, websocket: WebSocket):
        self.connections[user_id] = websocket

    def remove(self, user_id: int):
        if user_id in self.connections:
            del self.connections[user_id]

    async def broadcast(self, message: dict, exclude_user_id: int = None):
        for user_id, ws in list(self.connections.items()):
            if exclude_user_id is None or user_id != exclude_user_id:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Błąd wysyłania wiadomości do użytkownika {user_id}: {e}")


class ConnectionManager:
    def __init__(self):
        # Mapuje invitation_id -> GameRoom
        self.rooms: dict[int, GameRoom] = {}

    def get_or_create_room(self, invitation_id: int) -> GameRoom:
        if invitation_id not in self.rooms:
            self.rooms[invitation_id] = GameRoom()
        return self.rooms[invitation_id]

    def remove_room_if_empty(self, invitation_id: int):
        if invitation_id in self.rooms and not self.rooms[invitation_id].connections:
            del self.rooms[invitation_id]


manager = ConnectionManager()


@router.websocket("/ws/game/{invitation_id}")
async def websocket_game_endpoint(
    websocket: WebSocket,
    invitation_id: int,
    token: str = Query(...),
):
    # Dekodowanie tokenu
    email = decode_token(token)
    if not email:
        logger.warning(f"WebSocket odrzucony: brak ważnego tokenu dla pokoju {invitation_id}")
        await websocket.close(code=1008)  # Policy violation
        return

    # Pobranie bazy danych
    db = next(get_db())
    user = None
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            logger.warning(f"WebSocket odrzucony: użytkownik o emailu {email} nie znaleziony")
            await websocket.close(code=1008)
            return

        invitation = db.query(GameInvitation).filter(GameInvitation.id == invitation_id).first()
        if not invitation:
            logger.warning(f"WebSocket odrzucony: zaproszenie {invitation_id} nie znalezione")
            await websocket.close(code=1008)
            return

        # Sprawdzenie czy użytkownik bierze udział w tej grze
        if user.id != invitation.inviter_id and user.id != invitation.invitee_id:
            logger.warning(f"WebSocket odrzucony: użytkownik {user.username} nie ma praw do gry {invitation_id}")
            await websocket.close(code=1008)
            return

        # Zaakceptowanie połączenia
        await websocket.accept()

        room = manager.get_or_create_room(invitation_id)
        room.add(user.id, websocket)

        logger.info(f"Użytkownik {user.username} (ID: {user.id}) połączył się z grą {invitation_id}")

        # Określenie oponenta i roli
        opponent_id = invitation.invitee_id if user.id == invitation.inviter_id else invitation.inviter_id
        opponent_user = db.query(User).filter(User.id == opponent_id).first()
        opponent_username = opponent_user.username if opponent_user else "Przeciwnik"
        role = "inviter" if user.id == invitation.inviter_id else "invitee"

        # Wysłanie powitalnej paczki systemowej do podłączającego się gracza
        await websocket.send_json({
            "type": "system",
            "message": f"Połączono z pokojem gry {invitation_id}",
            "role": role,
            "username": user.username,
            "opponent_username": opponent_username,
            "game_type": invitation.game_type
        })

        # Powiadomienie drugiego gracza (jeśli jest już połączony) o wejściu oponenta
        await room.broadcast({
            "type": "player_joined",
            "username": user.username,
            "role": role
        }, exclude_user_id=user.id)

        # Główna pętla odbierania wiadomości
        while True:
            data = await websocket.receive_json()
            # Przesyłamy każdą wiadomość z payloadem do drugiego gracza
            await room.broadcast({
                "type": "game_action",
                "sender_id": user.id,
                "sender_username": user.username,
                "sender_role": role,
                "payload": data
            }, exclude_user_id=user.id)

    except WebSocketDisconnect:
        if user:
            logger.info(f"Użytkownik {user.username} rozłączony z gry {invitation_id}")
            room = manager.get_or_create_room(invitation_id)
            room.remove(user.id)
            role = "inviter" if user.id == invitation.inviter_id else "invitee"
            await room.broadcast({
                "type": "player_left",
                "username": user.username,
                "role": role
            }, exclude_user_id=user.id)
            manager.remove_room_if_empty(invitation_id)
    except Exception as e:
        username_str = user.username if user else "nieznany"
        logger.error(f"Błąd WebSocket dla użytkownika {username_str} w grze {invitation_id}: {e}")
    finally:
        db.close()

import asyncio
import logging
import random
import secrets
from types import SimpleNamespace
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from database import get_db
from auth import decode_token
from game import bot, engine, rules, service
from game.common import IllegalAction
from models import GameInvitation, GameInvitationStatus, User, GameSession

logger = logging.getLogger(__name__)

router = APIRouter(tags=["game_ws"])


class GameRoom:
    def __init__(self):
        # Mapuje user_id -> WebSocket
        self.connections: dict[int, WebSocket] = {}
        # Mapuje user_id -> ostatnia akcja "select_class" (odtwarzana graczowi dołączającemu później)
        self.last_class_selection: dict[int, dict] = {}
        # Akcje w jednym pokoju wykonują się po kolei
        self.lock = asyncio.Lock()

    def add(self, user_id: int, websocket: WebSocket):
        self.connections[user_id] = websocket

    def remove(self, user_id: int, websocket: WebSocket) -> bool:
        if self.connections.get(user_id) is websocket:
            del self.connections[user_id]
            return True
        return False

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


def prepare_game_start(
    db: Session, room: GameRoom, room_id: int, user: User, host_id: int, player_user_ids: list[int]
):
    """Zwraca (sesja, utworzona_teraz, błąd); istniejącą sesję zwraca bez tworzenia nowej."""
    if user.id != host_id:
        return None, False, "Tylko gospodarz może uruchomić grę"
    existing = service.get_session(db, room_id)
    if existing is not None:
        return existing, False, None
    if not rules.MIN_PLAYERS <= len(player_user_ids) <= rules.MAX_PLAYERS:
        return None, False, "Do rozpoczęcia potrzeba od 2 do 4 graczy"
    if any(player_user_id not in room.last_class_selection for player_user_id in player_user_ids):
        return None, False, "Każdy gracz musi wybrać klasę"
    users = {row.id: row for row in db.query(User).filter(User.id.in_(player_user_ids)).all()}
    players = [
        {
            "user_id": player_user_id,
            "name": users[player_user_id].username,
            "klass": room.last_class_selection[player_user_id]["class"],
        }
        for player_user_id in player_user_ids
    ]
    return service.start_game(db, room_id, players), True, None


@router.websocket("/ws/game/{invitation_id}")
async def websocket_game_endpoint(
    websocket: WebSocket,
    invitation_id: int,
    token: str = Query(...),
):
    logger.info(f"WebSocket połączenie przychodzące: invitation_id={invitation_id}")
    # Dekodowanie tokenu
    email = decode_token(token)
    if not email:
        logger.warning(f"WebSocket odrzucony: brak ważnego tokenu dla pokoju {invitation_id}")
        await websocket.close(code=1008)  # Policy violation
        return

    # Pobranie bazy danych
    db = next(get_db())
    user = None
    room = None
    room_id = None
    role = None
    player_id = None
    try:
        logger.info(f"Krok 1: Szukam użytkownika z emailem {email}")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            logger.warning(f"WebSocket odrzucony: użytkownik o emailu {email} nie znaleziony")
            await websocket.close(code=1008)
            return
        logger.info(f"Krok 2: Znaleziono użytkownika {user.username} (ID: {user.id})")

        logger.info(f"Krok 3: Szukam zaproszenia {invitation_id}")
        invitation = db.query(GameInvitation).filter(GameInvitation.id == invitation_id).first()
        if not invitation:
            logger.warning(f"WebSocket odrzucony: zaproszenie {invitation_id} nie znalezione")
            await websocket.close(code=1008)
            return
        logger.info(f"Krok 4: Znaleziono zaproszenie, room_id będzie: {invitation.room_id or invitation.id}")

        room_id = invitation.room_id or invitation.id
        logger.info(f"Krok 5: Szukam zaproszenia pokoju {room_id}")
        room_invitation = db.query(GameInvitation).filter(GameInvitation.id == room_id).first()
        if room_invitation is None:
            logger.error(f"Błąd: room_invitation None dla room_id={room_id}")
            await websocket.close(code=1008)
            return
        logger.info(f"Krok 6: Szukam zaakceptowanych zaproszeń dla pokoju {room_id}")
        accepted_invitations = db.query(GameInvitation).filter(
            or_(GameInvitation.id == room_id, GameInvitation.room_id == room_id),
            GameInvitation.status == GameInvitationStatus.ACCEPTED,
        ).order_by(GameInvitation.updated_at.asc(), GameInvitation.id.asc()).all()
        logger.info(f"Krok 7: Znaleziono {len(accepted_invitations)} zaakceptowanych zaproszeń")
        player_user_ids = [room_invitation.inviter_id] + [item.invitee_id for item in accepted_invitations]
        logger.info(f"Krok 8: User IDs w pokoju: {player_user_ids}, user.id={user.id}")
        if user.id not in player_user_ids:
            logger.warning(f"WebSocket odrzucony: użytkownik {user.username} nie ma praw do gry {invitation_id}")
            await websocket.close(code=1008)
            return
        logger.info(f"Krok 9: Użytkownik ma prawo dostępu!")

        # Zaakceptowanie połączenia
        logger.info(f"Krok 10: Akceptuję WebSocket dla użytkownika {user.username} w grze {invitation_id}")
        await websocket.accept()
        logger.info(f"Krok 11: WebSocket zaakceptowany!")

        room = manager.get_or_create_room(room_id)
        room.add(user.id, websocket)

        logger.info(f"Użytkownik {user.username} (ID: {user.id}) połączył się z grą {invitation_id}")

        # Określenie oponenta i roli
        role = "inviter" if user.id == room_invitation.inviter_id else "invitee"
        player_id = player_user_ids.index(user.id)
        player_rows = db.query(User).filter(User.id.in_(player_user_ids)).all()
        user_by_id = {player.id: player for player in player_rows}
        players = [
            {
                "id": index,
                "user_id": user_id,
                "username": user_by_id[user_id].username,
                "avatar": user_by_id[user_id].avatar,
            }
            for index, user_id in enumerate(player_user_ids)
        ]
        saved_session = (
            db.query(GameSession)
            .filter(GameSession.invitation_id == room_id)
            .first()
        )

        # Wysłanie powitalnej paczki systemowej do podłączającego się gracza
        system_message = {
            "type": "system",
            "message": f"Połączono z pokojem gry {invitation_id}",
            "role": role,
            "username": user.username,
            "opponent_username": next((player["username"] for player in players if player["id"] != player_id), "Gracz"),
            "game_type": invitation.game_type,
            "has_saved_session": saved_session is not None,
            "room_id": room_id,
            "player_id": player_id,
            "players": players,
            "host_id": room_invitation.inviter_id,
        }
        logger.info(f"Wysyłam system message do {user.username}: {system_message}")
        await websocket.send_json(system_message)

        if saved_session:
            await websocket.send_json(service.state_message(saved_session))

        # Restore first so a replayed class selection cannot initialize over a saved game.
        for other_id, action in room.last_class_selection.items():
            if other_id != user.id:
                other_player_id = player_user_ids.index(other_id) if other_id in player_user_ids else -1
                await websocket.send_json({
                    "type": "game_action",
                    "sender_id": other_id,
                    "sender_player_id": other_player_id,
                    "payload": action
                })

        # Powiadomienie drugiego gracza (jeśli jest już połączony) o wejściu oponenta
        await room.broadcast({
            "type": "player_joined",
            "username": user.username,
            "role": role,
            "player_id": player_id,
            "players": players,
        }, exclude_user_id=user.id)

        # Główna pętla odbierania wiadomości
        while True:
            data = await websocket.receive_json()
            if not isinstance(data, dict):
                await websocket.send_json({"type": "error", "message": "Nieprawidłowa wiadomość"})
                continue
            message_type = data.get("type")
            accepted_invitations = db.query(GameInvitation).filter(
                or_(GameInvitation.id == room_id, GameInvitation.room_id == room_id),
                GameInvitation.status == GameInvitationStatus.ACCEPTED,
            ).order_by(GameInvitation.updated_at.asc(), GameInvitation.id.asc()).all()
            player_user_ids = [room_invitation.inviter_id] + [item.invitee_id for item in accepted_invitations]
            if user.id not in player_user_ids:
                await websocket.close(code=1008)
                break
            player_id = player_user_ids.index(user.id)

            if message_type == "select_class":
                if data.get("class") not in rules.CLASS_STATS:
                    await websocket.send_json({"type": "error", "message": "Nieprawidłowy wybór klasy"})
                    continue
                # Zapamiętaj wybór, żeby odtworzyć go graczowi dołączającemu później
                room.last_class_selection[user.id] = data
                await room.broadcast({
                    "type": "game_action",
                    "sender_id": user.id,
                    "sender_username": user.username,
                    "sender_role": role,
                    "sender_player_id": player_id,
                    "payload": data,
                }, exclude_user_id=user.id)
            elif message_type == "game_init":
                async with room.lock:
                    session, created, error = prepare_game_start(
                        db, room, room_id, user, room_invitation.inviter_id, player_user_ids
                    )
                    if error:
                        await websocket.send_json({"type": "error", "message": error})
                    elif created:
                        await room.broadcast(service.state_message(session))
                    else:
                        await websocket.send_json(service.state_message(session))
            elif message_type in engine.ACTION_TYPES:
                async with room.lock:
                    try:
                        session, events = service.apply_action(db, room_id, user.id, data)
                    except IllegalAction as error:
                        await websocket.send_json({"type": "error", "message": str(error)})
                        continue
                    await room.broadcast(service.state_message(session, events))
            else:
                await websocket.send_json({"type": "error", "message": "Nieznana akcja"})

    except WebSocketDisconnect:
        if user:
            logger.info(f"Użytkownik {user.username} rozłączony z gry {invitation_id}")
    except Exception:
        username_str = user.username if user else "nieznany"
        logger.exception(f"Błąd WebSocket dla użytkownika {username_str} w grze {invitation_id}")
    finally:
        if room is not None and user is not None and room.remove(user.id, websocket):
            await room.broadcast({
                "type": "player_left",
                "username": user.username,
                "role": role,
                "player_id": player_id,
            }, exclude_user_id=user.id)
            manager.remove_room_if_empty(room_id)
        db.close()


@router.websocket("/ws/bot")
async def websocket_bot_endpoint(websocket: WebSocket, token: str | None = Query(default=None)):
    email = decode_token(token) if token else None
    if token and not email:
        await websocket.close(code=1008)
        return

    db = next(get_db()) if email else None
    try:
        user = db.query(User).filter(User.email == email).first() if db else None
        if email and user is None:
            await websocket.close(code=1008)
            return
        await websocket.accept()
        start = await websocket.receive_json()
        if (
            not isinstance(start, dict)
            or start.get("type") != "bot_init"
            or start.get("class") not in rules.CLASS_STATS
        ):
            await websocket.send_json({"type": "error", "message": "Nieprawidłowe rozpoczęcie gry"})
            await websocket.close(code=1008)
            return

        rng = random.Random(secrets.randbits(128))
        bot_class = rng.choice(tuple(rules.CLASS_STATS))
        initial = engine.new_game([
            {
                "user_id": user.id if user else None,
                "name": user.username if user else (start.get("username") or "Gracz"),
                "klass": start["class"],
            },
            {"user_id": None, "name": "Bot", "klass": bot_class},
        ])
        state = initial.state
        phase = initial.phase
        resume = initial.resume
        version = 1
        session = SimpleNamespace(
            invitation_id=0,
            state=state,
            phase=phase,
            resume_data=resume,
            version=version,
        )
        await websocket.send_json(service.state_message(session))

        while True:
            action = await websocket.receive_json()
            if not isinstance(action, dict) or action.get("type") not in engine.ACTION_TYPES:
                await websocket.send_json({"type": "error", "message": "Nieznana akcja"})
                continue
            try:
                result = engine.apply(state, phase, action, player_id=0, rng=rng, resume=resume)
            except IllegalAction as error:
                await websocket.send_json({"type": "error", "message": str(error)})
                continue

            state, phase, resume = result.state, result.phase, result.resume
            events = list(result.events)
            version += 1
            if not state.get("gameOver") and state["turn"] == 1:
                state, phase, resume, bot_events = bot.play_until_human_turn(
                    state, phase, resume, bot_player_id=1, rng=rng
                )
                events.extend(bot_events)
                version += len(bot_events)

            session.state = state
            session.phase = phase
            session.resume_data = resume
            session.version = version
            await websocket.send_json(service.state_message(session, events))
    except WebSocketDisconnect:
        logger.info("Użytkownik %s rozłączył się z grą z botem", email or "gość")
    except Exception:
        logger.exception("Błąd WebSocket w grze z botem użytkownika %s", email or "gość")
    finally:
        if db:
            db.close()

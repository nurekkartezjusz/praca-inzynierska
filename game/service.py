"""Trwałość gry: odczyt i zapis GameSession oraz wiadomości dla klientów."""

import logging

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from game import engine, fields
from game.common import FINISHED, IllegalAction
from models import GameSession

logger = logging.getLogger(__name__)


def get_session(db: Session, room_id: int, for_update: bool = False) -> GameSession | None:
    # populate_existing: sesja DB żyje tak długo jak połączenie WebSocket i inaczej zwracałaby nieaktualne dane.
    query = db.query(GameSession).filter(GameSession.invitation_id == room_id).populate_existing()
    if for_update:
        query = query.with_for_update()
    return query.first()


def state_message(session: GameSession, events: list[dict] | None = None) -> dict:
    try:
        resume = fields.public_resume(session.phase, session.resume_data)
    except (KeyError, TypeError, IndexError):
        logger.warning("Nie można odczytać danych wznowienia gry %s", session.invitation_id)
        resume = {}
    return {
        "type": "game_state",
        "state": session.state,
        "phase": session.phase,
        "resume": resume,
        "version": session.version,
        "events": events or [],
    }


def start_game(db: Session, room_id: int, players: list[dict]) -> GameSession:
    result = engine.new_game(players)
    session = GameSession(
        invitation_id=room_id,
        state=result.state,
        phase=result.phase,
        resume_data=result.resume,
        status="active",
        version=1,
    )
    db.add(session)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return get_session(db, room_id)
    db.refresh(session)
    return session


def apply_action(db: Session, room_id: int, user_id: int, action: dict) -> tuple[GameSession, list[dict]]:
    """Stosuje akcję gracza pod blokadą wiersza; rzuca IllegalAction, gdy jest niedozwolona."""
    session = get_session(db, room_id, for_update=True)
    try:
        if session is None:
            raise IllegalAction("Gra nie została rozpoczęta")
        player_id = next(
            (player["id"] for player in session.state["players"] if player["user_id"] == user_id), None
        )
        if player_id is None:
            raise IllegalAction("Nie uczestniczysz w tej grze")
        try:
            result = engine.apply(session.state, session.phase, action, player_id, resume=session.resume_data)
        except (KeyError, TypeError, IndexError):
            logger.exception("Zapis gry %s jest niezgodny z silnikiem", room_id)
            raise IllegalAction("Zapis gry jest niezgodny z obecną wersją gry")

        session.state = result.state
        session.phase = result.phase
        session.resume_data = result.resume
        session.status = "finished" if result.phase == FINISHED else "active"
        session.version += 1
        db.commit()
    except BaseException:
        db.rollback()
        raise
    db.refresh(session)
    return session, result.events

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, aliased

from database import get_db
from dependencies import get_current_user
from models import Friendship, FriendshipStatus, GameInvitation, GameInvitationStatus, GameSession, User
from schemas import GameInvitationCreate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["game_invitations"])


def get_room_root(db: Session, room_id: int) -> GameInvitation:
    invitation = db.query(GameInvitation).filter(GameInvitation.id == room_id).first()
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pokój gry nie znaleziony")
    if invitation.room_id is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID musi wskazywać główne zaproszenie pokoju")
    return invitation


@router.get("/game-sessions/resumable")
def get_resumable_game(
    invitation_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    MemberInvitation = aliased(GameInvitation)
    room_membership = db.query(MemberInvitation.id).filter(
        MemberInvitation.room_id == GameInvitation.id,
        MemberInvitation.invitee_id == current_user.id,
        MemberInvitation.status == GameInvitationStatus.ACCEPTED,
    ).exists()
    sessions = (
        db.query(GameInvitation, GameSession)
        .join(GameSession, GameSession.invitation_id == GameInvitation.id)
        .filter(
            or_(
                GameInvitation.inviter_id == current_user.id,
                GameInvitation.invitee_id == current_user.id,
                room_membership,
            ),
            GameInvitation.status == GameInvitationStatus.ACCEPTED,
            GameSession.status == "active",
        )
        .order_by(GameSession.updated_at.desc())
    )
    if invitation_id is not None:
        sessions = sessions.filter(GameInvitation.id == invitation_id)
    sessions = sessions.all()
    for invitation, session in sessions:
        if not session.state.get("gameOver") and session.phase != "finished":
            return {"invitation_id": invitation.id}
    return {"invitation_id": None}


@router.post("/game-invitations/send")
def send_game_invitation(
    invitation: GameInvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invitee = db.query(User).filter(User.username == invitation.invitee_username).first()
    if not invitee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony",
        )

    friendship = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) & (Friendship.addressee_id == invitee.id))
        | ((Friendship.requester_id == invitee.id) & (Friendship.addressee_id == current_user.id))
    ).first()
    if not friendship or friendship.status != FriendshipStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Możesz zapraszać tylko znajomych",
        )

    existing = db.query(GameInvitation).filter(
        GameInvitation.inviter_id == current_user.id,
        GameInvitation.invitee_id == invitee.id,
        GameInvitation.status == GameInvitationStatus.PENDING,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Masz już aktywne zaproszenie do tego użytkownika",
        )

    new_invitation = GameInvitation(
        inviter_id=current_user.id,
        invitee_id=invitee.id,
        game_type=invitation.game_type,
        status=GameInvitationStatus.PENDING,
    )
    db.add(new_invitation)
    db.commit()
    db.refresh(new_invitation)
    logger.info(
        "Zaproszenie do gry: %s -> %s (%s)",
        current_user.username,
        invitee.username,
        invitation.game_type,
    )
    return {
        "message": f"Zaproszenie do gry wysłane do {invitee.username}",
        "invitation_id": new_invitation.id,
        "room_id": new_invitation.id,
    }


@router.post("/game-rooms/{room_id}/invite")
def invite_to_game_room(
    room_id: int,
    invitation: GameInvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = get_room_root(db, room_id)
    if room.inviter_id != current_user.id or room.game_type != "wielka-studencka-batalla":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tylko gospodarz może zapraszać do tego pokoju")

    session = db.query(GameSession).filter(GameSession.invitation_id == room_id).first()
    if session is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Gra już się rozpoczęła")

    invitee = db.query(User).filter(User.username == invitation.invitee_username).first()
    if invitee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Użytkownik nie znaleziony")
    if invitee.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nie możesz zaprosić siebie")

    friendship = db.query(Friendship).filter(
        or_(
            (Friendship.requester_id == current_user.id) & (Friendship.addressee_id == invitee.id),
            (Friendship.requester_id == invitee.id) & (Friendship.addressee_id == current_user.id),
        ),
        Friendship.status == FriendshipStatus.ACCEPTED,
    ).first()
    if friendship is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Możesz zapraszać tylko znajomych")

    members = db.query(GameInvitation).filter(
        or_(GameInvitation.id == room_id, GameInvitation.room_id == room_id),
        GameInvitation.status.in_([GameInvitationStatus.PENDING, GameInvitationStatus.ACCEPTED]),
    ).all()
    if any(member.invitee_id == invitee.id for member in members) or invitee.id == room.inviter_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ten użytkownik już należy do pokoju")
    if len(members) >= 3:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Pokój może mieć maksymalnie 4 graczy")

    child_invitation = GameInvitation(
        inviter_id=current_user.id,
        invitee_id=invitee.id,
        room_id=room_id,
        game_type=room.game_type,
        status=GameInvitationStatus.PENDING,
    )
    db.add(child_invitation)
    db.commit()
    db.refresh(child_invitation)
    return {"message": f"Zaproszenie wysłane do {invitee.username}", "invitation_id": child_invitation.id, "room_id": room_id}


@router.get("/game-invitations/received")
def get_received_game_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    InviterAlias = aliased(User)
    rows = (
        db.query(GameInvitation, InviterAlias)
        .join(InviterAlias, GameInvitation.inviter_id == InviterAlias.id)
        .filter(
            GameInvitation.invitee_id == current_user.id,
            GameInvitation.status == GameInvitationStatus.PENDING,
        )
        .order_by(GameInvitation.created_at.desc())
        .all()
    )
    return [
        {
            "id": inv.id,
            "inviter": {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "avatar": u.avatar,
            },
            "game_type": inv.game_type,
            "status": inv.status.value,
            "created_at": inv.created_at,
            "room_id": inv.room_id or inv.id,
        }
        for inv, u in rows
    ]


@router.post("/game-invitations/accept/{invitation_id}")
def accept_game_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invitation = db.query(GameInvitation).filter(GameInvitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zaproszenie nie znalezione",
        )
    if invitation.invitee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="To nie Twoje zaproszenie",
        )
    if invitation.status != GameInvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zaproszenie nie jest już aktywne",
        )

    invitation.status = GameInvitationStatus.ACCEPTED
    invitation.updated_at = datetime.now(timezone.utc)
    db.commit()

    inviter = db.query(User).filter(User.id == invitation.inviter_id).first()
    logger.info(
        "Zaproszenie zaakceptowane: %s zaakceptował zaproszenie od %s",
        current_user.username,
        inviter.username,
    )
    return {
        "message": "Zaproszenie zaakceptowane",
        "game_type": invitation.game_type,
        "inviter": inviter.username,
        "room_id": invitation.room_id or invitation.id,
    }


@router.post("/game-invitations/decline/{invitation_id}")
def decline_game_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invitation = db.query(GameInvitation).filter(GameInvitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zaproszenie nie znalezione",
        )
    if invitation.invitee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="To nie Twoje zaproszenie",
        )

    invitation.status = GameInvitationStatus.DECLINED
    invitation.updated_at = datetime.now(timezone.utc)
    db.commit()
    logger.info("Zaproszenie odrzucone przez: %s", current_user.username)
    return {"message": "Zaproszenie odrzucone"}


@router.get("/game-invitations/status/{invitation_id}")
def get_game_invitation_status(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sprawdź status zaproszenia (dostępne dla obu stron: zapraszającego i zaproszonego)."""
    invitation = db.query(GameInvitation).filter(GameInvitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zaproszenie nie znalezione")
    if invitation.inviter_id != current_user.id and invitation.invitee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Brak dostępu do tego zaproszenia")

    invitee = db.query(User).filter(User.id == invitation.invitee_id).first()
    inviter = db.query(User).filter(User.id == invitation.inviter_id).first()
    return {
        "id": invitation.id,
        "room_id": invitation.room_id or invitation.id,
        "status": invitation.status.value,
        "game_type": invitation.game_type,
        "inviter_username": inviter.username if inviter else None,
        "invitee_username": invitee.username if invitee else None,
    }


@router.post("/game-invitations/cancel/{invitation_id}")
def cancel_game_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Anuluj wysłane zaproszenie (tylko zapraszający)."""
    invitation = db.query(GameInvitation).filter(GameInvitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zaproszenie nie znalezione")
    if invitation.inviter_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Możesz anulować tylko własne zaproszenia")
    if invitation.status != GameInvitationStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Zaproszenie nie jest już aktywne")

    invitation.status = GameInvitationStatus.EXPIRED
    invitation.updated_at = datetime.now(timezone.utc)
    db.commit()
    logger.info("Zaproszenie anulowane przez: %s", current_user.username)
    return {"message": "Zaproszenie anulowane"}


@router.get("/game-invitations/my-pending")
def get_my_pending_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Zwraca aktywne (PENDING) zaproszenia wysłane przez zalogowanego użytkownika."""
    InviteeAlias = aliased(User)
    rows = (
        db.query(GameInvitation, InviteeAlias)
        .join(InviteeAlias, GameInvitation.invitee_id == InviteeAlias.id)
        .filter(
            GameInvitation.inviter_id == current_user.id,
            GameInvitation.status == GameInvitationStatus.PENDING,
        )
        .order_by(GameInvitation.created_at.desc())
        .all()
    )
    return [
        {
            "id": inv.id,
            "room_id": inv.room_id or inv.id,
            "game_type": inv.game_type,
            "invitee_username": u.username,
            "created_at": inv.created_at,
        }
        for inv, u in rows
    ]


@router.get("/game-rooms/{room_id}")
def get_game_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    room = get_room_root(db, room_id)
    invitations = db.query(GameInvitation, User).join(
        User, User.id == GameInvitation.invitee_id
    ).filter(
        or_(GameInvitation.id == room_id, GameInvitation.room_id == room_id),
        GameInvitation.status.in_([GameInvitationStatus.PENDING, GameInvitationStatus.ACCEPTED]),
    ).order_by(GameInvitation.updated_at.asc(), GameInvitation.id.asc()).all()
    is_host = current_user.id == room.inviter_id
    is_member = any(inv.invitee_id == current_user.id for inv, _ in invitations)
    if not is_host and not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nie należysz do tego pokoju")

    host = db.query(User).filter(User.id == room.inviter_id).first()
    players = [{"id": 0, "user_id": room.inviter_id, "username": host.username, "status": "accepted"}]
    for invitation_row, user in invitations:
        if invitation_row.status == GameInvitationStatus.ACCEPTED:
            players.append({"id": len(players), "user_id": user.id, "username": user.username, "status": "accepted"})

    pending = [
        {"user_id": user.id, "username": user.username, "status": "pending"}
        for invitation_row, user in invitations
        if invitation_row.status == GameInvitationStatus.PENDING
    ]
    session = db.query(GameSession).filter(GameSession.invitation_id == room_id).first()
    return {
        "room_id": room_id,
        "host_id": room.inviter_id,
        "players": players,
        "pending": pending,
        "started": session is not None,
        "can_start": len(players) >= 2 and session is None,
    }

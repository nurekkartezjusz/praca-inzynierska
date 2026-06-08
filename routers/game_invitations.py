import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, aliased

from database import get_db
from dependencies import get_current_user
from models import Friendship, FriendshipStatus, GameInvitation, GameInvitationStatus, User
from schemas import GameInvitationCreate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["game_invitations"])


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
    }


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

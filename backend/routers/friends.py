import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, aliased

from database import get_db
from dependencies import get_current_user
from models import Friendship, FriendshipStatus, User
from schemas import FriendRequest, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["friends"])


@router.post("/friends/request")
def send_friend_request(
    friend_request: FriendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    addressee = db.query(User).filter(
        User.username == friend_request.addressee_username
    ).first()
    if not addressee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie znaleziony",
        )
    if current_user.id == addressee.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nie możesz zaprosić samego siebie",
        )

    existing = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) & (Friendship.addressee_id == addressee.id))
        | ((Friendship.requester_id == addressee.id) & (Friendship.addressee_id == current_user.id))
    ).first()

    if existing:
        if existing.status == FriendshipStatus.ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Już jesteście znajomymi",
            )
        elif existing.status == FriendshipStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Zaproszenie już zostało wysłane",
            )

    new_friendship = Friendship(
        requester_id=current_user.id,
        addressee_id=addressee.id,
        status=FriendshipStatus.PENDING,
    )
    db.add(new_friendship)
    db.commit()
    db.refresh(new_friendship)
    logger.info("Wysłano zaproszenie: %s -> %s", current_user.username, addressee.username)
    return {
        "message": f"Wysłano zaproszenie do {addressee.username}",
        "friendship_id": new_friendship.id,
    }


@router.get("/friends/requests")
def get_friend_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    RequesterAlias = aliased(User)
    rows = (
        db.query(Friendship, RequesterAlias)
        .join(RequesterAlias, Friendship.requester_id == RequesterAlias.id)
        .filter(
            Friendship.addressee_id == current_user.id,
            Friendship.status == FriendshipStatus.PENDING,
        )
        .all()
    )
    return [
        {
            "friendship_id": f.id,
            "requester": UserResponse.model_validate(u),
            "created_at": f.created_at,
        }
        for f, u in rows
    ]


@router.post("/friends/accept/{friendship_id}")
def accept_friend_request(
    friendship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zaproszenie nie znalezione",
        )
    if friendship.addressee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie możesz zaakceptować tego zaproszenia",
        )
    if friendship.status != FriendshipStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To zaproszenie zostało już przetworzone",
        )

    friendship.status = FriendshipStatus.ACCEPTED
    friendship.updated_at = datetime.now(timezone.utc)
    db.commit()

    requester = db.query(User).filter(User.id == friendship.requester_id).first()
    logger.info(
        "Zaakceptowano zaproszenie: %s <-> %s", current_user.username, requester.username
    )
    return {
        "message": f"Zaakceptowano zaproszenie od {requester.username}",
        "friend": UserResponse.model_validate(requester),
    }


@router.post("/friends/reject/{friendship_id}")
def reject_friend_request(
    friendship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zaproszenie nie znalezione",
        )
    if friendship.addressee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie możesz odrzucić tego zaproszenia",
        )
    if friendship.status != FriendshipStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To zaproszenie zostało już przetworzone",
        )

    requester_id = friendship.requester_id
    db.delete(friendship)
    db.commit()

    requester = db.query(User).filter(User.id == requester_id).first()
    logger.info(
        "Odrzucono zaproszenie: %s <- %s",
        current_user.username,
        requester.username if requester else requester_id,
    )
    return {"message": "Odrzucono zaproszenie"}


@router.get("/friends")
def get_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    FriendAlias = aliased(User)

    sent = (
        db.query(Friendship, FriendAlias)
        .join(FriendAlias, Friendship.addressee_id == FriendAlias.id)
        .filter(
            Friendship.requester_id == current_user.id,
            Friendship.status == FriendshipStatus.ACCEPTED,
        )
        .all()
    )
    received = (
        db.query(Friendship, FriendAlias)
        .join(FriendAlias, Friendship.requester_id == FriendAlias.id)
        .filter(
            Friendship.addressee_id == current_user.id,
            Friendship.status == FriendshipStatus.ACCEPTED,
        )
        .all()
    )

    return [
        {
            "id": friend.id,
            "username": friend.username,
            "email": friend.email,
            "avatar": friend.avatar,
            "friendship_id": friendship.id,
            "friendship_status": "accepted",
        }
        for friendship, friend in sent + received
    ]


@router.delete("/friends/{friendship_id}")
def remove_friend(
    friendship_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Znajomość nie znaleziona",
        )
    if friendship.requester_id != current_user.id and friendship.addressee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie możesz usunąć tej znajomości",
        )
    db.delete(friendship)
    db.commit()
    logger.info("Usunięto znajomość ID: %s", friendship_id)
    return {"message": "Usunięto znajomego"}


@router.get("/users/search")
def search_users(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = (
        db.query(User)
        .filter(User.username.ilike(f"%{query}%"), User.id != current_user.id)
        .limit(10)
        .all()
    )

    user_ids = [u.id for u in users]
    friendships = db.query(Friendship).filter(
        ((Friendship.requester_id == current_user.id) & Friendship.addressee_id.in_(user_ids))
        | (Friendship.requester_id.in_(user_ids) & (Friendship.addressee_id == current_user.id))
    ).all()

    friendship_map: dict[int, Friendship] = {}
    for f in friendships:
        other_id = f.addressee_id if f.requester_id == current_user.id else f.requester_id
        friendship_map[other_id] = f

    results = []
    for user in users:
        f = friendship_map.get(user.id)
        friendship_status = "none"
        friendship_id = None
        if f:
            if f.status == FriendshipStatus.ACCEPTED:
                friendship_status = "friends"
            elif f.status == FriendshipStatus.PENDING:
                friendship_status = (
                    "pending_sent" if f.requester_id == current_user.id else "pending_received"
                )
            friendship_id = f.id
        results.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatar": user.avatar,
            "friendship_status": friendship_status,
            "friendship_id": friendship_id,
        })
    return results

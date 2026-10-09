from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from app.db.database import get_db
from app.db.models import User
from app.db.schemas import UserResponse, UserUpdate
from app.api.deps import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/search", response_model=List[UserResponse])
def search_users(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User).filter(
        or_(
            User.username.ilike(f"%{q}%"),
            User.display_name.ilike(f"%{q}%"),
            User.phone_number.ilike(f"%{q}%")
        )
    ).filter(User.id != current_user.id).limit(20).all()

    results = []
    for u in query:
        resp = UserResponse.model_validate(u)
        resp.is_online = manager.is_user_online(u.id)
        results.append(resp)
    return results

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    resp = UserResponse.model_validate(current_user)
    resp.is_online = True
    return resp

@router.patch("/me", response_model=UserResponse)
def update_profile(
    req: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.display_name is not None:
        current_user.display_name = req.display_name.strip()
    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url
    if req.status_text is not None:
        current_user.status_text = req.status_text
    db.commit()
    db.refresh(current_user)
    resp = UserResponse.model_validate(current_user)
    resp.is_online = True
    return resp

@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    resp = UserResponse.model_validate(user)
    resp.is_online = manager.is_user_online(user.id)
    return resp


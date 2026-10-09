from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.db.models import User
from app.db.schemas import RegisterRequest, LoginRequest
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from datetime import datetime, timezone

def register_user(db: Session, req: RegisterRequest) -> User:
    # Check if username exists
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    # Check if phone number exists if provided
    if req.phone_number and db.query(User).filter(User.phone_number == req.phone_number).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )

    # Use default avatar if none provided
    avatar = req.avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={req.username}"

    user = User(
        username=req.username,
        display_name=req.display_name,
        phone_number=req.phone_number,
        avatar_url=avatar,
        password_hash=get_password_hash(req.password),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def verify_otp(db: Session, identifier: str, otp: str) -> User:
    if otp != settings.MOCK_OTP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP. For demo/development, use 123456"
        )
    # Find user by phone_number or username
    user = db.query(User).filter(
        (User.phone_number == identifier) | (User.username == identifier)
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with provided identifier"
        )
    return user

def authenticate_user(db: Session, req: LoginRequest) -> User:
    user = db.query(User).filter(
        (User.username == req.username_or_phone) | (User.phone_number == req.username_or_phone)
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/phone or password"
        )
    if not verify_password(req.password, user.password_hash or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/phone or password"
        )
    user.last_seen_at = datetime.now(timezone.utc)
    db.commit()
    return user

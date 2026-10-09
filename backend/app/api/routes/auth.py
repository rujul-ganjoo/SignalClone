from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.db.schemas import RegisterRequest, VerifyOTPRequest, LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import register_user, verify_otp, authenticate_user
from app.core.security import create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    user = register_user(db, req)
    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )

@router.post("/verify", response_model=TokenResponse)
def verify(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    user = verify_otp(db, req.identifier, req.otp)
    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, req)
    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

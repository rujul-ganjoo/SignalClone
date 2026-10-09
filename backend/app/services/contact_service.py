from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.db.models import Contact, User
from app.db.schemas import ContactCreate
from typing import List

def get_user_contacts(db: Session, user_id: int) -> List[Contact]:
    return db.query(Contact).filter(Contact.owner_user_id == user_id).all()

def add_contact(db: Session, owner_id: int, req: ContactCreate) -> Contact:
    target_user = None
    if req.contact_user_id:
        target_user = db.query(User).filter(User.id == req.contact_user_id).first()
    elif req.username_or_phone:
        target_user = db.query(User).filter(
            (User.username == req.username_or_phone) | (User.phone_number == req.username_or_phone)
        ).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact user not found"
        )

    if target_user.id == owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself as a contact"
        )

    existing = db.query(Contact).filter(
        Contact.owner_user_id == owner_id,
        Contact.contact_user_id == target_user.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contact already exists"
        )

    contact = Contact(
        owner_user_id=owner_id,
        contact_user_id=target_user.id,
        nickname=req.nickname
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

def delete_contact(db: Session, owner_id: int, contact_id: int):
    contact = db.query(Contact).filter(
        Contact.id == contact_id,
        Contact.owner_user_id == owner_id
    ).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
    db.delete(contact)
    db.commit()

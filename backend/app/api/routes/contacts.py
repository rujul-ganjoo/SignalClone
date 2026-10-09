from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import User
from app.db.schemas import ContactCreate, ContactResponse
from app.services.contact_service import get_user_contacts, add_contact, delete_contact
from app.api.deps import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/contacts", tags=["Contacts"])

@router.get("", response_model=List[ContactResponse])
def list_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contacts = get_user_contacts(db, current_user.id)
    results = []
    for c in contacts:
        resp = ContactResponse.model_validate(c)
        resp.contact_user.is_online = manager.is_user_online(c.contact_user_id)
        results.append(resp)
    return results

@router.post("", response_model=ContactResponse)
def create_contact(
    req: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contact = add_contact(db, current_user.id, req)
    resp = ContactResponse.model_validate(contact)
    resp.contact_user.is_online = manager.is_user_online(contact.contact_user_id)
    return resp

@router.delete("/{contact_id}")
def remove_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    delete_contact(db, current_user.id, contact_id)
    return {"message": "Contact deleted successfully"}

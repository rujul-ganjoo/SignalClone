from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Message, Conversation
from app.db.schemas import ReactionCreate, ReactionResponse, MessageResponse
from app.services.message_service import add_message_reaction, remove_message_reaction, edit_message, delete_message
from app.api.deps import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/messages", tags=["Messages"])

@router.post("/{message_id}/reactions")
async def add_reaction(
    message_id: int,
    req: ReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reaction = add_message_reaction(db, current_user.id, message_id, req.emoji)
    msg = db.query(Message).filter(Message.id == message_id).first()
    if msg:
        conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
        if conv:
            member_ids = {m.user_id for m in conv.members if m.is_active}
            await manager.broadcast_to_users({
                "type": "reaction.added",
                "message_id": message_id,
                "conversation_id": msg.conversation_id,
                "reaction": {
                    "id": reaction.id,
                    "user_id": current_user.id,
                    "user_name": current_user.display_name,
                    "emoji": reaction.emoji
                }
            }, member_ids)

    return {"message": "Reaction added", "reaction_id": reaction.id}

@router.delete("/{message_id}/reactions")
async def remove_reaction(
    message_id: int,
    req: ReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    remove_message_reaction(db, current_user.id, message_id, req.emoji)
    msg = db.query(Message).filter(Message.id == message_id).first()
    if msg:
        conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
        if conv:
            member_ids = {m.user_id for m in conv.members if m.is_active}
            await manager.broadcast_to_users({
                "type": "reaction.removed",
                "message_id": message_id,
                "conversation_id": msg.conversation_id,
                "user_id": current_user.id,
                "emoji": req.emoji
            }, member_ids)

    return {"message": "Reaction removed"}

@router.patch("/{message_id}")
async def update_message(
    message_id: int,
    content: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = edit_message(db, current_user.id, message_id, content)
    conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
    if conv:
        member_ids = {m.user_id for m in conv.members if m.is_active}
        await manager.broadcast_to_users({
            "type": "message.updated",
            "conversation_id": msg.conversation_id,
            "message_id": msg.id,
            "content": msg.content,
            "edited_at": msg.edited_at.isoformat() if msg.edited_at else None
        }, member_ids)

    return {"message": "Message edited", "content": msg.content}

@router.delete("/{message_id}")
async def remove_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    delete_message(db, current_user.id, message_id)
    msg = db.query(Message).filter(Message.id == message_id).first()
    if msg:
        conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
        if conv:
            member_ids = {m.user_id for m in conv.members if m.is_active}
            await manager.broadcast_to_users({
                "type": "message.deleted",
                "conversation_id": msg.conversation_id,
                "message_id": message_id
            }, member_ids)

    return {"message": "Message deleted"}


from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.db.models import User, Conversation, ConversationMember, Message, MessageReceipt, MessageReaction, Attachment
from app.db.schemas import (
    ConversationResponse, ConversationCreateDirect, ConversationCreateGroup,
    MessageResponse, MessageCreate, AddGroupMemberRequest, UserBase
)
from app.services.conversation_service import (
    get_user_conversations, get_or_create_direct_conversation,
    create_group_conversation, get_conversation_by_id,
    add_group_member, remove_group_member
)
from app.services.message_service import (
    create_message, get_conversation_messages, mark_messages_read
)
from app.api.deps import get_current_user
from app.websocket.manager import manager
import asyncio

router = APIRouter(prefix="/conversations", tags=["Conversations"])

def format_message_response(msg: Message, current_user_id: Optional[int] = None) -> MessageResponse:
    # Determine message status (sent / delivered / read) based on receipts
    status_val = "sent"
    if msg.receipts:
        # If all recipients read, status is 'read'
        # If any delivered/read, status is 'delivered'
        statuses = [r.status for r in msg.receipts]
        if all(s == "read" for s in statuses):
            status_val = "read"
        elif any(s in ("delivered", "read") for s in statuses):
            status_val = "delivered"

    resp = MessageResponse.model_validate(msg)
    resp.status = status_val
    return resp

def enrich_conversation(conv: Conversation, user_id: int, db: Session) -> ConversationResponse:
    resp = ConversationResponse.model_validate(conv)

    # Calculate other_user for direct conversations
    if conv.type == "direct":
        other_member = next((m for m in conv.members if m.user_id != user_id), None)
        if other_member and other_member.user:
            resp.other_user = UserBase.model_validate(other_member.user)
            # Use other user's display name and avatar if not explicitly set
            if not resp.title:
                resp.title = other_member.user.display_name
            if not resp.avatar_url:
                resp.avatar_url = other_member.user.avatar_url

    # Find last message
    last_msg = db.query(Message).filter(
        Message.conversation_id == conv.id,
        Message.deleted_at == None
    ).order_by(Message.created_at.desc()).first()

    if last_msg:
        resp.last_message = format_message_response(last_msg, user_id)

    # Calculate unread count for current user
    # Count messages after member's last_read_message_id, or receipts where user_id == user_id and status != 'read'
    my_member = next((m for m in conv.members if m.user_id == user_id), None)
    if my_member:
        unread_q = db.query(MessageReceipt).filter(
            MessageReceipt.user_id == user_id,
            MessageReceipt.status != "read"
        ).join(Message).filter(Message.conversation_id == conv.id)
        resp.unread_count = unread_q.count()

    return resp

@router.get("", response_model=List[ConversationResponse])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conversations = get_user_conversations(db, current_user.id)
    return [enrich_conversation(c, current_user.id, db) for c in conversations]

@router.post("/direct", response_model=ConversationResponse)
def create_direct(
    req: ConversationCreateDirect,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = get_or_create_direct_conversation(db, current_user.id, req.target_user_id)
    return enrich_conversation(conv, current_user.id, db)

@router.post("/group", response_model=ConversationResponse)
def create_group(
    req: ConversationCreateGroup,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = create_group_conversation(db, current_user.id, req)
    return enrich_conversation(conv, current_user.id, db)

@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = get_conversation_by_id(db, conversation_id, current_user.id)
    return enrich_conversation(conv, current_user.id, db)

@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
def get_messages(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=100),
    before_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    messages = get_conversation_messages(db, conversation_id, current_user.id, limit, before_id)
    return [format_message_response(m, current_user.id) for m in messages]

@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def post_message(
    conversation_id: int,
    req: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = create_message(db, current_user.id, conversation_id, req)
    resp = format_message_response(msg, current_user.id)

    # Broadcast to conversation members via WebSocket
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        member_ids = {m.user_id for m in conv.members if m.is_active}
        ws_payload = {
            "type": "message.created",
            "conversation_id": conversation_id,
            "message": resp.model_dump(mode="json")
        }
        await manager.broadcast_to_users(ws_payload, member_ids)

    return resp

@router.post("/{conversation_id}/read")
async def mark_read(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    updated_msg_ids = mark_messages_read(db, conversation_id, current_user.id)
    if updated_msg_ids:
        # Notify sender/other members that messages were read
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv:
            member_ids = {m.user_id for m in conv.members if m.is_active and m.user_id != current_user.id}
            await manager.broadcast_to_users({
                "type": "message.read",
                "conversation_id": conversation_id,
                "user_id": current_user.id,
                "message_ids": updated_msg_ids
            }, member_ids)

    return {"message": "Messages marked as read", "updated_count": len(updated_msg_ids)}

@router.post("/{conversation_id}/members")
async def add_member(
    conversation_id: int,
    req: AddGroupMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member = add_group_member(db, conversation_id, current_user.id, req)

    # Broadcast conversation update
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        member_ids = {m.user_id for m in conv.members if m.is_active}
        enriched = enrich_conversation(conv, current_user.id, db)
        await manager.broadcast_to_users({
            "type": "conversation.updated",
            "conversation": enriched.model_dump(mode="json")
        }, member_ids)

    return {"message": "Member added successfully"}

@router.delete("/{conversation_id}/members/{target_user_id}")
async def remove_member(
    conversation_id: int,
    target_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    remove_group_member(db, conversation_id, current_user.id, target_user_id)

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        member_ids = {m.user_id for m in conv.members if m.is_active}
        enriched = enrich_conversation(conv, current_user.id, db)
        await manager.broadcast_to_users({
            "type": "conversation.updated",
            "conversation": enriched.model_dump(mode="json")
        }, member_ids | {target_user_id})

    return {"message": "Member removed successfully"}


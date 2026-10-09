from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.db.models import Conversation, ConversationMember, Message, MessageReceipt, MessageReaction, Attachment, User
from app.db.schemas import MessageCreate, ReactionCreate
from app.websocket.manager import manager
from typing import List, Optional
from datetime import datetime, timezone

def create_message(db: Session, sender_id: int, conversation_id: int, req: MessageCreate) -> Message:
    # 1. Validate sender is active member
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == sender_id,
        ConversationMember.is_active == True
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not an active member of this conversation"
        )

    now = datetime.now(timezone.utc)

    # 2. Persist message
    msg = Message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        content=req.content,
        message_type=req.message_type,
        reply_to_message_id=req.reply_to_message_id,
        created_at=now,
        updated_at=now
    )
    db.add(msg)
    db.flush()

    # Link attachment if attachment_id provided
    if req.attachment_id:
        attachment = db.query(Attachment).filter(Attachment.id == req.attachment_id).first()
        if attachment:
            attachment.message_id = msg.id

    # 3. Update conversation last_message_at
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        conv.last_message_at = now
        conv.updated_at = now

    # 4. Create receipts for all other active members
    other_members = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id != sender_id,
        ConversationMember.is_active == True
    ).all()

    for om in other_members:
        # Check if recipient is online
        is_online = manager.is_user_online(om.user_id)
        receipt_status = "delivered" if is_online else "sent"
        receipt = MessageReceipt(
            message_id=msg.id,
            user_id=om.user_id,
            status=receipt_status,
            delivered_at=now if is_online else None
        )
        db.add(receipt)

    # Sender has read their own message
    member.last_read_message_id = msg.id

    db.commit()
    db.refresh(msg)
    return msg

def get_conversation_messages(
    db: Session,
    conversation_id: int,
    user_id: int,
    limit: int = 50,
    before_id: Optional[int] = None
) -> List[Message]:
    # Check access
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == user_id,
        ConversationMember.is_active == True
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    query = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.deleted_at == None
    )

    if before_id:
        query = query.filter(Message.id < before_id)

    messages = query.order_by(Message.created_at.asc()).limit(limit).all()
    return messages

def mark_messages_read(db: Session, conversation_id: int, user_id: int) -> List[int]:
    # Update receipts for all messages in this conversation where user_id is the recipient
    now = datetime.now(timezone.utc)
    receipts = db.query(MessageReceipt).join(Message).filter(
        Message.conversation_id == conversation_id,
        MessageReceipt.user_id == user_id,
        MessageReceipt.status != "read"
    ).all()

    updated_message_ids = []
    for r in receipts:
        r.status = "read"
        r.read_at = now
        updated_message_ids.append(r.message_id)

    # Update conversation member last_read_message_id
    last_msg = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.id.desc()).first()

    if last_msg:
        member = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id
        ).first()
        if member:
            member.last_read_message_id = last_msg.id

    db.commit()
    return updated_message_ids

def mark_user_messages_delivered(db: Session, user_id: int) -> List[int]:
    # When user connects, mark all pending 'sent' receipts for this user as 'delivered'
    now = datetime.now(timezone.utc)
    receipts = db.query(MessageReceipt).filter(
        MessageReceipt.user_id == user_id,
        MessageReceipt.status == "sent"
    ).all()

    updated_ids = []
    for r in receipts:
        r.status = "delivered"
        r.delivered_at = now
        updated_ids.append(r.message_id)

    if updated_ids:
        db.commit()
    return updated_ids

def add_message_reaction(db: Session, user_id: int, message_id: int, emoji: str) -> MessageReaction:
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    # Check user is member of conversation
    member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == msg.conversation_id,
        ConversationMember.user_id == user_id,
        ConversationMember.is_active == True
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Check if reaction already exists
    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == user_id,
        MessageReaction.emoji == emoji
    ).first()
    if existing:
        return existing

    reaction = MessageReaction(
        message_id=message_id,
        user_id=user_id,
        emoji=emoji,
        created_at=datetime.now(timezone.utc)
    )
    db.add(reaction)
    db.commit()
    db.refresh(reaction)
    return reaction

def remove_message_reaction(db: Session, user_id: int, message_id: int, emoji: str):
    reaction = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == user_id,
        MessageReaction.emoji == emoji
    ).first()
    if reaction:
        db.delete(reaction)
        db.commit()

def edit_message(db: Session, user_id: int, message_id: int, new_content: str) -> Message:
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if msg.sender_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only author can edit message")

    now = datetime.now(timezone.utc)
    msg.content = new_content
    msg.edited_at = now
    msg.updated_at = now
    db.commit()
    db.refresh(msg)
    return msg

def delete_message(db: Session, user_id: int, message_id: int):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if msg.sender_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only author can delete message")

    now = datetime.now(timezone.utc)
    msg.deleted_at = now
    msg.content = "This message was deleted"
    db.commit()

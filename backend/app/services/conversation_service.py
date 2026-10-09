from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from fastapi import HTTPException, status
from app.db.models import Conversation, ConversationMember, Message, User, MessageReceipt
from app.db.schemas import ConversationCreateDirect, ConversationCreateGroup, AddGroupMemberRequest
from typing import List, Optional
from datetime import datetime, timezone

def get_user_conversations(db: Session, user_id: int) -> List[Conversation]:
    # Find all conversations where user is an active member
    member_records = db.query(ConversationMember).filter(
        ConversationMember.user_id == user_id,
        ConversationMember.is_active == True
    ).all()

    conv_ids = [m.conversation_id for m in member_records]
    if not conv_ids:
        return []

    conversations = db.query(Conversation).filter(
        Conversation.id.in_(conv_ids)
    ).order_by(Conversation.last_message_at.desc()).all()

    return conversations

def get_or_create_direct_conversation(db: Session, user_id: int, target_user_id: int) -> Conversation:
    if user_id == target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create a conversation with yourself"
        )

    # Check if target user exists
    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

    # Find existing direct conversation between these two users
    # Query conversations where type == 'direct' and both user_id and target_user_id are members
    c1 = db.query(ConversationMember.conversation_id).filter(
        ConversationMember.user_id == user_id,
        ConversationMember.is_active == True
    ).scalar_subquery()

    c2 = db.query(ConversationMember.conversation_id).filter(
        ConversationMember.user_id == target_user_id,
        ConversationMember.is_active == True
    ).scalar_subquery()

    existing_conv = db.query(Conversation).filter(
        Conversation.type == "direct",
        Conversation.id.in_(
            db.query(ConversationMember.conversation_id).filter(
                ConversationMember.user_id == user_id,
                ConversationMember.is_active == True
            )
        ),
        Conversation.id.in_(
            db.query(ConversationMember.conversation_id).filter(
                ConversationMember.user_id == target_user_id,
                ConversationMember.is_active == True
            )
        )
    ).first()

    if existing_conv:
        return existing_conv

    # Create new direct conversation
    now = datetime.now(timezone.utc)
    conv = Conversation(
        type="direct",
        created_by=user_id,
        created_at=now,
        updated_at=now,
        last_message_at=now
    )
    db.add(conv)
    db.flush()

    m1 = ConversationMember(conversation_id=conv.id, user_id=user_id, role="member", joined_at=now, is_active=True)
    m2 = ConversationMember(conversation_id=conv.id, user_id=target_user_id, role="member", joined_at=now, is_active=True)
    db.add_all([m1, m2])
    db.commit()
    db.refresh(conv)
    return conv

def create_group_conversation(db: Session, creator_id: int, req: ConversationCreateGroup) -> Conversation:
    now = datetime.now(timezone.utc)
    conv = Conversation(
        type="group",
        title=req.title,
        avatar_url=req.avatar_url or f"https://api.dicebear.com/7.x/identicon/svg?seed={req.title}",
        created_by=creator_id,
        created_at=now,
        updated_at=now,
        last_message_at=now
    )
    db.add(conv)
    db.flush()

    # Creator is admin
    members = [ConversationMember(
        conversation_id=conv.id,
        user_id=creator_id,
        role="admin",
        joined_at=now,
        is_active=True
    )]

    # Add other members (deduplicate)
    added_ids = {creator_id}
    for uid in req.member_user_ids:
        if uid not in added_ids:
            user = db.query(User).filter(User.id == uid).first()
            if user:
                members.append(ConversationMember(
                    conversation_id=conv.id,
                    user_id=uid,
                    role="member",
                    joined_at=now,
                    is_active=True
                ))
                added_ids.add(uid)

    db.add_all(members)

    # Add a system welcome message
    system_msg = Message(
        conversation_id=conv.id,
        sender_id=creator_id,
        content=f"Group '{req.title}' was created",
        message_type="system",
        created_at=now,
        updated_at=now
    )
    db.add(system_msg)

    db.commit()
    db.refresh(conv)
    return conv

def get_conversation_by_id(db: Session, conversation_id: int, user_id: int) -> Conversation:
    # Verify user is active member
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == user_id,
        ConversationMember.is_active == True
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to conversation")

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv

def add_group_member(db: Session, conversation_id: int, admin_user_id: int, req: AddGroupMemberRequest) -> ConversationMember:
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or conv.type != "group":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a valid group conversation")

    # Check admin role
    admin_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == admin_user_id,
        ConversationMember.role == "admin",
        ConversationMember.is_active == True
    ).first()
    if not admin_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only group admins can add members")

    # Check target user
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == req.user_id
    ).first()

    now = datetime.now(timezone.utc)
    if existing:
        if existing.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already in group")
        existing.is_active = True
        existing.role = req.role
        existing.joined_at = now
        member = existing
    else:
        member = ConversationMember(
            conversation_id=conversation_id,
            user_id=req.user_id,
            role=req.role,
            joined_at=now,
            is_active=True
        )
        db.add(member)

    # Add system message
    system_msg = Message(
        conversation_id=conversation_id,
        sender_id=admin_user_id,
        content=f"{user.display_name} was added to the group",
        message_type="system",
        created_at=now,
        updated_at=now
    )
    db.add(system_msg)

    db.commit()
    db.refresh(member)
    return member

def remove_group_member(db: Session, conversation_id: int, request_user_id: int, target_user_id: int):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or conv.type != "group":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a valid group")

    # User can remove themselves (leave group) OR admin can remove member
    if request_user_id != target_user_id:
        admin_member = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == request_user_id,
            ConversationMember.role == "admin",
            ConversationMember.is_active == True
        ).first()
        if not admin_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permissions required to remove other members")

    target_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == target_user_id,
        ConversationMember.is_active == True
    ).first()
    if not target_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not in group")

    target_member.is_active = False

    target_user = db.query(User).filter(User.id == target_user_id).first()
    name = target_user.display_name if target_user else "Member"
    now = datetime.now(timezone.utc)
    system_msg = Message(
        conversation_id=conversation_id,
        sender_id=request_user_id,
        content=f"{name} left the group" if request_user_id == target_user_id else f"{name} was removed from the group",
        message_type="system",
        created_at=now,
        updated_at=now
    )
    db.add(system_msg)

    db.commit()

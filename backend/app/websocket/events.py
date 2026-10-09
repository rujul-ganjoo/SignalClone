import json
import logging
from datetime import datetime, timezone
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.websocket.manager import manager
from app.db.database import SessionLocal
from app.db.models import User, Conversation, ConversationMember, Message
from app.db.schemas import MessageCreate
from app.services.message_service import (
    create_message, mark_messages_read, mark_user_messages_delivered
)
from app.api.routes.conversations import format_message_response

logger = logging.getLogger("websocket")

async def handle_websocket_connection(websocket: WebSocket, current_user: User):
    user_id = current_user.id
    await manager.connect(websocket, user_id)

    db: Session = SessionLocal()
    try:
        # 1. Mark any pending messages for this user as delivered
        delivered_ids = mark_user_messages_delivered(db, user_id)
        if delivered_ids:
            # Find which senders sent these messages and notify them
            delivered_messages = db.query(Message).filter(Message.id.in_(delivered_ids)).all()
            for msg in delivered_messages:
                await manager.send_personal_message({
                    "type": "message.delivered",
                    "conversation_id": msg.conversation_id,
                    "message_id": msg.id,
                    "user_id": user_id
                }, msg.sender_id)

        # 2. Broadcast presence: online
        # Find all user's conversation partners
        my_conv_ids = [m.conversation_id for m in db.query(ConversationMember).filter(
            ConversationMember.user_id == user_id,
            ConversationMember.is_active == True
        ).all()]

        if my_conv_ids:
            partner_members = db.query(ConversationMember).filter(
                ConversationMember.conversation_id.in_(my_conv_ids),
                ConversationMember.user_id != user_id,
                ConversationMember.is_active == True
            ).all()
            partner_ids = {pm.user_id for pm in partner_members}
            await manager.broadcast_to_users({
                "type": "presence.update",
                "user_id": user_id,
                "is_online": True
            }, partner_ids)

        # 3. Main message loop
        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
            except json.JSONDecodeError:
                continue

            event_type = data.get("type")

            if event_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            elif event_type == "typing.start":
                conv_id = data.get("conversation_id")
                if conv_id:
                    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
                    if conv:
                        members = {m.user_id for m in conv.members if m.is_active and m.user_id != user_id}
                        await manager.broadcast_to_users({
                            "type": "typing.start",
                            "conversation_id": conv_id,
                            "user_id": user_id,
                            "username": current_user.display_name
                        }, members)

            elif event_type == "typing.stop":
                conv_id = data.get("conversation_id")
                if conv_id:
                    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
                    if conv:
                        members = {m.user_id for m in conv.members if m.is_active and m.user_id != user_id}
                        await manager.broadcast_to_users({
                            "type": "typing.stop",
                            "conversation_id": conv_id,
                            "user_id": user_id
                        }, members)

            elif event_type == "message.send":
                conv_id = data.get("conversation_id")
                content = data.get("content", "").strip()
                message_type = data.get("message_type", "text")
                reply_to_id = data.get("reply_to_message_id")
                attachment_id = data.get("attachment_id")

                if conv_id and (content or attachment_id):
                    req = MessageCreate(
                        content=content,
                        message_type=message_type,
                        reply_to_message_id=reply_to_id,
                        attachment_id=attachment_id
                    )
                    try:
                        msg = create_message(db, user_id, conv_id, req)
                        resp = format_message_response(msg, user_id)
                        conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
                        if conv:
                            all_members = {m.user_id for m in conv.members if m.is_active}
                            await manager.broadcast_to_users({
                                "type": "message.created",
                                "conversation_id": conv_id,
                                "message": resp.model_dump(mode="json")
                            }, all_members)
                    except Exception as e:
                        logger.error(f"Error handling message.send: {e}")
                        await websocket.send_text(json.dumps({"type": "error", "detail": str(e)}))

            elif event_type == "message.read":
                conv_id = data.get("conversation_id")
                if conv_id:
                    updated_ids = mark_messages_read(db, conv_id, user_id)
                    if updated_ids:
                        conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
                        if conv:
                            members = {m.user_id for m in conv.members if m.is_active and m.user_id != user_id}
                            await manager.broadcast_to_users({
                                "type": "message.read",
                                "conversation_id": conv_id,
                                "user_id": user_id,
                                "message_ids": updated_ids
                            }, members)

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        # Update last_seen_at
        now = datetime.now(timezone.utc)
        current_user.last_seen_at = now
        db.commit()

        # Broadcast presence: offline
        my_conv_ids = [m.conversation_id for m in db.query(ConversationMember).filter(
            ConversationMember.user_id == user_id,
            ConversationMember.is_active == True
        ).all()]
        if my_conv_ids:
            partner_members = db.query(ConversationMember).filter(
                ConversationMember.conversation_id.in_(my_conv_ids),
                ConversationMember.user_id != user_id,
                ConversationMember.is_active == True
            ).all()
            partner_ids = {pm.user_id for pm in partner_members}
            await manager.broadcast_to_users({
                "type": "presence.update",
                "user_id": user_id,
                "is_online": False,
                "last_seen_at": now.isoformat()
            }, partner_ids)
    except Exception as e:
        logger.error(f"Unexpected WebSocket error for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)
    finally:
        db.close()


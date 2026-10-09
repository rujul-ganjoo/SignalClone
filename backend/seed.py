from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine, Base
from app.db.models import User, Contact, Conversation, ConversationMember, Message, MessageReceipt, MessageReaction
from app.core.security import get_password_hash

def seed():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    print("Seeding database...")

    try:
        now = datetime.now(timezone.utc)

        # 1. Users
        users_data = [
            {
                "username": "sarah",
                "phone_number": "+15550101",
                "display_name": "Sarah Connor",
                "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
                "status_text": "Security first. Always verify keys.",
            },
            {
                "username": "alex",
                "phone_number": "+15550102",
                "display_name": "Alex Rivera",
                "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
                "status_text": "Building privacy tools.",
            },
            {
                "username": "elena",
                "phone_number": "+15550103",
                "display_name": "Elena Rostova",
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "status_text": "UX & Accessibility lead.",
            },
            {
                "username": "marcus",
                "phone_number": "+15550104",
                "display_name": "Marcus Vance",
                "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
                "status_text": "Outdoor explorer & photographer.",
            },
            {
                "username": "priya",
                "phone_number": "+15550105",
                "display_name": "Priya Sharma",
                "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
                "status_text": "Distributed systems engineer.",
            },
            {
                "username": "david",
                "phone_number": "+15550106",
                "display_name": "David Chen",
                "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
                "status_text": "Rust and cryptographic protocols.",
            },
        ]

        user_map = {}
        for u in users_data:
            existing = db.query(User).filter(User.username == u["username"]).first()
            if not existing:
                user = User(
                    username=u["username"],
                    phone_number=u["phone_number"],
                    display_name=u["display_name"],
                    avatar_url=u["avatar_url"],
                    status_text=u["status_text"],
                    password_hash=get_password_hash("password123"),
                    created_at=now - timedelta(days=30),
                    updated_at=now,
                    last_seen_at=now - timedelta(minutes=5)
                )
                db.add(user)
                db.flush()
                user_map[u["username"]] = user
            else:
                user_map[u["username"]] = existing

        sarah = user_map["sarah"]
        alex = user_map["alex"]
        elena = user_map["elena"]
        marcus = user_map["marcus"]
        priya = user_map["priya"]
        david = user_map["david"]

        # 2. Contacts for Sarah
        sarah_contacts = [alex, elena, marcus, priya, david]
        for c_user in sarah_contacts:
            if not db.query(Contact).filter(Contact.owner_user_id == sarah.id, Contact.contact_user_id == c_user.id).first():
                db.add(Contact(owner_user_id=sarah.id, contact_user_id=c_user.id))

        # Contacts for Alex
        for c_user in [sarah, elena, marcus]:
            if not db.query(Contact).filter(Contact.owner_user_id == alex.id, Contact.contact_user_id == c_user.id).first():
                db.add(Contact(owner_user_id=alex.id, contact_user_id=c_user.id))

        db.flush()

        # 3. Direct Conversation: Sarah <-> Alex
        def get_or_create_direct(u1, u2):
            existing_conv = db.query(Conversation).filter(
                Conversation.type == "direct",
                Conversation.id.in_(
                    db.query(ConversationMember.conversation_id).filter(
                        ConversationMember.user_id == u1.id, ConversationMember.is_active == True
                    )
                ),
                Conversation.id.in_(
                    db.query(ConversationMember.conversation_id).filter(
                        ConversationMember.user_id == u2.id, ConversationMember.is_active == True
                    )
                )
            ).first()
            if not existing_conv:
                c = Conversation(
                    type="direct",
                    created_by=u1.id,
                    created_at=now - timedelta(days=5),
                    updated_at=now - timedelta(minutes=10),
                    last_message_at=now - timedelta(minutes=10)
                )
                db.add(c)
                db.flush()
                m1 = ConversationMember(conversation_id=c.id, user_id=u1.id, role="member", joined_at=now - timedelta(days=5))
                m2 = ConversationMember(conversation_id=c.id, user_id=u2.id, role="member", joined_at=now - timedelta(days=5))
                db.add_all([m1, m2])
                db.flush()
                return c
            return existing_conv

        conv_sarah_alex = get_or_create_direct(sarah, alex)
        conv_sarah_elena = get_or_create_direct(sarah, elena)
        conv_sarah_marcus = get_or_create_direct(sarah, marcus)
        conv_sarah_priya = get_or_create_direct(sarah, priya)

        # 4. Group Conversations
        # Group 1: Signal Core Contributors
        group1 = db.query(Conversation).filter(Conversation.type == "group", Conversation.title == "Signal Core Contributors").first()
        if not group1:
            group1 = Conversation(
                type="group",
                title="Signal Core Contributors",
                avatar_url="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150",
                created_by=sarah.id,
                created_at=now - timedelta(days=10),
                updated_at=now - timedelta(minutes=2),
                last_message_at=now - timedelta(minutes=2)
            )
            db.add(group1)
            db.flush()
            m_s = ConversationMember(conversation_id=group1.id, user_id=sarah.id, role="admin", joined_at=now - timedelta(days=10))
            m_a = ConversationMember(conversation_id=group1.id, user_id=alex.id, role="member", joined_at=now - timedelta(days=10))
            m_e = ConversationMember(conversation_id=group1.id, user_id=elena.id, role="member", joined_at=now - timedelta(days=10))
            m_d = ConversationMember(conversation_id=group1.id, user_id=david.id, role="member", joined_at=now - timedelta(days=10))
            db.add_all([m_s, m_a, m_e, m_d])
            db.flush()

        # Group 2: Weekend Hikers
        group2 = db.query(Conversation).filter(Conversation.type == "group", Conversation.title == "Weekend Hikers").first()
        if not group2:
            group2 = Conversation(
                type="group",
                title="Weekend Hikers",
                avatar_url="https://images.unsplash.com/photo-1551632811-561732d1e306?w=150",
                created_by=alex.id,
                created_at=now - timedelta(days=7),
                updated_at=now - timedelta(hours=3),
                last_message_at=now - timedelta(hours=3)
            )
            db.add(group2)
            db.flush()
            m_a = ConversationMember(conversation_id=group2.id, user_id=alex.id, role="admin", joined_at=now - timedelta(days=7))
            m_s = ConversationMember(conversation_id=group2.id, user_id=sarah.id, role="member", joined_at=now - timedelta(days=7))
            m_m = ConversationMember(conversation_id=group2.id, user_id=marcus.id, role="member", joined_at=now - timedelta(days=7))
            m_p = ConversationMember(conversation_id=group2.id, user_id=priya.id, role="member", joined_at=now - timedelta(days=7))
            db.add_all([m_a, m_s, m_m, m_p])
            db.flush()

        # 5. Populate Messages if conversation has none
        def seed_messages(conv, msg_defs):
            if db.query(Message).filter(Message.conversation_id == conv.id).count() == 0:
                for item in msg_defs:
                    msg_time = now - item["offset"]
                    msg = Message(
                        conversation_id=conv.id,
                        sender_id=item["sender"].id,
                        content=item["content"],
                        message_type=item.get("type", "text"),
                        created_at=msg_time,
                        updated_at=msg_time
                    )
                    db.add(msg)
                    db.flush()

                    # Receipts
                    other_members = db.query(ConversationMember).filter(
                        ConversationMember.conversation_id == conv.id,
                        ConversationMember.user_id != item["sender"].id
                    ).all()

                    for om in other_members:
                        status_val = item.get("status", "read")
                        receipt = MessageReceipt(
                            message_id=msg.id,
                            user_id=om.user_id,
                            status=status_val,
                            delivered_at=msg_time + timedelta(seconds=1),
                            read_at=msg_time + timedelta(seconds=15) if status_val == "read" else None
                        )
                        db.add(receipt)

                    # Reactions if any
                    if "reaction" in item:
                        db.add(MessageReaction(
                            message_id=msg.id,
                            user_id=item["reaction"]["user"].id,
                            emoji=item["reaction"]["emoji"],
                            created_at=msg_time + timedelta(seconds=30)
                        ))

        # Sarah & Alex messages
        seed_messages(conv_sarah_alex, [
            {"sender": alex, "content": "Hey Sarah, have you checked the new WebSocket architecture benchmark?", "offset": timedelta(hours=5), "status": "read"},
            {"sender": sarah, "content": "Yes! Sub-millisecond latency on local delivery. Clean separation between routes and connection manager.", "offset": timedelta(hours=4, minutes=50), "status": "read", "reaction": {"user": alex, "emoji": "🔥"}},
            {"sender": alex, "content": "Awesome. Also verified that receipts update dynamically from sent -> delivered -> read.", "offset": timedelta(hours=2), "status": "read"},
            {"sender": sarah, "content": "Perfect. Ready for testing with multiple authenticated client sessions.", "offset": timedelta(minutes=10), "status": "delivered"}
        ])

        # Sarah & Elena messages
        seed_messages(conv_sarah_elena, [
            {"sender": elena, "content": "Sarah, I reviewed the desktop three-pane layout.", "offset": timedelta(hours=8), "status": "read"},
            {"sender": elena, "content": "The proportions match Signal Desktop exactly. High-contrast dark mode is looking sleek.", "offset": timedelta(hours=7, minutes=55), "status": "read"},
            {"sender": sarah, "content": "Thanks Elena! The composer keyboard shortcuts and message grouping are solid.", "offset": timedelta(hours=1), "status": "read", "reaction": {"user": elena, "emoji": "👍"}}
        ])

        # Sarah & Marcus messages (Marcus sent an unread message to Sarah!)
        seed_messages(conv_sarah_marcus, [
            {"sender": marcus, "content": "Hey Sarah, did you get a chance to see the hiking route photos?", "offset": timedelta(hours=3), "status": "delivered"},
            {"sender": marcus, "content": "We are heading out on Saturday morning at 7 AM sharp!", "offset": timedelta(minutes=25), "status": "delivered"}
        ])

        # Group 1: Signal Core Contributors messages
        seed_messages(group1, [
            {"sender": sarah, "content": "Welcome team to the Signal Clone development channel!", "offset": timedelta(days=2), "status": "read"},
            {"sender": david, "content": "Excited to collaborate! Backend models and schemas are completely normalized in SQLite.", "offset": timedelta(days=1), "status": "read"},
            {"sender": elena, "content": "Frontend component tree is modular: AppShell, NavigationRail, ConversationSidebar, MessageList.", "offset": timedelta(hours=4), "status": "read"},
            {"sender": alex, "content": "All real-time events (typing, receipts, presence) are firing cleanly.", "offset": timedelta(minutes=2), "status": "read", "reaction": {"user": sarah, "emoji": "🚀"}}
        ])

        # Group 2: Weekend Hikers messages
        seed_messages(group2, [
            {"sender": alex, "content": "Trail update: Mount Tamalpais route is clear!", "offset": timedelta(days=1), "status": "read"},
            {"sender": priya, "content": "Count me in! Bringing snacks and electrolytes.", "offset": timedelta(hours=6), "status": "read"},
            {"sender": marcus, "content": "Weather forecast looks sunny and crisp. Don't forget your hydration packs.", "offset": timedelta(hours=3), "status": "read"}
        ])

        db.commit()
        print("Database seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()

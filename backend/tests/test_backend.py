import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use a test SQLite database
TEST_DB_FILE = "./test_signal.db"
if os.path.exists(TEST_DB_FILE):
    try:
        os.remove(TEST_DB_FILE)
    except Exception:
        pass

from app.core.config import settings
settings.DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

from app.db.database import Base, get_db
from app.db.models import User
from app.main import app

test_engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=test_engine)

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_auth_registration_and_login():
    # 1. Register user 1
    reg_payload_1 = {
        "username": "alice",
        "display_name": "Alice Wonderland",
        "password": "secretpassword",
        "phone_number": "+111222333"
    }
    r = client.post("/api/auth/register", json=reg_payload_1)
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["user"]["username"] == "alice"
    assert data["user"]["display_name"] == "Alice Wonderland"
    token_alice = data["access_token"]

    # Duplicate username registration should fail
    r_dup = client.post("/api/auth/register", json=reg_payload_1)
    assert r_dup.status_code == 400

    # 2. Register user 2 (Bob)
    reg_payload_2 = {
        "username": "bob",
        "display_name": "Bob Builder",
        "password": "secretpassword",
        "phone_number": "+444555666"
    }
    r2 = client.post("/api/auth/register", json=reg_payload_2)
    assert r2.status_code == 200
    token_bob = r2.json()["access_token"]

    # 3. Test Login
    login_payload = {
        "username_or_phone": "alice",
        "password": "secretpassword"
    }
    r_login = client.post("/api/auth/login", json=login_payload)
    assert r_login.status_code == 200
    assert "access_token" in r_login.json()

    # Wrong password
    r_bad_login = client.post("/api/auth/login", json={"username_or_phone": "alice", "password": "wrong"})
    assert r_bad_login.status_code == 401

    # 4. Test Mock OTP Verification
    r_otp = client.post("/api/auth/verify", json={"identifier": "alice", "otp": "123456"})
    assert r_otp.status_code == 200
    assert "access_token" in r_otp.json()

    r_bad_otp = client.post("/api/auth/verify", json={"identifier": "alice", "otp": "000000"})
    assert r_bad_otp.status_code == 400

    # 5. Protected /api/auth/me
    headers_alice = {"Authorization": f"Bearer {token_alice}"}
    r_me = client.get("/api/auth/me", headers=headers_alice)
    assert r_me.status_code == 200
    assert r_me.json()["username"] == "alice"

    # Protected route with no token
    r_unauth = client.get("/api/auth/me")
    assert r_unauth.status_code == 401

def test_contacts_and_conversations():
    # Login alice and bob
    alice_token = client.post("/api/auth/login", json={"username_or_phone": "alice", "password": "secretpassword"}).json()["access_token"]
    bob_token = client.post("/api/auth/login", json={"username_or_phone": "bob", "password": "secretpassword"}).json()["access_token"]
    h_alice = {"Authorization": f"Bearer {alice_token}"}
    h_bob = {"Authorization": f"Bearer {bob_token}"}

    bob_id = client.get("/api/auth/me", headers=h_bob).json()["id"]
    alice_id = client.get("/api/auth/me", headers=h_alice).json()["id"]

    # 1. Add contact
    r_contact = client.post("/api/contacts", json={"contact_user_id": bob_id, "nickname": "Bobby"}, headers=h_alice)
    assert r_contact.status_code == 200
    contact_data = r_contact.json()
    assert contact_data["nickname"] == "Bobby"
    assert contact_data["contact_user"]["username"] == "bob"

    # Listing contacts
    r_list = client.get("/api/contacts", headers=h_alice)
    assert r_list.status_code == 200
    assert len(r_list.json()) >= 1

    # Cannot add self
    r_self = client.post("/api/contacts", json={"contact_user_id": alice_id}, headers=h_alice)
    assert r_self.status_code == 400

    # 2. Create direct conversation
    r_conv = client.post("/api/conversations/direct", json={"target_user_id": bob_id}, headers=h_alice)
    assert r_conv.status_code == 200
    conv_id = r_conv.json()["id"]
    assert r_conv.json()["type"] == "direct"

    # Idempotency: creating direct conversation again must return the same conversation
    r_conv_again = client.post("/api/conversations/direct", json={"target_user_id": bob_id}, headers=h_alice)
    assert r_conv_again.status_code == 200
    assert r_conv_again.json()["id"] == conv_id

    # 3. Send message from Alice to Bob
    r_msg = client.post(f"/api/conversations/{conv_id}/messages", json={"content": "Hello Bob from Alice!"}, headers=h_alice)
    assert r_msg.status_code == 200
    msg_id = r_msg.json()["id"]
    assert r_msg.json()["content"] == "Hello Bob from Alice!"

    # 4. Bob fetches messages and marks read
    r_msgs_bob = client.get(f"/api/conversations/{conv_id}/messages", headers=h_bob)
    assert r_msgs_bob.status_code == 200
    assert len(r_msgs_bob.json()) >= 1

    r_read = client.post(f"/api/conversations/{conv_id}/read", headers=h_bob)
    assert r_read.status_code == 200

    # 5. Add reaction
    r_react = client.post(f"/api/messages/{msg_id}/reactions", json={"emoji": "❤️"}, headers=h_bob)
    assert r_react.status_code == 200

    # 6. Edit message
    r_edit = client.patch(f"/api/messages/{msg_id}?content=Hello Bob (edited)", headers=h_alice)
    assert r_edit.status_code == 200
    assert r_edit.json()["content"] == "Hello Bob (edited)"

def test_group_conversations_and_permissions():
    alice_token = client.post("/api/auth/login", json={"username_or_phone": "alice", "password": "secretpassword"}).json()["access_token"]
    bob_token = client.post("/api/auth/login", json={"username_or_phone": "bob", "password": "secretpassword"}).json()["access_token"]
    h_alice = {"Authorization": f"Bearer {alice_token}"}
    h_bob = {"Authorization": f"Bearer {bob_token}"}
    bob_id = client.get("/api/auth/me", headers=h_bob).json()["id"]

    # Register Charlie
    r_charlie = client.post("/api/auth/register", json={
        "username": "charlie",
        "display_name": "Charlie Chaplin",
        "password": "secretpassword"
    })
    charlie_token = r_charlie.json()["access_token"]
    charlie_id = r_charlie.json()["user"]["id"]
    h_charlie = {"Authorization": f"Bearer {charlie_token}"}

    # 1. Create Group: Alice creates group with Bob
    r_grp = client.post("/api/conversations/group", json={
        "title": "Secret Agents",
        "member_user_ids": [bob_id]
    }, headers=h_alice)
    assert r_grp.status_code == 200
    grp_id = r_grp.json()["id"]
    assert r_grp.json()["title"] == "Secret Agents"

    # Alice is admin
    members = r_grp.json()["members"]
    alice_member = next(m for m in members if m["user"]["username"] == "alice")
    assert alice_member["role"] == "admin"

    # 2. Charlie is NOT a member and cannot read messages
    r_forbidden = client.get(f"/api/conversations/{grp_id}/messages", headers=h_charlie)
    assert r_forbidden.status_code == 403

    # 3. Bob (regular member) cannot add Charlie because Bob is not admin
    r_add_fail = client.post(f"/api/conversations/{grp_id}/members", json={"user_id": charlie_id}, headers=h_bob)
    assert r_add_fail.status_code == 403

    # 4. Alice (admin) adds Charlie
    r_add_ok = client.post(f"/api/conversations/{grp_id}/members", json={"user_id": charlie_id}, headers=h_alice)
    assert r_add_ok.status_code == 200

    # Now Charlie can access the group
    r_charlie_access = client.get(f"/api/conversations/{grp_id}/messages", headers=h_charlie)
    assert r_charlie_access.status_code == 200

    # 5. Charlie can leave the group
    r_leave = client.delete(f"/api/conversations/{grp_id}/members/{charlie_id}", headers=h_charlie)
    assert r_leave.status_code == 200

def test_websocket_connection_and_auth():
    alice_token = client.post("/api/auth/login", json={"username_or_phone": "alice", "password": "secretpassword"}).json()["access_token"]

    # Valid token connects
    with client.websocket_connect(f"/ws?token={alice_token}") as ws:
        ws.send_text('{"type": "ping"}')
        data = ws.receive_json()
        assert data["type"] == "pong"

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class RegisterRequest(BaseModel):
    phone_number: Optional[str] = None
    username: str
    display_name: str
    password: str
    avatar_url: Optional[str] = None

class VerifyOTPRequest(BaseModel):
    identifier: str  # phone_number or username
    otp: str

class LoginRequest(BaseModel):
    username_or_phone: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

# --- User Schemas ---
class UserBase(BaseModel):
    id: int
    username: str
    display_name: str
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None
    status_text: Optional[str] = None
    last_seen_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserResponse(UserBase):
    created_at: datetime
    is_online: Optional[bool] = False

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    status_text: Optional[str] = None

# --- Contact Schemas ---
class ContactCreate(BaseModel):
    contact_user_id: Optional[int] = None
    username_or_phone: Optional[str] = None
    nickname: Optional[str] = None

class ContactResponse(BaseModel):
    id: int
    nickname: Optional[str] = None
    created_at: datetime
    contact_user: UserResponse

    class Config:
        from_attributes = True

# --- Reaction & Attachment Schemas ---
class ReactionResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    emoji: str
    created_at: datetime

    class Config:
        from_attributes = True

class AttachmentResponse(BaseModel):
    id: int
    filename: str
    content_type: str
    file_size: int
    storage_path: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Message Receipt Schemas ---
class MessageReceiptResponse(BaseModel):
    id: int
    user_id: int
    status: str
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Message Schemas ---
class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"  # 'text', 'image', 'file'
    reply_to_message_id: Optional[int] = None
    attachment_id: Optional[int] = None

class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender: Optional[UserBase] = None
    content: str
    message_type: str
    reply_to_message_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    edited_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    status: Optional[str] = "sent"  # calculated highest receipt or direct status
    receipts: List[MessageReceiptResponse] = []
    reactions: List[ReactionResponse] = []
    attachments: List[AttachmentResponse] = []

    class Config:
        from_attributes = True

# --- Conversation Schemas ---
class ConversationMemberResponse(BaseModel):
    id: int
    user_id: int
    role: str
    joined_at: datetime
    is_active: bool
    user: UserBase

    class Config:
        from_attributes = True

class ConversationCreateDirect(BaseModel):
    target_user_id: int

class ConversationCreateGroup(BaseModel):
    title: str
    member_user_ids: List[int]
    avatar_url: Optional[str] = None

class ConversationUpdateGroup(BaseModel):
    title: Optional[str] = None
    avatar_url: Optional[str] = None

class AddGroupMemberRequest(BaseModel):
    user_id: int
    role: str = "member"

class ConversationResponse(BaseModel):
    id: int
    type: str  # 'direct' or 'group'
    title: Optional[str] = None
    avatar_url: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    last_message_at: datetime
    members: List[ConversationMemberResponse] = []
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    other_user: Optional[UserBase] = None  # for direct conversations

    class Config:
        from_attributes = True

class ReactionCreate(BaseModel):
    emoji: str

TokenResponse.model_rebuild()


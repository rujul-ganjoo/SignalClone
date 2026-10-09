export interface User {
  id: number;
  username: string;
  display_name: string;
  phone_number?: string | null;
  avatar_url?: string | null;
  status_text?: string | null;
  last_seen_at?: string | null;
  is_online?: boolean;
  created_at?: string;
}

export interface Contact {
  id: number;
  nickname?: string | null;
  created_at: string;
  contact_user: User;
}

export interface MessageReaction {
  id: number;
  user_id: number;
  user_name?: string | null;
  emoji: string;
  created_at: string;
}

export interface Attachment {
  id: number;
  filename: string;
  content_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
}

export interface MessageReceipt {
  id: number;
  user_id: number;
  status: 'sent' | 'delivered' | 'read';
  delivered_at?: string | null;
  read_at?: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender?: User;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  reply_to_message_id?: number | null;
  created_at: string;
  updated_at?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  receipts: MessageReceipt[];
  reactions: MessageReaction[];
  attachments: Attachment[];
}

export interface ConversationMember {
  id: number;
  user_id: number;
  role: 'admin' | 'member';
  joined_at: string;
  is_active: boolean;
  user: User;
}

export interface Conversation {
  id: number;
  type: 'direct' | 'group';
  title?: string | null;
  avatar_url?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  members: ConversationMember[];
  last_message?: Message | null;
  unread_count: number;
  other_user?: User | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

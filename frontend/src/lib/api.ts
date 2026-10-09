import {
  User,
  Contact,
  Conversation,
  Message,
  AuthResponse
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private getAuthHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('signal_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMsg = `Error ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.detail || errorData.message || errorMsg;
      } catch {
        // ignore json parse error
      }
      throw new Error(errorMsg);
    }

    if (res.status === 204) {
      return {} as T;
    }
    return res.json();
  }

  // Auth Endpoints
  async register(data: { username: string; display_name: string; password: string; phone_number?: string; avatar_url?: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { username_or_phone: string; password: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyOtp(data: { identifier: string; otp: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors on logout
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateMe(data: { display_name?: string; avatar_url?: string; status_text?: string }): Promise<User> {
    return this.request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Users
  async searchUsers(query: string): Promise<User[]> {
    return this.request<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return this.request<Contact[]>('/contacts');
  }

  async addContact(data: { contact_user_id?: number; username_or_phone?: string; nickname?: string }): Promise<Contact> {
    return this.request<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteContact(contactId: number): Promise<void> {
    return this.request<void>(`/contacts/${contactId}`, { method: 'DELETE' });
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/conversations');
  }

  async getConversation(id: number): Promise<Conversation> {
    return this.request<Conversation>(`/conversations/${id}`);
  }

  async createDirectConversation(targetUserId: number): Promise<Conversation> {
    return this.request<Conversation>('/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
  }

  async createGroupConversation(data: { title: string; member_user_ids: number[]; avatar_url?: string }): Promise<Conversation> {
    return this.request<Conversation>('/conversations/group', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addGroupMember(conversationId: number, data: { user_id: number; role?: string }): Promise<void> {
    return this.request<void>(`/conversations/${conversationId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeGroupMember(conversationId: number, targetUserId: number): Promise<void> {
    return this.request<void>(`/conversations/${conversationId}/members/${targetUserId}`, {
      method: 'DELETE',
    });
  }

  // Messages
  async getMessages(conversationId: number, limit = 50, beforeId?: number): Promise<Message[]> {
    let url = `/conversations/${conversationId}/messages?limit=${limit}`;
    if (beforeId) url += `&before_id=${beforeId}`;
    return this.request<Message[]>(url);
  }

  async sendMessage(conversationId: number, data: { content: string; message_type?: string; reply_to_message_id?: number; attachment_id?: number }): Promise<Message> {
    return this.request<Message>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markAsRead(conversationId: number): Promise<void> {
    return this.request<void>(`/conversations/${conversationId}/read`, {
      method: 'POST',
    });
  }

  async addReaction(messageId: number, emoji: string): Promise<void> {
    return this.request<void>(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  async removeReaction(messageId: number, emoji: string): Promise<void> {
    return this.request<void>(`/messages/${messageId}/reactions`, {
      method: 'DELETE',
      body: JSON.stringify({ emoji }),
    });
  }

  async editMessage(messageId: number, content: string): Promise<void> {
    return this.request<void>(`/messages/${messageId}?content=${encodeURIComponent(content)}`, {
      method: 'PATCH',
    });
  }

  async deleteMessage(messageId: number): Promise<void> {
    return this.request<void>(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // Upload
  async uploadFile(file: File): Promise<{ id: number; filename: string; content_type: string; file_size: number; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('signal_token') : null;

    const res = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Upload failed');
    }
    return res.json();
  }
}

export const api = new ApiClient();

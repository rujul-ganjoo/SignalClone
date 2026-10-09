import { create } from 'zustand';
import { Conversation, Message, User } from '@/types';
import { api } from '@/lib/api';
import { wsClient } from '@/lib/websocket';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: number | null;
  messages: Record<number, Message[]>; // conversationId -> messages
  typingUsers: Record<number, { userId: number; username: string } | null>; // conversationId -> typing user
  onlineUsers: Set<number>;
  isConnected: boolean;
  searchQuery: string;
  activeTab: 'chats' | 'calls' | 'stories' | 'settings';
  replyingTo: Message | null;
  isDetailsOpen: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: 'chats' | 'calls' | 'stories' | 'settings') => void;
  setReplyingTo: (msg: Message | null) => void;
  setIsDetailsOpen: (open: boolean) => void;
  loadConversations: () => Promise<void>;
  selectConversation: (conversationId: number) => Promise<void>;
  loadMessages: (conversationId: number) => Promise<void>;
  sendMessage: (content: string, attachmentId?: number) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  addReaction: (messageId: number, emoji: string) => Promise<void>;
  removeReaction: (messageId: number, emoji: string) => Promise<void>;
  markConversationRead: (conversationId: number) => Promise<void>;
  setupWebSocketListeners: (currentUserId: number) => () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),
  isConnected: false,
  searchQuery: '',
  activeTab: 'chats',
  replyingTo: null,
  isDetailsOpen: false,

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setReplyingTo: (msg) => set({ replyingTo: msg }),
  setIsDetailsOpen: (open) => set({ isDetailsOpen: open }),

  loadConversations: async () => {
    try {
      const convs = await api.getConversations();
      set({ conversations: convs });
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  },

  selectConversation: async (conversationId: number) => {
    set({ activeConversationId: conversationId, replyingTo: null });
    await get().loadMessages(conversationId);
    await get().markConversationRead(conversationId);
  },

  loadMessages: async (conversationId: number) => {
    try {
      const msgs = await api.getMessages(conversationId);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: msgs,
        },
      }));
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  },

  sendMessage: async (content: string, attachmentId?: number) => {
    const { activeConversationId, replyingTo } = get();
    if (!activeConversationId) return;

    const replyId = replyingTo?.id;
    set({ replyingTo: null });

    // Send via WebSocket if connected, fallback to REST
    wsClient.send({
      type: 'message.send',
      conversation_id: activeConversationId,
      content,
      message_type: attachmentId ? 'image' : 'text',
      reply_to_message_id: replyId,
      attachment_id: attachmentId,
    });
  },

  sendTyping: (isTyping: boolean) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    wsClient.send({
      type: isTyping ? 'typing.start' : 'typing.stop',
      conversation_id: activeConversationId,
    });
  },

  addReaction: async (messageId: number, emoji: string) => {
    try {
      await api.addReaction(messageId, emoji);
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
  },

  removeReaction: async (messageId: number, emoji: string) => {
    try {
      await api.removeReaction(messageId, emoji);
    } catch (err) {
      console.error('Failed to remove reaction:', err);
    }
  },

  markConversationRead: async (conversationId: number) => {
    try {
      await api.markAsRead(conversationId);
      // Reset unread count locally
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        ),
      }));
      wsClient.send({
        type: 'message.read',
        conversation_id: conversationId,
      });
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  },

  setupWebSocketListeners: (currentUserId: number) => {
    const unbindConn = wsClient.on('connection.state', (data: { connected: boolean }) => {
      set({ isConnected: data.connected });
    });

    const unbindMsgCreated = wsClient.on('message.created', (data: { conversation_id: number; message: Message }) => {
      const { conversation_id, message } = data;
      const { activeConversationId } = get();

      set((state) => {
        const convMessages = state.messages[conversation_id] || [];
        // Avoid duplicate
        if (convMessages.some((m) => m.id === message.id)) {
          return state;
        }

        const isCurrentActive = activeConversationId === conversation_id;

        // Update conversation list item last_message and unread_count
        const updatedConversations = state.conversations.map((c) => {
          if (c.id === conversation_id) {
            return {
              ...c,
              last_message: message,
              last_message_at: message.created_at,
              unread_count: isCurrentActive || message.sender_id === currentUserId
                ? 0
                : c.unread_count + 1,
            };
          }
          return c;
        }).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

        return {
          messages: {
            ...state.messages,
            [conversation_id]: [...convMessages, message],
          },
          conversations: updatedConversations,
        };
      });

      // If active conversation, auto mark as read
      if (activeConversationId === conversation_id && message.sender_id !== currentUserId) {
        get().markConversationRead(conversation_id);
      }
    });

    const unbindMsgDelivered = wsClient.on('message.delivered', (data: { conversation_id: number; message_id: number; user_id: number }) => {
      set((state) => {
        const msgs = state.messages[data.conversation_id];
        if (!msgs) return state;

        return {
          messages: {
            ...state.messages,
            [data.conversation_id]: msgs.map((m) =>
              m.id === data.message_id
                ? { ...m, status: m.status === 'read' ? 'read' : 'delivered' }
                : m
            ),
          },
        };
      });
    });

    const unbindMsgRead = wsClient.on('message.read', (data: { conversation_id: number; message_ids: number[]; user_id: number }) => {
      set((state) => {
        const msgs = state.messages[data.conversation_id];
        if (!msgs) return state;

        return {
          messages: {
            ...state.messages,
            [data.conversation_id]: msgs.map((m) =>
              data.message_ids.includes(m.id)
                ? { ...m, status: 'read' }
                : m
            ),
          },
        };
      });
    });

    const unbindTypingStart = wsClient.on('typing.start', (data: { conversation_id: number; user_id: number; username: string }) => {
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [data.conversation_id]: { userId: data.user_id, username: data.username },
        },
      }));
    });

    const unbindTypingStop = wsClient.on('typing.stop', (data: { conversation_id: number; user_id: number }) => {
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [data.conversation_id]: null,
        },
      }));
    });

    const unbindPresence = wsClient.on('presence.update', (data: { user_id: number; is_online: boolean }) => {
      set((state) => {
        const newSet = new Set(state.onlineUsers);
        if (data.is_online) {
          newSet.add(data.user_id);
        } else {
          newSet.delete(data.user_id);
        }
        return { onlineUsers: newSet };
      });
    });

    const unbindReactionAdd = wsClient.on('reaction.added', (data: { message_id: number; conversation_id: number; reaction: any }) => {
      set((state) => {
        const msgs = state.messages[data.conversation_id];
        if (!msgs) return state;

        return {
          messages: {
            ...state.messages,
            [data.conversation_id]: msgs.map((m) => {
              if (m.id !== data.message_id) return m;
              // Add reaction if not already present
              const reactions = m.reactions.filter(
                (r) => !(r.user_id === data.reaction.user_id && r.emoji === data.reaction.emoji)
              );
              return { ...m, reactions: [...reactions, data.reaction] };
            }),
          },
        };
      });
    });

    const unbindReactionRemove = wsClient.on('reaction.removed', (data: { message_id: number; conversation_id: number; user_id: number; emoji: string }) => {
      set((state) => {
        const msgs = state.messages[data.conversation_id];
        if (!msgs) return state;

        return {
          messages: {
            ...state.messages,
            [data.conversation_id]: msgs.map((m) => {
              if (m.id !== data.message_id) return m;
              return {
                ...m,
                reactions: m.reactions.filter(
                  (r) => !(r.user_id === data.user_id && r.emoji === data.emoji)
                ),
              };
            }),
          },
        };
      });
    });

    const unbindConvUpdated = wsClient.on('conversation.updated', (data: { conversation: Conversation }) => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === data.conversation.id ? data.conversation : c
        ),
      }));
    });

    return () => {
      unbindConn();
      unbindMsgCreated();
      unbindMsgDelivered();
      unbindMsgRead();
      unbindTypingStart();
      unbindTypingStop();
      unbindPresence();
      unbindReactionAdd();
      unbindReactionRemove();
      unbindConvUpdated();
    };
  },
}));


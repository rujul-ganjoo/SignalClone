'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { NavigationRail } from '@/components/navigation/NavigationRail';
import { ConversationSidebar } from '@/components/conversations/ConversationSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { ConversationDetailsDrawer } from '@/components/dialogs/ConversationDetailsDrawer';
import { NewMessageDialog } from '@/components/dialogs/NewMessageDialog';
import { NewGroupDialog } from '@/components/dialogs/NewGroupDialog';
import { SettingsDialog } from '@/components/dialogs/SettingsDialog';
import { FeaturePlaceholderDialog } from '@/components/dialogs/FeaturePlaceholderDialog';
import { MessageSquare, ShieldCheck } from 'lucide-react';

export const AppShell: React.FC = () => {
  const { user } = useAuthStore();
  const {
    conversations,
    activeConversationId,
    messages,
    loadConversations,
    setupWebSocketListeners,
    isDetailsOpen,
    setIsDetailsOpen,
  } = useChatStore();

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [placeholderFeature, setPlaceholderFeature] = useState<'calls' | 'stories' | 'devices' | null>(null);

  // Manage Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('signal_theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('signal_theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // Initial Data & WebSocket Lifecycle
  useEffect(() => {
    loadConversations();
    if (user?.id) {
      const cleanup = setupWebSocketListeners(user.id);
      return cleanup;
    }
  }, [user?.id]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 font-sans antialiased">
      {/* 1. Navigation Rail (Narrow Desktop Rail) */}
      <NavigationRail
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCallsPlaceholder={() => setPlaceholderFeature('calls')}
        onOpenStoriesPlaceholder={() => setPlaceholderFeature('stories')}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* 2. Conversations Sidebar */}
      <ConversationSidebar
        onOpenNewMessage={() => setIsNewMessageOpen(true)}
        onOpenNewGroup={() => setIsNewGroupOpen(true)}
      />

      {/* 3. Main Chat Viewport */}
      <main className="flex-1 flex flex-col h-full bg-[#f8f9fa] dark:bg-[#141416] relative overflow-hidden">
        {activeConversation ? (
          <>
            <ChatHeader
              conversation={activeConversation}
              onOpenCall={() => setPlaceholderFeature('calls')}
              onToggleDetails={() => setIsDetailsOpen(!isDetailsOpen)}
            />
            <MessageList
              conversation={activeConversation}
              messages={activeMessages}
            />
            <MessageComposer />
          </>
        ) : (
          /* Empty Chat Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="w-20 h-20 rounded-3xl bg-signal-blue/10 dark:bg-signal-blue/20 text-signal-blue flex items-center justify-center mb-5 shadow-inner">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Signal Desktop
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed mb-6">
              Send and receive messages with real-time delivery and privacy. Select a conversation on the left or start a new chat.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-zinc-800/60 px-3.5 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Simulated cryptographic channels active</span>
            </div>
          </div>
        )}
      </main>

      {/* 4. Contextual Details Drawer */}
      {activeConversation && isDetailsOpen && (
        <ConversationDetailsDrawer
          conversation={activeConversation}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}

      {/* Modals */}
      <NewMessageDialog
        isOpen={isNewMessageOpen}
        onClose={() => setIsNewMessageOpen(false)}
      />

      <NewGroupDialog
        isOpen={isNewGroupOpen}
        onClose={() => setIsNewGroupOpen(false)}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <FeaturePlaceholderDialog
        isOpen={placeholderFeature !== null}
        onClose={() => setPlaceholderFeature(null)}
        feature={placeholderFeature || 'calls'}
      />
    </div>
  );
};


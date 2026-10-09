'use client';

import React, { useState } from 'react';
import { Search, Plus, UserPlus, Users, X } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { ConversationListItem } from '@/components/conversations/ConversationListItem';
import { cn } from '@/lib/utils';

interface ConversationSidebarProps {
  onOpenNewMessage: () => void;
  onOpenNewGroup: () => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  onOpenNewMessage,
  onOpenNewGroup,
}) => {
  const { conversations, activeConversationId, selectConversation } = useChatStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'direct' | 'groups'>('all');

  const filteredConversations = conversations.filter((c) => {
    // 1. Filter by category
    if (filter === 'unread' && c.unread_count === 0) return false;
    if (filter === 'direct' && c.type !== 'direct') return false;
    if (filter === 'groups' && c.type !== 'group') return false;

    // 2. Filter by search term
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const title = (c.type === 'group' ? c.title : c.other_user?.display_name || c.title) || '';
    const otherUsername = c.other_user?.username || '';
    const otherPhone = c.other_user?.phone_number || '';
    const lastSnippet = c.last_message?.content || '';

    return (
      title.toLowerCase().includes(term) ||
      otherUsername.toLowerCase().includes(term) ||
      otherPhone.includes(term) ||
      lastSnippet.toLowerCase().includes(term)
    );
  });

  return (
    <aside className="w-80 md:w-88 lg:w-96 h-full flex flex-col bg-white dark:bg-[#1f2023] border-r border-[#e5e7eb] dark:border-[#27272a] shrink-0 select-none">
      {/* Header Bar */}
      <div className="p-3.5 pb-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Chats
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenNewGroup}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title="New Group"
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={onOpenNewMessage}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title="New Chat"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search chats, contacts..."
            className="w-full pl-9 pr-8 py-1.5 text-sm rounded-xl bg-[#f0f2f5] dark:bg-[#2b2c2f] border-none text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-signal-blue/50 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-2.5 px-0.5 overflow-x-auto no-scrollbar">
          {(['all', 'unread', 'direct', 'groups'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-full capitalize transition-colors whitespace-nowrap',
                filter === tab
                  ? 'bg-signal-blue text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-[#2b2c2f] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#343538]'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto py-1">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((c) => (
            <ConversationListItem
              key={c.id}
              conversation={c}
              isActive={activeConversationId === c.id}
              onClick={() => selectConversation(c.id)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-48 px-4 text-center text-gray-400 dark:text-gray-500">
            <Search className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No conversations found</p>
            <p className="text-xs mt-1">
              {searchTerm ? 'Try a different search term' : 'Click + above to start a new chat'}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};


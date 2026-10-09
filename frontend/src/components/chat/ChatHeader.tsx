'use client';

import React from 'react';
import { Phone, Video, Search, Info, MoreVertical } from 'lucide-react';
import { Conversation } from '@/types';
import { ContactAvatar } from '@/components/ui/ContactAvatar';
import { useChatStore } from '@/stores/chatStore';

interface ChatHeaderProps {
  conversation: Conversation;
  onOpenCall: () => void;
  onToggleDetails: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onOpenCall,
  onToggleDetails,
}) => {
  const { typingUsers, onlineUsers } = useChatStore();

  const isGroup = conversation.type === 'group';
  const title = isGroup
    ? conversation.title || 'Group'
    : conversation.other_user?.display_name || conversation.title || 'Chat';

  const avatarUrl = isGroup
    ? conversation.avatar_url
    : conversation.other_user?.avatar_url || conversation.avatar_url;

  const typing = typingUsers[conversation.id];

  const isOnline = !isGroup && conversation.other_user
    ? onlineUsers.has(conversation.other_user.id) || conversation.other_user.is_online
    : undefined;

  const renderSubtitle = () => {
    if (typing) {
      return (
        <span className="text-signal-blue font-medium animate-pulse">
          {typing.username} is typing...
        </span>
      );
    }
    if (isGroup) {
      const activeMembers = conversation.members.filter((m) => m.is_active);
      return <span>{activeMembers.length} members</span>;
    }
    if (isOnline) {
      return <span className="text-emerald-500 font-medium">Online</span>;
    }
    return <span className="text-gray-400">Signal contact</span>;
  };

  return (
    <header className="h-16 px-4 flex items-center justify-between border-b border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#18181a] select-none shrink-0 z-10">
      {/* Contact / Group Info */}
      <div
        onClick={onToggleDetails}
        className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
      >
        <ContactAvatar
          name={title}
          avatarUrl={avatarUrl}
          isOnline={isOnline}
          size="md"
        />
        <div className="flex flex-col">
          <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:underline">
            {title}
          </h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {renderSubtitle()}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
        <button
          onClick={onOpenCall}
          className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          title="Encrypted Voice Call"
        >
          <Phone className="w-5 h-5" />
        </button>
        <button
          onClick={onOpenCall}
          className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          title="Encrypted Video Call"
        >
          <Video className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleDetails}
          className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          title="Conversation details"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};


'use client';

import React from 'react';
import { Conversation } from '@/types';
import { ContactAvatar } from '@/components/ui/ContactAvatar';
import { MessageStatus } from '@/components/ui/MessageStatus';
import { formatConversationTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { Users } from 'lucide-react';

interface ConversationListItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const { user } = useAuthStore();
  const { onlineUsers } = useChatStore();

  const isGroup = conversation.type === 'group';
  const title = isGroup
    ? conversation.title || 'Group'
    : conversation.other_user?.display_name || conversation.title || 'Chat';

  const avatarUrl = isGroup
    ? conversation.avatar_url
    : conversation.other_user?.avatar_url || conversation.avatar_url;

  // Determine online status: for direct chat, check if other user is online
  const isOnline = !isGroup && conversation.other_user
    ? onlineUsers.has(conversation.other_user.id) || conversation.other_user.is_online
    : undefined;

  const lastMessage = conversation.last_message;
  const isOutgoing = lastMessage ? lastMessage.sender_id === user?.id : false;

  const renderSnippet = () => {
    if (!lastMessage) return <span className="italic text-gray-400">No messages yet</span>;

    let contentPreview = lastMessage.content;
    if (lastMessage.message_type === 'image') contentPreview = '📷 Photo';
    if (lastMessage.message_type === 'file') contentPreview = '📎 Attachment';
    if (lastMessage.message_type === 'system') return <span className="italic">{contentPreview}</span>;

    return (
      <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
        {isOutgoing && (
          <span className="shrink-0 text-gray-400">
            {lastMessage.status === 'read' ? '✓✓' : lastMessage.status === 'delivered' ? '✓✓' : '✓'}
          </span>
        )}
        {isGroup && !isOutgoing && lastMessage.sender && (
          <span className="font-medium text-gray-700 dark:text-gray-300 shrink-0">
            {lastMessage.sender.display_name.split(' ')[0]}:
          </span>
        )}
        <span className="truncate">{contentPreview}</span>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3.5 px-3 py-2.5 mx-2 my-0.5 rounded-xl cursor-pointer select-none transition-colors duration-150',
        isActive
          ? 'bg-[#e5e9f0] dark:bg-[#2c2d30] text-gray-900 dark:text-white'
          : 'hover:bg-[#ebedf0] dark:hover:bg-[#202124] text-gray-700 dark:text-gray-300'
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <ContactAvatar
          name={title}
          avatarUrl={avatarUrl}
          isOnline={isOnline}
          size="md"
        />
        {isGroup && (
          <div className="absolute -bottom-1 -right-1 bg-gray-600 text-white rounded-full p-0.5 shadow-sm">
            <Users className="w-2.5 h-2.5" />
          </div>
        )}
      </div>

      {/* Middle: Title & Snippet */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <span className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
            {title}
          </span>
          {lastMessage && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
              {formatConversationTime(lastMessage.created_at)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          <div className="truncate flex-1">{renderSnippet()}</div>

          {/* Unread Counter Badge */}
          {conversation.unread_count > 0 && (
            <span className="shrink-0 bg-signal-blue text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useEffect, useRef } from 'react';
import { Conversation, Message } from '@/types';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { formatDateSeparator } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';

interface MessageListProps {
  conversation: Conversation;
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({
  conversation,
  messages,
}) => {
  const { user } = useAuthStore();
  const { typingUsers } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const typing = typingUsers[conversation.id];
  const isGroup = conversation.type === 'group';

  // Map messages by id for reply lookups
  const messageMap = new Map<number, Message>();
  messages.forEach((m) => messageMap.set(m.id, m));

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-[#efeae2]/30 dark:bg-[#121214] select-text">
      {/* Intro info card */}
      <div className="flex flex-col items-center justify-center py-6 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-signal-blue/10 flex items-center justify-center text-signal-blue font-bold text-xl mb-2">
          {conversation.title?.[0] || '🔒'}
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          {conversation.type === 'group' ? conversation.title : conversation.other_user?.display_name || 'Signal Chat'}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mt-1">
          Messages in this chat are securely transmitted with real-time WebSocket delivery.
        </p>
      </div>

      {/* Render messages with date dividers */}
      {messages.map((msg, index) => {
        const isOutgoing = msg.sender_id === user?.id;
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

        // Check if date divider is needed
        const showDateDivider =
          !prevMsg ||
          new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

        // Check grouping
        const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id || showDateDivider;
        const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;

        const replyTo = msg.reply_to_message_id ? messageMap.get(msg.reply_to_message_id) : null;

        return (
          <React.Fragment key={msg.id}>
            {showDateDivider && (
              <div className="flex justify-center my-4 select-none">
                <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-gray-200/80 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 shadow-2xs">
                  {formatDateSeparator(msg.created_at)}
                </span>
              </div>
            )}

            <MessageBubble
              message={msg}
              isOutgoing={isOutgoing}
              isFirstInGroup={isFirstInGroup}
              isLastInGroup={isLastInGroup}
              showSenderName={isGroup && isFirstInGroup}
              replyToMessage={replyTo}
            />
          </React.Fragment>
        );
      })}

      {/* Typing Indicator Bubble */}
      {typing && (
        <div className="flex items-center gap-2 mt-2 ml-2 text-xs text-gray-500 dark:text-gray-400 select-none animate-in fade-in">
          <div className="bg-[#e9e9eb] dark:bg-[#2c2c2e] px-3.5 py-2 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
          </div>
          <span className="text-[11px] italic">{typing.username} is typing...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};


'use client';

import React, { useState } from 'react';
import { Message } from '@/types';
import { MessageStatus } from '@/components/ui/MessageStatus';
import { formatTime, cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { Reply, Smile, Trash2, Edit2 } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOutgoing: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showSenderName?: boolean;
  replyToMessage?: Message | null;
}

const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOutgoing,
  isFirstInGroup = true,
  isLastInGroup = true,
  showSenderName = false,
  replyToMessage,
}) => {
  const { user } = useAuthStore();
  const { setReplyingTo, addReaction, removeReaction } = useChatStore();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Group reactions by emoji
  const reactionCounts: Record<string, { count: number; users: string[]; hasReacted: boolean }> = {};
  message.reactions?.forEach((r) => {
    if (!reactionCounts[r.emoji]) {
      reactionCounts[r.emoji] = { count: 0, users: [], hasReacted: false };
    }
    reactionCounts[r.emoji].count += 1;
    if (r.user_name) reactionCounts[r.emoji].users.push(r.user_name);
    if (r.user_id === user?.id) reactionCounts[r.emoji].hasReacted = true;
  });

  const handleToggleReaction = async (emoji: string) => {
    if (reactionCounts[emoji]?.hasReacted) {
      await removeReaction(message.id, emoji);
    } else {
      await addReaction(message.id, emoji);
    }
    setShowEmojiPicker(false);
  };

  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs px-3 py-1 rounded-full bg-gray-200/60 dark:bg-zinc-800/80 text-gray-600 dark:text-gray-400 font-medium select-none shadow-2xs">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col my-0.5 select-text',
        isOutgoing ? 'items-end' : 'items-start',
        isFirstInGroup && 'mt-2'
      )}
    >
      {/* Group Sender Name */}
      {showSenderName && !isOutgoing && message.sender && (
        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 ml-3 mb-0.5 select-none">
          {message.sender.display_name}
        </span>
      )}

      <div className="relative max-w-[78%] sm:max-w-[70%] md:max-w-[65%]">
        {/* Hover Quick Actions Bar */}
        <div
          className={cn(
            'absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 p-1 rounded-full bg-white dark:bg-[#2c2d30] shadow-md border border-gray-200 dark:border-zinc-700 z-20',
            isOutgoing ? 'right-2' : 'left-2'
          )}
        >
          {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleToggleReaction(emoji)}
              className="hover:scale-125 transition-transform text-xs p-1 rounded-full"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500"
            title="React"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setReplyingTo(message)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-500"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Emoji Picker Popup */}
        {showEmojiPicker && (
          <div
            className={cn(
              'absolute bottom-full mb-1 flex items-center gap-1.5 p-1.5 rounded-full bg-white dark:bg-[#2c2d30] shadow-xl border border-gray-200 dark:border-zinc-700 z-30',
              isOutgoing ? 'right-0' : 'left-0'
            )}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                className="hover:scale-125 transition-transform text-lg p-1 rounded-full"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Bubble Box */}
        <div
          className={cn(
            'relative px-3.5 py-2 text-sm shadow-xs break-words whitespace-pre-wrap',
            isOutgoing
              ? 'bg-signal-blue text-white rounded-2xl rounded-tr-sm'
              : 'bg-[#e9e9eb] dark:bg-[#2c2c2e] text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm'
          )}
        >
          {/* Reply-to Card Preview */}
          {replyToMessage && (
            <div
              className={cn(
                'mb-2 px-2.5 py-1.5 rounded-lg border-l-3 text-xs flex flex-col',
                isOutgoing
                  ? 'bg-white/15 border-white text-white/90'
                  : 'bg-black/5 dark:bg-white/5 border-signal-blue text-gray-700 dark:text-gray-300'
              )}
            >
              <span className="font-semibold text-[11px]">
                {replyToMessage.sender?.display_name || 'Original message'}
              </span>
              <span className="truncate opacity-80">{replyToMessage.content}</span>
            </div>
          )}

          {/* Attachments if any */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 space-y-1">
              {message.attachments.map((att) => (
                <div key={att.id} className="rounded-lg overflow-hidden">
                  {att.content_type.startsWith('image/') ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${att.storage_path}`}
                      alt={att.filename}
                      className="max-h-60 rounded-lg object-cover cursor-pointer hover:opacity-95"
                    />
                  ) : (
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${att.storage_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-black/10 rounded text-xs underline"
                    >
                      📎 {att.filename} ({(att.file_size / 1024).toFixed(1)} KB)
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Message Content */}
          <div className="leading-relaxed">{message.content}</div>

          {/* Time & Receipt status checkmark */}
          <div
            className={cn(
              'flex items-center justify-end gap-1 mt-1 text-[10px] select-none',
              isOutgoing ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {message.edited_at && <span className="italic mr-0.5">edited</span>}
            <span>{formatTime(message.created_at)}</span>
            <MessageStatus
              status={message.status}
              isOutgoing={isOutgoing}
              className={isOutgoing ? 'text-white/80' : undefined}
            />
          </div>
        </div>

        {/* Reaction Badges Pill */}
        {Object.keys(reactionCounts).length > 0 && (
          <div
            className={cn(
              'flex flex-wrap gap-1 mt-1 z-10',
              isOutgoing ? 'justify-end' : 'justify-start'
            )}
          >
            {Object.entries(reactionCounts).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 text-xs rounded-full border shadow-2xs transition-transform active:scale-90',
                  data.hasReacted
                    ? 'bg-blue-50 border-signal-blue text-signal-blue dark:bg-blue-950/40 dark:border-signal-blue'
                    : 'bg-white border-gray-200 text-gray-700 dark:bg-[#2b2c2f] dark:border-zinc-700 dark:text-gray-300'
                )}
                title={data.users.join(', ')}
              >
                <span>{emoji}</span>
                {data.count > 1 && <span className="font-semibold text-[10px]">{data.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

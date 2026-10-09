'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, Image as ImageIcon } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const COMMON_EMOJIS = ['😊', '😂', '👍', '❤️', '🔥', '🎉', '🙏', '😍', '🤔', '👋', '👀', '💯'];

export const MessageComposer: React.FC = () => {
  const { sendMessage, sendTyping, replyingTo, setReplyingTo } = useChatStore();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Typing indicator
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setText('');
    sendTyping(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await api.uploadFile(file);
      await sendMessage(file.name, res.id);
      toast('File sent successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to upload file', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative border-t border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#18181a] px-3 py-2.5 shrink-0 select-none">
      {/* Replying-to Preview Bar */}
      {replyingTo && (
        <div className="flex items-center justify-between mb-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 border-l-4 border-signal-blue text-xs">
          <div className="truncate">
            <span className="font-semibold text-signal-blue mr-2">
              Replying to {replyingTo.sender?.display_name || 'Message'}:
            </span>
            <span className="text-gray-600 dark:text-gray-300 truncate">
              {replyingTo.content}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emoji Picker Menu */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 left-4 p-2 bg-white dark:bg-[#202124] rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-700 flex flex-wrap gap-2 max-w-xs z-30 animate-in fade-in">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setText((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              className="text-xl hover:scale-125 transition-transform p-1 rounded"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Controls */}
      <div className="flex items-end gap-2">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          title="Attach photo or document"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          title="Add emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Text Area */}
        <div className="flex-1 bg-[#f0f2f5] dark:bg-[#242528] rounded-2xl px-3.5 py-2 flex items-center min-h-[40px]">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="New message (Enter to send, Shift+Enter for newline)"
            className="w-full bg-transparent resize-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none max-h-28"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim()}
          className="p-2.5 rounded-full bg-signal-blue text-white hover:bg-signal-blue-hover disabled:opacity-40 disabled:hover:bg-signal-blue transition-all shadow-sm active:scale-95"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};


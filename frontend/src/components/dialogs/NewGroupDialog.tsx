'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import { Contact } from '@/types';
import { api } from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';
import { ContactAvatar } from '@/components/ui/ContactAvatar';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface NewGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewGroupDialog: React.FC<NewGroupDialogProps> = ({ isOpen, onClose }) => {
  const { selectConversation, loadConversations } = useChatStore();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getContacts().then(setContacts).catch(console.error);
      setTitle('');
      setSelectedUserIds([]);
    }
  }, [isOpen]);

  const toggleSelect = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast('Please enter a group name', 'error');
      return;
    }
    if (selectedUserIds.length === 0) {
      toast('Please select at least one member', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const conv = await api.createGroupConversation({
        title: title.trim(),
        member_user_ids: selectedUserIds,
      });
      await loadConversations();
      await selectConversation(conv.id);
      toast(`Group "${conv.title}" created`, 'success');
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to create group', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#202124] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-signal-blue" />
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              New Group
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Name Form */}
        <form onSubmit={handleCreateGroup} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-zinc-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Group Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design Team, Weekend Hikers"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-gray-100 dark:bg-zinc-800 border-none text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
                autoFocus
              />
            </div>
            <div className="text-xs text-gray-400">
              {selectedUserIds.length} member{selectedUserIds.length !== 1 ? 's' : ''} selected
            </div>
          </div>

          {/* Members Checklist */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Select Contacts
            </div>
            {contacts.length > 0 ? (
              contacts.map((c) => {
                const isSelected = selectedUserIds.includes(c.contact_user.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleSelect(c.contact_user.id)}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors select-none',
                      isSelected
                        ? 'bg-blue-50/60 dark:bg-signal-blue/10'
                        : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ContactAvatar
                        name={c.contact_user.display_name}
                        avatarUrl={c.contact_user.avatar_url}
                        size="md"
                      />
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {c.contact_user.display_name}
                        </div>
                        <div className="text-xs text-gray-400">
                          @{c.contact_user.username}
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-signal-blue border-signal-blue text-white'
                          : 'border-gray-300 dark:border-zinc-600'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-gray-400">
                No contacts available. Add contacts first or invite members!
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || selectedUserIds.length === 0}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-signal-blue text-white hover:bg-signal-blue-hover disabled:opacity-50 transition-colors shadow-xs"
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


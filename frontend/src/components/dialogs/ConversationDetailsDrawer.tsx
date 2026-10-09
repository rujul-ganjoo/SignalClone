'use client';

import React, { useState } from 'react';
import { X, UserPlus, LogOut, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { Conversation } from '@/types';
import { ContactAvatar } from '@/components/ui/ContactAvatar';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface ConversationDetailsDrawerProps {
  conversation: Conversation;
  isOpen: boolean;
  onClose: () => void;
}

export const ConversationDetailsDrawer: React.FC<ConversationDetailsDrawerProps> = ({
  conversation,
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const { loadConversations, selectConversation } = useChatStore();
  const { toast } = useToast();
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const isGroup = conversation.type === 'group';
  const title = isGroup
    ? conversation.title || 'Group'
    : conversation.other_user?.display_name || conversation.title || 'Chat';

  const avatarUrl = isGroup
    ? conversation.avatar_url
    : conversation.other_user?.avatar_url || conversation.avatar_url;

  const activeMembers = conversation.members.filter((m) => m.is_active);
  const myMembership = conversation.members.find((m) => m.user_id === user?.id && m.is_active);
  const isAdmin = myMembership?.role === 'admin';

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberUsername.trim()) return;

    try {
      setIsAdding(true);
      // Search user
      const users = await api.searchUsers(newMemberUsername.trim());
      const targetUser = users.find(
        (u) =>
          u.username.toLowerCase() === newMemberUsername.trim().toLowerCase() ||
          u.phone_number === newMemberUsername.trim()
      );

      if (!targetUser) {
        toast('User not found with that username or phone', 'error');
        return;
      }

      await api.addGroupMember(conversation.id, { user_id: targetUser.id, role: 'member' });
      await loadConversations();
      toast(`${targetUser.display_name} added to group`, 'success');
      setNewMemberUsername('');
      setShowAddMember(false);
    } catch (err: any) {
      toast(err.message || 'Failed to add member', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (targetUserId: number, targetName: string) => {
    if (!confirm(`Are you sure you want to remove ${targetName}?`)) return;
    try {
      await api.removeGroupMember(conversation.id, targetUserId);
      await loadConversations();
      toast(`${targetName} removed from group`, 'info');
    } catch (err: any) {
      toast(err.message || 'Failed to remove member', 'error');
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await api.removeGroupMember(conversation.id, user.id);
      await loadConversations();
      onClose();
      toast('You left the group', 'info');
    } catch (err: any) {
      toast(err.message || 'Failed to leave group', 'error');
    }
  };

  return (
    <aside className="w-80 lg:w-88 h-full bg-white dark:bg-[#18181a] border-l border-[#e5e7eb] dark:border-[#27272a] flex flex-col select-none shrink-0 z-20">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#e5e7eb] dark:border-[#27272a]">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          Chat Details
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Card */}
        <div className="flex flex-col items-center text-center">
          <ContactAvatar name={title} avatarUrl={avatarUrl} size="xl" className="mb-3" />
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          {!isGroup && conversation.other_user?.username && (
            <p className="text-xs text-gray-400 mt-0.5">@{conversation.other_user.username}</p>
          )}
          {!isGroup && conversation.other_user?.status_text && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic px-4">
              "{conversation.other_user.status_text}"
            </p>
          )}
        </div>

        {/* Group Members Section */}
        {isGroup && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Members ({activeMembers.length})
              </span>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="flex items-center gap-1 text-xs text-signal-blue hover:underline font-medium"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Member
                </button>
              )}
            </div>

            {/* Add Member Form */}
            {showAddMember && (
              <form onSubmit={handleAddMember} className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl space-y-2">
                <input
                  type="text"
                  value={newMemberUsername}
                  onChange={(e) => setNewMemberUsername(e.target.value)}
                  placeholder="Enter username or phone..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-signal-blue"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddMember(false)}
                    className="px-2.5 py-1 text-xs text-gray-500 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding || !newMemberUsername.trim()}
                    className="px-3 py-1 text-xs font-semibold bg-signal-blue text-white rounded hover:bg-signal-blue-hover disabled:opacity-50"
                  >
                    {isAdding ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </form>
            )}

            {/* Members List */}
            <div className="space-y-1">
              {activeMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ContactAvatar
                      name={m.user.display_name}
                      avatarUrl={m.user.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                        {m.user.display_name}
                        {m.user.id === user?.id && <span className="text-[10px] text-gray-400 font-normal">(You)</span>}
                      </div>
                      <div className="text-[10px] text-gray-400">@{m.user.username}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {m.role === 'admin' ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-signal-blue bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                        <Shield className="w-2.5 h-2.5" /> Admin
                      </span>
                    ) : (
                      isAdmin && m.user_id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(m.user_id, m.user.display_name)}
                          className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
                          title="Remove from group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Leave Group Button */}
            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
              <button
                onClick={handleLeaveGroup}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave Group
              </button>
            </div>
          </div>
        )}

        {/* Security & Encryption Card */}
        <div className="p-3.5 bg-blue-50/50 dark:bg-zinc-800/40 rounded-2xl border border-blue-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-signal-blue font-semibold text-xs mb-1">
            <Shield className="w-4 h-4" />
            Signal Safety Number
          </div>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
            All messages, calls, and attachments are delivered over encrypted sessions. Verification keys match.
          </p>
        </div>
      </div>
    </aside>
  );
};

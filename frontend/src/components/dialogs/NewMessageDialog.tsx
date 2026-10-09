'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { User, Contact } from '@/types';
import { api } from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';
import { ContactAvatar } from '@/components/ui/ContactAvatar';
import { useToast } from '@/components/ui/Toast';

interface NewMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewMessageDialog: React.FC<NewMessageDialogProps> = ({ isOpen, onClose }) => {
  const { selectConversation, loadConversations } = useChatStore();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getContacts().then(setContacts).catch(console.error);
      setQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const res = await api.searchUsers(val);
      setSearchResults(res);
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartChat = async (targetUserId: number) => {
    try {
      const conv = await api.createDirectConversation(targetUserId);
      await loadConversations();
      await selectConversation(conv.id);
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to start conversation', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#202124] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            New Message
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, username or phone number..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-gray-100 dark:bg-zinc-800 border-none text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
              autoFocus
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2">
          {query.trim() ? (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Search Results
              </div>
              {searchResults.length > 0 ? (
                searchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleStartChat(u.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ContactAvatar name={u.display_name} avatarUrl={u.avatar_url} size="md" />
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {u.display_name}
                        </div>
                        <div className="text-xs text-gray-400">@{u.username}</div>
                      </div>
                    </div>
                    <button className="text-xs font-medium text-signal-blue bg-signal-blue/10 px-3 py-1.5 rounded-lg hover:bg-signal-blue/20">
                      Message
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-gray-400">
                  {isSearching ? 'Searching...' : 'No users found matching query'}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Your Contacts
              </div>
              {contacts.length > 0 ? (
                contacts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleStartChat(c.contact_user.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
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
                    <button className="text-xs font-medium text-signal-blue bg-signal-blue/10 px-3 py-1.5 rounded-lg hover:bg-signal-blue/20">
                      Message
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-gray-400">
                  Type a name or username above to find people on Signal
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


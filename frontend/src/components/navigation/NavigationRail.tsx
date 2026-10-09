'use client';

import React from 'react';
import { MessageSquare, Phone, Disc, Settings, Sun, Moon, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { ContactAvatar } from '@/components/ui/ContactAvatar';
import { cn } from '@/lib/utils';

interface NavigationRailProps {
  onOpenSettings: () => void;
  onOpenCallsPlaceholder: () => void;
  onOpenStoriesPlaceholder: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  onOpenSettings,
  onOpenCallsPlaceholder,
  onOpenStoriesPlaceholder,
  theme,
  onToggleTheme,
}) => {
  const { user, logout } = useAuthStore();
  const { conversations, activeTab, setActiveTab } = useChatStore();

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  return (
    <aside className="w-16 h-full flex flex-col items-center justify-between py-4 bg-[#f0f2f5] dark:bg-[#18181a] border-r border-[#e5e7eb] dark:border-[#27272a] select-none z-20 shrink-0">
      {/* Top Section: User Avatar & Main Tabs */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* User Profile Avatar */}
        <button
          onClick={onOpenSettings}
          className="relative group transition-transform active:scale-95"
          title={`Signed in as ${user?.display_name || user?.username} (Click to open Settings)`}
        >
          <ContactAvatar
            name={user?.display_name || user?.username || 'User'}
            avatarUrl={user?.avatar_url}
            isOnline={true}
            size="md"
          />
        </button>

        {/* Navigation Items */}
        <div className="flex flex-col items-center gap-2 w-full px-2">
          {/* Chats Tab */}
          <button
            onClick={() => setActiveTab('chats')}
            className={cn(
              'relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors',
              activeTab === 'chats'
                ? 'bg-signal-blue text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800'
            )}
            title="Chats"
          >
            <MessageSquare className="w-5 h-5" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-signal-blue border-2 border-white dark:border-[#18181a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </button>

          {/* Calls (Coming Soon) */}
          <button
            onClick={onOpenCallsPlaceholder}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
            title="Calls (Encrypted Voice & Video - Coming Soon)"
          >
            <Phone className="w-5 h-5" />
          </button>

          {/* Stories (Coming Soon) */}
          <button
            onClick={onOpenStoriesPlaceholder}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
            title="Stories (Coming Soon)"
          >
            <Disc className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Section: Theme Toggle, Settings, Logout */}
      <div className="flex flex-col items-center gap-2 w-full px-2">
        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          title="Log out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};


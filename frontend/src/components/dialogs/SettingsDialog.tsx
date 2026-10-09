'use client';

import React, { useState } from 'react';
import { X, User, Shield, Bell, Palette, Laptop, Info, Check, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ContactAvatar } from '@/components/ui/ContactAvatar';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type TabType = 'profile' | 'privacy' | 'notifications' | 'appearance' | 'devices' | 'about';

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
}) => {
  const { user, updateProfile, logout } = useAuthStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Profile Form State
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [statusText, setStatusText] = useState(user?.status_text || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateProfile({
        display_name: displayName.trim(),
        status_text: statusText.trim(),
        avatar_url: avatarUrl.trim() || undefined,
      });
      toast('Profile updated successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const navItems = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'devices' as const, label: 'Linked Devices', icon: Laptop },
    { id: 'about' as const, label: 'About', icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#202124] rounded-2xl w-full max-w-2xl h-[560px] shadow-2xl border border-gray-200 dark:border-zinc-800 flex overflow-hidden">
        {/* Left Settings Sidebar */}
        <div className="w-56 bg-gray-50/70 dark:bg-[#18181a] border-r border-gray-200 dark:border-zinc-800 p-3 flex flex-col justify-between shrink-0 select-none">
          <div>
            <div className="flex items-center justify-between px-3 py-2 mb-2">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Settings</h2>
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors',
                      isActive
                        ? 'bg-signal-blue text-white shadow-xs'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-zinc-800'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>

        {/* Right Settings Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#202124]">
          {/* Header */}
          <div className="h-14 px-6 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 shrink-0">
            <h3 className="font-semibold text-sm capitalize text-gray-900 dark:text-gray-100">
              {activeTab}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                <div className="flex items-center gap-4 mb-4">
                  <ContactAvatar
                    name={user?.display_name || 'User'}
                    avatarUrl={avatarUrl || user?.avatar_url}
                    size="xl"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                      {user?.display_name}
                    </h4>
                    <p className="text-xs text-gray-400">@{user?.username}</p>
                    <p className="text-xs text-gray-400">{user?.phone_number || 'No phone set'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Status / About
                  </label>
                  <input
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    placeholder="Hey there! I am using Signal."
                    className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Avatar Image URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 text-sm font-semibold rounded-xl bg-signal-blue text-white hover:bg-signal-blue-hover disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-4 max-w-md">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Choose your Signal interface theme preference.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (theme !== 'light') onToggleTheme();
                    }}
                    className={cn(
                      'p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all',
                      theme === 'light'
                        ? 'border-signal-blue bg-blue-50/50 text-signal-blue font-bold'
                        : 'border-gray-200 dark:border-zinc-700 hover:border-gray-400 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <div className="w-12 h-8 rounded bg-white border shadow-xs flex items-center justify-center text-xs">
                      Aa
                    </div>
                    <span className="text-xs">Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (theme !== 'dark') onToggleTheme();
                    }}
                    className={cn(
                      'p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all',
                      theme === 'dark'
                        ? 'border-signal-blue bg-signal-blue/10 text-signal-blue font-bold'
                        : 'border-gray-200 dark:border-zinc-700 hover:border-gray-400 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <div className="w-12 h-8 rounded bg-[#18181a] border border-zinc-700 shadow-xs flex items-center justify-center text-xs text-white">
                      Aa
                    </div>
                    <span className="text-xs">Dark</span>
                  </button>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-4 text-xs text-gray-600 dark:text-gray-300 max-w-md">
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900">
                  <h4 className="font-bold text-signal-blue mb-1">Encrypted Communication</h4>
                  <p className="leading-relaxed">
                    Signal Clone protects your conversations with encrypted channels. Notice: This educational prototype simulates cryptography over secure WebSockets.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                    <span>Read receipts</span>
                    <span className="text-emerald-500 font-semibold">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                    <span>Typing indicators</span>
                    <span className="text-emerald-500 font-semibold">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                    <span>Screen security</span>
                    <span className="text-gray-400">Available on Mobile</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-3 max-w-md text-xs text-gray-600 dark:text-gray-300">
                <p>Notification settings for incoming messages and alerts.</p>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                    <span>In-app sound</span>
                    <span className="text-signal-blue font-semibold">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                    <span>Desktop notifications</span>
                    <span className="text-signal-blue font-semibold">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                    <span>Message preview</span>
                    <span className="text-signal-blue font-semibold">Name and message</span>
                  </div>
                </div>
              </div>
            )}

            {/* Linked Devices Tab */}
            {activeTab === 'devices' && (
              <div className="space-y-3 max-w-md text-xs text-gray-600 dark:text-gray-300">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">Current Web Session</div>
                    <div className="text-gray-400 text-[11px]">Active now · Antigravity IDE Desktop</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 text-[10px] font-semibold">
                    Online
                  </span>
                </div>
                <p className="text-gray-400 text-[11px]">
                  Linking secondary devices is supported via Signal QR verification.
                </p>
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300 max-w-md leading-relaxed">
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Signal Messenger Clone
                </h4>
                <p>
                  Built as a full-stack production assignment recreating Signal Desktop’s interface, real-time messaging, delivery states, and groups.
                </p>
                <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl space-y-1 font-mono text-[11px]">
                  <div>Version: 1.0.0</div>
                  <div>Stack: Next.js + FastAPI + SQLite + WebSockets</div>
                  <div>Developer: SDE Fullstack Assignment</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

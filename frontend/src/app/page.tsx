'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { AppShell } from '@/components/layout/AppShell';
import { AuthPage } from '@/components/auth/AuthPage';

export default function Home() {
  const { isAuthenticated, isLoading, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#121214] text-white">
        <div className="w-12 h-12 rounded-2xl bg-signal-blue flex items-center justify-center mb-4 animate-pulse">
          <span className="text-xl font-bold">💬</span>
        </div>
        <p className="text-sm font-medium text-gray-400">Loading Signal...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <AppShell />;
}

import { create } from 'zustand';
import { User } from '@/types';
import { api } from '@/lib/api';
import { wsClient } from '@/lib/websocket';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  login: (usernameOrPhone: string, password: string) => Promise<void>;
  register: (data: { username: string; display_name: string; password: string; phone_number?: string }) => Promise<void>;
  verifyOtp: (identifier: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { display_name?: string; avatar_url?: string; status_text?: string }) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  initAuth: async () => {
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }

    const savedToken = localStorage.getItem('signal_token');
    if (!savedToken) {
      set({ isLoading: false, isAuthenticated: false, user: null, token: null });
      return;
    }

    try {
      const me = await api.getMe();
      set({
        user: me,
        token: savedToken,
        isAuthenticated: true,
        isLoading: false,
      });
      wsClient.connect(savedToken);
    } catch {
      localStorage.removeItem('signal_token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  login: async (usernameOrPhone: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login({ username_or_phone: usernameOrPhone, password });
      localStorage.setItem('signal_token', res.access_token);
      set({
        user: res.user,
        token: res.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
      wsClient.connect(res.access_token);
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Login failed' });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.register(data);
      localStorage.setItem('signal_token', res.access_token);
      set({
        user: res.user,
        token: res.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
      wsClient.connect(res.access_token);
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Registration failed' });
      throw err;
    }
  },

  verifyOtp: async (identifier: string, otp: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.verifyOtp({ identifier, otp });
      localStorage.setItem('signal_token', res.access_token);
      set({
        user: res.user,
        token: res.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
      wsClient.connect(res.access_token);
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'OTP verification failed' });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    }
    localStorage.removeItem('signal_token');
    wsClient.disconnect();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  updateProfile: async (data) => {
    try {
      const updatedUser = await api.updateMe(data);
      set({ user: updatedUser });
    } catch (err: any) {
      set({ error: err.message || 'Failed to update profile' });
      throw err;
    }
  },
}));


'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/Toast';
import { MessageSquare, Shield, KeyRound, Sparkles, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AuthPage: React.FC = () => {
  const { login, register, verifyOtp, isLoading } = useAuthStore();
  const { toast } = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'otp'>('login');

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [identifierForOtp, setIdentifierForOtp] = useState('');

  const demoAccounts = [
    { username: 'sarah', name: 'Sarah Connor', role: 'Security Lead' },
    { username: 'alex', name: 'Alex Rivera', role: 'Core Dev' },
    { username: 'elena', name: 'Elena Rostova', role: 'UX Designer' },
    { username: 'marcus', name: 'Marcus Vance', role: 'Explorer' },
    { username: 'priya', name: 'Priya Sharma', role: 'Distributed Eng' },
    { username: 'david', name: 'David Chen', role: 'Protocol Eng' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username.trim(), password);
      toast('Signed in successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Login failed', 'error');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({
        username: username.trim(),
        display_name: displayName.trim(),
        password,
        phone_number: phone.trim() || undefined,
      });
      toast('Account created! Signed in.', 'success');
    } catch (err: any) {
      toast(err.message || 'Registration failed', 'error');
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyOtp(identifierForOtp.trim(), otp.trim());
      toast('OTP verified! Signed in.', 'success');
    } catch (err: any) {
      toast(err.message || 'OTP verification failed', 'error');
    }
  };

  const handleQuickDemoLogin = async (uName: string) => {
    try {
      await login(uName, 'password123');
      toast(`Signed in as demo user ${uName}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Quick login failed', 'error');
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-[#121214] p-4 text-gray-900 dark:text-gray-100 select-none">
      <div className="w-full max-w-md bg-white dark:bg-[#1f2023] rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-signal-blue text-white flex items-center justify-center mb-3 shadow-lg shadow-signal-blue/30">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Signal Messenger</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Say "hello" to a private messenger experience.
          </p>
        </div>

        {/* Tab Switcher (Login / Register / OTP) */}
        <div className="grid grid-cols-3 p-1 mb-6 bg-gray-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setMode('login')}
            className={cn(
              'py-2 rounded-lg transition-all',
              mode === 'login'
                ? 'bg-white dark:bg-[#2b2c2f] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={cn(
              'py-2 rounded-lg transition-all',
              mode === 'register'
                ? 'bg-white dark:bg-[#2b2c2f] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            Register
          </button>
          <button
            onClick={() => setMode('otp')}
            className={cn(
              'py-2 rounded-lg transition-all',
              mode === 'otp'
                ? 'bg-white dark:bg-[#2b2c2f] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            Mock OTP
          </button>
        </div>

        {/* Form: Sign In */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Username or Phone Number
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. sarah or +15550101"
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-signal-blue text-white font-semibold text-sm hover:bg-signal-blue-hover disabled:opacity-50 transition-colors shadow-md shadow-signal-blue/20"
            >
              {isLoading ? 'Signing in...' : 'Continue'}
            </button>
          </form>
        )}

        {/* Form: Register */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. john_doe"
                required
                className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. John Doe"
                required
                className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Phone Number (optional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 0199"
                className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password"
                required
                className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-signal-blue text-white font-semibold text-sm hover:bg-signal-blue-hover disabled:opacity-50 transition-colors shadow-md shadow-signal-blue/20"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Form: Mock OTP */}
        {mode === 'otp' && (
          <form onSubmit={handleOtpVerify} className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
              💡 For assignment demonstration, the fixed OTP is <span className="font-mono font-bold">123456</span>.
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Username or Phone Number
              </label>
              <input
                type="text"
                value={identifierForOtp}
                onChange={(e) => setIdentifierForOtp(e.target.value)}
                placeholder="e.g. sarah or +15550101"
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                6-Digit Verification Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  required
                  className="flex-1 px-3.5 py-2.5 text-center text-lg tracking-widest font-mono font-bold rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
                />
                <button
                  type="button"
                  onClick={() => setOtp('123456')}
                  className="px-3 py-2 text-xs font-semibold bg-gray-200 dark:bg-zinc-700 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Fill 123456
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-signal-blue text-white font-semibold text-sm hover:bg-signal-blue-hover disabled:opacity-50 transition-colors shadow-md shadow-signal-blue/20"
            >
              {isLoading ? 'Verifying...' : 'Verify Code & Sign In'}
            </button>
          </form>
        )}

        {/* Quick Demo Switcher Section */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            <UserCheck className="w-3.5 h-3.5 text-signal-blue" />
            <span>One-Click Demo Accounts</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.username}
                type="button"
                onClick={() => handleQuickDemoLogin(acc.username)}
                className="flex flex-col items-start p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 hover:bg-blue-50/70 dark:hover:bg-zinc-800 hover:border-signal-blue border border-transparent transition-all text-left group"
              >
                <div className="font-semibold text-xs text-gray-900 dark:text-gray-100 group-hover:text-signal-blue">
                  {acc.name}
                </div>
                <div className="text-[10px] text-gray-400">@{acc.username}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer footer */}
        <p className="mt-6 text-[11px] text-gray-400 dark:text-gray-500 text-center leading-relaxed">
          Educational Clone for Scaler SDE Assignment. Real end-to-end Signal Protocol cryptography is simulated over WebSockets.
        </p>
      </div>
    </div>
  );
};

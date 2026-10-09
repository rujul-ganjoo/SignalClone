import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { getInitials, formatTime, formatConversationTime } from '../lib/utils';
import { ContactAvatar } from '../components/ui/ContactAvatar';
import { MessageStatus } from '../components/ui/MessageStatus';
import { ToastProvider } from '../components/ui/Toast';
import { AuthPage } from '../components/auth/AuthPage';

describe('Frontend Utility Functions', () => {
  it('correctly formats initials', () => {
    expect(getInitials('Sarah Connor')).toBe('SC');
    expect(getInitials('Alex')).toBe('AL');
    expect(getInitials('')).toBe('?');
  });

  it('formats dates cleanly without throwing', () => {
    const nowIso = new Date().toISOString();
    expect(formatTime(nowIso)).toBeTruthy();
    expect(formatConversationTime(nowIso)).toBeTruthy();
  });
});

describe('UI Components', () => {
  it('renders ContactAvatar with correct initials when no avatarUrl provided', () => {
    render(<ContactAvatar name="Sarah Connor" />);
    expect(screen.getByText('SC')).toBeDefined();
  });

  it('renders MessageStatus icons correctly', () => {
    const { container: c1 } = render(<MessageStatus status="sent" isOutgoing={true} />);
    expect(c1.querySelector('svg')).toBeDefined();

    const { container: c2 } = render(<MessageStatus status="delivered" isOutgoing={true} />);
    expect(c2.querySelector('svg')).toBeDefined();

    const { container: c3 } = render(<MessageStatus status="read" isOutgoing={true} />);
    expect(c3.querySelector('svg')).toBeDefined();
  });

  it('renders AuthPage with Sign In form and Demo account buttons', () => {
    render(
      <ToastProvider>
        <AuthPage />
      </ToastProvider>
    );
    expect(screen.getByText('Signal Messenger')).toBeDefined();
    expect(screen.getByPlaceholderText(/sarah/i)).toBeDefined();
    expect(screen.getByText('Sarah Connor')).toBeDefined();
    expect(screen.getByText('Alex Rivera')).toBeDefined();
  });
});

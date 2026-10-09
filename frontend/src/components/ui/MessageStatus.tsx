import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageStatusProps {
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  className?: string;
  isOutgoing?: boolean;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({
  status = 'sent',
  className,
  isOutgoing = true,
}) => {
  if (!isOutgoing) return null;

  switch (status) {
    case 'sending':
      return <Clock className={cn('w-3 h-3 text-white/70 animate-spin', className)} />;
    case 'sent':
      return <Check className={cn('w-3.5 h-3.5 text-white/75', className)} />;
    case 'delivered':
      return <CheckCheck className={cn('w-3.5 h-3.5 text-white/75', className)} />;
    case 'read':
      return <CheckCheck className={cn('w-3.5 h-3.5 text-white font-bold', className)} />;
    default:
      return <Check className={cn('w-3.5 h-3.5 text-white/75', className)} />;
  }
};

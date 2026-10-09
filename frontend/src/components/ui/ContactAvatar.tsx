import React from 'react';
import { cn, getAvatarColor, getInitials } from '@/lib/utils';

interface ContactAvatarProps {
  name: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ContactAvatar: React.FC<ContactAvatarProps> = ({
  name,
  avatarUrl,
  isOnline,
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const badgeSizeClasses = {
    sm: 'w-2.5 h-2.5 border',
    md: 'w-3 h-3 border-[1.5px]',
    lg: 'w-3.5 h-3.5 border-2',
    xl: 'w-4 h-4 border-2',
  };

  const [imgError, setImgError] = React.useState(false);

  return (
    <div className={cn('relative inline-flex flex-shrink-0 items-center justify-center', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center font-medium text-white select-none',
          sizeClasses[size],
          !avatarUrl || imgError ? getAvatarColor(name) : 'bg-gray-200 dark:bg-gray-700'
        )}
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-white dark:border-[#18181a]',
            badgeSizeClasses[size],
            isOnline ? 'bg-emerald-500' : 'bg-gray-400'
          )}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

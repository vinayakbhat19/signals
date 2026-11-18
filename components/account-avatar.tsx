'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { cn } from '@/lib/utils';

interface AccountAvatarProps {
  size?: 'sm' | 'md';
  className?: string;
}

function getInitials(
  fullName?: string | null,
  email?: string | null
): string | null {
  const cleaned = (fullName || '').trim().replace(/\s+/g, ' ');
  if (cleaned) {
    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 1).toUpperCase();
  }
  const local = (email || '').split('@')[0]?.trim();
  if (local) {
    const tokens = local.split(/[._-]+/).filter(Boolean);
    if (tokens.length >= 2) {
      return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toUpperCase();
    }
    return local[0].toUpperCase();
  }
  return null;
}

export function AccountAvatar({ size = 'md', className }: AccountAvatarProps) {
  const { user, profile } = useAuth();
  const metaName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : null;
  const initials = user
    ? getInitials(profile?.full_name || metaName, user.email)
    : null;

  return (
    <Link
      href={user ? '/account/' : '/login/'}
      aria-label={user ? 'My account' : 'Log in or create account'}
      title={user ? profile?.full_name || user.email || 'My account' : 'Log in'}
      className={cn(
        'flex shrink-0 items-center justify-center bg-[#FF4FD8] font-extrabold text-[#12091E] border-2 border-[#12091E] transition-transform hover:rotate-0',
        size === 'sm'
          ? 'size-10 rounded-[13px] text-sm rotate-3'
          : 'size-[42px] rounded-[14px] text-sm rotate-4',
        className
      )}
    >
      {initials ? (
        <span className="tracking-tight leading-none">{initials}</span>
      ) : (
        <User className="size-5 stroke-[2.4]" aria-hidden="true" />
      )}
    </Link>
  );
}

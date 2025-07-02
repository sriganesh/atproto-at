'use client';

import Link from 'next/link';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { useAuthMode } from '@/app/components/auth/AuthModeProvider';
import { BADGE_TYPES, CURRENT_BADGE } from '@/app/utils/badges';

export default function FooterBadgeLink() {
  const { session } = useAuth();
  const { isDeveloperMode } = useAuthMode();
  
  // Only show for logged-in users in developer mode
  if (!session || !isDeveloperMode) {
    return null;
  }
  
  const currentBadgeConfig = BADGE_TYPES[CURRENT_BADGE];
  if (!currentBadgeConfig) {
    return null;
  }
  
  return (
    <>
      <span className="text-gray-400">•</span>
      <Link
        href="/badges"
        className="text-lg text-gray-500 hover:text-blue-500 transition-all hover:scale-110"
        title={`Get ${currentBadgeConfig.title}`}
      >
        {currentBadgeConfig.emoji}
      </Link>
    </>
  );
}
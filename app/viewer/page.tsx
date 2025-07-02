'use client';

import { Suspense } from 'react';
import ViewerContent from '../components/viewer/ViewerContent';
import Link from 'next/link';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import TidClock from '../components/ui/TidClock';
import LoginButton from '../components/auth/LoginButton';
import UserMenu from '../components/auth/UserMenu';
import FooterBadgeLink from '../components/badges/FooterBadgeLink';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Client Component with TID functionality
export default function ViewerPage() {

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold transition-colors hover:text-blue-700">
          <span>atproto.</span><span className="text-blue-500">at://</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <LoginButton />
          <UserMenu />
        </div>
      </div>
      
      {/* Critical: Wrap client component with Suspense to fix useSearchParams warning */}
      <Suspense fallback={<LoadingIndicator message="Loading viewer..." />}>
        <ViewerContent />
      </Suspense>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400 space-y-2">
        <p className="mb-2">
          <span className="font-semibold">atproto.at</span> - All-in-one AT Protocol Explorer
        </p>
        <TidClock />
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="/privacy" className="text-gray-500 hover:text-blue-500 hover:underline">Privacy</a>
          <span className="text-gray-400">•</span>
          <a href="/terms" className="text-gray-500 hover:text-blue-500 hover:underline">Terms</a>
          <span className="text-gray-400">•</span>

          <a href="https://github.com/sriganesh/atproto-at" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500 hover:underline">Source Code</a>
        </div>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="https://bsky.app/profile/atproto.at" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@atproto.at</a>
          <span className="text-gray-400">•</span>
          <a href="https://bsky.app/profile/sri.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@sri.xyz</a>
          <FooterBadgeLink />
        </div>
      </div>
    </div>
  );
} 
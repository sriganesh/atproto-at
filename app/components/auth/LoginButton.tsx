'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { usePathname } from 'next/navigation';

export default function LoginButton() {
  const { session, isLoading } = useAuth();
  const pathname = usePathname();

  // Don't show login button if already logged in
  if (session || isLoading) {
    return null;
  }

  // Check if we're on the homepage
  const isHomepage = pathname === '/';

  // Mobile avatar style for non-homepage views
  if (!isHomepage) {
    return (
      <>
        {/* Mobile: Show as avatar button */}
        <Link
          href="/auth/login"
          className="sm:hidden w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition text-sm font-semibold"
          aria-label="Sign In"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </Link>
        
        {/* Desktop: Show regular button */}
        <Link
          href="/auth/login"
          className="hidden sm:inline-block px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition text-sm font-medium"
        >
          Sign In
        </Link>
      </>
    );
  }

  // Homepage: Always show regular button
  return (
    <Link
      href="/auth/login"
      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition text-sm font-medium"
    >
      Sign In
    </Link>
  );
}
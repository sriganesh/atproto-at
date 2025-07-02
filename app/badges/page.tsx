'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { useAuthMode } from '@/app/components/auth/AuthModeProvider';
import { useAuthenticatedRequest } from '@/app/hooks/useAuthenticatedRequest';
import SupporterBadgeModal from '@/app/components/supporter/SupporterBadgeModal';
import { BADGE_TYPES, CURRENT_BADGE } from '@/app/utils/badges';
import LoginButton from '@/app/components/auth/LoginButton';
import UserMenu from '@/app/components/auth/UserMenu';

export default function BadgesPage() {
  const { session } = useAuth();
  const { isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const currentBadgeConfig = BADGE_TYPES[CURRENT_BADGE];

  // Load user badges when page loads and user is authenticated
  useEffect(() => {
    if (session && isDeveloperMode) {
      setIsLoading(true);
      executeRequest(async (agent) => {
        try {
          const response = await agent.com.atproto.repo.listRecords({
            repo: session.did,
            collection: 'at.atproto.supporter.badge',
            limit: 100
          });
          const badgeTypes = response.data.records.map(record => 
            record.uri.split('/').pop() || ''
          );
          setUserBadges(badgeTypes);
        } catch (err) {
          console.error('Failed to load badges:', err);
          setUserBadges([]);
        }
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [session, isDeveloperMode, executeRequest]);

  const hasCurrentBadge = userBadges.includes(CURRENT_BADGE);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-[100]">
        <LoginButton />
        <UserMenu />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back link */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-blue-500 hover:underline mb-8"
        >
          ← Back to home
        </Link>

        {/* Page title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">
            <span className="text-2xl">🏅</span> Supporter Badges
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Collect badges to show your support for atproto.at
          </p>
        </div>

        {!session || !isDeveloperMode ? (
          // Not logged in or not in developer mode
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {!session 
                ? "Please sign in to view and collect badges"
                : "Enable Developer Mode to access badges"
              }
            </p>
            {!session && (
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        ) : isLoading ? (
          // Loading state
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Current Season Badge */}
            <div className="mb-12">
              <h2 className="text-xl font-semibold mb-4 text-center">
                Current Badge Available
              </h2>
              
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 max-w-md mx-auto">
                <div className="text-center">
                  <div className="text-6xl mb-4">{currentBadgeConfig.emoji}</div>
                  <h3 className="text-2xl font-bold mb-2">{currentBadgeConfig.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {currentBadgeConfig.description}
                  </p>
                  
                  {hasCurrentBadge ? (
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
                        <span>✅</span>
                        You have this badge!
                      </div>
                      <div>
                        <Link
                          href={`/viewer?uri=at://${session.did}/at.atproto.supporter.badge/${CURRENT_BADGE}`}
                          className="text-blue-500 hover:underline"
                        >
                          View your badge →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowModal(true)}
                      className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${currentBadgeConfig.gradient} text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200`}
                    >
                      <span className="text-xl">{currentBadgeConfig.emoji}</span>
                      Get This Badge
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* User's Badge Collection */}
            {userBadges.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-center">
                  Your Badge Collection
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userBadges.map(badgeType => {
                    const config = BADGE_TYPES[badgeType];
                    if (!config) return null;
                    
                    return (
                      <Link
                        key={badgeType}
                        href={`/viewer?uri=at://${session.did}/at.atproto.supporter.badge/${badgeType}`}
                        className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-center group"
                      >
                        <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                          {config.emoji}
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {config.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {config.whatItRepresents}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Badge Modal */}
      <SupporterBadgeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        badgeType={CURRENT_BADGE}
      />
    </div>
  );
}
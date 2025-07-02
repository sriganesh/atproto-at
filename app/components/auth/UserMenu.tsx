'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useAuthMode } from './AuthModeProvider';
import UserAvatar from '../profiles/UserAvatar';
import InfoTooltip from '../ui/InfoTooltip';

export default function UserMenu() {
  const { session, sessions, logout, switchAccount, isLoading } = useAuth();
  const { isReadOnly, isDeveloperMode, toggleReadOnly, toggleDeveloperMode } = useAuthMode();
  const [isOpen, setIsOpen] = useState(false);
  const [showBlueskySubmenu, setShowBlueskySubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowBlueskySubmenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  

  if (!session || isLoading) {
    return null;
  }

  return (
    <div className="relative z-[100] isolate" ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        aria-label="User menu"
      >
        <UserAvatar
          handle={session.handle}
          avatar={session.avatar}
          size="sm"
        />
        <span className="text-sm font-medium hidden sm:block">
          {session.handle}
        </span>
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
        
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-[100] border border-gray-200 dark:border-gray-700">
          {/* Current User */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium">{session.displayName || session.handle}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {session.did}
            </p>
          </div>

          {/* Account Switcher */}
          {sessions.length > 1 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Switch Account
              </div>
              {sessions
                .filter(s => s.did !== session.did)
                .map(account => (
                  <button
                    key={account.did}
                    onClick={() => {
                      switchAccount(account.did);
                      setIsOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <p className="text-sm">{account.handle}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {account.did}
                    </p>
                  </button>
                ))}
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
            </>
          )}

          {/* Menu Items */}
          
          <a
            href={`/viewer?uri=${session.did}`}
            className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            onClick={() => setIsOpen(false)}
          >
            <span className="flex items-center gap-2">
              <span>@</span>
              Profile
            </span>
          </a>
          
          {/* Bluesky submenu */}
          <div className="relative">
            <button
              onClick={() => setShowBlueskySubmenu(!showBlueskySubmenu)}
              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span>🦋</span>
                Bluesky
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${showBlueskySubmenu ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showBlueskySubmenu && (
              <div className="bg-gray-50 dark:bg-gray-900">
                <a
                  href={`/viewer?uri=${session.did}/app.bsky.actor.profile/self`}
                  className="block px-6 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={() => setIsOpen(false)}
                >
                  My Profile
                </a>
                
                <a
                  href={`/viewer?uri=${session.did}/app.bsky.feed.post`}
                  className="block px-6 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={() => setIsOpen(false)}
                >
                  My Posts
                </a>
                
                <a
                  href={`/viewer?uri=${session.did}/app.bsky.feed.like`}
                  className="block px-6 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={() => setIsOpen(false)}
                >
                  My Likes
                </a>
                
                <a
                  href={`/viewer?uri=${session.did}/app.bsky.feed.repost`}
                  className="block px-6 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={() => setIsOpen(false)}
                >
                  My Reposts
                </a>
                
                <a
                  href={`/viewer?uri=${session.did}/app.bsky.graph.list`}
                  className="block px-6 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={() => setIsOpen(false)}
                >
                  My Lists
                </a>
                
                <a
                  href={`/viewer?uri=${session.did}/app.bsky.feed.generator`}
                  className="block px-6 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={() => setIsOpen(false)}
                >
                  My Feeds
                </a>
                
                <a
                  href={`/viewer?uri=${session.did}/app.bsky.graph.block`}
                  className="block px-6 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={() => setIsOpen(false)}
                >
                  My Blocks
                </a>
                
                <a
                  href={`/viewer?uri=${session.did}/app.bsky.graph.follow`}
                  className="block px-6 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  onClick={() => setIsOpen(false)}
                >
                  My Following
                </a>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
          
          {/* Mode Toggles */}
          <div className="px-4 py-2">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 flex items-center">
                Read-only mode
                <InfoTooltip 
                  tooltipText="When disabled, you can perform standard Bluesky actions like posting, liking, reposting, and deleting your own content"
                  className="ml-1"
                />
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isReadOnly}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleReadOnly();
                }}
                className={`
                  relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                  ${isReadOnly ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
                `}
              >
                <span
                  className={`
                    inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
                    ${isReadOnly ? 'translate-x-5' : 'translate-x-1'}
                  `}
                />
              </button>
            </label>
            
            {!isReadOnly && (
              <label className="flex items-center justify-between cursor-pointer group mt-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 flex items-center">
                  Developer mode
                  <InfoTooltip 
                    tooltipText="Enables advanced features to create, edit, or delete any records in your repository, and create new collections"
                    className="ml-1"
                  />
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDeveloperMode}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDeveloperMode();
                  }}
                  className={`
                    relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                    ${isDeveloperMode ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
                      ${isDeveloperMode ? 'translate-x-5' : 'translate-x-1'}
                    `}
                  />
                </button>
              </label>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

          {/* Logout */}
          <button
            onClick={async () => {
              await logout();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
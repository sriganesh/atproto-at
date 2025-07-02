'use client';

import { useAuth } from './AuthProvider';
import { useState, useEffect, useRef } from 'react';

export default function SessionStatus() {
  const { session, isLoading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeShownRef = useRef<Set<string>>(new Set());
  
  console.log('SessionStatus - session:', session, 'isLoading:', isLoading);

  useEffect(() => {
    // Show welcome message only once per session per page load
    if (session && !welcomeShownRef.current.has(session.did)) {
      welcomeShownRef.current.add(session.did);
      setShowWelcome(true);
      
      // Hide the welcome message after 3 seconds
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [session]);

  if (isLoading) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg shadow-lg z-50">
        Loading session...
      </div>
    );
  }

  if (showWelcome && session) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-out">
        Welcome back, {session.handle}!
      </div>
    );
  }

  return null;
}
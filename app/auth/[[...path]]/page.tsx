'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getOAuthClient } from '@/lib/auth/oauth-client';
import LoadingIndicator from '@/app/components/ui/LoadingIndicator';

export default function OAuthHandlerPage() {
  const router = useRouter();
  const params = useParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    async function handleOAuthFlow() {
      try {
        const client = await getOAuthClient();
        
        // Check if this is an OAuth callback by looking for the code in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const isCallback = urlParams.has('code') || urlParams.has('state');
        
        if (isCallback) {
          console.log('OAuth callback detected in URL');
          // Initialize the OAuth client - it will handle the callback automatically
          const result = await client.init();
          
          if (result && 'state' in result) {
            // OAuth callback was processed successfully
            console.log('OAuth callback processed, redirecting to profile');
            // Get the session to extract the DID
            const session = await client.restore(result.session.sub);
            if (session) {
              // Redirect directly to the user's profile
              window.location.replace(`/viewer?uri=${result.session.sub}`);
            } else {
              // Fallback to home if session restore fails
              window.location.replace('/');
            }
            return;
          } else {
            throw new Error('Failed to process OAuth callback');
          }
        } else {
          // Not an OAuth callback, redirect to home
          router.push('/');
        }
      } catch (err) {
        console.error('OAuth flow error:', err);
        setError(err instanceof Error ? err.message : 'Failed to process authentication');
        setIsProcessing(false);
      }
    }

    handleOAuthFlow();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md w-full mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
              Authentication Failed
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full p-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition font-medium"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-md w-full mx-auto text-center">
          <LoadingIndicator message="Completing authentication..." />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            You'll be redirected to your profile shortly...
          </p>
        </div>
      </div>
    );
  }
  
  // If we're here and not processing, something went wrong
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting...
        </p>
      </div>
    </div>
  );
}
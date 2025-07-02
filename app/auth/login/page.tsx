'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/components/auth/AuthProvider';
import HandleAutocomplete from '@/app/components/ui/HandleAutocomplete';

export default function LoginPage() {
  const router = useRouter();
  const { login, error: authError } = useAuth();
  const [handle, setHandle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent, overrideHandle?: string) => {
    e.preventDefault();
    
    // Use override handle if provided (from autocomplete), otherwise use state
    const handleToUse = overrideHandle || handle;
    
    if (!handleToUse.trim()) {
      setError('Please enter a handle or DID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Clean the handle input
      let cleanHandle = handleToUse.trim();
      
      // If it looks like a domain without protocol, assume it's a handle
      if (!cleanHandle.includes('://') && !cleanHandle.startsWith('did:')) {
        // Remove @ if present
        cleanHandle = cleanHandle.replace(/^@/, '');
      }
      
      await login(cleanHandle);
      // The login function will redirect to the auth server
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start login process');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-xl">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-white">atproto.</span>
              <span className="text-blue-500">at://</span>
            </h1>
          </Link>
          <p className="text-gray-400">Sign In</p>
        </div>

        {/* Main card */}
        <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <p className="text-gray-300">
              Sign in with your AT Protocol account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <HandleAutocomplete
                value={handle}
                onChange={setHandle}
                onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                onSuggestionSelect={(suggestion) => {
                  // Set the handle in the input
                  setHandle(suggestion.handle);
                  // Submit with the full handle directly
                  handleSubmit({ preventDefault: () => {} } as React.FormEvent, suggestion.handle);
                }}
                placeholder="Enter your Bluesky handle or DID"
                inputClassName="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Error Display */}
            {(error || authError) && (
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl">
                <p className="text-sm text-red-400">
                  {error || authError}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              {isLoading ? 'Connecting...' : 'Continue'}
            </button>
          </form>

          {/* What happens next */}
          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-gray-400 text-sm mb-3">What happens next:</p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• You'll be redirected to your PDS to sign in</li>
              <li>• Your PDS will ask you to authorize atproto.at</li>
              <li>• After approval, you'll be redirected back here</li>
            </ul>
            <p className="text-xs text-gray-500 text-center mt-6">
              We use OAuth for secure authentication. Your password is never shared with us.
            </p>
          </div>
        </div>

        {/* TID o'clock */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-400 transition-colors">
            ← Back to explorer
          </Link>
        </div>
      </div>
    </div>
  );
}
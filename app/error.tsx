'use client';

import { useEffect } from 'react';
import ErrorDisplay from './components/ui/ErrorDisplay';
import { getUserFriendlyMessage, categorizeError } from './hooks/useErrorHandler';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error handler:', error);
  }, [error]);

  const errorInfo = {
    message: error.message,
    timestamp: new Date(),
    details: error.digest
  };

  const userMessage = getUserFriendlyMessage(errorInfo);
  const errorCategory = categorizeError(errorInfo);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {errorCategory === 'network' 
              ? 'Connection Error' 
              : errorCategory === 'server'
              ? 'Server Error'
              : 'Something went wrong'}
          </h2>
        </div>
        
        <ErrorDisplay error={userMessage} />
        
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Try again
          </button>
          
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Go to homepage
          </a>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
            <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">
              Error details (dev only)
            </summary>
            <pre className="mt-2 text-xs overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
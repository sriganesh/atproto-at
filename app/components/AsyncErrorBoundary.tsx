'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import ErrorDisplay from './ui/ErrorDisplay';
import { useErrorHandler } from '../hooks/useErrorHandler';

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error) => void;
}

/**
 * Error boundary specifically for handling async errors
 * Works with promises and async operations
 */
export default function AsyncErrorBoundary({ 
  children, 
  fallback,
  onError 
}: AsyncErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = new Error(
        event.reason?.message || event.reason || 'Unhandled promise rejection'
      );
      
      handleError(error, 'AsyncErrorBoundary');
      setError(error);
      
      if (onError) {
        onError(error);
      }
      
      // Prevent default error handling
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleError, onError]);

  const retry = () => {
    setError(null);
  };

  if (error) {
    if (fallback) {
      return <>{fallback(error, retry)}</>;
    }

    return (
      <div className="p-4">
        <ErrorDisplay error={error.message} />
        <div className="mt-4">
          <button
            onClick={retry}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
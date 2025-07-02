import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLoadingOnly } from '../../../hooks/useLoadingState';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, params: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact' | 'flexible';
      }) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

interface TurnstileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  downloadType: 'loaded' | 'all';
  blobCount: number;
}

export default function TurnstileModal({ 
  isOpen, 
  onClose, 
  onVerified, 
  downloadType,
  blobCount 
}: TurnstileModalProps) {
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const { isLoading: isVerifying, error, execute, setError } = useLoadingOnly();

  const SITE_KEY = '0x4AAAAAABgsAI1SACQX1nBR';

  const handleTurnstileSuccess = useCallback(async (token: string) => {
    try {
      await execute((async () => {
        const response = await fetch('/api/verify-turnstile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (result.success) {
          onVerified();
          onClose();
        } else {
          // Reset the widget
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
          throw new Error(result.error || 'Verification failed. Please try again.');
        }
      })());
    } catch (error) {
      console.error('Verification error:', error);
      // Reset the widget
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }
  }, [onVerified, onClose, execute]);

  useEffect(() => {
    if (!isOpen) {
      // Clean up when modal closes
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore errors when cleaning up
        }
        widgetIdRef.current = null;
      }
      return;
    }

    const loadTurnstile = () => {
      const script = document.getElementById('turnstile-script');
      
      if (!script) {
        const newScript = document.createElement('script');
        newScript.id = 'turnstile-script';
        newScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        newScript.async = true;
        newScript.defer = true;
        newScript.onload = initTurnstile;
        newScript.onerror = (error) => {
          console.error('Failed to load Turnstile script:', error);
          setError('Failed to load verification widget. Please try again.');
        };
        document.head.appendChild(newScript);
      } else {
        // Script already loaded
        initTurnstile();
      }
    };

    const initTurnstile = () => {
      if (window.turnstile && turnstileRef.current) {
        // Clean up existing widget first
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch (e) {
            // Ignore errors when removing widgets
          }
        }

        const id = window.turnstile.render(turnstileRef.current, {
          sitekey: SITE_KEY,
          callback: handleTurnstileSuccess,
          'error-callback': () => {
            setError('Verification failed. Please try again.');
          },
          'expired-callback': () => {
            setError('Verification expired. Please try again.');
          },
          theme: 'auto',
          size: 'normal',
        });
        
        widgetIdRef.current = id;
      }
    };

    loadTurnstile();

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore errors when cleaning up
        }
        widgetIdRef.current = null;
      }
    };
  }, [isOpen, handleTurnstileSuccess, setError]);

  const handleClose = () => {
    if (!isVerifying) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Verify Download Request
          </h2>
          <button
            onClick={handleClose}
            disabled={isVerifying}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            You're about to download{' '}
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {downloadType === 'loaded' ? `${blobCount} loaded blobs` : 'all blobs from repository'}
            </span>{' '}
            as a ZIP file.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please complete the verification below to prevent automated abuse.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-center mb-4">
          <div 
            ref={turnstileRef}
            className={`transition-opacity ${isVerifying ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
          />
        </div>

        {isVerifying && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
              Verifying...
            </span>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isVerifying}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Protected by Cloudflare Turnstile
          </p>
        </div>
      </div>
    </div>
  );
} 
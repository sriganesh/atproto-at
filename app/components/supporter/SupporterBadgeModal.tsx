'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useAuthenticatedRequest } from '@/app/hooks/useAuthenticatedRequest';
import Toast from '../ui/Toast';
import { BADGE_TYPES } from '@/app/utils/badges';

interface SupporterBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  badgeType?: string;
  badgeConfig?: {
    title?: string;
    description?: string;
    emoji?: string;
    defaultMessage?: string;
    gradient?: string;
  };
}

export default function SupporterBadgeModal({ 
  isOpen, 
  onClose,
  badgeType = 'earlyadopter',
  badgeConfig
}: SupporterBadgeModalProps) {
  const { session } = useAuth();
  const { executeRequest } = useAuthenticatedRequest();
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Use predefined config or custom config
  const config = badgeConfig || BADGE_TYPES[badgeType] || BADGE_TYPES.earlyadopter;
  const [message, setMessage] = useState(config.defaultMessage);

  // Update message when badge type changes
  useEffect(() => {
    if (!badgeConfig) {
      const newConfig = BADGE_TYPES[badgeType] || BADGE_TYPES.earlyadopter;
      setMessage(newConfig.defaultMessage);
    }
  }, [badgeType, badgeConfig]);

  const handleCreateBadge = async () => {
    if (!session) return;
    
    setIsCreating(true);
    
    try {
      let createdUri = '';
      
      await executeRequest(async (agent) => {
        // Create the supporter badge record
        const record = {
          $type: 'at.atproto.supporter.badge',
          createdAt: new Date().toISOString(),
          service: 'Taproot (atproto.at://)',
          message: message.trim() || 'Supporting Taproot (atproto.at://)!',
          version: '1.0.0',
          badgeType: badgeType // Include badge type in the record
        };
        
        const response = await agent.com.atproto.repo.createRecord({
          repo: session.did,
          collection: 'at.atproto.supporter.badge',
          rkey: badgeType,
          record
        });
        
        createdUri = response.uri;
      });
      
      setToast({ 
        message: '🎉 Supporter badge created! Redirecting...', 
        type: 'success' 
      });
      
      // Redirect to the newly created badge
      setTimeout(() => {
        if (createdUri) {
          window.location.href = `/viewer?uri=${createdUri.replace('at://', '')}`;
        } else {
          // Fallback if no URI returned
          window.location.href = `/viewer?uri=${session.did}/at.atproto.supporter.badge/${badgeType}`;
        }
      }, 1500);
    } catch (err) {
      console.error('Failed to create supporter badge:', err);
      
      // Check if badge already exists
      if (err instanceof Error && err.message.includes('record already exists')) {
        setToast({ 
          message: 'You already have a supporter badge! Thank you! 💜', 
          type: 'info' 
        });
      } else {
        setToast({ 
          message: 'Failed to create supporter badge. Please try again.', 
          type: 'error' 
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[110] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="text-2xl">{config.emoji}</span>
              {config.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {config.description}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                This will create a record at:
              </p>
              <code className="block p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs break-all font-mono text-blue-600 dark:text-blue-400">
                at://{session?.did}/at.atproto.supporter.badge/{badgeType}
              </code>
            </div>

            <div className="mb-6">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your message (optional)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share why you love atproto.at..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {message.length}/300 characters
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                What this badge represents:
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                {config.whatItRepresents || `You have the ${badgeType} badge`}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBadge}
              disabled={isCreating}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isCreating
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : `bg-gradient-to-r ${config.gradient} text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`
              }`}
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create My Badge 🎉'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
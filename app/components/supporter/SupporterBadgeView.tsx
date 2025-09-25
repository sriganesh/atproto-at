'use client';

import React from 'react';
import { BADGE_TYPES } from '@/app/utils/badges';

interface SupporterBadgeViewProps {
  recordData: any;
  recordUri: string;
  onRefresh?: () => void;
}

export default function SupporterBadgeView({ recordData, recordUri }: SupporterBadgeViewProps) {
  const badge = recordData?.value;
  
  if (!badge) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        No badge data available
      </div>
    );
  }

  const createdDate = badge.createdAt ? new Date(badge.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Unknown';

  // Extract badge type from URI or record
  const badgeTypeFromUri = recordUri.split('/').pop() || 'earlyadopter';
  const badgeType = badge.badgeType || badgeTypeFromUri;
  const badgeConfig = BADGE_TYPES[badgeType];

  // Determine gradient and emoji based on badge type
  // Extract just the base gradient without hover states
  const gradientMatch = badgeConfig?.gradient?.match(/from-\S+\s+to-\S+/);
  const gradient = gradientMatch ? gradientMatch[0] : 'from-blue-500 to-cyan-500';
  const emoji = badgeConfig?.emoji || '🏆';
  const badgeLabel = badgeConfig ? badgeConfig.title.replace(' Badge', '') : badgeType;

  return (
    <div className="space-y-4">
      {/* Badge Header */}
      <div className={`bg-gradient-to-r ${gradient} rounded-lg p-6 text-white`}>
        <div className="flex items-center gap-4">
          <span className="text-5xl">{emoji}</span>
          <div>
            <h2 className="text-2xl font-bold">atproto.at {badgeLabel}</h2>
            <p className="text-white/90">{badgeType} badge</p>
          </div>
        </div>
      </div>

      {/* Badge Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Badge Details</h3>
        
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Service:</span>
            <p className="text-gray-900 dark:text-gray-100">{badge.service || 'Taproot (atproto.at://)'}</p>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Created:</span>
            <p className="text-gray-900 dark:text-gray-100">{createdDate}</p>
          </div>

          {badge.message && (
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Message:</span>
              <p className="text-gray-900 dark:text-gray-100 mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg italic">
                "{badge.message}"
              </p>
            </div>
          )}

          {badge.version && (
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Version:</span>
              <p className="text-gray-900 dark:text-gray-100">{badge.version}</p>
            </div>
          )}
        </div>
      </div>

      {/* Recognition */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
          ✨ {badgeConfig?.whatItRepresents || `This user has the ${badgeType} badge for Taproot (atproto.at://)!`} ✨
        </p>
      </div>
    </div>
  );
}
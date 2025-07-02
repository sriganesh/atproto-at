import React from 'react';
import Link from 'next/link';
import { BADGE_TYPES } from '@/app/utils/badges';

interface BadgeRecord {
  uri: string;
  cid: string;
  value: {
    $type: string;
    createdAt: string;
    service: string;
    message: string;
    version: string;
    badgeType?: string;
  };
}

interface BadgeCollectionViewProps {
  records: BadgeRecord[];
  ownerDid: string;
  ownerHandle?: string;
}

export default function BadgeCollectionView({ records, ownerDid, ownerHandle }: BadgeCollectionViewProps) {
  // Group badges by type
  const badgesByType = records.reduce<Record<string, BadgeRecord[]>>((acc, record) => {
    // Extract badge type from URI or from record
    const uriParts = record.uri.split('/');
    const rkey = uriParts[uriParts.length - 1];
    const badgeType = record.value.badgeType || rkey;
    
    if (!acc[badgeType]) {
      acc[badgeType] = [];
    }
    acc[badgeType].push(record);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Badge Collection</h2>
        <p className="text-blue-100">
          {ownerHandle ? (
            <>
              <Link 
                href={`/viewer?uri=${ownerDid}`}
                className="hover:underline"
              >
                @{ownerHandle}
              </Link>
              's badges
            </>
          ) : (
            <>This user's badges</>
          )}
        </p>
        <p className="text-sm text-blue-200 mt-2">
          {records.length} {records.length === 1 ? 'badge' : 'badges'} earned
        </p>
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(badgesByType).map(([badgeType, badges]) => {
          const badgeConfig = BADGE_TYPES[badgeType];
          const latestBadge = badges[0]; // Assuming most recent first
          
          return (
            <Link
              key={badgeType}
              href={`/viewer?uri=${latestBadge.uri.replace('at://', '')}`}
              className="block"
            >
              <div className={`
                bg-gradient-to-br ${badgeConfig?.gradient || 'from-gray-500 to-gray-600'} 
                rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:scale-[1.02] 
                transition-all duration-200 cursor-pointer text-white
              `}>
                {/* Badge Icon and Title */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{badgeConfig?.emoji || '🏆'}</span>
                    <div>
                      <h3 className="text-xl font-bold">
                        {badgeConfig?.title || `${badgeType} Badge`}
                      </h3>
                      <p className="text-sm opacity-90">
                        {badgeConfig?.whatItRepresents || 'Special achievement'}
                      </p>
                    </div>
                  </div>
                  {badges.length > 1 && (
                    <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                      x{badges.length}
                    </span>
                  )}
                </div>

                {/* Badge Message */}
                {latestBadge.value.message && (
                  <div className="bg-white/10 rounded-lg p-3 mb-4">
                    <p className="text-sm italic">"{latestBadge.value.message}"</p>
                  </div>
                )}

                {/* Badge Details */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center opacity-80">
                    <span>Earned:</span>
                    <span>
                      {new Date(latestBadge.value.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center opacity-80">
                    <span>Service:</span>
                    <span>{latestBadge.value.service}</span>
                  </div>
                </div>

                {/* View Details */}
                <div className="mt-4 text-center">
                  <span className="text-sm opacity-90 hover:opacity-100">
                    Click to view details →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Empty State */}
      {records.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <span className="text-6xl mb-4 block">🏆</span>
          <p className="text-gray-500 dark:text-gray-400">
            No badges in this collection yet
          </p>
        </div>
      )}
    </div>
  );
}
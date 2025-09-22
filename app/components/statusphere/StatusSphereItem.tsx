import React from 'react';
import BaseCollectionItem from '../collections/BaseCollectionItem';
import { getRelativeTime } from '@/lib/utils/date';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';

type StatusSphereItemProps = {
  statusRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      status: string;
      createdAt: string;
    };
  };
};

export default function StatusSphereItem({ statusRecord }: StatusSphereItemProps) {
  // Use the centralized theme for StatusSphere records
  const theme = RECORD_THEMES.statusphere;

  const renderContent = () => {
    const createdAt = new Date(statusRecord.value.createdAt);
    const timeAgo = getRelativeTime(createdAt);
    
    return (
      <div className="p-6">
        <div className="flex items-center justify-center mb-4">
          <div className={`text-7xl ${theme.bgColor} rounded-2xl p-6 shadow-inner`}>
            {statusRecord.value.status}
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            Status posted {timeAgo}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            {createdAt.toLocaleString()}
          </p>
        </div>

        {/* StatusSphere branding */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Posted via</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">StatusSphere</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseCollectionItem
      record={statusRecord}
      theme={theme}
      renderContent={renderContent}
    />
  );
}
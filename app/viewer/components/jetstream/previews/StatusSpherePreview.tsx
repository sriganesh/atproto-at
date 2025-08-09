import React from 'react';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';

interface StatusSpherePreviewProps {
  statusRecord: {
    status: string;
    createdAt: string;
  };
  authorDid: string;
  recordKey: string;
}

export default function StatusSpherePreview({ statusRecord, authorDid, recordKey }: StatusSpherePreviewProps) {
  const theme = RECORD_THEMES.statusphere;
  return (
    <div className={`mt-2 p-4 ${theme.bgColor} rounded-lg border ${theme.borderColor}`}>
      {/* Header */}
      <div className={`${theme.textColor} text-xs font-medium mb-3 flex items-center gap-2`}>
        <span>{theme.icon}</span>
        <span>New Statusphere Status</span>
      </div>
      
      {/* Status Emoji Display */}
      <div className="flex items-center justify-center mb-4">
        <div className={`text-6xl ${theme.bgColor} rounded-2xl p-4 shadow-inner`}>
          {statusRecord.status}
        </div>
      </div>

      {/* Action links */}
      <div className="flex items-center gap-3 text-xs">
        <a
          href={`/viewer?uri=${authorDid}/xyz.statusphere.status/${recordKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline flex items-center gap-1"
        >
          atproto.at
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        
        <a
          href={`https://bsky.social/xrpc/com.atproto.repo.getRecord?repo=${authorDid}&collection=xyz.statusphere.status&rkey=${recordKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline flex items-center gap-1"
        >
          PDS
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
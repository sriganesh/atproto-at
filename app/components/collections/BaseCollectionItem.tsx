import React from 'react';
import Link from 'next/link';
import { formatDate } from '../../../lib/utils/date';
import { extractTidFromUri, decodeTidToTimestamp } from '../../../lib/utils/tid';

export interface ThemeColors {
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export interface BaseCollectionItemProps {
  record: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      createdAt?: string;
      [key: string]: any;
    };
  };
  theme: ThemeColors;
  recordKey?: string; // Optional override for record key
  loadingText?: string;
  errorText?: string;
  isLoading?: boolean;
  error?: string | null;
  renderContent: (props: {
    record: any;
    isLoading: boolean;
    error: string | null;
  }) => React.ReactNode;
  headerExtra?: React.ReactNode; // For additional header content like reply indicator
  disableLink?: boolean; // Disable the wrapper link (e.g., when content has its own links)
}

export default function BaseCollectionItem({
  record,
  theme,
  recordKey: customRecordKey,
  loadingText = 'Loading...',
  errorText = 'Unable to load content',
  isLoading = false,
  error = null,
  renderContent,
  headerExtra,
  disableLink = false
}: BaseCollectionItemProps) {
  // Extract the record key from the URI
  const uriParts = record.uri.split('/');
  const recordKey = customRecordKey || uriParts[uriParts.length - 1];

  const { icon, bgColor, borderColor, textColor } = theme;

  const content = (
    <>
      {/* Header */}
      <div className={`${bgColor} px-4 py-2 border-b ${borderColor} flex items-center`}>
        <span className="text-xl mr-2">{icon}</span>
        <span className={`font-medium ${textColor}`}>
          {recordKey}
        </span>
        {headerExtra}
      </div>
      
      {/* Content Area - only show if there's content */}
      {(() => {
        const renderedContent = !isLoading && !error ? renderContent({ record, isLoading, error }) : null;
        const hasContent = renderedContent !== null;
        
        if (isLoading || error || hasContent) {
          return (
            <div className="bg-white dark:bg-gray-900">
              {isLoading && (
                <div className="p-4">
                  <div className="text-gray-500 text-sm animate-pulse">{loadingText}</div>
                </div>
              )}
              
              {error && !isLoading && (
                <div className="p-4">
                  <div className="text-gray-500 text-sm">{errorText}</div>
                </div>
              )}
              
              {renderedContent}
            </div>
          );
        }
        return null;
      })()}
      
      {/* Footer */}
      <div className={`${bgColor} px-4 py-2 flex justify-end`}>
        <span className="text-sm text-gray-500">
          {(() => {
            // Try to use createdAt first
            if (record.value.createdAt) {
              return formatDate(record.value.createdAt);
            }
            // Fall back to decoding timestamp from TID
            const tid = extractTidFromUri(record.uri);
            if (tid) {
              const timestamp = decodeTidToTimestamp(tid);
              if (timestamp) {
                return formatDate(new Date(timestamp).toISOString());
              }
            }
            return '';
          })()}
        </span>
      </div>
    </>
  );

  // Conditionally wrap in Link based on disableLink prop
  if (disableLink) {
    return (
      <div className={`rounded-lg overflow-hidden border ${borderColor} hover:shadow-md transition-shadow`}>
        {content}
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden border ${borderColor} hover:shadow-md transition-shadow`}>
      <Link 
        href={`/viewer?uri=${record.uri.replace('at://', '')}`}
        className="block cursor-pointer"
      >
        {content}
      </Link>
    </div>
  );
}
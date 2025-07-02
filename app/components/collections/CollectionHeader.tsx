import React from 'react';

type CollectionHeaderProps = {
  name: string;
  recordCount: number;
  hasMore?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => void;
};

export default function CollectionHeader({ 
  name, 
  recordCount,
  hasMore = false,
  isLoading = false,
  onLoadMore
}: CollectionHeaderProps) {
  return (
    <div className="mb-4 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-lg mb-1">Collection: {name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This collection contains {recordCount} records loaded
          </p>
        </div>
        {hasMore && onLoadMore && (
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </span>
            ) : (
              'Load More'
            )}
          </button>
        )}
      </div>
    </div>
  );
} 
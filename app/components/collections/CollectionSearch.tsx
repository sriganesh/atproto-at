import React from 'react';

interface CollectionSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalRecords: number;
  filteredCount: number;
  showResults?: boolean;
}

export default function CollectionSearch({
  searchQuery,
  onSearchChange,
  totalRecords,
  filteredCount,
  showResults = true
}: CollectionSearchProps) {
  return (
    <div className="mb-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Search records..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2 pl-10 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {showResults && searchQuery && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredCount} of {totalRecords} records
        </div>
      )}
    </div>
  );
}
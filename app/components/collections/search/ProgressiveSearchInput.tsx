/**
 * Enhanced search input with loading indicators and progress display
 */

import React from 'react';
import { useCollectionSearchContext } from './CollectionSearchProvider';

export interface ProgressiveSearchInputProps {
  placeholder?: string;
  className?: string;
}

export default function ProgressiveSearchInput({
  placeholder = "Search records...",
  className = ""
}: ProgressiveSearchInputProps) {
  const searchContext = useCollectionSearchContext();
  
  if (!searchContext) {
    // Fallback to regular search if not in search context
    return null;
  }

  const { state, updateSearchQuery, clearSearch, getSearchProgress } = searchContext;
  const progress = getSearchProgress();
  const { query, isSearching, loadingProgress, searchResults, loadAllRequested } = state;
  
  const isLoadingContent = loadingProgress.loading > 0;

  return (
    <div className={`mb-4 ${className}`}>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => updateSearchQuery(e.target.value)}
          className="w-full px-4 py-2 pl-10 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        {/* Search icon */}
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
        
        {/* Clear button */}
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* Loading spinner */}
        {isSearching && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
      
      {/* Progress and status */}
      <div className="mt-2 flex items-center justify-between text-sm">
        <div className="text-gray-600 dark:text-gray-400">
          {query ? (
            <span>
              {searchResults.length} results{progress.loaded > 0 && ` from ${progress.loaded} indexed records`}
            </span>
          ) : (
            <span>{progress.total} records available</span>
          )}
        </div>
        
        {/* Show loading indicator when actively loading */}
        {isLoadingContent && (
          <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading {loadingProgress.loading} records...
          </div>
        )}
      </div>
      
      {/* Progress bar - only show when actively loading */}
      {isLoadingContent && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Loading status details */}
      {(loadingProgress.failed > 0 || (loadAllRequested && progress.loaded < progress.total)) && (
        <div className="mt-1 text-xs">
          {loadingProgress.failed > 0 && (
            <div className="text-red-500">
              {loadingProgress.failed} records failed to load
            </div>
          )}
          {loadAllRequested && loadingProgress.loading === 0 && progress.failed > 0 && (
            <div className="text-gray-500 dark:text-gray-400">
              Indexing complete: {progress.failed} records couldn't be indexed (may be deleted or private)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
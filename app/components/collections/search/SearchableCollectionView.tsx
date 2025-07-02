/**
 * Wrapper component that adds search functionality to collection views
 */

import React, { ReactNode, useCallback } from 'react';
import { CollectionRecord } from './types';
import { CollectionSearchProvider } from './CollectionSearchProvider';
import ProgressiveSearchInput from './ProgressiveSearchInput';
import { useCollectionSearchContext } from './CollectionSearchProvider';

interface SearchableCollectionViewProps {
  records: CollectionRecord[];
  children: ReactNode;
  isSearchEnabled?: boolean;
  showSearchInput?: boolean;
  className?: string;
}

/**
 * Inner component that uses search context
 */
function SearchableContent({ 
  children, 
  showSearchInput
}: { 
  children: ReactNode; 
  showSearchInput: boolean;
}) {
  // Just pass through children - search input is handled in CollectionView
  return <>{children}</>;
}

/**
 * Main wrapper component
 */
export default function SearchableCollectionView({
  records,
  children,
  isSearchEnabled = true,
  showSearchInput = true,
  className = ""
}: SearchableCollectionViewProps) {
  // Fetch content function for the search provider
  const fetchContent = useCallback(async (recordUri: string) => {
    try {
      // Extract the record to get the subject URI
      const record = records.find(r => r.uri === recordUri);
      if (!record) throw new Error('Record not found');

      // For likes and reposts, we need to fetch the subject content
      if (record.value.$type === 'app.bsky.feed.like' || 
          record.value.$type === 'app.bsky.feed.repost') {
        const subjectUri = record.value.subject?.uri;
        if (!subjectUri) throw new Error('No subject URI');
        
        const cleanUri = subjectUri.replace(/^at:\/\//i, '');
        const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
      }
      
      // For threadgates and postgates, the components already load the post content
      // We shouldn't duplicate those API calls here
      
      // For other types, fetch the record itself
      const cleanUri = recordUri.replace(/^at:\/\//i, '');
      const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching content:', error);
      throw error;
    }
  }, [records]);

  if (!isSearchEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <CollectionSearchProvider
      records={records}
      fetchContent={fetchContent}
    >
      <div className={className}>
        <SearchableContent showSearchInput={showSearchInput}>
          {children}
        </SearchableContent>
      </div>
    </CollectionSearchProvider>
  );
}
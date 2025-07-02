/**
 * Context provider for collection search functionality
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { CollectionRecord, SearchContextValue } from './types';
import { useCollectionSearch } from './useCollectionSearch';

const CollectionSearchContext = createContext<SearchContextValue | null>(null);

export interface CollectionSearchProviderProps {
  children: ReactNode;
  records: CollectionRecord[];
  fetchContent: (recordUri: string) => Promise<any>;
  maxConcurrent?: number;
  debounceMs?: number;
}

export function CollectionSearchProvider({
  children,
  records,
  fetchContent,
  maxConcurrent = 3,
  debounceMs = 300
}: CollectionSearchProviderProps) {
  const searchContext = useCollectionSearch({
    records,
    fetchContent,
    maxConcurrent,
    debounceMs
  });

  return (
    <CollectionSearchContext.Provider value={searchContext}>
      {children}
    </CollectionSearchContext.Provider>
  );
}

/**
 * Hook to use the collection search context
 */
export function useCollectionSearchContext(): SearchContextValue | null {
  return useContext(CollectionSearchContext);
}

/**
 * Hook that throws if not in context - for components that require search
 */
export function useRequiredCollectionSearch(): SearchContextValue {
  const context = useCollectionSearchContext();
  if (!context) {
    throw new Error('useRequiredCollectionSearch must be used within CollectionSearchProvider');
  }
  return context;
}
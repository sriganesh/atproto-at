/**
 * Main hook for progressive collection search functionality
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  CollectionRecord, 
  SearchableRecord, 
  SearchState, 
  ContentLoadStatus, 
  ContentRegistration,
  SearchContextValue 
} from './types';
import { SearchIndexer } from './utils/searchIndexer';
import { ContentLoader } from './utils/contentLoader';

export interface UseCollectionSearchOptions {
  records: CollectionRecord[];
  fetchContent: (recordUri: string) => Promise<any>;
  maxConcurrent?: number;
  debounceMs?: number;
}

export function useCollectionSearch({
  records,
  fetchContent,
  maxConcurrent = 3,
  debounceMs = 300
}: UseCollectionSearchOptions): SearchContextValue {
  // Search indexer - initialize early
  const searchIndexer = useRef(new SearchIndexer());

  // Initialize search state
  const [state, setState] = useState<SearchState>(() => {
    const searchableRecords = new Map<string, SearchableRecord>();
    
    // Convert initial records to searchable records and index basic metadata
    records.forEach(record => {
      const searchableRecord: SearchableRecord = {
        ...record,
        contentLoadStatus: ContentLoadStatus.NotLoaded
      };
      searchableRecords.set(record.uri, searchableRecord);
      
      // Index basic metadata immediately
      searchIndexer.current.addBasicRecord(record);
    });

    return {
      query: '',
      searchableRecords,
      loadingProgress: {
        total: records.length,
        loaded: 0,
        loading: 0,
        failed: 0
      },
      searchResults: [],
      isSearching: false,
      loadAllRequested: false
    };
  });

  // Content loader and ref for update callback
  const contentLoader = useRef<ContentLoader>();
  const updateLoadStatusRef = useRef<any>();

  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, searchResults: [], isSearching: false }));
      return;
    }

    setState(prev => ({ ...prev, isSearching: true }));

    // Search through indexed content
    const results = searchIndexer.current.search(query);
    
    setState(prev => ({
      ...prev,
      searchResults: Array.from(results),
      isSearching: false
    }));

    // Prioritize loading content that might match
    setState(prev => {
      if (contentLoader.current) {
        const unloadedRecords = Array.from(prev.searchableRecords.values())
          .filter(r => r.contentLoadStatus === ContentLoadStatus.NotLoaded);
        contentLoader.current.prioritizeForSearch(unloadedRecords, query);
      }
      return prev;
    });
  }, []);

  // Update search query with debouncing
  const updateSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, query }));

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);
  }, [performSearch, debounceMs]);

  // Register loaded content
  const registerContent = useCallback((registration: ContentRegistration) => {
    setState(prev => {
      const record = prev.searchableRecords.get(registration.recordUri);
      if (!record) return prev;

      // Update record with loaded content
      const updatedRecord: SearchableRecord = {
        ...record,
        loadedContent: registration.content,
        contentLoadStatus: ContentLoadStatus.Loaded,
        contentLoadedAt: Date.now()
      };

      // Update state
      const newSearchableRecords = new Map(prev.searchableRecords);
      newSearchableRecords.set(registration.recordUri, updatedRecord);

      // Update search index
      searchIndexer.current.addRecord(updatedRecord);

      // Re-run search if there's an active query
      if (prev.query) {
        const results = searchIndexer.current.search(prev.query);
        return {
          ...prev,
          searchableRecords: newSearchableRecords,
          searchResults: Array.from(results)
        };
      }

      return {
        ...prev,
        searchableRecords: newSearchableRecords
      };
    });
  }, []);

  // Update load status - define before using in ref
  const updateLoadStatus = useCallback((recordUri: string, status: ContentLoadStatus) => {
    setState(prev => {
      const record = prev.searchableRecords.get(recordUri);
      if (!record) return prev;

      const newSearchableRecords = new Map(prev.searchableRecords);
      newSearchableRecords.set(recordUri, {
        ...record,
        contentLoadStatus: status
      });

      // Update loading progress
      let loaded = 0;
      let loading = 0;
      let failed = 0;

      newSearchableRecords.forEach(r => {
        switch (r.contentLoadStatus) {
          case ContentLoadStatus.Loaded:
            loaded++;
            break;
          case ContentLoadStatus.Loading:
            loading++;
            break;
          case ContentLoadStatus.Failed:
            failed++;
            break;
        }
      });

      return {
        ...prev,
        searchableRecords: newSearchableRecords,
        loadingProgress: {
          total: newSearchableRecords.size,
          loaded,
          loading,
          failed
        }
      };
    });
  }, []);

  // Store callbacks in refs after they're defined
  updateLoadStatusRef.current = updateLoadStatus;
  const registerContentRef = useRef<typeof registerContent>();
  registerContentRef.current = registerContent;

  // Initialize content loader
  useEffect(() => {
    contentLoader.current = new ContentLoader({
      maxConcurrent,
      maxRetries: 1, // Reduce retries to fail faster
      retryDelay: 1000,
      batchSize: 10,
      timeout: 3000, // 3 second timeout
      fetchContent,
      onLoadStart: (recordUri) => {
        setTimeout(() => {
          updateLoadStatusRef.current?.(recordUri, ContentLoadStatus.Loading);
        }, 0);
      },
      onLoadComplete: (recordUri, content) => {
        // Parse and register the loaded content
        if (content && content.data) {
          let searchableContent: any = {};
          
          // Handle different response types
          if (content.data?.value?.$type === 'app.bsky.feed.post' || 
              content.value?.$type === 'app.bsky.feed.post' ||
              content.type === 'record') {
            // This is a post - extract post text and author DID from URI
            const postText = content.data?.value?.text || 
                           content.value?.text || 
                           content.data?.text || '';
            
            // Extract DID from URI to fetch author separately if needed
            const authorDid = content.uri?.split('/')[2] || 
                            content.data?.uri?.split('/')[2] || 
                            recordUri.split('/')[2];
            
            // For now, just index the post text and DID
            // The UI will fetch and display author info separately
            searchableContent = {
              post: {
                text: postText,
                author: {
                  handle: authorDid, // This will be searchable
                  displayName: ''
                }
              }
            };
            
            // Remove debug logging
          } else if (content.data?.value?.$type === 'app.bsky.actor.profile') {
            // This is a profile
            searchableContent = {
              profile: {
                handle: content.data.handle || '',
                displayName: content.data.value?.displayName || '',
                description: content.data.value?.description || ''
              }
            };
          }
          
          // Register the content if we found something
          if (Object.keys(searchableContent).length > 0) {
            const registration: ContentRegistration = {
              recordUri,
              content: searchableContent,
              contentType: searchableContent.post ? 'post' : searchableContent.profile ? 'profile' : 'list'
            };
            
            // Use setTimeout to avoid state update during render
            setTimeout(() => {
              registerContentRef.current?.(registration);
            }, 0);
          } else {
            // Mark as loaded even if no searchable content
            setTimeout(() => {
              updateLoadStatusRef.current?.(recordUri, ContentLoadStatus.Loaded);
            }, 0);
          }
        }
      },
      onLoadError: (recordUri, error) => {
        console.error(`Failed to load content for ${recordUri}:`, error);
        setTimeout(() => {
          updateLoadStatusRef.current?.(recordUri, ContentLoadStatus.Failed);
        }, 0);
      }
    });

    return () => {
      contentLoader.current?.clear();
    };
  }, [fetchContent, maxConcurrent]);

  // Request to load all content
  const requestLoadAll = useCallback(() => {
    setState(prev => {
      const unloadedRecords = Array.from(prev.searchableRecords.values())
        .filter(r => r.contentLoadStatus === ContentLoadStatus.NotLoaded);
      
      if (contentLoader.current && unloadedRecords.length > 0) {
        contentLoader.current.enqueueAll(unloadedRecords, 50);
      }
      
      return { ...prev, loadAllRequested: true };
    });
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      query: '',
      searchResults: [],
      isSearching: false
      // Don't reset loadAllRequested - keep the indexed state
    }));
  }, []);

  // Check if a record is searchable
  const isRecordSearchable = useCallback((record: CollectionRecord): boolean => {
    const supportedTypes = [
      'app.bsky.feed.like',
      'app.bsky.feed.repost',
      'app.bsky.feed.post',
      'app.bsky.actor.profile',
      'app.bsky.graph.list',
      'app.bsky.feed.threadgate',
      'app.bsky.feed.postgate'
    ];
    return supportedTypes.includes(record.value.$type);
  }, []);

  // Get search progress
  const getSearchProgress = useCallback(() => {
    const { loaded, failed, total } = state.loadingProgress;
    return {
      percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
      loaded,
      total,
      failed
    };
  }, [state.loadingProgress]);

  // Re-run search when new content is indexed
  const prevLoadedRef = useRef(state.loadingProgress.loaded);
  useEffect(() => {
    // Only re-run if we have a query and more records were loaded
    if (state.query && state.loadingProgress.loaded > prevLoadedRef.current) {
      prevLoadedRef.current = state.loadingProgress.loaded;
      // Small delay to let the index update
      setTimeout(() => {
        performSearch(state.query);
      }, 100);
    }
  }, [state.loadingProgress.loaded, state.query, performSearch]);

  // Context value
  const contextValue: SearchContextValue = {
    state,
    updateSearchQuery,
    registerContent,
    updateLoadStatus,
    requestLoadAll,
    clearSearch,
    isRecordSearchable,
    getSearchProgress
  };

  // Update records when they change (e.g., load more)
  useEffect(() => {
    setState(prev => {
      const newSearchableRecords = new Map<string, SearchableRecord>();
      
      // Add all records, preserving existing loaded content
      records.forEach(record => {
        const existing = prev.searchableRecords.get(record.uri);
        if (existing && existing.contentLoadStatus !== ContentLoadStatus.NotLoaded) {
          // Preserve existing loaded record
          newSearchableRecords.set(record.uri, existing);
        } else {
          // Add new record
          const searchableRecord: SearchableRecord = {
            ...record,
            contentLoadStatus: ContentLoadStatus.NotLoaded
          };
          newSearchableRecords.set(record.uri, searchableRecord);
          
          // Index basic metadata
          searchIndexer.current.addBasicRecord(record);
        }
      });
      
      // Recalculate loading progress
      let loaded = 0;
      let loading = 0;
      let failed = 0;
      
      newSearchableRecords.forEach(r => {
        switch (r.contentLoadStatus) {
          case ContentLoadStatus.Loaded:
            loaded++;
            break;
          case ContentLoadStatus.Loading:
            loading++;
            break;
          case ContentLoadStatus.Failed:
            failed++;
            break;
        }
      });
      
      return {
        ...prev,
        searchableRecords: newSearchableRecords,
        loadingProgress: {
          total: newSearchableRecords.size,
          loaded,
          loading,
          failed
        }
      };
    });
  }, [records]);

  // Cleanup stuck loading states periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        // Check if we have loading progress but content loader isn't actually loading
        if (prev.loadingProgress.loading > 0 && contentLoader.current) {
          const stats = contentLoader.current.getStats();
          
          // If loader shows 0 loading but we still have loading states, clean them up
          if (stats.loading === 0) {
            let loaded = 0;
            let loading = 0;
            let failed = 0;
            const updatedRecords = new Map(prev.searchableRecords);
            
            updatedRecords.forEach((record, uri) => {
              // Mark stuck loading records as failed
              if (record.contentLoadStatus === ContentLoadStatus.Loading) {
                record.contentLoadStatus = ContentLoadStatus.Failed;
                updatedRecords.set(uri, record);
              }
              
              switch (record.contentLoadStatus) {
                case ContentLoadStatus.Loaded:
                  loaded++;
                  break;
                case ContentLoadStatus.Loading:
                  loading++;
                  break;
                case ContentLoadStatus.Failed:
                  failed++;
                  break;
              }
            });
            
            if (loading !== prev.loadingProgress.loading) {
              return {
                ...prev,
                searchableRecords: updatedRecords,
                loadingProgress: {
                  ...prev.loadingProgress,
                  loaded,
                  loading,
                  failed
                }
              };
            }
          }
        }
        
        return prev;
      });
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, []);

  return contextValue;
}
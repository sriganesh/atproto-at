/**
 * Type definitions for progressive search functionality
 */

// Base record type from collection
export interface CollectionRecord {
  uri: string;
  cid: string;
  value: {
    $type: string;
    subject?: {
      uri: string;
      cid: string;
    };
    text?: string;
    createdAt?: string;
    [key: string]: any;
  };
}

// Enhanced record with loaded content
export interface SearchableRecord extends CollectionRecord {
  // Loaded content for searching
  loadedContent?: {
    post?: {
      text?: string;
      author?: {
        handle: string;
        displayName?: string;
      };
      [key: string]: any;
    };
    profile?: {
      handle: string;
      displayName?: string;
      description?: string;
    };
    list?: {
      name: string;
      description?: string;
    };
  };
  // Loading state
  contentLoadStatus: ContentLoadStatus;
  // When content was loaded (for cache management)
  contentLoadedAt?: number;
}

// Content loading states
export enum ContentLoadStatus {
  NotLoaded = 'not_loaded',
  Loading = 'loading',
  Loaded = 'loaded',
  Failed = 'failed'
}

// Search state for the entire collection
export interface SearchState {
  // Current search query
  query: string;
  // Map of record URI to searchable record
  searchableRecords: Map<string, SearchableRecord>;
  // Loading progress
  loadingProgress: {
    total: number;
    loaded: number;
    loading: number;
    failed: number;
  };
  // Search results
  searchResults: string[]; // Array of URIs
  // Is search in progress
  isSearching: boolean;
  // Should load all content for complete search
  loadAllRequested: boolean;
}

// Content registration payload
export interface ContentRegistration {
  recordUri: string;
  content: SearchableRecord['loadedContent'];
  contentType: 'post' | 'profile' | 'list';
}

// Search context value
export interface SearchContextValue {
  state: SearchState;
  // Actions
  updateSearchQuery: (query: string) => void;
  registerContent: (registration: ContentRegistration) => void;
  updateLoadStatus: (recordUri: string, status: ContentLoadStatus) => void;
  requestLoadAll: () => void;
  clearSearch: () => void;
  // Utilities
  isRecordSearchable: (record: CollectionRecord) => boolean;
  getSearchProgress: () => { percentage: number; loaded: number; total: number; failed: number };
}

// Priority queue item for content loading
export interface LoadQueueItem {
  recordUri: string;
  priority: number; // Higher = more important
  addedAt: number;
  retryCount: number;
}

// Search indexer options
export interface SearchIndexOptions {
  // Fields to index for each content type
  postFields: string[];
  profileFields: string[];
  listFields: string[];
  // Performance options
  maxIndexSize: number;
  enableFuzzySearch: boolean;
}
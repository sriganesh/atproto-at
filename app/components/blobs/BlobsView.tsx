import React, { useState, useEffect, useRef, useCallback } from 'react';
import BlobGallery from './BlobGallery';
import LoadMoreButton from '../collections/LoadMoreButton';
import { JsonViewer } from '../ui/JsonViewer';
import { BlobDownloadDropdown, BlobDownloadModal, useBlobDownload } from './download';

interface BlobState {
  blobs: string[];
  cursor: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasLoaded: boolean;
}

interface BlobsViewProps {
  did: string;
  pdsEndpoint: string;
  persistentState?: BlobState;
  onStateChange?: (state: BlobState) => void;
}

interface BlobData {
  cids: string[];
  cursor?: string;
}

export default function BlobsView({ did, pdsEndpoint, persistentState, onStateChange }: BlobsViewProps) {
  // Use persistent state if provided, otherwise use local state
  const [localState, setLocalState] = useState<BlobState>({
    blobs: [],
    cursor: null,
    isLoading: true,
    isLoadingMore: false,
    error: null,
    hasLoaded: false
  });

  const state = persistentState || localState;
  const setState = onStateChange || setLocalState;

  const { blobs, cursor, isLoading, isLoadingMore, error, hasLoaded } = state;

  // Inner tab state
  const [activeBlobTab, setActiveBlobTab] = useState<'preview' | 'raw'>('preview');

  // Normalize PDS endpoint to ensure it has protocol
  const normalizedPdsEndpoint = React.useMemo(() => {
    if (!pdsEndpoint) return null;
    
    // If it already has protocol, use as-is
    if (pdsEndpoint.startsWith('http://') || pdsEndpoint.startsWith('https://')) {
      return pdsEndpoint;
    }
    
    // Otherwise, assume https
    return `https://${pdsEndpoint}`;
  }, [pdsEndpoint]);

  // Download functionality
  const {
    startDownload,
    startDownloadAll,
    isDownloading: isDownloadingBlobs,
    showModal: showDownloadModal,
    closeModal: closeDownloadModal,
    logs: downloadLogs,
    currentProgress: downloadProgress,
    isComplete: isDownloadComplete,
    canClose: canCloseDownload,
  } = useBlobDownload();

  // Handle download loaded blobs
  const handleDownloadLoaded = useCallback(() => {
    if (!normalizedPdsEndpoint || blobs.length === 0) return;
    
    // Use DID as identifier, or fall back to a generic name
    const identifier = did || 'unknown';
    
    startDownload(blobs, did, normalizedPdsEndpoint, identifier);
  }, [blobs, did, normalizedPdsEndpoint, startDownload]);

  // Handle download all blobs from repository
  const handleDownloadAll = useCallback(() => {
    if (!normalizedPdsEndpoint) return;
    
    // Use DID as identifier, or fall back to a generic name
    const identifier = did || 'unknown';
    
    startDownloadAll(did, normalizedPdsEndpoint, identifier);
  }, [did, normalizedPdsEndpoint, startDownloadAll]);

  // Check if we have required data
  if (!normalizedPdsEndpoint) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">PDS endpoint not available</p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">Cannot fetch blobs without a PDS endpoint.</p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch blobs from PDS
  const fetchBlobs = useCallback(async (cursorParam?: string) => {
    try {
      const url = new URL(`/xrpc/com.atproto.sync.listBlobs`, normalizedPdsEndpoint);
      url.searchParams.set('did', did);
      url.searchParams.set('limit', '50'); // Reasonable batch size
      if (cursorParam) {
        url.searchParams.set('cursor', cursorParam);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch blobs: ${response.status}`);
      }

      const data: BlobData = await response.json();
      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to fetch blobs');
    }
  }, [did, normalizedPdsEndpoint]);

  // Initial load
  useEffect(() => {
    // Skip if already loaded (for persistent state)
    if (hasLoaded) return;

    const loadInitialBlobs = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const data = await fetchBlobs();
        const newBlobs = data.cids || [];
        setState(prev => ({ 
          ...prev, 
          blobs: newBlobs, 
          cursor: data.cursor || null,
          isLoading: false,
          hasLoaded: true
        }));
      } catch (err) {
        console.error('Error loading blobs:', err);
        setState(prev => ({ 
          ...prev, 
          error: err instanceof Error ? err.message : 'Failed to load blobs',
          isLoading: false,
          hasLoaded: true
        }));
      }
    };

    loadInitialBlobs();
  }, [did, normalizedPdsEndpoint, hasLoaded, fetchBlobs]);

  // Load more blobs
  const loadMoreBlobs = useCallback(async () => {
    if (!cursor || isLoadingMore) return;

    setState(prev => ({ ...prev, isLoadingMore: true }));

    try {
      const data = await fetchBlobs(cursor);
      const newBlobs = data.cids || [];
      setState(prev => ({ 
        ...prev, 
        blobs: [...prev.blobs, ...newBlobs], 
        cursor: data.cursor || null,
        isLoadingMore: false
      }));
    } catch (err) {
      console.error('Error loading more blobs:', err);
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Failed to load more blobs',
        isLoadingMore: false
      }));
    }
  }, [cursor, isLoadingMore, fetchBlobs]);

  // Infinite scroll functionality
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && cursor && !isLoadingMore) {
          loadMoreBlobs();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [cursor, isLoadingMore, loadMoreBlobs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading blobs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">Failed to load blobs</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (blobs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <div className="text-4xl mb-4">📦</div>
        <p className="text-lg font-medium mb-2">No blobs found</p>
        <p className="text-sm">This profile doesn't have any stored blobs.</p>
      </div>
    );
  }

  const blobTabs = [
    { id: 'preview', label: 'Preview' },
    { id: 'raw', label: 'Raw Data' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-lg mb-1">Blob Storage</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {blobs.length} blob{blobs.length !== 1 ? 's' : ''} {blobs.length >= 50 ? 'loaded from' : 'found in'} this repository
            </p>
          </div>
          {blobs.length > 0 && normalizedPdsEndpoint && (
            <BlobDownloadDropdown
              onDownloadLoaded={handleDownloadLoaded}
              onDownloadAll={handleDownloadAll}
              isLoading={isDownloadingBlobs}
              disabled={isDownloadingBlobs}
              loadedCount={blobs.length}
              showSimplified={blobs.length < 50}
            />
          )}
        </div>
      </div>

      {/* Inner Tab Navigation */}
      <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
        {blobTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveBlobTab(tab.id as 'preview' | 'raw')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeBlobTab === tab.id
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="relative">
        {/* Preview Tab */}
        <div className={activeBlobTab === 'preview' ? 'block' : 'hidden'}>
          <div className="space-y-6">
            {/* Gallery */}
            <BlobGallery 
              blobs={blobs}
              did={did} 
              pdsEndpoint={normalizedPdsEndpoint}
              onLoadMore={loadMoreBlobs}
              canLoadMore={!!cursor}
              isLoadingMore={isLoadingMore}
            />

            {/* Infinite scroll trigger */}
            {cursor && (
              <div ref={loadMoreRef} className="flex justify-center py-4">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    <span>Loading more blobs...</span>
                  </div>
                )}
              </div>
            )}

            {/* Fallback Load More Button */}
            {cursor && !isLoadingMore && (
              <div className="flex justify-center">
                <LoadMoreButton
                  onClick={loadMoreBlobs}
                  isLoading={isLoadingMore}
                />
              </div>
            )}
          </div>
        </div>

        {/* Raw Data Tab */}
        <div className={activeBlobTab === 'raw' ? 'block' : 'hidden'}>
          {blobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">📦</div>
              <p className="text-lg font-medium mb-2">Blob CID Data</p>
              <p className="text-sm">
                No blobs found to display CID information.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-gray-700">
                Showing {blobs.length} blob CID{blobs.length !== 1 ? 's' : ''} 
                {cursor && <span> • <button onClick={loadMoreBlobs} className="text-blue-500 hover:text-blue-700">{isLoadingMore ? 'Loading...' : 'Load more'}</button></span>}
              </div>
              <JsonViewer data={blobs} />
            </div>
          )}
        </div>
      </div>

      {/* Download Modal */}
      <BlobDownloadModal
        isOpen={showDownloadModal}
        onClose={closeDownloadModal}
        logs={downloadLogs}
        currentProgress={downloadProgress}
        isComplete={isDownloadComplete}
        canClose={canCloseDownload}
      />
    </div>
  );
} 
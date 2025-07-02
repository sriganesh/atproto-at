import React, { useState, useEffect, useCallback, useRef } from 'react';
import BlobItem from './BlobItem';
import BlobPreview from './BlobPreview';

type BlobType = 'image' | 'video' | 'webvtt' | 'other';

interface BlobGalleryProps {
  blobs: string[];
  did: string;
  pdsEndpoint: string;
  onLoadMore?: () => Promise<void>;
  canLoadMore?: boolean;
  isLoadingMore?: boolean;
}

export default function BlobGallery({ blobs, did, pdsEndpoint, onLoadMore, canLoadMore, isLoadingMore }: BlobGalleryProps) {
  const [selectedBlob, setSelectedBlob] = useState<{ cid: string; type?: BlobType; index: number } | null>(null);
  const [typeCache, setTypeCache] = useState<Map<string, BlobType>>(new Map());
  const typeCacheRef = useRef(typeCache);
  
  // Keep ref in sync with state
  useEffect(() => {
    typeCacheRef.current = typeCache;
  }, [typeCache]);

  // Fast blob type detection for prefetching
  const prefetchBlobType = useCallback(async (cid: string) => {
    if (typeCacheRef.current.has(cid)) return; // Already cached

    const imageUrl = `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${cid}@jpeg`;
    const videoThumbnailUrl = `https://video.cdn.bsky.app/hls/${did}/${cid}/thumbnail.jpg`;

    try {
      // Quick check for image first (most common case)
      const imagePromise = new Promise<boolean>((resolve) => {
        const testImage = new Image();
        const timeout = setTimeout(() => resolve(false), 400);
        testImage.onload = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        testImage.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        testImage.src = imageUrl;
      });

      const isImage = await imagePromise;
      
      if (isImage) {
        setTypeCache(prev => new Map(prev).set(cid, 'image'));
        return;
      }

      // Only check video if not an image
      const videoPromise = new Promise<boolean>((resolve) => {
        const testVideo = new Image();
        const timeout = setTimeout(() => resolve(false), 400);
        testVideo.onload = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        testVideo.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        testVideo.src = videoThumbnailUrl;
      });

      const isVideo = await Promise.race([
        videoPromise,
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 100)) // Quick timeout for video
      ]);

      if (isVideo) {
        setTypeCache(prev => new Map(prev).set(cid, 'video'));
      }
      // Don't cache 'other' types during prefetching - let full detection run when needed
      // This allows WebVTT and other file types to be properly detected when navigating to them
    } catch (error) {
      // Silent fail for prefetch - don't cache anything, let full detection run
          }
  }, [did]);

  // Prefetch adjacent blob types when a blob is selected for preview
  useEffect(() => {
    if (selectedBlob && selectedBlob.index !== undefined) {
      const prefetchAdjacent = async () => {
        const currentIndex = selectedBlob.index;
        const adjacentIndices = [
          currentIndex - 1,
          currentIndex + 1,
          currentIndex - 2, // Prefetch a bit further for smoother navigation
          currentIndex + 2
        ].filter(index => index >= 0 && index < blobs.length);

        // Prefetch types for adjacent blobs that aren't cached yet
        for (const index of adjacentIndices) {
          const cid = blobs[index];
          if (!typeCache.has(cid)) {
            // Start prefetching in the background
            prefetchBlobType(cid);
          }
        }
      };

      prefetchAdjacent();
    }
  }, [selectedBlob, blobs, typeCache, prefetchBlobType]);

  const handleBlobClick = (cid: string, detectedType?: 'image' | 'video') => {
    const index = blobs.indexOf(cid);
    
    // Store detected type in cache (cast to BlobType for compatibility)
    if (detectedType) {
      setTypeCache(prev => new Map(prev).set(cid, detectedType as BlobType));
    }
    
    setSelectedBlob({ cid, type: detectedType as BlobType, index });
  };

  const handleClosePreview = () => {
    setSelectedBlob(null);
  };

  const handleNavigate = async (newIndex: number) => {
    if (newIndex >= 0 && newIndex < blobs.length) {
      const newCid = blobs[newIndex];
      const cachedType = typeCache.get(newCid);
      
      // Immediately update to show the new blob (this prevents loading delays)
      setSelectedBlob({ cid: newCid, type: cachedType, index: newIndex });
      
      // If not cached, start prefetching adjacent items for this new position
      if (!cachedType) {
        // Prefetch for better subsequent navigation
        const adjacentIndices = [newIndex - 1, newIndex + 1]
          .filter(index => index >= 0 && index < blobs.length);
        
        for (const index of adjacentIndices) {
          const adjacentCid = blobs[index];
          if (!typeCache.has(adjacentCid)) {
            prefetchBlobType(adjacentCid);
          }
        }
      }
    } else if (newIndex >= blobs.length && canLoadMore && onLoadMore && !isLoadingMore) {
      // Reached the end, try to load more
      try {
        await onLoadMore();
        // After loading, check if new items are available
        if (newIndex < blobs.length) {
          const newCid = blobs[newIndex];
          const cachedType = typeCache.get(newCid);
          setSelectedBlob({ cid: newCid, type: cachedType, index: newIndex });
        }
      } catch (error) {
        console.error('Failed to load more items:', error);
      }
    }
  };

  // Callback to update type cache when BlobPreview detects type
  const handleTypeDetected = (cid: string, type: BlobType) => {
    setTypeCache(prev => new Map(prev).set(cid, type));
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {blobs.map((cid) => (
          <BlobItem
            key={cid}
            cid={cid}
            did={did}
            onClick={(detectedType?: 'image' | 'video') => handleBlobClick(cid, detectedType)}
          />
        ))}
      </div>

      {/* Preview Modal */}
      {selectedBlob && (
        <BlobPreview
          cid={selectedBlob.cid}
          did={did}
          type={selectedBlob.type}
          pdsEndpoint={pdsEndpoint}
          onClose={handleClosePreview}
          galleryBlobs={blobs}
          currentIndex={selectedBlob.index}
          onNavigate={handleNavigate}
          canLoadMore={canLoadMore}
          isLoadingMore={isLoadingMore}
          onTypeDetected={handleTypeDetected}
        />
      )}
    </>
  );
} 
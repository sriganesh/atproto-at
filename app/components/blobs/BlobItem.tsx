import React, { useState, useEffect, useRef } from 'react';
import { isMobileDevice } from '@/lib/utils/browser/device-utils';

interface BlobItemProps {
  cid: string;
  did: string;
  onClick: (detectedType?: 'image' | 'video') => void;
}

export default function BlobItem({ cid, did, onClick }: BlobItemProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [detectedType, setDetectedType] = useState<'image' | 'video' | 'other'>('image');
  const [currentUrl, setCurrentUrl] = useState(`https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${cid}@jpeg`);
  const imgRef = useRef<HTMLImageElement>(null);

  // Detect if we're on mobile or Safari
  const isMobile = isMobileDevice();
  const isSafari = typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    // If the image CDN failed, try video thumbnail
    if (detectedType === 'image') {
      const videoThumbnailUrl = `https://video.cdn.bsky.app/hls/${did}/${cid}/thumbnail.jpg`;
      setCurrentUrl(videoThumbnailUrl);
      setDetectedType('video');
      setIsLoading(true); // Keep loading while we try video thumbnail
    } else {
      // Video thumbnail also failed, show error state
      setIsLoading(false);
      setHasError(true);
      setDetectedType('other');
    }
  };

  // Improved loading timeout with Safari-specific handling
  useEffect(() => {
    const checkImageLoaded = () => {
      if (imgRef.current && imgRef.current.complete) {
        if (imgRef.current.naturalWidth > 0 && imgRef.current.naturalHeight > 0) {
          setIsLoading(false);
          return true;
        } else if (imgRef.current.naturalWidth === 0 && imgRef.current.naturalHeight === 0) {
          // Image failed to load
          handleImageError();
          return true;
        }
      }
      return false;
    };

    // Immediate check
    if (checkImageLoaded()) {
      return;
    }

    // Safari and mobile need more aggressive checking
    const checkInterval = isSafari || isMobile ? 250 : 500;
    const maxTimeout = isSafari ? 1500 : (isMobile ? 2000 : 3000);

    const intervalId = setInterval(() => {
      if (checkImageLoaded()) {
        clearInterval(intervalId);
      }
    }, checkInterval);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      if (isLoading && !hasError) {
        if (checkImageLoaded()) {
          return;
        }
        // Force hide loading state if we can't determine load status
        setIsLoading(false);
      }
    }, maxTimeout);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [currentUrl, isLoading, hasError, isSafari, isMobile]);

  const handleClick = () => {
    onClick(detectedType === 'other' ? undefined : detectedType);
  };

  return (
    <div 
      className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-gray-200 dark:border-gray-700"
      onClick={handleClick}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error State - show generic file icon */}
      {hasError && (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="text-4xl mb-2">📄</div>
          <span className="text-xs text-center">Preview</span>
        </div>
      )}

      {/* Video play overlay for detected videos */}
      {detectedType === 'video' && !isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black bg-opacity-60 rounded-full p-3">
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Image/Video Thumbnail */}
      {!hasError && (
        <img
          ref={imgRef}
          src={currentUrl}
          alt={`Blob ${cid.substring(0, 12)}...`}
          className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={isMobile || isSafari ? "eager" : "lazy"}
          decoding={isSafari ? "sync" : "async"}
        />
      )}
    </div>
  );
} 
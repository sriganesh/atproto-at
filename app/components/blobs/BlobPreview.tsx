import React, { useState, useEffect, useCallback } from 'react';

type BlobType = 'image' | 'video' | 'webvtt' | 'other';

interface BlobPreviewProps {
  cid: string;
  did: string;
  type?: BlobType;
  pdsEndpoint: string;
  onClose: () => void;
  // Gallery navigation
  galleryBlobs?: string[];
  currentIndex?: number;
  onNavigate?: (newIndex: number) => Promise<void>;
  canLoadMore?: boolean;
  isLoadingMore?: boolean;
  onTypeDetected?: (cid: string, type: BlobType) => void;
}

export default function BlobPreview({ cid, did, type, pdsEndpoint, onClose, galleryBlobs, currentIndex, onNavigate, canLoadMore, isLoadingMore, onTypeDetected }: BlobPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [detectedType, setDetectedType] = useState<'image' | 'video' | 'webvtt' | 'other' | undefined>(type);
  const [isDetecting, setIsDetecting] = useState(!type); // Only detect if type not provided
  const [webvttContent, setWebvttContent] = useState<string>('');

  // Generate URLs based on detected type
  const imageUrl = `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${cid}@jpeg`;
  const videoThumbnailUrl = `https://video.cdn.bsky.app/hls/${did}/${cid}/thumbnail.jpg`;
  const pdsUrl = `${pdsEndpoint}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${cid}`;
  
  // For videos, use PDS directly to get the raw video file instead of HLS segments
  const videoUrl = pdsUrl;

  // Reset state when CID changes (navigation)
  useEffect(() => {
    // Immediately clear any hanging states when navigating
    setIsLoading(true);
    setHasError(false);
    setDetectedType(type);
    setIsDetecting(!type); // Detect if type is undefined/null
    setWebvttContent(''); // Clear any previous content
    
    // If we have a type from cache, clear loading immediately
    if (type) {
      setIsLoading(false);
    }
  }, [cid, type]);

  // Fast type detection with reduced timeouts and parallel checks
  useEffect(() => {
    if (!type && isDetecting) {
      const detectBlobType = async () => {
        try {
          // Try image first (most common case)
          const imagePromise = new Promise<boolean>((resolve) => {
            const testImage = new Image();
            const timeout = setTimeout(() => resolve(false), 500);
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

          // Start head request but with very aggressive timeout
          const headPromise = new Promise<string>((resolve) => {
            const timeoutController = new AbortController();
            const timeoutId = setTimeout(() => {
              timeoutController.abort();
              resolve('');
            }, 800); // Further reduced from 2s to 800ms
            
            fetch(pdsUrl, { 
              method: 'HEAD',
              signal: timeoutController.signal
            })
            .then(response => {
              clearTimeout(timeoutId);
              resolve(response.headers.get('content-type') || '');
            })
            .catch(() => {
              clearTimeout(timeoutId);
              resolve('');
            });
          });

          // Check if it's an image first
          const isImage = await imagePromise;
          
          if (isImage) {
            setDetectedType('image');
            setIsDetecting(false);
            onTypeDetected?.(cid, 'image');
            return;
          }

          // Only check video if image failed
          const videoPromise = new Promise<boolean>((resolve) => {
            const testVideo = new Image();
            const timeout = setTimeout(() => resolve(false), 500);
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

          // Check video while also getting content-type
          const [isVideo, headResult] = await Promise.all([
            videoPromise,
            Promise.race([
              headPromise,
              new Promise<string>(resolve => setTimeout(() => resolve(''), 300))
            ])
          ]);

          if (isVideo) {
            setDetectedType('video');
            setIsDetecting(false);
            onTypeDetected?.(cid, 'video');
            return;
          }

          // Check if we have WebVTT content

          if (headResult.includes('text/vtt')) {
            // Fetch WebVTT content with very reduced timeout
            try {
              const contentController = new AbortController();
              const contentTimeoutId = setTimeout(() => contentController.abort(), 1000); // Reduced from 3s to 1s
              
              const contentResponse = await fetch(pdsUrl, {
                signal: contentController.signal
              });
              clearTimeout(contentTimeoutId);
              
              const content = await contentResponse.text();
              setWebvttContent(content);
              setDetectedType('webvtt');
              setIsDetecting(false);
              setIsLoading(false);
              onTypeDetected?.(cid, 'webvtt');
              return;
            } catch (contentError) {
                            // Fall through to default type
            }
          }

          // Default to other type immediately
          setDetectedType('other');
          setIsDetecting(false);
          setIsLoading(false);
          onTypeDetected?.(cid, 'other');
        } catch (error) {
          console.error('Error in blob type detection:', error);
          // Ensure we always clear the loading states immediately
          setDetectedType('other');
          setIsDetecting(false);
          setIsLoading(false);
          setHasError(false); // Don't show error for detection failures
        }
      };

      // Very aggressive overall timeout
      const overallTimeout = setTimeout(() => {
                setDetectedType('other');
        setIsDetecting(false);
        setIsLoading(false);
        onTypeDetected?.(cid, 'other');
      }, 1500); // Reduced from 5s to 1.5s

      detectBlobType().finally(() => {
        clearTimeout(overallTimeout);
      });
    }
  }, [isDetecting, imageUrl, videoThumbnailUrl, pdsUrl, cid, onTypeDetected, type]);

  // Add emergency timeout for any lingering loading states
  useEffect(() => {
    if (isDetecting) {
      const emergencyTimeout = setTimeout(() => {
                setDetectedType('other');
        setIsDetecting(false);
        setIsLoading(false);
        onTypeDetected?.(cid, 'other');
      }, 2000); // Emergency fallback after 2s

      return () => clearTimeout(emergencyTimeout);
    }
  }, [isDetecting, cid, onTypeDetected]);

  const handleMediaLoad = () => {
    setIsLoading(false);
  };

  const handleMediaError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Gallery navigation
  const canNavigatePrev = galleryBlobs && currentIndex !== undefined && currentIndex > 0;
  const canNavigateNext = galleryBlobs && currentIndex !== undefined && (
    currentIndex < galleryBlobs.length - 1 || (canLoadMore && !isLoadingMore)
  );

  const handlePrevious = useCallback(async () => {
    if (canNavigatePrev && onNavigate && currentIndex !== undefined) {
      await onNavigate(currentIndex - 1);
    }
  }, [canNavigatePrev, onNavigate, currentIndex]);

  const handleNext = useCallback(async () => {
    if (onNavigate && currentIndex !== undefined) {
      await onNavigate(currentIndex + 1);
    }
  }, [onNavigate, currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrevious, handleNext]);

  const renderContent = () => {
    if (hasError) {
      return (
        <div className="text-center text-white">
          <svg className="h-20 w-20 mx-auto mb-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-xl font-medium">Unable to load {detectedType === 'video' ? 'video' : detectedType || 'content'}</p>
        </div>
      );
    }

    if (isDetecting) {
      return (
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl font-medium">Loading...</p>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Loading overlay */}
        {isLoading && !isDetecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="flex items-center gap-3 text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="text-lg">Loading {detectedType || 'content'}...</span>
            </div>
          </div>
        )}

        {/* Media content - only render when type is detected */}
        {detectedType && !isDetecting && (
          detectedType === 'video' ? (
            <video
              src={videoUrl}
              poster={videoThumbnailUrl}
              controls
              autoPlay
              className="max-w-full object-contain"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
              onLoadedData={handleMediaLoad}
              onError={handleMediaError}
            >
              Your browser does not support the video tag.
            </video>
          ) : detectedType === 'image' ? (
            <img
              src={imageUrl}
              alt={`Blob ${cid}`}
              className="max-w-full object-contain"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
              onLoad={handleMediaLoad}
              onError={handleMediaError}
            />
          ) : detectedType === 'webvtt' ? (
            <div className="w-full max-w-4xl mx-auto text-white">
              <div className="bg-black bg-opacity-80 rounded-lg p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="flex items-center gap-2 mb-4 text-green-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2C7 1.44772 7.44772 1 8 1H16C16.5523 1 17 1.44772 17 2V4M7 4H17M7 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4H17" />
                  </svg>
                  <h3 className="text-lg font-medium">WebVTT Subtitles</h3>
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {webvttContent}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center text-white">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-medium mb-2">Binary Blob</h3>
              <p className="text-gray-300 mb-4">This blob contains binary data that cannot be previewed</p>
              <a
                href={pdsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                Download File
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </a>
            </div>
          )
        )}
      </div>
    );
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-[100]"
      style={{ 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        width: '100vw', 
        height: '100vh' 
      }}
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 transition-colors p-2"
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation arrows */}
      {galleryBlobs && galleryBlobs.length > 1 && (
        <>
          {/* Previous button */}
          <button
            onClick={handlePrevious}
            disabled={!canNavigatePrev}
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-3 rounded-full transition-all ${
              canNavigatePrev 
                ? 'text-white bg-black bg-opacity-50 hover:bg-opacity-70' 
                : 'text-gray-500 bg-black bg-opacity-30 cursor-not-allowed'
            }`}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={!canNavigateNext}
            className={`absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-3 rounded-full transition-all ${
              canNavigateNext 
                ? 'text-white bg-black bg-opacity-50 hover:bg-opacity-70' 
                : 'text-gray-500 bg-black bg-opacity-30 cursor-not-allowed'
            }`}
          >
            {isLoadingMore && currentIndex !== undefined && currentIndex >= (galleryBlobs?.length || 0) - 1 ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </>
      )}

      {/* Content container */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        {renderContent()}
      </div>

      {/* Bottom info bar */}
      <div className="bg-black bg-opacity-80 text-white p-4">
        <div className="max-w-4xl mx-auto">
                    {/* Links and Gallery position in same line */}
          <div className="flex items-center justify-between">
            {/* Links */}
            <div className="flex gap-4">
              {/* Only show first link for non-WebVTT types */}
              {detectedType !== 'webvtt' && (
                <a
                  href={detectedType === 'video' ? videoUrl : detectedType === 'image' ? imageUrl : pdsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                >
                  {detectedType === 'video' ? 'Video' : detectedType === 'image' ? 'CDN' : 'File'}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              
              <a
                href={pdsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors text-sm"
              >
                Original
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Gallery position */}
            {galleryBlobs && galleryBlobs.length > 1 && currentIndex !== undefined && (
              <p className="text-sm text-gray-300">
                {currentIndex + 1} of {galleryBlobs.length}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
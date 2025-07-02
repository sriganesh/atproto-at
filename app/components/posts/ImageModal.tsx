import React, { useState, useEffect, useCallback } from 'react';
import { resolveDid } from '../../../lib/edge-atproto';

type ImageData = {
  alt?: string;
  image: {
    ref: {
      $link: string;
    };
    mimeType: string;
  };
  aspectRatio?: {
    width: number;
    height: number;
  };
};

type ImageModalProps = {
  images: ImageData[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  authorDid?: string;
};

export default function ImageModal({ images, currentIndex, isOpen, onClose, authorDid }: ImageModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(currentIndex);
  const [pdsEndpoint, setPdsEndpoint] = useState<string | null>(null);

  // Update current index when prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(currentIndex);
    }
  }, [currentIndex, isOpen]);

  // Reset PDS endpoint when modal closes to save memory
  useEffect(() => {
    if (!isOpen) {
      setPdsEndpoint(null);
    }
  }, [isOpen]);

  // Fetch PDS endpoint for the author using cached DID resolution
  useEffect(() => {
    const fetchPdsEndpoint = async () => {
      if (!authorDid) return;
      
      try {
                const pds = await resolveDid(authorDid);
        if (pds) {
                    setPdsEndpoint(pds);
        } else {
          console.warn(`ImageModal: Could not resolve DID ${authorDid}`);
        }
      } catch (error) {
        console.error('ImageModal: Error resolving DID:', error);
      }
    };
    
    if (isOpen) {
      fetchPdsEndpoint();
    }
  }, [authorDid, isOpen]);

  // Generate image URLs
  const getImageUrl = (link: string, fullSize = false) => {
    const cid = link.replace('$link', '').trim();
    
    if (authorDid) {
      const baseUrl = fullSize 
        ? `https://cdn.bsky.app/img/feed_fullsize/plain/${authorDid}/${cid}@jpeg`
        : `https://cdn.bsky.app/img/feed_thumbnail/plain/${authorDid}/${cid}@jpeg`;
      return baseUrl;
    }
    
    const baseUrl = fullSize 
      ? `https://cdn.bsky.app/img/feed_fullsize/plain/${cid}@jpeg`
      : `https://cdn.bsky.app/img/feed_thumbnail/plain/${cid}@jpeg`;
    return baseUrl;
  };

  // Generate PDS blob URL
  const getPdsUrl = (link: string) => {
    if (!pdsEndpoint || !authorDid) return null;
    
    const cid = link.replace('$link', '').trim();
    return `${pdsEndpoint}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(authorDid)}&cid=${cid}`;
  };

  // Navigate between images
  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    } else if (direction === 'next' && currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  }, [currentImageIndex, images.length]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle keyboard navigation and prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateImage('prev');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateImage('next');
        }
      };

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, currentImageIndex, onClose, navigateImage]);

  if (!isOpen) return null;

  const currentImage = images[currentImageIndex];
  const pdsUrl = getPdsUrl(currentImage.image.ref.$link);

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

      {/* Navigation arrows (only show if more than 1 image) */}
      {images.length > 1 && (
        <>
          {/* Previous button */}
          <button
            onClick={() => navigateImage('prev')}
            disabled={currentImageIndex === 0}
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-3 rounded-full transition-all ${
              currentImageIndex > 0
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
            onClick={() => navigateImage('next')}
            disabled={currentImageIndex === images.length - 1}
            className={`absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-3 rounded-full transition-all ${
              currentImageIndex < images.length - 1
                ? 'text-white bg-black bg-opacity-50 hover:bg-opacity-70' 
                : 'text-gray-500 bg-black bg-opacity-30 cursor-not-allowed'
            }`}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Image container */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <img
          src={getImageUrl(currentImage.image.ref.$link, true)}
          alt={currentImage.alt || `Image ${currentImageIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        />
      </div>

      {/* Bottom info bar */}
      <div className="bg-black bg-opacity-80 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Image info */}
            <div className="flex items-center gap-4">
              {currentImage.alt && (
                <span className="text-sm text-gray-300">
                  {currentImage.alt}
                </span>
              )}
              {pdsUrl && (
                <a
                  href={pdsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                >
                  PDS
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

            {/* Image counter */}
            {images.length > 1 && (
              <p className="text-sm text-gray-300">
                {currentImageIndex + 1} of {images.length}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
import React, { useState, useRef, useEffect } from 'react';
import TurnstileModal from './TurnstileModal';

interface BlobDownloadDropdownProps {
  onDownloadLoaded: () => void;
  onDownloadAll: () => void;
  isLoading: boolean;
  disabled?: boolean;
  loadedCount: number;
  showSimplified?: boolean;
}

export default function BlobDownloadDropdown({ 
  onDownloadLoaded, 
  onDownloadAll,
  isLoading, 
  disabled = false,
  loadedCount,
  showSimplified = false 
}: BlobDownloadDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTurnstile, setShowTurnstile] = useState(false);
  const [pendingDownloadType, setPendingDownloadType] = useState<'loaded' | 'all' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (downloadType: 'loaded' | 'all') => {
    setIsOpen(false);
    setPendingDownloadType(downloadType);
    setShowTurnstile(true);
  };

  const handleTurnstileVerified = () => {
    if (pendingDownloadType === 'loaded') {
      onDownloadLoaded();
    } else if (pendingDownloadType === 'all') {
      onDownloadAll();
    }
    setPendingDownloadType(null);
  };

  const handleTurnstileClose = () => {
    setShowTurnstile(false);
    setPendingDownloadType(null);
  };

  // Render simplified single button for cases where loaded = all
  if (showSimplified) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => handleOptionClick('all')}
          disabled={disabled || isLoading}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
            ${disabled || isLoading 
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
            }
          `}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Preparing...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download All</span>
            </>
          )}
        </button>

        <TurnstileModal
          isOpen={showTurnstile}
          onClose={handleTurnstileClose}
          onVerified={handleTurnstileVerified}
          downloadType={pendingDownloadType || 'all'}
          blobCount={loadedCount}
        />
      </div>
    );
  }

  // Original dropdown implementation for cases where loaded != all
  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex">
        {/* Main Download Button */}
        <button
          onClick={() => handleOptionClick('loaded')}
          disabled={disabled || isLoading}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-l-lg font-medium text-sm transition-all
            ${disabled || isLoading 
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
            }
          `}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Preparing...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download Loaded ({loadedCount})</span>
            </>
          )}
        </button>

        {/* Dropdown Arrow */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || isLoading}
          className={`
            px-2 py-2 rounded-r-lg border-l border-purple-500 transition-all
            ${disabled || isLoading 
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed border-gray-400' 
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
            }
          `}
        >
          <svg 
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && !isLoading && (
        <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            <button
              onClick={() => handleOptionClick('loaded')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <div className="font-medium">Download Loaded ({loadedCount})</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Download only the blobs currently shown as ZIP file
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleOptionClick('all')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <div>
                <div className="font-medium">Download All from Repository</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Fetch and download all blobs from this account as ZIP file
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      <TurnstileModal
        isOpen={showTurnstile}
        onClose={handleTurnstileClose}
        onVerified={handleTurnstileVerified}
        downloadType={pendingDownloadType || 'loaded'}
        blobCount={loadedCount}
      />
    </div>
  );
} 
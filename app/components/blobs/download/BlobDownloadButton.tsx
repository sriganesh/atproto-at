import React from 'react';

interface BlobDownloadButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
  blobCount: number;
}

export default function BlobDownloadButton({ 
  onClick, 
  isLoading, 
  disabled = false,
  blobCount 
}: BlobDownloadButtonProps) {
  return (
    <button
      onClick={onClick}
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
          <span>Download Loaded ({blobCount})</span>
        </>
      )}
    </button>
  );
} 
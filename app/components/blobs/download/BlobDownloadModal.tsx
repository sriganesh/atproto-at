import React from 'react';

interface DownloadLog {
  id: string;
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'success';
  message: string;
}

interface BlobDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: DownloadLog[];
  currentProgress: {
    current: number;
    total: number;
    stage: string;
  } | null;
  isComplete: boolean;
  canClose: boolean;
}

export default function BlobDownloadModal({
  isOpen,
  onClose,
  logs,
  currentProgress,
  isComplete,
  canClose
}: BlobDownloadModalProps) {
  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return '❌';
      case 'warn':
        return '⚠️';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warn':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'success':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Downloading Blobs
          </h2>
          {canClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {currentProgress && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {currentProgress.stage}
              </span>
              <span className="text-sm text-gray-500">
                {currentProgress.current} of {currentProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(currentProgress.current / currentProgress.total) * 100}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2">
              <span className="text-gray-500 text-xs mt-0.5">
                {log.timestamp}
              </span>
              <span className={`${getLogColor(log.level)} mt-0.5`}>
                {getLogIcon(log.level)}
              </span>
              <span className="text-gray-800 dark:text-gray-200 flex-1">
                {log.message}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        {isComplete && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 
import { useState, useCallback, useRef, useEffect } from 'react';
import { showSaveFilePicker, downloadBlob, isFileSystemAccessSupported } from '@/lib/utils/download/file-picker';
import { createZipCreator, sanitizeFilename } from '@/lib/utils/download/zip-creator';
import { DownloadManager, DownloadProgress } from '@/lib/utils/download/download-manager';
import { generateBlobFilename } from '@/lib/utils/download/content-type-mapper';

interface DownloadLog {
  id: string;
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'success';
  message: string;
}

interface UseBlobDownloadReturn {
  startDownload: (blobs: string[], did: string, pdsEndpoint: string, identifier: string) => Promise<void>;
  startDownloadAll: (did: string, pdsEndpoint: string, identifier: string) => Promise<void>;
  isDownloading: boolean;
  showModal: boolean;
  closeModal: () => void;
  logs: DownloadLog[];
  currentProgress: DownloadProgress | null;
  isComplete: boolean;
  canClose: boolean;
}

export const useBlobDownload = (): UseBlobDownloadReturn => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [logs, setLogs] = useState<DownloadLog[]>([]);
  const [currentProgress, setCurrentProgress] = useState<DownloadProgress | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addLog = useCallback((level: 'info' | 'error' | 'warn' | 'success', message: string) => {
    const log: DownloadLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };
    setLogs(prev => [...prev, log]);
  }, []);

  const resetState = useCallback(() => {
    setLogs([]);
    setCurrentProgress(null);
    setIsComplete(false);
    setCanClose(false);
    setIsDownloading(false);
  }, []);

  const closeModal = useCallback(() => {
    if (canClose || !isDownloading) {
      setShowModal(false);
      // Reset state after a short delay to allow modal to close smoothly
      setTimeout(resetState, 300);
    }
  }, [canClose, isDownloading, resetState]);

  // Function to fetch all blobs from repository
  const fetchAllBlobs = useCallback(async (
    did: string, 
    pdsEndpoint: string, 
    signal: AbortSignal
  ): Promise<string[]> => {
    const allBlobs: string[] = [];
    let cursor: string | undefined;
    
    addLog('info', 'Fetching complete blob list from repository...');
    
    do {
      signal.throwIfAborted();
      
      const url = new URL('/xrpc/com.atproto.sync.listBlobs', pdsEndpoint);
      url.searchParams.set('did', did);
      url.searchParams.set('limit', '100'); // Larger batch size for fetching
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      setCurrentProgress({ 
        current: allBlobs.length, 
        total: allBlobs.length + 100, 
        stage: 'Fetching blob list' 
      });

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch blob list: ${response.status}`);
      }

      const data = await response.json();
      const newBlobs = data.cids || [];
      allBlobs.push(...newBlobs);
      cursor = data.cursor;
      
      addLog('info', `Fetched ${allBlobs.length} blob references...`);
      
    } while (cursor);
    
    addLog('info', `Complete! Found ${allBlobs.length} total blobs in repository`);
    return allBlobs;
  }, [addLog]);

  const startDownload = useCallback(async (
    blobs: string[], 
    did: string, 
    pdsEndpoint: string, 
    identifier: string
  ) => {
    if (isDownloading) return;

    // Reset state and show modal
    resetState();
    setShowModal(true);
    setIsDownloading(true);
    
    // Create abort controller for cancellation support
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      addLog('info', `Starting blob export for ${identifier}`);
      addLog('info', `Downloading ${blobs.length} loaded blobs`);

      if (blobs.length === 0) {
        addLog('warn', 'No blobs loaded to download');
        setIsComplete(true);
        setCanClose(true);
        setIsDownloading(false);
        return;
      }

      // Ask user where to save the file
      setCurrentProgress({ current: 0, total: blobs.length, stage: 'Waiting for user to choose save location' });
      addLog('info', 'Please choose where to save the ZIP file');

      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `atproto_at_blobs-${sanitizeFilename(identifier)}-${timestamp}.zip`;
      const folderName = `atproto_at_blobs-${sanitizeFilename(identifier)}-${timestamp}`;

      let fileHandle;
      if (isFileSystemAccessSupported()) {
        try {
          fileHandle = await showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'ZIP Archive',
                accept: { 'application/zip': ['.zip'] },
              },
            ],
          });
        } catch (error) {
          addLog('error', `Failed to open file picker: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        if (!fileHandle) {
          addLog('warn', 'File save cancelled by user');
          setIsComplete(true);
          setCanClose(true);
          setIsDownloading(false);
          return;
        }
      }

      signal.throwIfAborted();

      // Initialize ZIP creator
      const zipCreator = createZipCreator();
      addLog('info', 'Initialized ZIP archive');

      // Set up download manager
      const downloadManager = new DownloadManager({
        concurrency: 3,
        maxRetries: 3,
        onProgress: (progress) => {
          setCurrentProgress(progress);
        },
        onLog: (level, message) => {
          addLog(level, message);
        },
      });

      // Generate blob URLs
      const urlGenerator = (cid: string) => {
        const url = new URL('/xrpc/com.atproto.sync.getBlob', pdsEndpoint);
        url.searchParams.set('did', did);
        url.searchParams.set('cid', cid);
        return url.toString();
      };

      // Download all blobs
      const results = await downloadManager.downloadBlobs(blobs, urlGenerator, signal);

      signal.throwIfAborted();

      // Add successful downloads to ZIP
      setCurrentProgress({ current: 0, total: results.length, stage: 'Creating ZIP archive' });
      addLog('info', 'Adding blobs to ZIP archive with detected file extensions');

      let successCount = 0;
      for (const result of results) {
        if (result.data) {
          const filename = generateBlobFilename(result.cid, result.contentType);
          const blobFilename = `${folderName}/${filename}`;
          zipCreator.addFile(blobFilename, result.data);
          successCount++;
        }
        setCurrentProgress({ 
          current: successCount, 
          total: results.filter(r => r.data !== null).length, 
          stage: 'Creating ZIP archive' 
        });
      }

      signal.throwIfAborted();

      // Generate ZIP file
      setCurrentProgress({ current: 0, total: 1, stage: 'Generating ZIP file' });
      addLog('info', 'Generating ZIP file...');
      addLog('warn', 'This may take several minutes for large archives with many blobs. Please be patient.');
      
      const zipBlob = await zipCreator.generate();

      signal.throwIfAborted();

      // Save the file
      if (fileHandle) {
        // File System Access API path
        const writable = await fileHandle.createWritable();
        await writable.write(zipBlob);
        await writable.close();
        addLog('success', `ZIP file saved successfully!`);
      } else {
        // Fallback download
        downloadBlob(zipBlob, filename);
        addLog('success', `ZIP file download started!`);
      }

      const failedCount = results.length - successCount;
      if (failedCount > 0) {
        addLog('warn', `${failedCount} blobs failed to download and were skipped`);
      }
      
      addLog('success', `Export completed! ${successCount} blobs archived.`);

    } catch (error) {
      if (signal.aborted) {
        addLog('warn', 'Download cancelled by user');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        addLog('error', `Export failed: ${errorMessage}`);
        console.error('Blob download error:', error);
      }
    } finally {
      setCurrentProgress(null);
      setIsComplete(true);
      setCanClose(true);
      setIsDownloading(false);
      abortControllerRef.current = null;
    }
  }, [isDownloading, addLog, resetState]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const startDownloadAll = useCallback(async (
    did: string, 
    pdsEndpoint: string, 
    identifier: string
  ) => {
    if (isDownloading) return;

    // Reset state and show modal
    resetState();
    setShowModal(true);
    setIsDownloading(true);
    
    // Create abort controller for cancellation support
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      addLog('info', `Starting complete blob export for ${identifier}`);
      
      // First, fetch all blobs from the repository
      const allBlobs = await fetchAllBlobs(did, pdsEndpoint, signal);
      
      if (allBlobs.length === 0) {
        addLog('warn', 'No blobs found in repository');
        setIsComplete(true);
        setCanClose(true);
        setIsDownloading(false);
        return;
      }

      // Ask user where to save the file
      setCurrentProgress({ current: 0, total: allBlobs.length, stage: 'Waiting for user to choose save location' });
      addLog('info', 'Please choose where to save the ZIP file');

      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `atproto_at_blobs-all-${sanitizeFilename(identifier)}-${timestamp}.zip`;
      const folderName = `atproto_at_blobs-all-${sanitizeFilename(identifier)}-${timestamp}`;

      let fileHandle;
      if (isFileSystemAccessSupported()) {
        try {
          fileHandle = await showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'ZIP Archive',
                accept: { 'application/zip': ['.zip'] },
              },
            ],
          });
        } catch (error) {
          addLog('error', `Failed to open file picker: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        if (!fileHandle) {
          addLog('warn', 'File save cancelled by user');
          setIsComplete(true);
          setCanClose(true);
          setIsDownloading(false);
          return;
        }
      }

      signal.throwIfAborted();

      // Initialize ZIP creator
      const zipCreator = createZipCreator();
      addLog('info', 'Initialized ZIP archive');

      // Set up download manager
      const downloadManager = new DownloadManager({
        concurrency: 3,
        maxRetries: 3,
        onProgress: (progress) => {
          setCurrentProgress(progress);
        },
        onLog: (level, message) => {
          addLog(level, message);
        },
      });

      // Generate blob URLs
      const urlGenerator = (cid: string) => {
        const url = new URL('/xrpc/com.atproto.sync.getBlob', pdsEndpoint);
        url.searchParams.set('did', did);
        url.searchParams.set('cid', cid);
        return url.toString();
      };

      // Download all blobs
      const results = await downloadManager.downloadBlobs(allBlobs, urlGenerator, signal);

      signal.throwIfAborted();

      // Add successful downloads to ZIP
      setCurrentProgress({ current: 0, total: results.length, stage: 'Creating ZIP archive' });
      addLog('info', 'Adding blobs to ZIP archive with detected file extensions');

      let successCount = 0;
      for (const result of results) {
        if (result.data) {
          const filename = generateBlobFilename(result.cid, result.contentType);
          const blobFilename = `${folderName}/${filename}`;
          zipCreator.addFile(blobFilename, result.data);
          successCount++;
        }
        setCurrentProgress({ 
          current: successCount, 
          total: results.filter(r => r.data !== null).length, 
          stage: 'Creating ZIP archive' 
        });
      }

      signal.throwIfAborted();

      // Generate ZIP file
      setCurrentProgress({ current: 0, total: 1, stage: 'Generating ZIP file' });
      addLog('info', 'Generating ZIP file...');
      addLog('warn', 'This may take several minutes for large archives with many blobs. Please be patient.');
      
      const zipBlob = await zipCreator.generate();

      signal.throwIfAborted();

      // Save the file
      if (fileHandle) {
        // File System Access API path
        const writable = await fileHandle.createWritable();
        await writable.write(zipBlob);
        await writable.close();
        addLog('success', `ZIP file saved successfully!`);
      } else {
        // Fallback download
        downloadBlob(zipBlob, filename);
        addLog('success', `ZIP file download started!`);
      }

      const failedCount = results.length - successCount;
      if (failedCount > 0) {
        addLog('warn', `${failedCount} blobs failed to download and were skipped`);
      }
      
      addLog('success', `Complete export finished! ${successCount} blobs archived from repository.`);

    } catch (error) {
      if (signal.aborted) {
        addLog('warn', 'Download cancelled by user');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        addLog('error', `Export failed: ${errorMessage}`);
        console.error('Blob download error:', error);
      }
    } finally {
      setCurrentProgress(null);
      setIsComplete(true);
      setCanClose(true);
      setIsDownloading(false);
      abortControllerRef.current = null;
    }
  }, [isDownloading, addLog, resetState, fetchAllBlobs]);

  return {
    startDownload,
    startDownloadAll,
    isDownloading,
    showModal,
    closeModal,
    logs,
    currentProgress,
    isComplete,
    canClose,
  };
}; 
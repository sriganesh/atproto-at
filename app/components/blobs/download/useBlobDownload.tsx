import { useState, useCallback, useRef, useEffect } from 'react';
import { showSaveFilePicker, downloadBlob, isFileSystemAccessSupported } from '@/lib/utils/download/file-picker';
import { createZipCreator, sanitizeFilename } from '@/lib/utils/download/zip-creator';
import { DownloadManager, DownloadProgress } from '@/lib/utils/download/download-manager';
import { generateBlobFilename } from '@/lib/utils/download/content-type-mapper';

// Maximum blobs per ZIP file to prevent memory issues
const MAX_BLOBS_PER_ZIP = 1000;

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
      addLog('info', `Downloading ${blobs.length} selected blobs`);

      if (blobs.length === 0) {
        addLog('warn', 'No blobs selected to download');
        setIsComplete(true);
        setCanClose(true);
        setIsDownloading(false);
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const sanitizedId = sanitizeFilename(identifier);

      // Check if we need multi-part export
      if (blobs.length > MAX_BLOBS_PER_ZIP) {
        // Multi-part export for large selections
        const chunks: string[][] = [];
        for (let i = 0; i < blobs.length; i += MAX_BLOBS_PER_ZIP) {
          chunks.push(blobs.slice(i, Math.min(i + MAX_BLOBS_PER_ZIP, blobs.length)));
        }

        const totalParts = chunks.length;
        addLog('info', `Large export detected (${blobs.length} blobs). Will create ${totalParts} ZIP files (${MAX_BLOBS_PER_ZIP} blobs each).`);

        let totalSuccessCount = 0;
        let totalFailedCount = 0;
        const hasFileSystemAccess = isFileSystemAccessSupported();

        for (let partIndex = 0; partIndex < chunks.length; partIndex++) {
          signal.throwIfAborted();

          const partNum = partIndex + 1;
          const chunk = chunks[partIndex];
          const paddedPartNum = String(partNum).padStart(2, '0');
          const paddedTotalParts = String(totalParts).padStart(2, '0');

          addLog('info', `Processing part ${partNum} of ${totalParts} (${chunk.length} blobs)`);

          // Create filename for this part
          const partFilename = `atproto_at-${sanitizedId}-${timestamp}-blobs_selected_part_${paddedPartNum}_of_${paddedTotalParts}.zip`;
          const folderName = `blobs_selected_part_${paddedPartNum}`;

          // Ask user where to save this part (only for File System Access API)
          let fileHandle;
          if (hasFileSystemAccess) {
            setCurrentProgress({
              current: partIndex * MAX_BLOBS_PER_ZIP,
              total: blobs.length,
              stage: `Choose location for part ${partNum} of ${totalParts}`
            });

            try {
              fileHandle = await showSaveFilePicker({
                suggestedName: partFilename,
                types: [
                  {
                    description: 'ZIP Archive',
                    accept: { 'application/zip': ['.zip'] },
                  },
                ],
              });
            } catch (error) {
              addLog('warn', `Failed to select save location for part ${partNum}. Skipping...`);
              continue; // Skip this part if user cancels
            }
          }

          // Create fresh ZIP instance for this part
          const zipCreator = createZipCreator();

          // Set up download manager for this chunk
          const downloadManager = new DownloadManager({
            concurrency: 3,
            maxRetries: 3,
            onProgress: (progress) => {
              setCurrentProgress({
                current: (partIndex * MAX_BLOBS_PER_ZIP) + progress.current,
                total: blobs.length,
                stage: `Downloading part ${partNum} of ${totalParts}: ${progress.stage}`
              });
            },
            onLog: (level, message) => {
              addLog(level, `[Part ${partNum}] ${message}`);
            },
          });

          // Generate blob URLs
          const urlGenerator = (cid: string) => {
            const url = new URL('/xrpc/com.atproto.sync.getBlob', pdsEndpoint);
            url.searchParams.set('did', did);
            url.searchParams.set('cid', cid);
            return url.toString();
          };

          // Download blobs for this chunk
          const results = await downloadManager.downloadBlobs(chunk, urlGenerator, signal);

          signal.throwIfAborted();

          // Add successful downloads to ZIP
          addLog('info', `[Part ${partNum}] Adding ${results.filter(r => r.data !== null).length} blobs to ZIP archive`);

          let partSuccessCount = 0;
          for (const result of results) {
            if (result.data) {
              const filename = generateBlobFilename(result.cid, result.contentType);
              const blobFilename = `${folderName}/${filename}`;
              zipCreator.addFile(blobFilename, result.data);
              partSuccessCount++;
            }
          }

          totalSuccessCount += partSuccessCount;
          const partFailedCount = chunk.length - partSuccessCount;
          totalFailedCount += partFailedCount;

          signal.throwIfAborted();

          // Generate and save this part
          setCurrentProgress({
            current: (partIndex * MAX_BLOBS_PER_ZIP) + chunk.length,
            total: blobs.length,
            stage: `Generating ZIP for part ${partNum} of ${totalParts}`
          });

          addLog('info', `[Part ${partNum}] Generating ZIP file...`);
          const zipBlob = await zipCreator.generate();

          signal.throwIfAborted();

          if (fileHandle) {
            // File System Access API path
            const writable = await fileHandle.createWritable();
            await writable.write(zipBlob);
            await writable.close();
            addLog('success', `Part ${partNum} of ${totalParts} saved successfully! (${partSuccessCount} blobs)`);
          } else {
            // Fallback download
            downloadBlob(zipBlob, partFilename);
            addLog('success', `Part ${partNum} of ${totalParts} download started! (${partSuccessCount} blobs)`);
          }

          if (partFailedCount > 0) {
            addLog('warn', `[Part ${partNum}] ${partFailedCount} blobs failed to download and were skipped`);
          }
        }

        // Final summary for multi-part export
        addLog('success', `Selected blobs export finished! ${totalSuccessCount} blobs archived in ${totalParts} ZIP files.`);
        if (totalFailedCount > 0) {
          addLog('warn', `Total: ${totalFailedCount} blobs failed to download across all parts.`);
        }

      } else {
        // Single ZIP file for small exports (existing logic)
        setCurrentProgress({ current: 0, total: blobs.length, stage: 'Waiting for user to choose save location' });
        addLog('info', 'Please choose where to save the ZIP file');

        const filename = `atproto_at-${sanitizedId}-${timestamp}-blobs_selected.zip`;
        const folderName = `blobs_selected`;

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
        addLog('warn', 'This may take a moment. Please be patient.');

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
      }

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

      addLog('info', `Complete! Found ${allBlobs.length} total blobs in repository`);

      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const sanitizedId = sanitizeFilename(identifier);

      // Check if we need multi-part export
      if (allBlobs.length > MAX_BLOBS_PER_ZIP) {
        // Multi-part export for large collections
        const chunks: string[][] = [];
        for (let i = 0; i < allBlobs.length; i += MAX_BLOBS_PER_ZIP) {
          chunks.push(allBlobs.slice(i, Math.min(i + MAX_BLOBS_PER_ZIP, allBlobs.length)));
        }

        const totalParts = chunks.length;
        addLog('info', `Large export detected (${allBlobs.length} blobs). Will create ${totalParts} ZIP files (${MAX_BLOBS_PER_ZIP} blobs each).`);

        let totalSuccessCount = 0;
        let totalFailedCount = 0;
        const hasFileSystemAccess = isFileSystemAccessSupported();

        for (let partIndex = 0; partIndex < chunks.length; partIndex++) {
          signal.throwIfAborted();

          const partNum = partIndex + 1;
          const chunk = chunks[partIndex];
          const paddedPartNum = String(partNum).padStart(2, '0');
          const paddedTotalParts = String(totalParts).padStart(2, '0');

          addLog('info', `Processing part ${partNum} of ${totalParts} (${chunk.length} blobs)`);

          // Create filename for this part
          const partFilename = `atproto_at-${sanitizedId}-${timestamp}-blobs_part_${paddedPartNum}_of_${paddedTotalParts}.zip`;
          const folderName = `blobs_part_${paddedPartNum}`;

          // Ask user where to save this part (only for File System Access API)
          let fileHandle;
          if (hasFileSystemAccess) {
            setCurrentProgress({
              current: partIndex * MAX_BLOBS_PER_ZIP,
              total: allBlobs.length,
              stage: `Choose location for part ${partNum} of ${totalParts}`
            });

            try {
              fileHandle = await showSaveFilePicker({
                suggestedName: partFilename,
                types: [
                  {
                    description: 'ZIP Archive',
                    accept: { 'application/zip': ['.zip'] },
                  },
                ],
              });
            } catch (error) {
              addLog('warn', `Failed to select save location for part ${partNum}. Skipping...`);
              continue; // Skip this part if user cancels
            }
          }

          // Create fresh ZIP instance for this part
          const zipCreator = createZipCreator();

          // Set up download manager for this chunk
          const downloadManager = new DownloadManager({
            concurrency: 3,
            maxRetries: 3,
            onProgress: (progress) => {
              setCurrentProgress({
                current: (partIndex * MAX_BLOBS_PER_ZIP) + progress.current,
                total: allBlobs.length,
                stage: `Downloading part ${partNum} of ${totalParts}: ${progress.stage}`
              });
            },
            onLog: (level, message) => {
              addLog(level, `[Part ${partNum}] ${message}`);
            },
          });

          // Generate blob URLs
          const urlGenerator = (cid: string) => {
            const url = new URL('/xrpc/com.atproto.sync.getBlob', pdsEndpoint);
            url.searchParams.set('did', did);
            url.searchParams.set('cid', cid);
            return url.toString();
          };

          // Download blobs for this chunk
          const results = await downloadManager.downloadBlobs(chunk, urlGenerator, signal);

          signal.throwIfAborted();

          // Add successful downloads to ZIP
          addLog('info', `[Part ${partNum}] Adding ${results.filter(r => r.data !== null).length} blobs to ZIP archive`);

          let partSuccessCount = 0;
          for (const result of results) {
            if (result.data) {
              const filename = generateBlobFilename(result.cid, result.contentType);
              const blobFilename = `${folderName}/${filename}`;
              zipCreator.addFile(blobFilename, result.data);
              partSuccessCount++;
            }
          }

          totalSuccessCount += partSuccessCount;
          const partFailedCount = chunk.length - partSuccessCount;
          totalFailedCount += partFailedCount;

          signal.throwIfAborted();

          // Generate and save this part
          setCurrentProgress({
            current: (partIndex * MAX_BLOBS_PER_ZIP) + chunk.length,
            total: allBlobs.length,
            stage: `Generating ZIP for part ${partNum} of ${totalParts}`
          });

          addLog('info', `[Part ${partNum}] Generating ZIP file...`);
          const zipBlob = await zipCreator.generate();

          signal.throwIfAborted();

          if (fileHandle) {
            // File System Access API path
            const writable = await fileHandle.createWritable();
            await writable.write(zipBlob);
            await writable.close();
            addLog('success', `Part ${partNum} of ${totalParts} saved successfully! (${partSuccessCount} blobs)`);
          } else {
            // Fallback download
            downloadBlob(zipBlob, partFilename);
            addLog('success', `Part ${partNum} of ${totalParts} download started! (${partSuccessCount} blobs)`);
          }

          if (partFailedCount > 0) {
            addLog('warn', `[Part ${partNum}] ${partFailedCount} blobs failed to download and were skipped`);
          }
        }

        // Final summary for multi-part export
        addLog('success', `Complete export finished! ${totalSuccessCount} blobs archived in ${totalParts} ZIP files.`);
        if (totalFailedCount > 0) {
          addLog('warn', `Total: ${totalFailedCount} blobs failed to download across all parts.`);
        }

      } else {
        // Single ZIP file for small exports (existing logic)
        setCurrentProgress({ current: 0, total: allBlobs.length, stage: 'Waiting for user to choose save location' });
        addLog('info', 'Please choose where to save the ZIP file');

        const filename = `atproto_at-${sanitizedId}-${timestamp}-blobs.zip`;
        const folderName = `blobs`;

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
        addLog('warn', 'This may take a moment. Please be patient.');

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
      }

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
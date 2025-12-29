/**
 * Enhanced repository download utility supporting both CAR and JSON ZIP formats
 * Builds upon the existing downloadRepo functionality with additional format options
 */

import { downloadRepo } from './downloadRepo';
import { processCarToJson } from './carProcessor';
import { generateRecordsZip, generateZipFilename } from './zipGenerator';

export type DownloadFormat = 'car' | 'json';

export interface DownloadResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Download repository in the specified format
 */
export async function downloadRepoEnhanced(
  pdsUrl: string, 
  did: string, 
  format: DownloadFormat = 'car',
  handle?: string
): Promise<DownloadResult> {
  if (!pdsUrl || !did) {
    return {
      success: false,
      message: 'PDS URL and DID are required',
      error: 'Missing required parameters'
    };
  }

  try {
    if (format === 'car') {
      // Use existing CAR download functionality
      await downloadRepo(pdsUrl, did);
      return {
        success: true,
        message: 'CAR file download started successfully'
      };
    } else if (format === 'json') {
      // Download CAR file in memory and process to JSON ZIP
      return await downloadAsJsonZip(pdsUrl, did, handle);
    } else {
      return {
        success: false,
        message: 'Unsupported download format',
        error: `Format '${format}' is not supported`
      };
    }
  } catch (error) {
    console.error('Error downloading repository:', error);
    return {
      success: false,
      message: 'Failed to download repository',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Download repository as JSON ZIP file
 */
async function downloadAsJsonZip(pdsUrl: string, did: string, handle?: string): Promise<DownloadResult> {
  try {
    // Step 1: Fetch CAR file data
    const carBlob = await fetchCarFile(pdsUrl, did);
    
    // Step 2: Process CAR file to JSON records
    const processingResult = await processCarToJson(carBlob);
    
    if (processingResult.records.length === 0) {
      return {
        success: false,
        message: 'No records found in repository',
        error: 'The repository appears to be empty'
      };
    }

    // Step 3: Use the DID from the processing result, not from external metadata
    const metadata = {
      ...processingResult.metadata,
      did: processingResult.metadata.did || did // Fallback to provided DID if not found in processing
    };

    // Step 4: Generate ZIP file with JSON records
    const zipBlob = await generateRecordsZip(
      processingResult.records,
      metadata,
      {
        includeMetadata: true,
        organizeByCollection: true,
        prettifyJson: true
      }
    );

    // Step 5: Generate filename using handle if available
    const zipFilename = generateZipFilename(metadata, handle);
    downloadBlob(zipBlob, zipFilename);

    return {
      success: true,
      message: `JSON ZIP download started successfully. Processed ${processingResult.metadata.processedBlocks} records into ${Object.keys(groupRecordsByCollection(processingResult.records)).length} collections.`
    };

  } catch (error) {
    console.error('Error processing CAR file to JSON:', error);
    return {
      success: false,
      message: 'Failed to process repository to JSON format',
      error: error instanceof Error ? error.message : 'Unknown processing error'
    };
  }
}

/**
 * Helper to group records by collection for counting
 */
function groupRecordsByCollection(records: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  for (const record of records) {
    const collection = record.collection || 'unknown';
    if (!grouped[collection]) {
      grouped[collection] = [];
    }
    grouped[collection].push(record);
  }
  return grouped;
}

/**
 * Fetch CAR file as blob without triggering download
 */
async function fetchCarFile(pdsUrl: string, did: string): Promise<Blob> {
  // Normalize PDS URL
  const normalizedPdsUrl = pdsUrl.endsWith('/') ? pdsUrl.slice(0, -1) : pdsUrl;

  // AT Protocol standard endpoint for repository export
  const endpoint = 'xrpc/com.atproto.sync.getRepo';
  const downloadUrl = `${normalizedPdsUrl}/${endpoint}?did=${encodeURIComponent(did)}`;

  try {
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.ipld.car',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repository: ${response.status} ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to fetch CAR file');
  }
}

/**
 * Helper function to trigger blob download
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
} 
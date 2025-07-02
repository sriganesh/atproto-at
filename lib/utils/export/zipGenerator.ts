/**
 * Utility for generating ZIP files from processed AT Protocol records
 * Provides a clean interface for creating downloadable archives
 */

import JSZip from 'jszip';
import { ProcessedRecord, groupRecordsByCollection, generateRecordFilename } from './carProcessor';

export interface ZipGenerationOptions {
  includeMetadata?: boolean;
  organizeByCollection?: boolean;
  prettifyJson?: boolean;
}

/**
 * Generate a ZIP file from processed records
 */
export async function generateRecordsZip(
  records: ProcessedRecord[],
  metadata: any,
  options: ZipGenerationOptions = {}
): Promise<Blob> {
  const {
    includeMetadata = true,
    organizeByCollection = true,
    prettifyJson = true
  } = options;

  const zip = new JSZip();

  if (organizeByCollection) {
    // Group records by collection and create organized structure
    const groupedRecords = groupRecordsByCollection(records);
    
    for (const [collection, collectionRecords] of Object.entries(groupedRecords)) {
      const folder = zip.folder(collection);
      
      if (folder) {
        collectionRecords.forEach((record, index) => {
          const filename = generateFilenameFromRecord(record, index);
          const content = prettifyJson 
            ? JSON.stringify(record.record, null, 2)
            : JSON.stringify(record.record);
          
          folder.file(filename, content);
        });
      }
    }
  } else {
    // Flat structure
    records.forEach((record, index) => {
      const filename = generateRecordFilename(record, index);
      const content = prettifyJson 
        ? JSON.stringify(record.record, null, 2)
        : JSON.stringify(record.record);
      
      zip.file(filename, content);
    });
  }

  // Add metadata file if requested
  if (includeMetadata) {
    const metadataContent = {
      ...metadata,
      exportedAt: new Date().toISOString(),
      totalRecords: records.length,
      processingInfo: {
        successfulRecords: records.filter(r => !r.error).length,
        erroredRecords: records.filter(r => r.error).length
      }
    };

    zip.file('_metadata.json', JSON.stringify(metadataContent, null, 2));
  }

  // Generate and return the ZIP blob
  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Generate a simple filename from a record for flat organization
 */
function generateFilenameFromRecord(record: ProcessedRecord, index: number): string {
  // For individual files within collection folders, use the actual rkey if available
  if (record.rkey) {
    return `${record.rkey}.json`;
  }
  
  return `record_${index + 1}.json`;
}

/**
 * Generate a ZIP filename based on metadata and handle information
 */
export function generateZipFilename(metadata: any, handle?: string): string {
  const date = new Date();
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const unixTimestamp = Math.floor(date.getTime() / 1000);
  
  // Try to use handle first, then fall back to DID identifier
  if (handle && handle !== 'null' && handle !== 'undefined') {
    return `atproto-at-${handle.replace(/\./g, '-')}-${formattedDate}-${unixTimestamp}.zip`;
  }
  
  if (metadata.did) {
    // Extract a meaningful identifier from the DID
    if (metadata.did.startsWith('did:plc:')) {
      const identifier = metadata.did.replace('did:plc:', '').substring(0, 12);
      return `atproto-at-${identifier}-${formattedDate}-${unixTimestamp}.zip`;
    } else if (metadata.did.startsWith('did:web:')) {
      const webIdentifier = metadata.did.replace('did:web:', '').replace(/\./g, '-');
      return `atproto-at-${webIdentifier}-${formattedDate}-${unixTimestamp}.zip`;
    } else {
      // Generic DID handling
      const parts = metadata.did.split(':');
      const identifier = parts[parts.length - 1].substring(0, 12);
      return `atproto-at-${identifier}-${formattedDate}-${unixTimestamp}.zip`;
    }
  }
  
  return `atproto-at-records-${formattedDate}-${unixTimestamp}.zip`;
} 
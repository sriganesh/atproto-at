/**
 * Utility for processing CAR files and converting them to JSON format
 * Extracts AT Protocol records with proper keys from MST structure
 */

import { CarReader } from '@ipld/car';
import * as dagCbor from '@ipld/dag-cbor';

export interface ProcessedRecord {
  cid: string;
  collection?: string;
  rkey?: string;
  record: any;
  error?: string;
  uri?: string;
}

export interface CarProcessingResult {
  records: ProcessedRecord[];
  metadata: {
    totalBlocks: number;
    processedBlocks: number;
    errors: number;
    did?: string;
    repoCommit?: any;
    processedBy: {
      tool: string;
      version: string;
      website: string;
      processedAt: string;
    };
  };
}

/**
 * Process a CAR file blob and extract AT Protocol records as JSON
 */
export async function processCarToJson(carBlob: Blob): Promise<CarProcessingResult> {
  const carBytes = new Uint8Array(await carBlob.arrayBuffer());
  const reader = await CarReader.fromBytes(carBytes);
  
  const allBlocks = new Map<string, any>();
  const records: ProcessedRecord[] = [];
  let totalBlocks = 0;
  let processedBlocks = 0;
  let errors = 0;
  let extractedDid: string | undefined;
  let repoCommit: any = null;

  // First pass: decode all blocks and build lookup
  for await (const { cid, bytes } of reader.blocks()) {
    totalBlocks++;
    
    try {
      const decoded = dagCbor.decode(bytes);
      const cidString = cid.toString();
      allBlocks.set(cidString, decoded);
      
      // Find repository commit
      if (decoded && typeof decoded === 'object') {
        if (decoded.did && decoded.data && decoded.rev !== undefined) {
          repoCommit = decoded;
          extractedDid = decoded.did;
        }
      }
      
      processedBlocks++;
    } catch (error) {
      errors++;
    }
  }

  // Extract records from MST structure
  if (repoCommit && repoCommit.data) {
    const dataCid = repoCommit.data.toString();
    const dataBlock = allBlocks.get(dataCid);
    
    if (dataBlock) {
      try {
        await traverseMST(dataBlock, allBlocks, records, '', extractedDid || 'unknown');
      } catch (error) {
        console.warn('MST traversal from root failed:', error);
      }
    }
  }

  // Systematically traverse ALL MST nodes to ensure we get all records
  const processedMSTNodes = new Set<string>();
  
  for (const [cidString, blockData] of allBlocks.entries()) {
    if (processedMSTNodes.has(cidString) || !blockData || typeof blockData !== 'object') {
      continue;
    }
    
    // Check if this is an MST node
    if (blockData.e || blockData.l || blockData.r) {
      processedMSTNodes.add(cidString);
      
      try {
        await traverseMST(blockData, allBlocks, records, '', extractedDid || 'unknown');
      } catch (error) {
        console.warn(`Error processing MST node ${cidString}:`, error);
      }
    }
  }
  
  // Deduplicate records by CID
  const uniqueRecords = new Map<string, ProcessedRecord>();
  for (const record of records) {
    uniqueRecords.set(record.cid, record);
  }
  records.length = 0;
  records.push(...uniqueRecords.values());

  return {
    records,
    metadata: {
      totalBlocks,
      processedBlocks,
      errors,
      did: extractedDid,
      repoCommit,
      processedBy: {
        tool: "Taproot - AT Protocol Explorer and Exporter",
        version: "1.0.0",
        website: "https://atproto.at",
        processedAt: new Date().toISOString()
      }
    }
  };
}

/**
 * Traverse MST (Merkle Search Tree) to extract records with actual keys
 */
async function traverseMST(
  node: any,
  allBlocks: Map<string, any>,
  records: ProcessedRecord[],
  pathPrefix: string,
  did: string
): Promise<void> {
  if (!node || typeof node !== 'object') {
    return;
  }

  // Handle MST leaf nodes (entries)
  if (node.e && Array.isArray(node.e)) {
    let currentPath = pathPrefix;
    
    for (let i = 0; i < node.e.length; i++) {
      const entry = node.e[i];
      
      if (entry.k && entry.v) {
        // Convert binary key to string
        const keySegment = entry.k instanceof Uint8Array 
          ? new TextDecoder().decode(entry.k) 
          : String(entry.k);
        
        // Handle prefix length (p field) - MST optimization where keys share prefixes
        let fullPath: string;
        if (entry.p !== undefined && typeof entry.p === 'number') {
          const prefixToKeep = currentPath.substring(0, entry.p);
          fullPath = prefixToKeep + keySegment;
        } else {
          fullPath = pathPrefix + keySegment;
        }
        
        currentPath = fullPath;
        const valueCid = entry.v.toString();
        
        const valueBlock = allBlocks.get(valueCid);
        if (valueBlock) {
          // Check if the value is another MST node or a record
          if (valueBlock.e || valueBlock.l || valueBlock.r) {
            await traverseMST(valueBlock, allBlocks, records, fullPath, did);
          } else if (valueBlock.$type) {
            // It's a record! Extract collection and rkey from path
            const pathSegments = fullPath.split('/');
            
            if (pathSegments.length >= 2) {
              const collection = pathSegments[0];
              const rkey = pathSegments[1];
              
              const record: ProcessedRecord = {
                cid: valueCid,
                collection,
                rkey,
                record: valueBlock,
                uri: `at://${did}/${collection}/${rkey}`
              };
              
              records.push(record);
            }
          } else {
            // Check if it has MST structure even if it doesn't have $type
            if (valueBlock.e || valueBlock.l || valueBlock.r) {
              await traverseMST(valueBlock, allBlocks, records, fullPath, did);
            }
          }
        }
      }
    }
  }

  // Handle MST internal nodes (left and right subtrees)
  if (node.l) {
    const leftCid = node.l.toString();
    const leftBlock = allBlocks.get(leftCid);
    if (leftBlock) {
      await traverseMST(leftBlock, allBlocks, records, pathPrefix, did);
    }
  }

  if (node.r) {
    const rightCid = node.r.toString();
    const rightBlock = allBlocks.get(rightCid);
    if (rightBlock) {
      await traverseMST(rightBlock, allBlocks, records, pathPrefix, did);
    }
  }
}

/**
 * Group processed records by collection type for better organization
 */
export function groupRecordsByCollection(records: ProcessedRecord[]): Record<string, ProcessedRecord[]> {
  const grouped: Record<string, ProcessedRecord[]> = {};
  
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
 * Generate a filename for a processed record using actual rkey
 */
export function generateRecordFilename(record: ProcessedRecord, index: number): string {
  if (record.rkey && record.rkey !== 'unknown') {
    return `${record.rkey}.json`;
  }
  
  return `record_${index + 1}.json`;
} 
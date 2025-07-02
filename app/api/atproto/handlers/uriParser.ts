import { parseAtUri, extractCollectionAndRkey, isDid, isHandle, resolveHandle } from '@/lib/edge-atproto';
import { validateDid, validateCollection, validateRkey } from '../validators/inputValidator';

export interface ParsedUri {
  did: string;
  collection?: string;
  rkey?: string;
}

/**
 * Parses and validates AT Protocol URIs
 * Handles special cases like did:web identifiers with paths
 */
export async function parseAndValidateUri(uriParam: string): Promise<{
  success: boolean;
  data?: ParsedUri;
  error?: string;
}> {
  // Ensure URI has proper prefix
  const uri = uriParam.startsWith('at://') ? uriParam : `at://${uriParam}`;
  const uriComponents = parseAtUri(uri);
  
  if (!uriComponents) {
    return {
      success: false,
      error: 'Invalid AT Protocol URI'
    };
  }
  
  // Extract components
  const { did } = uriComponents;
  const { collection, rkey } = extractCollectionAndRkey(uriComponents.path);
  
  // Handle did:web identifiers that might have paths intermixed
  let resolvedDid = did;
  let collectionPath = collection;
  let resolvedRkey = rkey;
  
  // If we have a did:web identifier that might contain a collection path
  if (did.startsWith('did:web:') && did.includes('/')) {
    // Split it properly between the DID and the path
    const didParts = did.split('/');
    resolvedDid = didParts[0]; // The first part is the actual DID
    
    // If collection is not set from the path, use the remaining parts as collection path
    if (!collection && didParts.length > 1) {
      // Check if the remaining path parts include both collection and rkey
      const remainingPath = didParts.slice(1).join('/');
      const remainingParts = remainingPath.split('/');
      
      if (remainingParts.length >= 2) {
        // We have both collection and rkey in the remaining path
        collectionPath = remainingParts[0];
        resolvedRkey = remainingParts[1];
      } else {
        // Just collection in the remaining path
        collectionPath = remainingPath;
      }
    }
  }
  // Validate DID or handle
  else if (!isDid(did)) {
    // Try to resolve as a handle
    if (isHandle(did)) {
      const didFromHandle = await resolveHandle(did);
      if (!didFromHandle) {
        return {
          success: false,
          error: `Could not resolve handle: ${did}`
        };
      }
      resolvedDid = didFromHandle;
    } else {
      return {
        success: false,
        error: 'Invalid AT Protocol URI. Must include a valid DID or handle.'
      };
    }
  }
  
  // Validate the resolved DID
  const didValidation = validateDid(resolvedDid);
  if (!didValidation.valid) {
    return {
      success: false,
      error: didValidation.error
    };
  }
  
  // Validate collection if present
  if (collectionPath) {
    const collectionValidation = validateCollection(collectionPath);
    if (!collectionValidation.valid) {
      return {
        success: false,
        error: collectionValidation.error
      };
    }
  }
  
  // Validate rkey if present
  const finalRkey = resolvedRkey || rkey;
  if (finalRkey) {
    const rkeyValidation = validateRkey(finalRkey);
    if (!rkeyValidation.valid) {
      return {
        success: false,
        error: rkeyValidation.error
      };
    }
  }
  
  return {
    success: true,
    data: {
      did: resolvedDid,
      collection: collectionPath,
      rkey: finalRkey
    }
  };
}
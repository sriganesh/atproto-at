import { AtpBaseClient, ComAtprotoRepoGetRecord } from "@atproto/api";
import { getPds } from "@atproto/identity";

// Regular expression to match AT Protocol URIs
export const ATP_URI_REGEX = /^(at:\/\/)?((?:did:[a-z0-9:%-]+)|(?:.*))(\/[^?#\s]*)?(\?[^#\s]+)?(#[^\s]+)?$/i;

export type AtpUriComponents = {
  protocol?: string;
  did: string;
  path?: string;
  query?: string;
  hash?: string;
};

/**
 * Parse an AT Protocol URI into its components
 */
export function parseAtUri(uri: string): AtpUriComponents | null {
  const match = uri.match(ATP_URI_REGEX);
  if (!match) return null;

  const [, protocol, did, path, query, hash] = match;
  return { protocol, did, path, query, hash };
}

/**
 * Extract collection and record key from an AT Protocol URI path
 */
export function extractCollectionAndRkey(path?: string): { collection?: string; rkey?: string } {
  if (!path) return {};

  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return {
      collection: parts[0],
      rkey: parts[1],
    };
  } else if (parts.length === 1) {
    return {
      collection: parts[0],
    };
  }
  
  return {};
}

/**
 * Parse the URL from a atproto.at URL to extract AT Protocol components
 */
export function parseAtprotoAtUrl(url: string): AtpUriComponents | null {
  // Handle URLs like https://atproto.at//did:plc:abc/app.bsky.feed.post/123
  const atprotoAtRegex = /^https?:\/\/atproto\.at\/\/(.*)$/;
  const match = url.match(atprotoAtRegex);
  
  if (match && match[1]) {
    return parseAtUri(`at://${match[1]}`);
  }
  
  return null;
}

/**
 * Check if a string is a DID
 */
export function isDid(str: string): boolean {
  return str.startsWith('did:');
}

// Global cache for DID resolution to avoid repeated PLC directory calls
const didResolutionCache = new Map<string, { pds: string | null; timestamp: number; ttl: number }>();
const pendingDidResolutions = new Map<string, Promise<string | null>>();

// Cache TTL: 5 minutes for successful resolutions, 30 seconds for failures
const DID_CACHE_TTL_SUCCESS = 5 * 60 * 1000; // 5 minutes
const DID_CACHE_TTL_FAILURE = 30 * 1000; // 30 seconds

/**
 * Resolve a DID to get the PDS URL with caching
 */
export async function resolveDid(did: string): Promise<string | null> {
  if (!isDid(did)) {
    return null;
  }
  
  // Check cache first
  const cached = didResolutionCache.get(did);
  if (cached && Date.now() < cached.timestamp + cached.ttl) {
    return cached.pds;
  }
  
  // Check if resolution is already in progress to avoid duplicate requests
  if (pendingDidResolutions.has(did)) {
    return pendingDidResolutions.get(did)!;
  }
  
  // Create new resolution promise
  const resolutionPromise = (async () => {
    try {
      
      // For DIDs, we need to resolve the PDS
      const response = await fetch(`https://plc.directory/${did}`);
      if (!response.ok) {
        // Cache failures for shorter time
        didResolutionCache.set(did, { 
          pds: null, 
          timestamp: Date.now(), 
          ttl: DID_CACHE_TTL_FAILURE 
        });
        return null;
      }
      
      const didDoc = await response.json();
      const pds = getPds(didDoc);
      const result = pds ?? null;
      
      // Cache successful resolution
      didResolutionCache.set(did, { 
        pds: result, 
        timestamp: Date.now(), 
        ttl: DID_CACHE_TTL_SUCCESS 
      });
      
      return result;
    } catch (error) {
      console.error("Error resolving DID:", error);
      
      // Cache failures for shorter time
      didResolutionCache.set(did, { 
        pds: null, 
        timestamp: Date.now(), 
        ttl: DID_CACHE_TTL_FAILURE 
      });
      return null;
    } finally {
      // Remove from pending requests
      pendingDidResolutions.delete(did);
    }
  })();
  
  // Store pending promise
  pendingDidResolutions.set(did, resolutionPromise);
  
  return resolutionPromise;
}

/**
 * Fetch record data from an AT Protocol repository
 */
export async function fetchRecord(
  pds: string, 
  repo: string, 
  collection: string, 
  rkey: string
): Promise<any> {
  try {
    const atpClient = new AtpBaseClient((url, init) => 
      fetch(new URL(url, pds), init)
    );

    const response = await atpClient.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey,
    });

    return {
      success: true,
      data: response.data,
      url: `${pds}/xrpc/com.atproto.repo.getRecord?repo=${repo}&collection=${collection}&rkey=${rkey}`,
    };
  } catch (e) {
    if (e instanceof ComAtprotoRepoGetRecord.RecordNotFoundError) {
      return {
        success: false,
        error: "Record not found",
      };
    }

    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error fetching record",
    };
  }
} 
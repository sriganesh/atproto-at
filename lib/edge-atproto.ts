// Edge-compatible version of AT Protocol utilities
// Avoids using Node.js-specific modules that don't work in Edge environments

// Regular expression to match AT Protocol URIs
export const ATP_URI_REGEX = /^(at:\/\/)?((?:did:[a-z0-9:%-]+)|(?:.*))(\/[^?#\s]*)?(\?[^#\s]+)?(#[^\s]+)?$/i;

// Regular expression to match a Bluesky handle
export const HANDLE_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z0-9-_.]+$/;

// Import PDS endpoints from config
import PDS_ENDPOINTS from '@/config/pds-endpoints';

export type AtpUriComponents = {
  protocol?: string;
  did: string;
  path?: string;
  query?: string;
  hash?: string;
};

// Helper to get a random element from an array
const getRandomElement = (array: string[]) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Get multiple random elements from an array
const getRandomElements = (array: string[], count: number) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

/**
 * Check if a string is a valid Bluesky handle
 */
export function isHandle(str: string): boolean {
  return HANDLE_REGEX.test(str);
}

/**
 * Check if a string is a DID with web method
 */
export function isWebDid(did: string): boolean {
  return did.startsWith('did:web:');
}

/**
 * Get domain from did:web identifier
 */
export function getWebDidDomain(did: string): string | null {
  if (!isWebDid(did)) return null;
  return did.replace('did:web:', '');
}

/**
 * Resolve a did:web identifier to get the DID document
 */
export async function resolveWebDid(did: string): Promise<string | null> {
  if (!isWebDid(did)) {
    return null;
  }
  
  try {
    const domain = getWebDidDomain(did);
    if (!domain) {
      console.error(`Invalid did:web format: ${did}`);
      return null;
    }
    
    // Fetch DID document from well-known location
    const didDocUrl = `https://${domain}/.well-known/did.json`;
    
    const response = await fetch(didDocUrl);
    if (!response.ok) {
      console.error(`Failed to fetch did:web document: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const didDoc = await response.json();
    
    // Extract PDS service endpoint
    if (didDoc && didDoc.service) {
      const pdsService = didDoc.service.find((s: any) => 
        s.id === '#atproto_pds' || 
        s.id.endsWith('atproto_pds') ||
        (s.type === 'AtprotoPersonalDataServer')
      );
      
      if (pdsService && pdsService.serviceEndpoint) {
        return pdsService.serviceEndpoint;
      }
    }
    
    console.error(`No PDS service endpoint found in did:web document for ${did}`);
    return null;
  } catch (error) {
    console.error(`Error resolving did:web ${did}:`, error);
    return null;
  }
}

/**
 * Try to resolve a handle using a specific PDS endpoint
 */
async function tryResolveHandleWithEndpoint(endpoint: string, handle: string): Promise<string | null> {
  try {
    const response = await fetch(`https://${endpoint}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.did || null;
  } catch (error) {
    console.error(`Error resolving handle ${handle} with endpoint ${endpoint}:`, error);
    return null;
  }
}

/**
 * Resolve a handle to a DID using the AT Protocol API, trying multiple PDS endpoints
 */
export async function resolveHandle(handle: string): Promise<string | null> {
  // Add .bsky.social to handles without a domain
  let handleToTry = handle;
  if (!handle.includes('.')) {
    handleToTry = `${handle}.bsky.social`;
  }
  
  // Step 1: Try bsky.social first (most common)
  let did = await tryResolveHandleWithEndpoint(PDS_ENDPOINTS.primary, handleToTry);
  if (did) return did;
  
  // Step 2: Try 3 random US-East endpoints
  const randomEastEndpoints = getRandomElements(PDS_ENDPOINTS.usEast, 3);
  for (const endpoint of randomEastEndpoints) {
    did = await tryResolveHandleWithEndpoint(endpoint, handleToTry);
    if (did) return did;
  }
  
  // Step 3: Try 3 random US-West endpoints
  const randomWestEndpoints = getRandomElements(PDS_ENDPOINTS.usWest, 3);
  for (const endpoint of randomWestEndpoints) {
    did = await tryResolveHandleWithEndpoint(endpoint, handleToTry);
    if (did) return did;
  }

  // Step 4: Try any custom endpoints
  if (PDS_ENDPOINTS.custom && PDS_ENDPOINTS.custom.length > 0) {
    for (const endpoint of PDS_ENDPOINTS.custom) {
      did = await tryResolveHandleWithEndpoint(endpoint, handleToTry);
      if (did) return did;
    }
  }
  
  // Could not resolve the handle with any endpoint
  return null;
}

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

// Global cache for DID resolution to avoid repeated PLC directory calls - Edge-compatible
const didResolutionCache = new Map<string, { pds: string | null; timestamp: number; ttl: number }>();
const pendingDidResolutions = new Map<string, Promise<string | null>>();

// Cache TTL: 5 minutes for successful resolutions, 30 seconds for failures  
const DID_CACHE_TTL_SUCCESS = 5 * 60 * 1000; // 5 minutes
const DID_CACHE_TTL_FAILURE = 30 * 1000; // 30 seconds

/**
 * Resolve a DID to get the PDS URL - Edge-compatible version with caching
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
      
      // Check if it's a did:web identifier
      if (isWebDid(did)) {
        const result = await resolveWebDid(did);
        
        // Cache web DID resolution
        didResolutionCache.set(did, { 
          pds: result, 
          timestamp: Date.now(), 
          ttl: result ? DID_CACHE_TTL_SUCCESS : DID_CACHE_TTL_FAILURE 
        });
        
        return result;
      }
      
      // For did:plc, we use PLC directory
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
      
      // Simple extraction of the PDS service without @atproto/identity
      let result: string | null = null;
      if (didDoc && didDoc.service) {
        const pdsService = didDoc.service.find((s: any) => 
          s.id === '#atproto_pds' || 
          s.id.endsWith('atproto_pds') ||
          (s.type === 'AtprotoPersonalDataServer')
        );
        
        if (pdsService && pdsService.serviceEndpoint) {
          result = pdsService.serviceEndpoint;
        }
      }
      
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
 * Fetch record data from an AT Protocol repository - Edge-compatible
 */
export async function fetchRecord(
  pds: string, 
  repo: string, 
  collection: string, 
  rkey: string
): Promise<any> {
  try {
    // Direct fetch instead of using @atproto/api which has Node.js dependencies
    const url = new URL(`/xrpc/com.atproto.repo.getRecord`, pds);
    url.searchParams.set('repo', repo);
    url.searchParams.set('collection', collection);
    url.searchParams.set('rkey', rkey);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch record: ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      data,
      url: url.toString(),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error fetching record",
    };
  }
}

/**
 * Fetch collection data from an AT Protocol repository
 */
export async function fetchCollection(
  pds: string, 
  repo: string, 
  collection: string,
  cursor?: string,
  limit: number = 50
): Promise<any> {
  try {
    // Use com.atproto.repo.listRecords instead of getRecord
    const url = new URL(`/xrpc/com.atproto.repo.listRecords`, pds);
    url.searchParams.set('repo', repo);
    url.searchParams.set('collection', collection);
    url.searchParams.set('limit', limit.toString());
    
    // Add cursor for pagination if provided
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch collection: ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      data,
      url: url.toString(),
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error fetching collection",
    };
  }
}

/**
 * Fetch profile data from an AT Protocol repository
 */
export async function fetchProfile(
  pds: string, 
  did: string
): Promise<any> {
  try {
    // First, get the repository description to get collections
    const describeUrl = new URL(`/xrpc/com.atproto.repo.describeRepo`, pds);
    describeUrl.searchParams.set('repo', did);
    
    let repoInfo = null;
    let collections = [];
    let repoTakendown = false;
    let repoDeactivated = false;
    let repoUnavailable = false;
    let repoUnavailableMessage = null;
    
    try {
      const describeResponse = await fetch(describeUrl.toString());
      
      if (describeResponse.ok) {
        repoInfo = await describeResponse.json();
        
        // Try to get collections list if available
        if (repoInfo && !repoInfo.collections) {
          // If describeRepo doesn't return collections (some implementations don't),
          // try to get them with listCollections
          try {
            const collectionsUrl = new URL(`/xrpc/com.atproto.repo.listCollections`, pds);
            collectionsUrl.searchParams.set('repo', did);
            
            const collectionsResponse = await fetch(collectionsUrl.toString());
            
            if (collectionsResponse.ok) {
              const collectionsData = await collectionsResponse.json();
              collections = collectionsData.collections || [];
              repoInfo.collections = collections;
            }
          } catch (error) {
            console.error("Error fetching collections:", error);
          }
        }
      } else {
        // Check for specific error types
        const errorData = await describeResponse.json();
        
        if (errorData.error === "RepoTakendown") {
                    repoTakendown = true;
          repoUnavailable = true;
          repoUnavailableMessage = errorData.message;
          repoInfo = {
            handle: null,
            did: did,
            takendown: true,
            takendownMessage: errorData.message
          };
        } else if (errorData.error === "RepoDeactivated") {
          repoDeactivated = true;
          repoUnavailable = true;
          repoUnavailableMessage = errorData.message;
          repoInfo = {
            handle: null,
            did: did,
            deactivated: true,
            deactivatedMessage: errorData.message
          };
        } else {
          // Generic repository unavailability
          console.error(`Error fetching repo info: ${describeResponse.status} - ${JSON.stringify(errorData)}`);
          repoUnavailable = true;
          repoUnavailableMessage = errorData.message || "Repository information unavailable";
          repoInfo = {
            handle: null,
            did: did,
            unavailable: true,
            unavailableMessage: repoUnavailableMessage
          };
        }
      }
    } catch (error) {
      console.error("Error fetching repo info:", error);
      repoUnavailable = true;
      repoUnavailableMessage = error instanceof Error ? error.message : "Unknown error fetching repository";
      repoInfo = {
        handle: null,
        did: did,
        unavailable: true,
        unavailableMessage: repoUnavailableMessage
      };
    }
    
    // Try to get profile data from app.bsky.actor.getProfile
    let profileData = null;
    try {
      const profileUrl = new URL(`/xrpc/app.bsky.actor.getProfile`, pds);
      profileUrl.searchParams.set('actor', did);
      
      const profileResponse = await fetch(profileUrl.toString());
      
      if (profileResponse.ok) {
        profileData = await profileResponse.json();
        
        // Process profile data to add convenience fields
        if (profileData) {
          // Process avatar - different possible formats
          if (profileData.avatar) {
            // If avatar is a blob reference, convert it to a URL
            if (typeof profileData.avatar !== 'string') {
              // Check if it has a direct ref property
              if (profileData.avatar.ref?.$link) {
                profileData.avatarUrl = `https://cdn.bsky.app/img/avatar/plain/${did}/${profileData.avatar.ref.$link}@jpeg`;
              }
            } 
            // If it's already a string URL, just copy it to avatarUrl for consistency
            else {
              profileData.avatarUrl = profileData.avatar;
            }
          }
          
          // Add the DID explicitly for reference
          profileData.did = did;
          
          // Add service endpoint directly for convenience
          profileData.service = pds;
        }
      } else if (!repoUnavailable) {
        // Only log this as an error if it's not a known unavailability
        console.error(`Error fetching profile: ${profileResponse.status}`);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
    
    // Fetch DID Document to get service endpoints
    let didDoc = null;
    try {
      const didDocResult = await fetchDidDocument(did);
      if (didDocResult.success) {
        didDoc = didDocResult.data;
      }
    } catch (error) {
      console.error("Error fetching DID document:", error);
    }
    
    // If we have repoInfo, add the didDoc to it
    if (repoInfo && didDoc) {
      repoInfo.didDoc = didDoc;
    }
    
    // If we get here, we might have repo info or profile data
    if (repoInfo || profileData) {
      return {
        success: true,
        data: {
          ...(profileData || {}),
          repoInfo,
          did: did,
          takendown: repoTakendown,
          deactivated: repoDeactivated,
          unavailable: repoUnavailable,
          unavailableMessage: repoUnavailableMessage
        },
        url: describeUrl.toString(),
      };
    }
    
    return {
      success: false,
      error: "Failed to fetch profile or repository information",
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error fetching profile",
    };
  }
}

/**
 * Fetch PLC directory audit log for a DID
 */
export async function fetchPlcLog(did: string): Promise<any> {
  if (!isDid(did)) {
    console.error(`Invalid DID format for PLC log: ${did}`);
    return {
      success: false,
      error: 'Invalid DID format',
    };
  }
  
  try {
    // did:web types don't have PLC logs
    if (isWebDid(did)) {
      return {
        success: true,
        data: [],
        url: null,
      };
    }
    
    const response = await fetch(`https://plc.directory/${did}/log/audit`);
    
    if (!response.ok) {
      console.error(`PLC directory returned status ${response.status} for DID: ${did}`);
      return {
        success: false,
        error: `Failed to fetch PLC log: ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    
    // Process the log to extract the most relevant information
    const processedLog = data.map((entry: any) => {
      // Extract key information from each operation
      const { createdAt, operation } = entry;
      const pdsEndpoint = operation.services?.atproto_pds?.endpoint || null;
      const handles = operation.alsoKnownAs?.map((aka: string) => aka.replace('at://', '')) || [];
      const rotationKeys = operation.rotationKeys || [];
      const verificationMethods = operation.verificationMethods || {};
      
      return {
        createdAt,
        pdsEndpoint,
        handles,
        rotationKeys,
        verificationMethods,
        prev: operation.prev,
        cid: entry.cid
      };
    });
    
    return {
      success: true,
      data: processedLog,
      url: `https://plc.directory/${did}/log/audit`,
    };
  } catch (e) {
    console.error(`Error fetching PLC log for DID ${did}:`, e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error fetching PLC log",
    };
  }
}

/**
 * Fetch the DID document for a DID
 * For did:plc identifiers, fetches from plc.directory
 * For did:web identifiers, fetches from the well-known URL
 */
export async function fetchDidDocument(did: string): Promise<any> {
  if (!isDid(did)) {
    return {
      success: false,
      error: 'Invalid DID format',
    };
  }
  
  try {
    let response;
    let documentUrl;
    
    // Check if it's a did:web identifier
    if (isWebDid(did)) {
      const domain = getWebDidDomain(did);
      if (!domain) {
        return {
          success: false,
          error: `Invalid did:web format: ${did}`,
        };
      }
      
      documentUrl = `https://${domain}/.well-known/did.json`;
      response = await fetch(documentUrl);
    } else {
      // Assume it's a did:plc identifier
      documentUrl = `https://plc.directory/${did}`;
      response = await fetch(documentUrl);
    }
    
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch DID document: ${response.status} ${response.statusText}`,
        url: documentUrl,
      };
    }
    
    const document = await response.json();
    
    return {
      success: true,
      data: document,
      url: documentUrl,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error fetching DID document",
    };
  }
} 
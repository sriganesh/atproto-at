"use client";

/**
 * Handle resolver utility for AT Protocol URIs
 * 
 * IMPORTANT URL PATTERN:
 * This application follows a consistent pattern of using DID-based URLs rather than handle-based URLs
 * in the viewer. When a handle-based URL is detected, it is resolved to a DID and then redirected
 * to maintain this consistency. This ensures that:
 * 
 * 1. All viewer URLs have a consistent format using DIDs
 * 2. Bookmarking and sharing always use the more stable DID format
 * 3. The application can directly use the URI for API requests without additional resolution
 * 
 * Examples:
 * - Input: sri.xyz/app.bsky.feed.post/3lomntxdbuk2m
 * - Normalized: did:plc:7gm5ejhut7kia2kzglqfew5b/app.bsky.feed.post/3lomntxdbuk2m
 * 
 */

import { isHandle, HANDLE_REGEX } from '@/lib/edge-atproto';

/**
 * Parse a Bluesky app URL and convert it to an AT Protocol URI
 * @param url The Bluesky URL to convert
 * @returns The equivalent AT Protocol URI or null if not a valid Bluesky URL
 */
export function parseBskyAppUrl(url: string): string | null {
  // Remove any leading @ symbol that might have been added
  if (url.startsWith('@')) {
    url = url.substring(1);
  }
  
  // Check if it's a Bluesky URL
  if (!url.startsWith('https://bsky.app/profile/')) {
    return null;
  }
  
  // Parse profile URLs (with handle or DID)
  // Format: https://bsky.app/profile/{handle-or-did}
  const profileRegex = /https:\/\/bsky\.app\/profile\/([^\/]+)(?:\/([^\/]+)\/([^\/]+))?/;
  const match = url.match(profileRegex);
  
  if (!match) {
    return null;
  }
  
  const [, didOrHandle, type, rkey] = match;
  
  // If it's just a profile URL without additional paths
  if (!type || !rkey) {
    return didOrHandle;
  }
  
  // Handle the different types of Bluesky URLs
  switch (type) {
    case 'post':
      return `${didOrHandle}/app.bsky.feed.post/${rkey}`;
    case 'lists':
      return `${didOrHandle}/app.bsky.graph.list/${rkey}`;
    case 'feed':
      return `${didOrHandle}/app.bsky.feed.generator/${rkey}`;
    default:
      return null;
  }
}

/**
 * Checks if a URI uses a handle instead of a DID and resolves it if necessary
 * @param uri The URI to check and potentially resolve
 * @returns The resolved URI with DIDs
 */
export async function resolveHandleInUri(uri: string): Promise<{resolvedUri: string, error?: string}> {
  // If URI is empty, return it as is
  if (!uri) {
    return { resolvedUri: uri, error: "Empty URI" };
  }
  
  // First check if it's a Bluesky app URL
  const bskyUri = parseBskyAppUrl(uri);
  if (bskyUri) {
        // Continue processing with the converted URI
    uri = bskyUri;
  }
  
  // Handle AT Protocol URI schemes
  const formattedUri = uri.startsWith('at://') ? uri : `at://${uri}`;
  
  // Extract the handle/DID component from the URI
  const match = formattedUri.match(/at:\/\/([^\/]+)(\/.*)?/i);
  
  if (!match) {
    return { resolvedUri: uri, error: "Invalid URI format" };
  }
  
  const [, didOrHandle, path = ''] = match;
  
  // If it's already a DID, return the URI as is - this now handles both did:plc and did:web
  if (didOrHandle.startsWith('did:')) {
    return { resolvedUri: uri };
  }
  
  // If it's a handle, resolve it to a DID
  if (isHandle(didOrHandle)) {
    try {
            // First try to get the DID by calling our own API endpoint for handle resolution
      const response = await fetch(`/api/atproto?uri=${encodeURIComponent(didOrHandle)}`);
      
      if (!response.ok) {
        return { 
          resolvedUri: uri,
          error: `Failed to resolve handle: ${didOrHandle}. ${response.status} ${response.statusText}`
        };
      }
      
      const data = await response.json();
      
      if (data.uri && data.uri.startsWith('at://did:')) {
        const did = data.uri.replace('at://', '');
        const resolvedUri = `${did}${path}`;
                return { resolvedUri };
      }
      
      return { 
        resolvedUri: uri,
        error: `Unexpected response when resolving handle: ${didOrHandle}`
      };
    } catch (error) {
      console.error(`Error resolving handle ${didOrHandle}:`, error);
      return { 
        resolvedUri: uri,
        error: `Failed to resolve handle: ${didOrHandle}. ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  // If it's neither a DID nor a valid handle, return it as is
  return { resolvedUri: uri };
} 
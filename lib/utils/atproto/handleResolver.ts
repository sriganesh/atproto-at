"use client";

/**
 * Handle resolver utility for AT Protocol URIs
 *
 * Supports URLs from multiple AT Protocol web applications including:
 * - Bluesky (bsky.app)
 * - Blacksky (blacksky.community)
 * - Additional apps configured in /config/atproto-apps.ts
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
 * - Input: sri.xyz/app.bsky.feed.post/3lszcx7zf622q
 * - Normalized: did:plc:7gm5ejhut7kia2kzglqfew5b/app.bsky.feed.post/3lszcx7zf622q
 *
 * - Input: https://bsky.app/profile/sri.xyz/post/3lszcx7zf622q
 * - Normalized: did:plc:7gm5ejhut7kia2kzglqfew5b/app.bsky.feed.post/3lszcx7zf622q
 *
 * - Input: https://blacksky.community/profile/did:plc:7gm5ejhut7kia2kzglqfew5b/post/3lszcx7zf622q
 * - Normalized: did:plc:7gm5ejhut7kia2kzglqfew5b/app.bsky.feed.post/3lszcx7zf622q
 */

import { isHandle } from '@/lib/edge-atproto';
import { RECORD_TYPE_MAPPINGS, getSupportedHostnames } from '@/config/atproto-apps';

/**
 * Build a regex pattern that matches URLs from all supported AT Protocol apps
 * Pattern: https://(bsky.app|blacksky.community)/profile/{handle-or-did}[/{type}/{rkey}]
 */
function buildAtProtoAppUrlRegex(): RegExp {
  const hostnames = getSupportedHostnames();
  // Escape dots in hostnames for regex and join with alternation
  const hostnamePattern = hostnames.map(h => h.replace(/\./g, '\\.')).join('|');
  return new RegExp(`^https?:\\/\\/(${hostnamePattern})\\/profile\\/([^\\/]+)(?:\\/([^\\/]+)\\/([^\\/]+))?$`, 'i');
}

// Pre-compile the regex for performance
const atProtoAppUrlRegex = buildAtProtoAppUrlRegex();

/**
 * Parse an AT Protocol app URL and convert it to an AT Protocol URI
 * Supports URLs from Bluesky, Blacksky, and other configured apps.
 *
 * @param url The web app URL to convert (e.g., https://bsky.app/profile/...)
 * @returns The equivalent AT Protocol URI path or null if not a valid app URL
 *
 * @example
 * parseAtProtoAppUrl('https://bsky.app/profile/sri.xyz/post/3lszcx7zf622q')
 * // Returns: 'sri.xyz/app.bsky.feed.post/3lszcx7zf622q'
 *
 * @example
 * parseAtProtoAppUrl('https://blacksky.community/profile/did:plc:7gm5ejhut7kia2kzglqfew5b/post/3lszcx7zf622q')
 * // Returns: 'did:plc:7gm5ejhut7kia2kzglqfew5b/app.bsky.feed.post/3lszcx7zf622q'
 */
export function parseAtProtoAppUrl(url: string): string | null {
  // Remove any leading @ symbol that might have been added
  if (url.startsWith('@')) {
    url = url.substring(1);
  }

  const match = url.match(atProtoAppUrlRegex);

  if (!match) {
    return null;
  }

  const [, hostname, didOrHandle, type, rkey] = match;

  // If it's just a profile URL without additional paths
  if (!type || !rkey) {
    return didOrHandle;
  }

  // Look up the collection NSID for this type
  const typeLower = type.toLowerCase();
  const collection = RECORD_TYPE_MAPPINGS[typeLower];

  if (!collection) {
    console.warn(`Unknown record type '${type}' in URL from ${hostname}. Supported types: ${Object.keys(RECORD_TYPE_MAPPINGS).join(', ')}`);
    return null;
  }

  return `${didOrHandle}/${collection}/${rkey}`;
}

/**
 * @deprecated Use parseAtProtoAppUrl instead. This function is kept for backward compatibility.
 * Parse a Bluesky app URL and convert it to an AT Protocol URI
 */
export function parseBskyAppUrl(url: string): string | null {
  return parseAtProtoAppUrl(url);
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

  // First check if it's an AT Protocol app URL (Bluesky, Blacksky, etc.)
  const appUri = parseAtProtoAppUrl(uri);
  if (appUri) {
    // Continue processing with the converted URI
    uri = appUri;
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

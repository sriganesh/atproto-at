/**
 * Configuration for AT Protocol web applications
 *
 * This config allows the viewer to support URLs from multiple AT Protocol
 * web applications (Bluesky, Blacksky, etc.) without code changes.
 *
 * To add support for a new app, simply add its hostname to the ATPROTO_APPS array.
 * The app must follow the standard URL pattern:
 *   https://{hostname}/profile/{handle-or-did}/{type}/{rkey}
 */

export type AtProtoAppConfig = {
  /** The hostname of the AT Protocol web app (e.g., 'bsky.app') */
  hostname: string;
  /** Human-readable name of the app */
  name: string;
  /** Whether this is the default/primary app (used for display purposes) */
  isDefault?: boolean;
};

/**
 * List of supported AT Protocol web applications
 * Add new apps here to enable URL support automatically
 */
export const ATPROTO_APPS: AtProtoAppConfig[] = [
  { hostname: 'bsky.app', name: 'Bluesky', isDefault: true },
  { hostname: 'blacksky.community', name: 'Blacksky' },
];

/**
 * Mapping from URL path segments to full AT Protocol collection NSIDs
 * These are the standard Bluesky Lexicon types used across AT Protocol apps
 */
export const RECORD_TYPE_MAPPINGS: Record<string, string> = {
  'post': 'app.bsky.feed.post',
  'lists': 'app.bsky.graph.list',
  'feed': 'app.bsky.feed.generator',
};

/**
 * Get all supported hostnames as an array
 */
export function getSupportedHostnames(): string[] {
  return ATPROTO_APPS.map(app => app.hostname);
}

/**
 * Check if a hostname is a supported AT Protocol app
 */
export function isSupportedAtProtoApp(hostname: string): boolean {
  return ATPROTO_APPS.some(app => app.hostname.toLowerCase() === hostname.toLowerCase());
}

/**
 * Get the app config for a given hostname
 */
export function getAppConfig(hostname: string): AtProtoAppConfig | undefined {
  return ATPROTO_APPS.find(app => app.hostname.toLowerCase() === hostname.toLowerCase());
}

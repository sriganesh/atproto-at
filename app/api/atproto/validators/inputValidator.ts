/**
 * Input validation utilities for AT Protocol API endpoints
 */

// Maximum lengths for various inputs
const MAX_URI_LENGTH = 2048;
const MAX_CURSOR_LENGTH = 256;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

// Regex patterns for validation
const DID_PATTERN = /^did:[a-z]+:[a-zA-Z0-9._%-]+$/;
const HANDLE_PATTERN = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
const RKEY_PATTERN = /^[a-zA-Z0-9._~:-]+$/;
const AT_URI_PATTERN = /^(at:\/\/)?[^\/\s]+/;

export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  error?: string;
}

/**
 * Validates and sanitizes URI parameter
 */
export function validateUri(uri: string | null): ValidationResult<string> {
  if (!uri) {
    return { valid: false, error: 'URI parameter is required' };
  }

  // Check length
  if (uri.length > MAX_URI_LENGTH) {
    return { valid: false, error: 'URI is too long' };
  }

  // Remove any control characters and trim whitespace
  const sanitized = uri.replace(/[\x00-\x1F\x7F]/g, '').trim();
  
  if (!sanitized) {
    return { valid: false, error: 'URI cannot be empty' };
  }

  // Basic pattern check for AT URIs
  if (!AT_URI_PATTERN.test(sanitized)) {
    return { valid: false, error: 'Invalid URI format' };
  }

  // Check for common injection patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      return { valid: false, error: 'URI contains potentially dangerous content' };
    }
  }

  return { valid: true, value: sanitized };
}

/**
 * Validates DID format
 */
export function validateDid(did: string): ValidationResult<string> {
  if (!DID_PATTERN.test(did)) {
    return { valid: false, error: 'Invalid DID format' };
  }
  return { valid: true, value: did };
}

/**
 * Validates handle format
 */
export function validateHandle(handle: string): ValidationResult<string> {
  if (!HANDLE_PATTERN.test(handle)) {
    return { valid: false, error: 'Invalid handle format' };
  }
  
  // Additional check for reasonable handle length
  if (handle.length > 253) { // Max domain name length
    return { valid: false, error: 'Handle is too long' };
  }
  
  return { valid: true, value: handle };
}

/**
 * Validates collection name format
 */
export function validateCollection(collection: string): ValidationResult<string> {
  // Basic length check
  if (collection.length > 256) {
    return { valid: false, error: 'Collection name is too long' };
  }
  
  // Check for dangerous patterns in collection names
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /\x00/  // null bytes
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(collection)) {
      return { valid: false, error: 'Collection name contains potentially dangerous content' };
    }
  }
  
  // Allow any collection format - the API will handle invalid collections
  return { valid: true, value: collection };
}

/**
 * Validates record key format
 */
export function validateRkey(rkey: string): ValidationResult<string> {
  if (!RKEY_PATTERN.test(rkey)) {
    return { valid: false, error: 'Invalid record key format' };
  }
  
  // Check reasonable length
  if (rkey.length > 512) {
    return { valid: false, error: 'Record key is too long' };
  }
  
  return { valid: true, value: rkey };
}

/**
 * Validates and sanitizes cursor parameter
 */
export function validateCursor(cursor: string | null): ValidationResult<string | undefined> {
  if (!cursor) {
    return { valid: true, value: undefined };
  }

  // Check length
  if (cursor.length > MAX_CURSOR_LENGTH) {
    return { valid: false, error: 'Cursor is too long' };
  }

  // Remove any control characters
  const sanitized = cursor.replace(/[\x00-\x1F\x7F]/g, '').trim();
  
  if (!sanitized) {
    return { valid: true, value: undefined };
  }

  // Basic alphanumeric + base64 characters check
  if (!/^[a-zA-Z0-9+/=_.-]+$/.test(sanitized)) {
    return { valid: false, error: 'Invalid cursor format' };
  }

  return { valid: true, value: sanitized };
}

/**
 * Validates and sanitizes limit parameter
 */
export function validateLimit(limit: string | null): ValidationResult<number> {
  if (!limit) {
    return { valid: true, value: DEFAULT_LIMIT };
  }

  const parsed = parseInt(limit, 10);
  
  if (isNaN(parsed)) {
    return { valid: false, error: 'Limit must be a number' };
  }
  
  if (parsed < MIN_LIMIT) {
    return { valid: false, error: `Limit must be at least ${MIN_LIMIT}` };
  }
  
  if (parsed > MAX_LIMIT) {
    return { valid: false, error: `Limit cannot exceed ${MAX_LIMIT}` };
  }
  
  return { valid: true, value: parsed };
}

/**
 * Validates all API parameters
 */
export interface ValidatedParams {
  uri: string;
  cursor?: string;
  limit: number;
}

export function validateApiParams(
  uri: string | null,
  cursor: string | null,
  limit: string | null
): ValidationResult<ValidatedParams> {
  // Validate URI
  const uriResult = validateUri(uri);
  if (!uriResult.valid) {
    return { valid: false, error: uriResult.error };
  }

  // Validate cursor
  const cursorResult = validateCursor(cursor);
  if (!cursorResult.valid) {
    return { valid: false, error: cursorResult.error };
  }

  // Validate limit
  const limitResult = validateLimit(limit);
  if (!limitResult.valid) {
    return { valid: false, error: limitResult.error };
  }

  return {
    valid: true,
    value: {
      uri: uriResult.value!,
      cursor: cursorResult.value,
      limit: limitResult.value!
    }
  };
}
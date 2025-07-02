/**
 * Decode a TID (Timestamp ID) to extract the timestamp
 * TIDs are base32-encoded timestamps used as record keys in AT Protocol
 */

// Base32 alphabet used by AT Protocol (Crockford's base32)
const BASE32_ALPHABET = '234567abcdefghijklmnopqrstuvwxyz';

/**
 * Decodes a TID string to get the timestamp in milliseconds
 * @param tid The TID string to decode
 * @returns Timestamp in milliseconds, or null if invalid
 */
export function decodeTidToTimestamp(tid: string): number | null {
  try {
    if (!tid || tid.length !== 13) {
      return null;
    }

    // Validate first character
    if (!'234567abcdefghij'.includes(tid[0])) {
      return null;
    }

    // Convert base32 to BigInt to handle large numbers
    let num = BigInt(0);
    for (let i = 0; i < tid.length; i++) {
      const char = tid[i];
      const value = BASE32_ALPHABET.indexOf(char);
      if (value === -1) {
        return null;
      }
      num = num * BigInt(32) + BigInt(value);
    }

    // Extract timestamp from the 64-bit value
    // Top bit is 0, next 53 bits are microseconds, final 10 bits are clock ID
    // Shift right by 10 bits to get the timestamp
    const microseconds = num >> BigInt(10);
    
    // Convert microseconds to milliseconds for JavaScript Date
    return Number(microseconds / BigInt(1000));
  } catch (error) {
    console.error('Error decoding TID:', error);
    return null;
  }
}

/**
 * Extract TID from an AT Protocol URI
 * @param uri The AT Protocol URI
 * @returns The TID (record key) or null
 */
export function extractTidFromUri(uri: string): string | null {
  try {
    const parts = uri.split('/');
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

/**
 * Get a human-readable date from a TID
 * @param tid The TID to decode
 * @returns Formatted date string or null
 */
export function getDateFromTid(tid: string): string | null {
  const timestamp = decodeTidToTimestamp(tid);
  if (!timestamp) {
    return null;
  }

  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return null;
  }
}

/**
 * Generate a new TID (Timestamp ID)
 * TIDs are 13-character base32-encoded timestamps used as record keys in AT Protocol
 * Format: 64-bit value with 1 reserved bit, 53 bits for microseconds, 10 bits for clock ID
 */
let lastTimestamp = BigInt(0);
let clockId = Math.floor(Math.random() * 1024); // 10-bit random clock ID

export function generateTid(): string {
  // Get current time in microseconds
  let timestamp = BigInt(Date.now()) * BigInt(1000);
  
  // Ensure monotonic increase
  if (timestamp <= lastTimestamp) {
    timestamp = lastTimestamp + BigInt(1);
  }
  lastTimestamp = timestamp;
  
  // Combine timestamp (53 bits) and clock ID (10 bits)
  // Top bit is always 0, so we just shift and combine
  const tidValue = (timestamp << BigInt(10)) | BigInt(clockId);
  
  // Convert to base32
  let result = '';
  let value = tidValue;
  
  // Generate 13 characters (13 * 5 bits = 65 bits, but we use 64)
  for (let i = 0; i < 13; i++) {
    const index = Number(value & BigInt(31)); // Get last 5 bits
    result = BASE32_ALPHABET[index] + result;
    value = value >> BigInt(5); // Shift right by 5 bits
  }
  
  return result;
}
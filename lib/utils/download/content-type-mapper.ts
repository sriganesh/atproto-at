// Content type to file extension mapping for blob downloads
const contentTypeToExtension: Record<string, string> = {
  // Images
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg', 
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',

  // Videos
  'video/mp4': 'mp4',
  'video/mpeg': 'mpeg',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/avi': 'avi',
  'video/x-msvideo': 'avi',
  'video/3gpp': '3gp',
  'video/x-flv': 'flv',

  // Audio
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'audio/webm': 'weba',

  // Text/Subtitles
  'text/vtt': 'vtt',
  'text/plain': 'txt',
  'text/html': 'html',
  'text/css': 'css',
  'text/javascript': 'js',
  'text/xml': 'xml',
  'text/csv': 'csv',

  // Documents
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',

  // Archives
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/x-rar-compressed': 'rar',
  'application/x-tar': 'tar',
  'application/gzip': 'gz',
  'application/x-7z-compressed': '7z',

  // JSON/Data
  'application/json': 'json',
  'application/xml': 'xml',
  'application/x-yaml': 'yaml',
  'text/yaml': 'yaml',

  // Binary/Other
  'application/octet-stream': 'bin',
};

/**
 * Get file extension from content type
 * @param contentType - The content type from HTTP response header
 * @returns File extension (without dot) or 'bin' for unknown types
 */
export const getExtensionFromContentType = (contentType: string | undefined): string => {
  if (!contentType) {
    return 'bin';
  }

  // Clean content type - remove charset and other parameters
  const cleanContentType = contentType.split(';')[0].trim().toLowerCase();
  
  // Look up extension
  const extension = contentTypeToExtension[cleanContentType];
  
  return extension || 'bin';
};

/**
 * Generate filename with appropriate extension based on content type
 * @param cid - The blob CID
 * @param contentType - The content type from HTTP response header
 * @returns Filename with appropriate extension
 */
export const generateBlobFilename = (cid: string, contentType?: string): string => {
  const extension = getExtensionFromContentType(contentType);
  return `${cid}.${extension}`;
}; 
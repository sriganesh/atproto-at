import JSZip from 'jszip';

export interface ZipCreator {
  addFile(filename: string, data: Uint8Array): void;
  generate(): Promise<Blob>;
}

export class StreamingZipCreator implements ZipCreator {
  private zip: JSZip;

  constructor() {
    this.zip = new JSZip();
  }

  addFile(filename: string, data: Uint8Array): void {
    this.zip.file(filename, data);
  }

  async generate(): Promise<Blob> {
    return await this.zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6, // Balanced compression
      },
    });
  }
}

export const createZipCreator = (): ZipCreator => {
  return new StreamingZipCreator();
};

// Utility function to sanitize filenames for ZIP
export const sanitizeFilename = (filename: string): string => {
  // Remove or replace invalid characters for ZIP filenames
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .substring(0, 255); // Limit length
}; 
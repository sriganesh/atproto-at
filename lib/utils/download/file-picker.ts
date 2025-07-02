// File System Access API utilities
export interface FileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

// Extend the standard WritableStream to include the FileSystemWritableFileStream methods
interface FileSystemWritableFileStream extends WritableStream {
  write(data: any): Promise<void>;
  close(): Promise<void>;
}

export const showSaveFilePicker = async (options: {
  suggestedName: string;
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}): Promise<FileHandle | undefined> => {
  try {
    // Check if File System Access API is supported
    if ('showSaveFilePicker' in window) {
      // @ts-ignore - File System Access API is not fully typed yet
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: options.suggestedName,
        types: options.types,
        excludeAcceptAllOption: true,
      });
      return fileHandle;
    } else {
      // Fallback for browsers that don't support File System Access API
      // This will trigger a regular download instead
      return undefined;
    }
  } catch (error) {
    // User cancelled or other error
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled - this is normal, don't log as error
    } else {
      console.error('Error opening file picker:', error);
    }
    return undefined;
  }
};

export const isFileSystemAccessSupported = (): boolean => {
  return 'showSaveFilePicker' in window;
};

// Fallback download function for browsers without File System Access API
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}; 
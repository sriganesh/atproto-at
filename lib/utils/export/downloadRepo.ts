/**
 * Utility function to download a repository from a PDS server
 * Works with both regular PDS servers and did:web repositories
 */
export async function downloadRepo(pdsUrl: string, did: string): Promise<void> {
  if (!pdsUrl || !did) {
    throw new Error('PDS URL and DID are required');
  }
  
  try {
    // Normalize PDS URL by removing trailing slash if present
    const normalizedPdsUrl = pdsUrl.endsWith('/') ? pdsUrl.slice(0, -1) : pdsUrl;
    
    // Check if the DID is did:web
    const isWebDid = did.startsWith('did:web:');
    
    // AT Proto standard endpoint for repository export
    const endpoint = 'xrpc/com.atproto.sync.getRepo';
    const downloadUrl = `${normalizedPdsUrl}/${endpoint}?did=${encodeURIComponent(did)}`;

    // Fetch the repository CAR file
    let response: Response;
    try {
      response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.ipld.car',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch repository: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to fetch repository');
    }
    
    // Get the blob from the response
    const blob = await response.blob();
    
    // Create an object URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary anchor element to initiate the download
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    // Set the filename for the download
    // Format: atproto-at-did-yyyy-mm-dd-timestamp.car
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const unixTimestamp = Math.floor(date.getTime() / 1000);
    
    // Make the filename more user-friendly for did:web
    let filename = did.replace(/:/g, '-');
    if (isWebDid) {
      // For did:web:example.com, use example.com
      filename = did.replace('did:web:', '');
    }
    
    a.download = `atproto-at-${filename}-${formattedDate}-${unixTimestamp}.car`;
    
    // Append to the document, click, and clean up
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading repository:', error);
    throw error;
  }
} 
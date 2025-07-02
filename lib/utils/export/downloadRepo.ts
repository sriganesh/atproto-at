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
    
    // Different repos might have different XRPC endpoints 
    // AT Proto standard endpoint is com.atproto.sync.getRepo
    // Some custom implementations might have variations
    
    // List of possible repo sync endpoints to try
    const syncEndpoints = [
      'xrpc/com.atproto.sync.getRepo',        // Standard endpoint
      'xrpc/com.atproto.repo.exportRepo',     // Alternative some servers might use
    ];
    
    let response = null;
    
    // Try each endpoint until we find one that works
    for (const endpoint of syncEndpoints) {
      const downloadUrl = `${normalizedPdsUrl}/${endpoint}?did=${encodeURIComponent(did)}`;
            
      try {
        // Try the current endpoint
        const currentResponse = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.ipld.car',
          },
        });
        
        if (currentResponse.ok) {
                    response = currentResponse;
          break; // Found a working endpoint
        }
        
              } catch (endpointError) {
        console.error(`Error with endpoint ${endpoint}:`, endpointError);
        // Continue to try the next endpoint
      }
    }
    
    // If none of the endpoints worked
    if (!response) {
      throw new Error(`Failed to download repository: No working endpoint found for ${pdsUrl}`);
    }
    
    // If we have a valid response, continue with the download
    if (!response.ok) {
      throw new Error(`Failed to download repository: ${response.statusText}`);
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
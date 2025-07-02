export interface BreadcrumbItem {
  label: string;
  uri: string;
  path: string;
}

// Generate the breadcrumbs based on URI components
export const getBreadcrumbs = (data: any, profileData: any): BreadcrumbItem[] | null => {
  if (!data || !data.uri) return null;
  
  const uriString = data.uri.replace('at://', '');
  const parts = uriString.split('/');
  const items: BreadcrumbItem[] = [];
  
  // Add DID part
  if (parts[0]) {
    // Use handle if available from any data source
    const handle = data.data?.handle || data.data?.repoInfo?.handle || 
                  profileData?.handle || profileData?.repoInfo?.handle;
    const displayLabel = handle || parts[0];
    
    // Only truncate if longer than 64 characters
    const formattedLabel = displayLabel.length > 64
      ? `${displayLabel.substring(0, 30)}...${displayLabel.substring(displayLabel.length - 30)}`
      : displayLabel;
    
    items.push({
      label: formattedLabel,
      uri: parts[0],
      path: `/viewer?uri=${parts[0]}`
    });
  }
  
  // Add collection part if available
  if (parts[1]) {
    items.push({
      label: parts[1],
      uri: `${parts[0]}/${parts[1]}`,
      path: `/viewer?uri=${parts[0]}/${parts[1]}`
    });
  }
  
  // Add record key part if available
  if (parts[2]) {
    items.push({
      label: parts[2],
      uri: `${parts[0]}/${parts[1]}/${parts[2]}`,
      path: `/viewer?uri=${parts[0]}/${parts[1]}/${parts[2]}`
    });
  }
  
  return items;
}; 
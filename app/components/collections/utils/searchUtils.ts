/**
 * Utility functions for searching collection records
 */

export interface SearchableRecord {
  uri: string;
  cid: string;
  value: {
    $type: string;
    text?: string;
    name?: string;
    description?: string;
    policies?: {
      labelValues?: string[];
    };
    subject?: {
      uri?: string;
      cid?: string;
    };
    [key: string]: any;
  };
  // Additional data that may be loaded by components
  subjectPost?: {
    value?: {
      text?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

/**
 * Filter records based on search query
 * Searches both JSON data and specific content fields based on record type
 * Note: For likes/reposts, this only searches the basic record data,
 * not the actual liked/reposted content which is loaded separately
 */
export function filterRecords(records: SearchableRecord[], searchQuery: string): SearchableRecord[] {
  // Return all records if search is empty
  if (!searchQuery || !searchQuery.trim()) {
    return [...records]; // Return a new array to ensure React detects changes
  }

  const query = searchQuery.toLowerCase().trim();
  
  const filtered = records.filter(record => {
    // Guard against invalid records
    if (!record || !record.value) return false;
    
    try {
      // Search in specific fields based on record type first
      const value = record.value;
      
      // For posts, search in text content
      if (value.$type === 'app.bsky.feed.post' && value.text) {
        if (value.text.toLowerCase().includes(query)) return true;
      }
      
      // For likes, search in the liked post's text if available
      if (value.$type === 'app.bsky.feed.like' && record.subjectPost?.value?.text) {
        if (record.subjectPost.value.text.toLowerCase().includes(query)) return true;
      }
      
      // For reposts, search in the reposted post's text if available
      if (value.$type === 'app.bsky.feed.repost' && record.subjectPost?.value?.text) {
        if (record.subjectPost.value.text.toLowerCase().includes(query)) return true;
      }
      
      // For lists, search in name and description
      if (value.$type === 'app.bsky.graph.list') {
        if (value.name && value.name.toLowerCase().includes(query)) return true;
        if (value.description && value.description.toLowerCase().includes(query)) return true;
      }
      
      // For labeler services, search in policies
      if (value.$type === 'app.bsky.labeler.service' && value.policies?.labelValues) {
        const labelValues = value.policies.labelValues;
        for (const label of labelValues) {
          if (label.toLowerCase().includes(query)) return true;
        }
      }

      // Search in record URI
      if (record.uri && record.uri.toLowerCase().includes(query)) return true;
      
      // Last resort: search in JSON representation
      // Skip JSON search for like/repost records to avoid issues
      if (value.$type !== 'app.bsky.feed.like' && 
          value.$type !== 'app.bsky.feed.repost') {
        try {
          const jsonString = JSON.stringify(record).toLowerCase();
          if (jsonString.includes(query)) return true;
        } catch (jsonError) {
          // Silently ignore JSON errors
        }
      }

      return false;
    } catch (error) {
      console.error('Error in filterRecords for record:', record.uri, error);
      return false;
    }
  });
  
  return filtered;
}
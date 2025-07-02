/**
 * Shared utilities for fetching and processing profile data across components
 */

export type ProfileInfo = {
  displayName: string;
  handle: string;
  avatar?: string;
  did: string;
};

/**
 * Fetch profile data for a DID
 * @param did - The DID to fetch profile data for
 * @returns The profile data response or null if failed
 */
export async function fetchProfileData(did: string): Promise<any> {
  try {
    // First try to fetch the actor profile directly
    const profileResponse = await fetch(`/api/atproto?uri=${encodeURIComponent(`${did}/app.bsky.actor.profile/self`)}`);
    
    if (profileResponse.ok) {
      const profileResult = await profileResponse.json();
      
      if (profileResult.data && profileResult.data.value && 
          profileResult.data.value.$type === 'app.bsky.actor.profile') {
        // We got the profile record directly
        return profileResult;
      }
    }
    
    // Fallback to the regular profile fetch if the direct approach fails
    const response = await fetch(`/api/atproto?uri=${encodeURIComponent(did)}`);
    if (response.ok) {
      const result = await response.json();
      
      // The profile data is in result.data
      return result;
    } else {
      const errorText = await response.text();
      console.error(`Failed to fetch profile for ${did}: Status ${response.status}`, errorText);
    }
  } catch (error) {
    console.error(`Failed to fetch profile for ${did}:`, error);
  }
  return null;
}

/**
 * Process profile data to extract relevant information
 * @param profileResponse - The profile response data
 * @param fallbackDid - The DID to use as fallback
 * @returns Extracted profile information
 */
export function extractProfileInfo(profileResponse: any, fallbackDid: string): ProfileInfo {
  if (!profileResponse) {
    return { 
      handle: 'unknown', 
      displayName: 'Unknown User',
      avatar: undefined,
      did: fallbackDid
    };
  }
  
  // The actual profile data structure depends on where it's coming from
  const profileData = profileResponse.data || {};
  
  let displayName = '';
  let handle = '';
  let avatar = undefined;
  const authorDid = fallbackDid;
  
  // Case 1: Direct app.bsky.actor.profile record (from self record)
  if (profileData.value && profileData.value.$type === 'app.bsky.actor.profile') {
    const profile = profileData.value;
    
    // Get display name directly from the profile
    displayName = profile.displayName || '';
    
    // Handle might be in the repo info or need to be fetched separately
    handle = profileData.handle || 
             profileData.repoInfo?.handle || 
             profile.handle || '';
    
    // Construct avatar URL from the blob reference
    if (profile.avatar && profile.avatar.ref && profile.avatar.ref.$link) {
      avatar = `https://cdn.bsky.app/img/avatar/plain/${authorDid}/${profile.avatar.ref.$link}@jpeg`;
    }
  }
  // Try to find avatar URL that might have been pre-processed
  else if (profileData.avatarUrl) {
    avatar = profileData.avatarUrl;
  
    // Case 2: Bluesky-specific actor profile from app.bsky.actor.getProfile
    if (profileData.displayName !== undefined || profileData.avatar !== undefined) {
      displayName = profileData.displayName || '';
      handle = profileData.handle || '';
      
      // Handle avatar - could be a direct URL or a blob reference
      if (profileData.avatar && !avatar) {
        if (typeof profileData.avatar === 'string') {
          avatar = profileData.avatar;
        } else if (profileData.avatar.ref && profileData.avatar.ref.$link) {
          avatar = `https://cdn.bsky.app/img/avatar/plain/${authorDid}/${profileData.avatar.ref.$link}@jpeg`;
        }
      }
    }
  }
  // Case 3: Profile inside another property
  else if (profileData.profile) {
    const profile = profileData.profile;
    displayName = profile.displayName || '';
    handle = profile.handle || profileData.handle || '';
    
    if (profile.avatar) {
      // Could be a direct URL or a ref
      if (typeof profile.avatar === 'string') {
        avatar = profile.avatar;
      } else if (profile.avatar.ref && profile.avatar.ref.$link) {
        avatar = `https://cdn.bsky.app/img/avatar/plain/${authorDid}/${profile.avatar.ref.$link}@jpeg`;
      }
    }
  }
  // Case 4: Repository info structure
  else if (profileData.repoInfo) {
    handle = profileData.repoInfo.handle || '';
    // Repository info rarely has display name or avatar, but may have a handle
  }
  
  // If we still don't have a handle but have a DID, try the DID as a fallback
  if (!handle && authorDid) {
    handle = authorDid.substring(0, 10) + '...';
  }
  
  // Try finding display name in other places if it's still not set
  if (!displayName) {
    if (profileData.value?.displayName) {
      displayName = profileData.value.displayName;
    } else if (profileData.repoInfo?.displayName) {
      displayName = profileData.repoInfo.displayName;
    }
  }
  
  return {
    displayName: displayName || handle || 'Unknown User',
    handle: handle || 'unknown',
    avatar,
    did: authorDid
  };
}

/**
 * Create a minimal profile info for error cases
 * @param did - The DID to create minimal info for
 * @returns Minimal profile information
 */
export function createMinimalProfileInfo(did: string): ProfileInfo {
  return {
    displayName: 'Unknown User',
    handle: did.substring(0, 10) + '...',
    avatar: undefined,
    did: did
  };
}
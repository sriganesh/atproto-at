import React, { useState, useEffect } from 'react';
import { cachedApiCall } from '../utils/apiCache';

interface FollowPreviewProps {
  followRecord: any;
  followerDid: string;
  recordKey: string;
}

export default React.memo(function FollowPreview({ followRecord, followerDid, recordKey }: FollowPreviewProps) {
  const [followedUserProfile, setFollowedUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdsEndpoint, setPdsEndpoint] = useState<string>('bsky.social');

  // Fetch profile data for a DID using cached API calls
  const fetchProfileData = async (did: string) => {
    try {
      // First try to fetch the actor profile directly
      try {
        const profileResult = await cachedApiCall<any>(`${did}/app.bsky.actor.profile/self`);
        if (profileResult.data && profileResult.data.value && 
            profileResult.data.value.$type === 'app.bsky.actor.profile') {
          // Extract PDS hostname from the API URL if available
          if (profileResult.apiUrl) {
            const pdsHostname = new URL(profileResult.apiUrl).hostname;
            setPdsEndpoint(pdsHostname);
          }
          return profileResult;
        }
      } catch (profileError) {
        // Profile fetch failed, try regular fetch
      }
      
      // Fallback to the regular profile fetch
      const result = await cachedApiCall<any>(did);
      // Extract PDS hostname from the API URL if available
      if (result.apiUrl) {
        const pdsHostname = new URL(result.apiUrl).hostname;
        setPdsEndpoint(pdsHostname);
      }
      return result;
    } catch (error) {
      console.error(`Failed to fetch profile for ${did}:`, error);
      return null;
    }
  };

  // Extract profile info from API response (improved version)
  const extractProfileInfo = (profileResponse: any) => {
    if (!profileResponse) return { handle: 'unknown' };
    
    const profileData = profileResponse.data || {};
    let displayName = '';
    let handle = '';
    let avatar = undefined;
    let description = '';
    let authorDid = '';
    
    // Get the DID
    authorDid = profileData.did || followRecord.subject;
    
    // Case 1: Direct app.bsky.actor.profile record (from self record)
    if (profileData.value && profileData.value.$type === 'app.bsky.actor.profile') {
      const profile = profileData.value;
      
      // Get display name directly from the profile
      displayName = profile.displayName || '';
      description = profile.description || '';
      
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
        description = profileData.description || '';
        
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
      description = profile.description || '';
      
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
      displayName: displayName || handle || 'unknown',
      handle: handle || 'unknown',
      description,
      avatar,
      did: authorDid
    };
  };

  useEffect(() => {
    const fetchFollowedProfile = async () => {
      if (!followRecord.subject) {
        setError('No user DID found');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch the followed user's profile
        const subjectDid = followRecord.subject;
        const profileData = await fetchProfileData(subjectDid);
        if (profileData) {
          const profileInfo = extractProfileInfo(profileData);
          setFollowedUserProfile(profileInfo);
        } else {
          setError('Failed to load profile');
        }
      } catch (err) {
        console.error('Error fetching followed user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowedProfile();
  }, [followRecord.subject]);

  if (isLoading) {
    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border animate-pulse">
        <div className="text-xs text-gray-500 dark:text-gray-400">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Failed to load profile: {error}
        </div>
      </div>
    );
  }

  if (!followedUserProfile) {
    return null;
  }

  return (
    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
      {/* Header */}
      <div className="text-green-600 dark:text-green-400 text-xs font-medium mb-2">
        👥 Followed
      </div>
      
      {/* User Profile */}
      <div className="flex items-center gap-2 mb-3">
        {followedUserProfile.avatar && (
          <img 
            src={followedUserProfile.avatar} 
            alt={followedUserProfile.displayName}
            className="w-6 h-6 rounded-full"
            loading="lazy"
          />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {followedUserProfile.displayName}
          </span>
          {followedUserProfile.handle && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              @{followedUserProfile.handle}
            </span>
          )}
        </div>
      </div>
      
      {followedUserProfile.description && (
        <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">
          {followedUserProfile.description.length > 100 
            ? `${followedUserProfile.description.substring(0, 100)}...`
            : followedUserProfile.description
          }
        </div>
      )}
      
      {/* Action links */}
      <div className="flex items-center gap-3 text-xs">
        <a
          href={`/viewer?uri=${followRecord.subject}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center gap-1"
        >
          atproto.at
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        
        <a
          href={`https://bsky.app/profile/${followRecord.subject}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center gap-1"
        >
          🦋
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        
        <a
          href={`https://${pdsEndpoint}/xrpc/com.atproto.repo.getRecord?repo=${followerDid}&collection=app.bsky.graph.follow&rkey=${recordKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center gap-1"
        >
          PDS
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the follow record subject actually changed
  return (
    prevProps.followRecord?.subject === nextProps.followRecord?.subject &&
    prevProps.followerDid === nextProps.followerDid &&
    prevProps.recordKey === nextProps.recordKey
  );
}); 
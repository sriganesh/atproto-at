import React, { useState, useEffect } from 'react';

function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

interface PostPreviewProps {
  postRecord: any;
  authorDid: string;
  recordKey: string;
}

export default function PostPreview({ postRecord, authorDid, recordKey }: PostPreviewProps) {
  const [authorInfo, setAuthorInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdsEndpoint, setPdsEndpoint] = useState<string>('bsky.social');

  // Fetch profile data for a DID
  const fetchProfileData = async (did: string) => {
    try {
      // First try to fetch the actor profile directly
      const profileResponse = await fetch(`/api/atproto?uri=${encodeURIComponent(`${did}/app.bsky.actor.profile/self`)}`);
      
      if (profileResponse.ok) {
        const profileResult = await profileResponse.json();
        if (profileResult.data && profileResult.data.value && 
            profileResult.data.value.$type === 'app.bsky.actor.profile') {
          return profileResult;
        }
      }
      
      // Fallback to the regular profile fetch
      const response = await fetch(`/api/atproto?uri=${encodeURIComponent(did)}`);
      if (response.ok) {
        const result = await response.json();
        return result;
      }
    } catch (error) {
      console.error(`Failed to fetch profile for ${did}:`, error);
    }
    return null;
  };

  // Extract profile info from API response
  const extractProfileInfo = (profileResponse: any) => {
    if (!profileResponse) return { handle: 'unknown' };
    
    const profileData = profileResponse.data || {};
    let displayName = '';
    let handle = '';
    let avatar = undefined;
    
    // Get the DID
    const profileDid = profileData.did || authorDid;
    
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
        avatar = `https://cdn.bsky.app/img/avatar/plain/${profileDid}/${profile.avatar.ref.$link}@jpeg`;
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
            avatar = `https://cdn.bsky.app/img/avatar/plain/${profileDid}/${profileData.avatar.ref.$link}@jpeg`;
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
          avatar = `https://cdn.bsky.app/img/avatar/plain/${profileDid}/${profile.avatar.ref.$link}@jpeg`;
        }
      }
    }
    // Case 4: Repository info structure
    else if (profileData.repoInfo) {
      handle = profileData.repoInfo.handle || '';
      // Repository info rarely has display name or avatar, but may have a handle
    }
    
    // If we still don't have a handle but have a DID, try the DID as a fallback
    if (!handle && profileDid) {
      handle = profileDid.substring(0, 10) + '...';
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
      avatar
    };
  };

  useEffect(() => {
    const fetchAuthorProfile = async () => {
      if (!authorDid) {
        setError('No author DID found');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch the post author's profile
        const profileData = await fetchProfileData(authorDid);
        if (profileData) {
          const profileInfo = extractProfileInfo(profileData);
          setAuthorInfo(profileInfo);
          
          // Extract PDS hostname from the API URL if available
          if (profileData.apiUrl) {
            const pdsHostname = new URL(profileData.apiUrl).hostname;
            setPdsEndpoint(pdsHostname);
          }
        } else {
          setError('Failed to load author profile');
        }
      } catch (err) {
        console.error('Error fetching post author profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load author');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuthorProfile();
  }, [authorDid]);

  if (isLoading) {
    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border animate-pulse">
        <div className="text-xs text-gray-500 dark:text-gray-400">Loading post author...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Failed to load author: {error}
        </div>
      </div>
    );
  }

  const isPostType = postRecord.$type === 'app.bsky.feed.post';

  return (
    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
      {/* Header */}
      <div className="text-blue-600 dark:text-blue-400 text-xs font-medium mb-2">
        📝 New Post
      </div>
      
      {/* Author Info */}
      {authorInfo && (
        <div className="flex items-center gap-2 mb-3">
          {authorInfo.avatar && (
            <img 
              src={authorInfo.avatar} 
              alt={authorInfo.displayName}
              className="w-6 h-6 rounded-full"
              loading="lazy"
            />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {authorInfo.displayName}
            </span>
            {authorInfo.handle && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                @{authorInfo.handle}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Post Content */}
      {isPostType && postRecord.text && (
        <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed mb-3">
          {truncateText(postRecord.text)}
        </div>
      )}
      
      {!isPostType && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {postRecord.$type}
        </div>
      )}
      
      {/* Show embedded content info if present */}
      {isPostType && postRecord.embed && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
          <span>📎</span>
          <span>
            {postRecord.embed.$type === 'app.bsky.embed.images' && `${postRecord.embed.images?.length || 0} image(s)`}
            {postRecord.embed.$type === 'app.bsky.embed.video' && 'Video'}
            {postRecord.embed.$type === 'app.bsky.embed.record' && 'Quote post'}
            {postRecord.embed.$type === 'app.bsky.embed.external' && 'Link'}
            {!['app.bsky.embed.images', 'app.bsky.embed.video', 'app.bsky.embed.record', 'app.bsky.embed.external'].includes(postRecord.embed.$type) && 'Media'}
          </span>
        </div>
      )}
      
      {/* Action links */}
      <div className="flex items-center gap-3 text-xs">
        <a
          href={`/viewer?uri=${authorDid}/app.bsky.feed.post/${recordKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1"
        >
          atproto.at
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        
        <a
          href={`https://bsky.app/profile/${authorDid}/post/${recordKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1"
        >
          🦋
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        
        <a
          href={`https://${pdsEndpoint}/xrpc/com.atproto.repo.getRecord?repo=${authorDid}&collection=app.bsky.feed.post&rkey=${recordKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1"
        >
          PDS
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
} 
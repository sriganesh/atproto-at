import React, { useState, useEffect } from 'react';
import { cachedApiCall } from '../utils/apiCache';
import { getAuthorDidFromUri } from '@/lib/utils/atproto';

function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

interface LikedPostPreviewProps {
  likeRecord: any;
}

export default React.memo(function LikedPostPreview({ likeRecord }: LikedPostPreviewProps) {
  const [likedPost, setLikedPost] = useState<any>(null);
  const [authorInfo, setAuthorInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdsEndpoint, setPdsEndpoint] = useState<string>('bsky.social');

  // Extract record key from URI
  const getRecordKeyFromUri = (uri: string): string => {
    const parts = uri.split('/');
    return parts[parts.length - 1] || '';
  };

  // Fetch profile data for a DID using cached API call
  const fetchProfileData = async (did: string) => {
    try {
      // First try to fetch the actor profile directly
      try {
        const profileResult = await cachedApiCall(`${did}/app.bsky.actor.profile/self`) as any;
        if (profileResult.data && profileResult.data.value && 
            profileResult.data.value.$type === 'app.bsky.actor.profile') {
          return profileResult;
        }
      } catch (profileError) {
                // Fallback to the regular profile fetch
      }
      
      const result = await cachedApiCall(did) as any;
      return result;
    } catch (error) {
      console.error(`Failed to fetch profile for ${did}:`, error);
      return null;
    }
  };

  // Extract profile info from API response (improved version from RepostedItem)
  const extractProfileInfo = (profileResponse: any) => {
    if (!profileResponse) return { handle: 'unknown' };
    
    const profileData = profileResponse.data || {};
    let displayName = '';
    let handle = '';
    let avatar = undefined;
    let authorDid = '';
    
    // Get the DID
    authorDid = profileData.did || getAuthorDidFromUri(profileResponse.uri || '');
    
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
      displayName: displayName || handle || 'unknown',
      handle: handle || 'unknown',
      avatar
    };
  };

  useEffect(() => {
    const fetchLikedPost = async () => {
      if (!likeRecord.subject?.uri) {
        setError('No post URI found');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch the liked post using cached API call
        const subjectUri = likeRecord.subject.uri;
        const cleanUri = subjectUri.replace(/^at:\/\//i, '');
        const data = await cachedApiCall(cleanUri) as any;
        
        setLikedPost(data.data);
        
        // Extract PDS hostname from the API URL
        if (data.apiUrl) {
          const pdsHostname = new URL(data.apiUrl).hostname;
          setPdsEndpoint(pdsHostname);
        }

        // Fetch the post author's profile
        const postAuthorDid = getAuthorDidFromUri(subjectUri);
        if (postAuthorDid) {
          const profileData = await fetchProfileData(postAuthorDid);
          if (profileData) {
            const profileInfo = extractProfileInfo(profileData);
            setAuthorInfo(profileInfo);
          }
        }
      } catch (err) {
        console.error('Error fetching liked post:', err);
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLikedPost();
  }, [likeRecord.subject?.uri]); // Only depend on the URI that matters

  if (isLoading) {
    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border animate-pulse">
        <div className="text-xs text-gray-500 dark:text-gray-400">Loading liked post...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Failed to load post: {error}
        </div>
      </div>
    );
  }

  if (!likedPost || !likedPost.value) {
    return null;
  }

  const post = likedPost.value;
  const isPostType = post.$type === 'app.bsky.feed.post';
  const postAuthorDid = getAuthorDidFromUri(likeRecord.subject.uri);
  const recordKey = getRecordKeyFromUri(likeRecord.subject.uri);

  return (
    <div className="mt-2 p-3 bg-pink-50 dark:bg-pink-900/20 rounded border border-pink-200 dark:border-pink-800">
      {/* Header */}
      <div className="text-pink-600 dark:text-pink-400 text-xs font-medium mb-2">
        ❤️ Liked Post
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
      
      {isPostType && post.text && (
        <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed mb-3">
          {truncateText(post.text, 200)}
        </div>
      )}
      
      {!isPostType && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {post.$type}
        </div>
      )}
      
      {/* Action links */}
      <div className="flex items-center gap-3 text-xs">
        <a
          href={`/viewer?uri=${postAuthorDid}/app.bsky.feed.post/${recordKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 hover:underline flex items-center gap-1"
        >
          atproto.at
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        
        <a
          href={`https://bsky.app/profile/${postAuthorDid}/post/${recordKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 hover:underline flex items-center gap-1"
        >
          🦋
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        
        <a
          href={`https://${pdsEndpoint}/xrpc/com.atproto.repo.getRecord?repo=${postAuthorDid}&collection=app.bsky.feed.post&rkey=${recordKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 hover:underline flex items-center gap-1"
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
  // Only re-render if the like record URI actually changed
  return prevProps.likeRecord?.subject?.uri === nextProps.likeRecord?.subject?.uri;
}); 
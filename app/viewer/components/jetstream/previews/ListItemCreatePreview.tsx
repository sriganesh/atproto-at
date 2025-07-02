import React, { useState, useEffect } from 'react';

interface ListItemCreatePreviewProps {
  listItemRecord: any;
  authorDid: string;
  recordKey: string;
}

export default function ListItemCreatePreview({ listItemRecord, authorDid, recordKey }: ListItemCreatePreviewProps) {
  const [listData, setListData] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
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
          // Extract PDS hostname from the API URL if available
          if (profileResult.apiUrl) {
            const pdsHostname = new URL(profileResult.apiUrl).hostname;
            setPdsEndpoint(pdsHostname);
          }
          return profileResult;
        }
      }
      
      // Fallback to the regular profile fetch
      const response = await fetch(`/api/atproto?uri=${encodeURIComponent(did)}`);
      if (response.ok) {
        const result = await response.json();
        // Extract PDS hostname from the API URL if available
        if (result.apiUrl) {
          const pdsHostname = new URL(result.apiUrl).hostname;
          setPdsEndpoint(pdsHostname);
        }
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
    let description = '';
    let authorDid = '';
    
    // Get the DID
    authorDid = profileData.did || listItemRecord.subject;
    
    // Case 1: Direct app.bsky.actor.profile record (from self record)
    if (profileData.value && profileData.value.$type === 'app.bsky.actor.profile') {
      const profile = profileData.value;
      
      displayName = profile.displayName || '';
      description = profile.description || '';
      handle = profileData.handle || profileData.repoInfo?.handle || profile.handle || '';
      
      // Construct avatar URL from the blob reference
      if (profile.avatar && profile.avatar.ref && profile.avatar.ref.$link) {
        avatar = `https://cdn.bsky.app/img/avatar/plain/${authorDid}/${profile.avatar.ref.$link}@jpeg`;
      }
    }
    // Case 2: Other profile structures
    else if (profileData.avatarUrl) {
      avatar = profileData.avatarUrl;
      
      if (profileData.displayName !== undefined || profileData.avatar !== undefined) {
        displayName = profileData.displayName || '';
        handle = profileData.handle || '';
        description = profileData.description || '';
        
        if (profileData.avatar && !avatar) {
          if (typeof profileData.avatar === 'string') {
            avatar = profileData.avatar;
          } else if (profileData.avatar.ref && profileData.avatar.ref.$link) {
            avatar = `https://cdn.bsky.app/img/avatar/plain/${authorDid}/${profileData.avatar.ref.$link}@jpeg`;
          }
        }
      }
    }
    else if (profileData.repoInfo) {
      handle = profileData.repoInfo.handle || '';
    }
    
    if (!handle && authorDid) {
      handle = authorDid.substring(0, 10) + '...';
    }
    
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
    const fetchData = async () => {
      if (!listItemRecord.list || !listItemRecord.subject) {
        setError('Missing list or user information');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Parse list URI to get the list record
        const listUri = listItemRecord.list.replace('at://', '');
        
        // Fetch list data and user profile in parallel
        const [listResponse, profileData] = await Promise.all([
          fetch(`/api/atproto?uri=${encodeURIComponent(listUri)}`),
          fetchProfileData(listItemRecord.subject)
        ]);

        // Handle list data
        if (listResponse.ok) {
          const listResult = await listResponse.json();
          if (listResult.data && listResult.data.value && 
              listResult.data.value.$type === 'app.bsky.graph.list') {
            setListData(listResult.data.value);
          }
        }

        // Handle user profile data
        if (profileData) {
          const profileInfo = extractProfileInfo(profileData);
          setUserProfile(profileInfo);
        }

        if (!listResponse.ok && !profileData) {
          setError('Failed to load list and profile data');
        }
      } catch (err) {
        console.error('Error fetching list item data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [listItemRecord]);

  if (isLoading) {
    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border animate-pulse">
        <div className="text-xs text-gray-500 dark:text-gray-400">Loading list and profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Failed to load data: {error}
        </div>
      </div>
    );
  }

  const listUri = listItemRecord.list.replace('at://', '');
  const listKey = listUri.split('/').pop();

  return (
    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
      {/* Header */}
      <div className="text-green-600 dark:text-green-400 text-xs font-medium mb-2">
        📝 Added to List
      </div>
      
      {/* User Profile */}
      {userProfile && (
        <div className="flex items-center gap-2 mb-3">
          {userProfile.avatar && (
            <img 
              src={userProfile.avatar} 
              alt={userProfile.displayName}
              className="w-6 h-6 rounded-full"
              loading="lazy"
            />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {userProfile.displayName}
            </span>
            {userProfile.handle && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                @{userProfile.handle}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* List Info */}
      {listData && (
        <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">
          Added to: <span className="font-medium">{listData.name}</span>
          {listData.description && (
            <div className="mt-1 text-gray-500 dark:text-gray-400">
              {listData.description.length > 60 
                ? `${listData.description.substring(0, 60)}...`
                : listData.description
              }
            </div>
          )}
        </div>
      )}
      
      {/* Action links */}
      <div className="flex items-center gap-3 text-xs">
        {userProfile && (
          <>
            <a
              href={`/viewer?uri=${listItemRecord.subject}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center gap-1"
            >
              User atproto.at
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            
            <a
              href={`https://bsky.app/profile/${listItemRecord.subject}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center gap-1"
            >
              User 🦋
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </>
        )}
        
        {listData && listKey && (
          <>
            <a
              href={`/viewer?uri=${listUri}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center gap-1"
            >
              List atproto.at
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            
            <a
              href={`https://bsky.app/profile/${authorDid}/lists/${listKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center gap-1"
            >
              List 🦋
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </>
        )}
        
        <a
          href={`https://${pdsEndpoint}/xrpc/com.atproto.repo.getRecord?repo=${authorDid}&collection=app.bsky.graph.listitem&rkey=${recordKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center gap-1"
        >
          Item PDS
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        
        {listData && listKey && (
          <a
            href={`https://${pdsEndpoint}/xrpc/com.atproto.repo.getRecord?repo=${authorDid}&collection=app.bsky.graph.list&rkey=${listKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center gap-1"
          >
            List PDS
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
} 
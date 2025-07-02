import React, { useState, useEffect } from 'react';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import PostCard from '../posts/PostCard';
import UserAvatar from '../profiles/UserAvatar';
import { useLoadingState } from '../../hooks/useLoadingState';
import { useErrorHandler, getUserFriendlyMessage } from '../../hooks/useErrorHandler';
import { getAuthorDidFromUri } from '@/lib/utils/atproto';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '../../hooks/useAuthenticatedRequest';
import RecordEditor from '../records/RecordEditor';

type LikeViewProps = {
  data: any;
  activeTab: 'info' | 'raw';
  setActiveTab: (tab: 'info' | 'raw') => void;
  profileCache?: Map<string, any>;
  onProfileCached?: (did: string, profileData: any) => void;
  getOrCreateProfileRequest?: (did: string, requestFn: () => Promise<any>) => Promise<any>;
  postCache?: Map<string, any>;
  onPostCached?: (postUri: string, postData: any) => void;
  getOrCreatePostRequest?: (postUri: string, requestFn: () => Promise<any>) => Promise<any>;
};

export default function LikeView({ 
  data, 
  activeTab, 
  setActiveTab,
  profileCache,
  onProfileCached,
  getOrCreateProfileRequest,
  postCache,
  onPostCached,
  getOrCreatePostRequest
}: LikeViewProps) {
  const { data: likeData, isLoading, error, execute } = useLoadingState<{
    likedPost: any;
    likedAuthorInfo: any;
    likerInfo: any;
  }>();
  
  const { handleError } = useErrorHandler();
  const [showEditModal, setShowEditModal] = useState(false);
  
  const { session } = useAuth();
  const { isReadOnly, isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  
  // Check if user owns this like and can edit/delete it
  const ownerDid = getAuthorDidFromUri(data.uri);
  const isOwner = session?.did === ownerDid;
  const canDeveloperEdit = isDeveloperMode && !isReadOnly && isOwner && !!session;
  
  const tabs = [
    { id: 'info', label: 'Like Information' },
    { id: 'raw', label: 'Raw Data' }
  ];
  
  // Extract like data
  const like = data.data;
  const likeValue = like.value;
  
  
  // Get liker DID from the like record URI
  const likerDid = getAuthorDidFromUri(data.uri);
  
  // Format the date using the user's local timezone
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      return new Intl.DateTimeFormat(undefined, options).format(date);
    } catch (err) {
      return '';
    }
  };
  
  // Fetch profile data for a DID with caching
  const fetchProfileData = async (did: string) => {
    // Check cache first
    if (profileCache?.has(did)) {
      const cachedProfile = profileCache.get(did);
      return cachedProfile;
    }

    // Use request deduplication if available
    if (getOrCreateProfileRequest) {
      const profileData = await getOrCreateProfileRequest(did, async () => {
        return await fetchProfileDataDirect(did);
      });
      
      // Cache the result
      if (onProfileCached && profileData) {
        onProfileCached(did, profileData);
      }
      
      return profileData;
    }

    // Direct fetch as fallback
    return await fetchProfileDataDirect(did);
  };

  const fetchProfileDataDirect = async (did: string) => {
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
  };
  
  // Process profile data to extract relevant information
  const extractProfileInfo = (profileResponse: any) => {
    if (!profileResponse) {
      console.warn('No profile response to extract from');
      return { handle: 'unknown' };
    }
    
    // The actual profile data structure depends on where it's coming from
    const profileData = profileResponse.data || {};
    
    let displayName = '';
    let handle = '';
    let avatar = undefined;
    let authorDid = '';
    
    // Get the DID
    authorDid = profileData.did || getAuthorDidFromUri(profileResponse.uri || '');
    
    // Check for pre-processed avatarUrl at the top level first
    if (profileData.avatarUrl) {
      avatar = profileData.avatarUrl;
    }
    
    // Case 1: Direct app.bsky.actor.profile record (from self record)
    if (profileData.value && profileData.value.$type === 'app.bsky.actor.profile') {
      const profile = profileData.value;
      
      // Get display name directly from the profile
      displayName = profile.displayName || '';
      
      // Handle might be in the repo info or need to be fetched separately
      handle = profileData.handle || 
               profileData.repoInfo?.handle || 
               profile.handle || '';
      
      // Construct avatar URL from the blob reference if we don't have avatarUrl
      if (!avatar && profile.avatar && profile.avatar.ref && profile.avatar.ref.$link) {
        avatar = `https://cdn.bsky.app/img/avatar/plain/${authorDid}/${profile.avatar.ref.$link}@jpeg`;
      }
    }
    // Case 2: Bluesky-specific actor profile from app.bsky.actor.getProfile
    else if (profileData.displayName !== undefined || profileData.handle !== undefined) {
      displayName = profileData.displayName || '';
      handle = profileData.handle || '';
      
      // Handle avatar - could be a direct URL or a blob reference
      if (!avatar && profileData.avatar) {
        if (typeof profileData.avatar === 'string') {
          avatar = profileData.avatar;
        } else if (profileData.avatar.ref && profileData.avatar.ref.$link) {
          avatar = `https://cdn.bsky.app/img/avatar/plain/${authorDid}/${profileData.avatar.ref.$link}@jpeg`;
        }
      }
    }
    // Case 3: Profile inside another property
    else if (profileData.profile) {
      const profile = profileData.profile;
      displayName = profile.displayName || '';
      handle = profile.handle || profileData.handle || '';
      
      if (!avatar && profile.avatar) {
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
      displayName = profileData.repoInfo.displayName || '';
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

  // Fetch the liked post and user profiles
  useEffect(() => {
    const fetchLikeData = async () => {
      try {
        await execute((async () => {
          const subjectUri = likeValue.subject.uri;
          if (!subjectUri) {
            throw new Error('Missing subject URI');
          }

          // Fetch the liked post with caching
          let postData;
          const cleanUri = subjectUri.replace(/^at:\/\//i, '');
          
          // Check cache first
          if (postCache?.has(subjectUri)) {
            const cachedData = postCache.get(subjectUri);
            postData = { data: cachedData };
          } else if (getOrCreatePostRequest) {
            // Use request deduplication
            const fetchedData = await getOrCreatePostRequest(subjectUri, async () => {
              const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
              if (!response.ok) {
                throw new Error(`Failed to fetch liked post: ${response.status}`);
              }
              const result = await response.json();
              return result.data;
            });
            postData = { data: fetchedData };
            
            // Cache the result
            if (onPostCached && fetchedData) {
              onPostCached(subjectUri, fetchedData);
            }
          } else {
            // Direct fetch as fallback
            const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
            if (!response.ok) {
              throw new Error(`Failed to fetch liked post: ${response.status}`);
            }
            postData = await response.json();
          }
          
          // Extract PDS hostname from the API URL
          const pdsHostname = postData.apiUrl ? new URL(postData.apiUrl || 'https://bsky.social').hostname : 'bsky.social';
          const likedPost = {...postData.data, pdsEndpoint: pdsHostname};

          // Fetch the liked post author profile
          let likedAuthorInfo = null;
          const postAuthorDid = getAuthorDidFromUri(subjectUri);
          if (postAuthorDid) {
            const likedAuthorProfileData = await fetchProfileData(postAuthorDid);
            if (likedAuthorProfileData) {
              likedAuthorInfo = extractProfileInfo(likedAuthorProfileData);
            }
          }

          // Fetch the liker profile
          let likerInfo = null;
          if (likerDid) {
            const likerProfileData = await fetchProfileData(likerDid);
            if (likerProfileData) {
              likerInfo = extractProfileInfo(likerProfileData);
            }
          }

          return {
            likedPost,
            likedAuthorInfo,
            likerInfo
          };
        })());
      } catch (err) {
        const errorInfo = handleError(err, 'LikeView.fetchLikeData');
        // The error is already logged by handleError
      }
    };

    fetchLikeData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likeValue.subject.uri, likerDid, execute]);

  return (
    <>
      <TabsContainer 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={(tabId) => setActiveTab(tabId as 'info' | 'raw')}
        rightContent={
          canDeveloperEdit ? (
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600 transition-colors"
            >
              Edit Record
            </button>
          ) : undefined
        }
      >
        {activeTab === 'info' && (
          <div className="space-y-6">
            {isLoading && (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading like information...</div>
              </div>
            )}
            
            {error && (
              <div className="text-center py-8">
                <div className="text-red-500">
                  {getUserFriendlyMessage({ 
                    message: error, 
                    timestamp: new Date() 
                  })}
                </div>
              </div>
            )}
            
            {!isLoading && !error && likeData && (
              <>
                {/* Like header */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl" role="img" aria-label="like">❤️</span>
                    <div className="flex items-center space-x-2">
                      {likeData.likerInfo && (
                        <UserAvatar 
                          avatar={likeData.likerInfo.avatar} 
                          handle={likeData.likerInfo.handle} 
                          size="sm"
                        />
                      )}
                      <div>
                        <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                          {likeData.likerInfo ? (
                            <>
                              <span className="font-semibold">{likeData.likerInfo.displayName}</span>
                              <span className="text-gray-500 ml-1">@{likeData.likerInfo.handle}</span>
                            </>
                          ) : (
                            'Someone'
                          )} liked this post
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(likeValue.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Liked post */}
                {likeData.likedPost && (
                  <div className="border-2 border-red-400 dark:border-red-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-md">
                    <PostCard 
                      post={{...likeData.likedPost, service: likeData.likedPost?.pdsEndpoint || 'bsky.social'}} 
                      authorInfo={likeData.likedAuthorInfo}
                      profileCache={profileCache}
                      onProfileCached={onProfileCached}
                      getOrCreateProfileRequest={getOrCreateProfileRequest}
                      postCache={postCache}
                      onPostCached={onPostCached}
                      getOrCreatePostRequest={getOrCreatePostRequest}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {activeTab === 'raw' && (
          <JsonViewer data={data.data} />
        )}
      </TabsContainer>
      
      {/* Edit Record Modal */}
      {showEditModal && (
        <RecordEditor
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          recordData={like}
          recordUri={data.uri}
          onRecordUpdated={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
} 
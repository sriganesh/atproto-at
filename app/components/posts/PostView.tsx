import React, { useState, useEffect } from 'react';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import PostCard from './PostCard';
import { useLoadingOnly } from '../../hooks/useLoadingState';
import { getAuthorDidFromUri } from '@/lib/utils/atproto';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '../../hooks/useAuthenticatedRequest';
import RecordEditor from '../records/RecordEditor';

type PostViewProps = {
  data: any;
  activeTab: 'info' | 'raw';
  setActiveTab: (tab: 'info' | 'raw') => void;
  // Cache props to prevent duplicate requests
  profileCache?: Map<string, any>;
  onProfileCached?: (did: string, profileData: any) => void;
  getOrCreateProfileRequest?: (did: string, requestFn: () => Promise<any>) => Promise<any>;
  postCache?: Map<string, any>;
  onPostCached?: (postUri: string, postData: any) => void;
  getOrCreatePostRequest?: (postUri: string, requestFn: () => Promise<any>) => Promise<any>;
};

export default function PostView({ 
  data, 
  activeTab, 
  setActiveTab,
  profileCache,
  onProfileCached,
  getOrCreateProfileRequest,
  postCache,
  onPostCached,
  getOrCreatePostRequest
}: PostViewProps) {
  const [parentPost, setParentPost] = useState<any>(null);
  const [rootPost, setRootPost] = useState<any>(null);
  const { isLoading: isLoadingContext, execute: executeContext } = useLoadingOnly();
  const [authorInfo, setAuthorInfo] = useState<any>(null);
  const [parentAuthorInfo, setParentAuthorInfo] = useState<any>(null);
  const [rootAuthorInfo, setRootAuthorInfo] = useState<any>(null);
  
  // Auth hooks for edit/delete functionality
  const { session } = useAuth();
  const { isReadOnly, isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  const [showEditModal, setShowEditModal] = useState(false);
  
  const tabs = [
    { id: 'info', label: 'Post Content' },
    { id: 'raw', label: 'Raw Data' }
  ];
  
  // Extract owner DID from URI
  const recordUri = data.uri;
  const ownerDid = recordUri.replace('at://', '').split('/')[0];
  const isOwner = session?.did === ownerDid;
  const canDeveloperEdit = isDeveloperMode && !isReadOnly && isOwner && !!session;
  
  // Extract post data
  const post = data.data;
  const postValue = post.value;
  const isReply = !!postValue?.reply;
  
  
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
        
        // Additional validation to ensure we have usable data
        if (!result.data) {
          return null;
        }
        
        // Make sure avatarUrl is passed through if available
        if (result.data.avatarUrl && !result.avatarUrl) {
          result.avatarUrl = result.data.avatarUrl;
        }
        
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
  
  // Load author profile for this post
  useEffect(() => {
    const fetchAuthorProfile = async () => {
      const authorDid = getAuthorDidFromUri(data.uri);
      
      if (authorDid) {
        const profileData = await fetchProfileData(authorDid);
        
        // Extract profile information
        if (profileData) {
          const info = extractProfileInfo(profileData);
          setAuthorInfo(info);
        }
      }
    };
    
    fetchAuthorProfile();
  }, [data.uri]);
  
  // Fetch post data with caching
  const fetchPostData = async (postUri: string) => {
    // Check cache first
    if (postCache?.has(postUri)) {
      const cachedPost = postCache.get(postUri);
      return cachedPost;
    }

    // Use request deduplication if available
    if (getOrCreatePostRequest) {
      const postData = await getOrCreatePostRequest(postUri, async () => {
        const cleanUri = postUri.replace(/^at:\/\//i, '');
        const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch post: ${response.status}`);
        }
        
        const data = await response.json();
        return data.data;
      });
      
      // Cache the result
      if (onPostCached && postData) {
        onPostCached(postUri, postData);
      }
      
      return postData;
    }

    // Direct fetch as fallback
    const cleanUri = postUri.replace(/^at:\/\//i, '');
    const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
    
    if (response.ok) {
      const data = await response.json();
      return data.data;
    }
    
    return null;
  };

  // Load parent and root posts if this is a reply
  useEffect(() => {
    const fetchReplyContext = async () => {
      if (!isReply) return;
      
      try {
        await executeContext(async () => {
          // Get parent post URI and author
          const parentUri = postValue.reply.parent?.uri;
          if (parentUri) {
            const parentData = await fetchPostData(parentUri);
            if (parentData) {
              setParentPost(parentData);
              
              // Get parent author profile
              const parentAuthorDid = getAuthorDidFromUri(parentUri);
              if (parentAuthorDid) {
                const parentProfileData = await fetchProfileData(parentAuthorDid);
                if (parentProfileData) {
                  setParentAuthorInfo(extractProfileInfo(parentProfileData));
                }
              }
            }
          }
          
          // Get root post if different from parent
          const rootUri = postValue.reply.root?.uri;
          if (rootUri && rootUri !== parentUri) {
            const rootData = await fetchPostData(rootUri);
            if (rootData) {
              setRootPost(rootData);
              
              // Get root author profile
              const rootAuthorDid = getAuthorDidFromUri(rootUri);
              if (rootAuthorDid) {
                const rootProfileData = await fetchProfileData(rootAuthorDid);
                if (rootProfileData) {
                  setRootAuthorInfo(extractProfileInfo(rootProfileData));
                }
              }
            }
          }
        });
      } catch (error) {
        console.error('Failed to fetch reply context:', error);
      }
    };
    
    fetchReplyContext();
  }, [postValue, isReply, executeContext]);
  
  return (
    <>
      <TabsContainer 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={(tab) => setActiveTab(tab as 'info' | 'raw')}
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
        <div style={{ display: activeTab === 'info' ? 'block' : 'none' }}>
          <div className="space-y-4">
            {/* Show contextual thread if available */}
            {isLoadingContext && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-center text-sm text-gray-500">
                Loading thread context...
              </div>
            )}
            
            {/* Root post (if available and different from parent) */}
            {rootPost && rootPost !== parentPost && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 mb-3">
                <PostCard 
                  post={{...rootPost, service: rootPost?.pdsEndpoint || 'bsky.social'}} 
                  authorInfo={rootAuthorInfo}
                  profileCache={profileCache}
                  onProfileCached={onProfileCached}
                  getOrCreateProfileRequest={getOrCreateProfileRequest}
                  postCache={postCache}
                  onPostCached={onPostCached}
                  getOrCreatePostRequest={getOrCreatePostRequest}
                />
              </div>
            )}
            
            {/* Parent post (if available) */}
            {parentPost && (
              <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 mb-3 ${rootPost && rootPost !== parentPost ? "ml-4" : ""}`}>
                <PostCard 
                  post={{...parentPost, service: parentPost?.pdsEndpoint || 'bsky.social'}} 
                  authorInfo={parentAuthorInfo}
                  profileCache={profileCache}
                  onProfileCached={onProfileCached}
                  getOrCreateProfileRequest={getOrCreateProfileRequest}
                  postCache={postCache}
                  onPostCached={onPostCached}
                  getOrCreatePostRequest={getOrCreatePostRequest}
                />
              </div>
            )}
            
            {/* Main post */}
            <div className={`border-2 border-blue-400 dark:border-blue-600 rounded-lg overflow-hidden bg-blue-50 dark:bg-blue-950 shadow-md ${isReply ? (parentPost ? "ml-8" : "ml-4") : ""}`}>
              <PostCard 
                post={{...post, service: data.apiUrl ? new URL(data.apiUrl).hostname : 'bsky.social'}} 
                authorInfo={authorInfo} 
                isReply={isReply}
                profileCache={profileCache}
                onProfileCached={onProfileCached}
                getOrCreateProfileRequest={getOrCreateProfileRequest}
                postCache={postCache}
                onPostCached={onPostCached}
                getOrCreatePostRequest={getOrCreatePostRequest}
              />
            </div>
          </div>
        </div>
        
        <div style={{ display: activeTab === 'raw' ? 'block' : 'none' }}>
          <JsonViewer data={data.data} uri={recordUri} />
        </div>
      </TabsContainer>
      
      {/* Edit Record Modal */}
      {showEditModal && (
        <RecordEditor
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          recordData={post}
          recordUri={recordUri}
          onRecordUpdated={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
} 
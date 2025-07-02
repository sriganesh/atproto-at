import React, { useState, useEffect } from 'react';
import PostCard from '../posts/PostCard';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';
import { useViewerCacheContext } from '../viewer/context/ViewerCacheContext';
import { createMinimalProfileInfo } from '../../../lib/utils/profile';
import BaseCollectionItem from './BaseCollectionItem';
import { useAuthorProfile } from '../../hooks/useAuthorProfile';
import { getAuthorDidFromUri } from '@/lib/utils/atproto';

type ProfileInfo = {
  handle: string;
  displayName?: string;
  avatar?: string;
};

type LikedPostItemProps = {
  likeRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      subject: {
        uri: string;
        cid: string;
      };
      createdAt?: string;
      [key: string]: any;
    };
  };
};

export default function LikedPostItem({ 
  likeRecord
}: LikedPostItemProps) {
  // Use cache context instead of props
  const {
    profileCache,
    postCache,
    handleProfileCached: onProfileCached,
    handlePostCached: onPostCached,
    getOrCreateProfileRequest,
    getOrCreatePostRequest
  } = useViewerCacheContext();
  const [likedPost, setLikedPost] = useState<any>(null);
  const [authorInfo, setAuthorInfo] = useState<ProfileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to fetch profile data
  const fetchProfileData = async (did: string) => {
    try {
      // First try to fetch the actual profile record which includes avatar
      const profileRecordResponse = await fetch(`/api/atproto?uri=${encodeURIComponent(`${did}/app.bsky.actor.profile/self`)}`);
      if (profileRecordResponse.ok) {
        const profileRecordData = await profileRecordResponse.json();
        if (profileRecordData.data?.value?.$type === 'app.bsky.actor.profile') {
          // We got the profile record, return it
          return profileRecordData;
        }
      }
      
      // Fallback to basic profile fetch if the profile record doesn't exist
      const response = await fetch(`/api/atproto?uri=${encodeURIComponent(did)}`);
      if (!response.ok) {
        console.error(`Failed to fetch profile for ${did}: ${response.status}`);
        return null;
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching profile for ${did}:`, error);
      return null;
    }
  };

  // Helper function to extract profile info
  const extractProfileInfo = (profileResponse: any, did: string): ProfileInfo => {
    if (!profileResponse || !profileResponse.data) {
      return createMinimalProfileInfo(did);
    }
    
    const profileData = profileResponse.data;
    
    // Profile data structure can vary based on the API response
    let handle = '';
    let displayName = '';
    let avatar = undefined;
    
    // Check for pre-processed avatarUrl at the top level first
    if (profileData.avatarUrl) {
      avatar = profileData.avatarUrl;
    }
    
    // Handle profile inside value property (from profile record)
    if (profileData.value && profileData.value.$type === 'app.bsky.actor.profile') {
      const profile = profileData.value;
      handle = profileData.handle || ''; // Handle might be at root level
      displayName = profile.displayName || '';
      
      // Construct avatar URL from blob reference if we don't have avatarUrl
      if (!avatar && profile.avatar && profile.avatar.ref && profile.avatar.ref.$link) {
        avatar = `https://cdn.bsky.app/img/avatar/plain/${did}/${profile.avatar.ref.$link}@jpeg`;
      }
    }
    // Handle direct profile properties (from profile endpoint)
    else if (profileData.handle) {
      handle = profileData.handle;
      displayName = profileData.displayName || '';
      
      // Handle avatar - could be a direct URL or a blob reference
      if (!avatar && profileData.avatar) {
        if (typeof profileData.avatar === 'string') {
          avatar = profileData.avatar;
        } else if (profileData.avatar.ref && profileData.avatar.ref.$link) {
          avatar = `https://cdn.bsky.app/img/avatar/plain/${did}/${profileData.avatar.ref.$link}@jpeg`;
        }
      }
    }
    // Handle profile inside profile property
    else if (profileData.profile) {
      const profile = profileData.profile;
      handle = profile.handle || profileData.handle || '';
      displayName = profile.displayName || '';
      
      if (!avatar && profile.avatar) {
        // Could be a direct URL or a ref
        if (typeof profile.avatar === 'string') {
          avatar = profile.avatar;
        } else if (profile.avatar.ref && profile.avatar.ref.$link) {
          avatar = `https://cdn.bsky.app/img/avatar/plain/${did}/${profile.avatar.ref.$link}@jpeg`;
        }
      }
    }
    // Handle profile data from repo info
    else if (profileData.repoInfo) {
      handle = profileData.repoInfo.handle || '';
      displayName = profileData.repoInfo.displayName || profileData.repoInfo.handle || '';
    }
    
    // Fallback to DID if no handle found
    if (!handle) {
      handle = did.substring(0, 10) + '...';
    }
    
    const result = {
      handle: handle,
      displayName: displayName || handle,
      avatar: avatar
    };
    return result;
  };

  // Fetch the liked post content
  useEffect(() => {
    // Skip if we already have the data
    if (likedPost && authorInfo) {
      setIsLoading(false);
      return;
    }

    const fetchLikedPost = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const subjectUri = likeRecord.value.subject.uri;
        if (!subjectUri) {
          throw new Error('Missing subject URI');
        }

        // Fetch the liked post with caching
        // Check cache first
        const cachedPost = postCache?.get(subjectUri);
        if (cachedPost) {
          setLikedPost(cachedPost);
          // Still need to fetch author info
        } else {
                    
          // Use request deduplication if available
          if (getOrCreatePostRequest) {
                        const postData = await getOrCreatePostRequest(subjectUri, async () => {
              const cleanUri = subjectUri.replace(/^at:\/\//i, '');
              const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
              
              if (!response.ok) {
                throw new Error(`Failed to fetch liked post: ${response.status}`);
              }
              
              const data = await response.json();
              // Extract PDS hostname from the API URL
              const pdsHostname = data.apiUrl ? new URL(data.apiUrl).hostname : 'bsky.social';
              
              // Handle the response based on type
              if (data.type === 'record' && data.data) {
                // If it's a record response, use the data directly
                return {
                  ...data.data,
                  uri: data.uri || subjectUri,
                  cid: data.data.cid,
                  value: data.data.value,
                  pdsEndpoint: pdsHostname
                };
              } else {
                // Fallback for other response types
                return {...data.data, pdsEndpoint: pdsHostname};
              }
            });
            
            if (postData) {
              setLikedPost(postData);
            }
            
            // Cache the result
            if (onPostCached) {
                            onPostCached(subjectUri, postData);
            }
          } else {
            // Fallback to direct fetch if no deduplication helper
                        const cleanUri = subjectUri.replace(/^at:\/\//i, '');
            const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch liked post: ${response.status}`);
            }
            
            const data = await response.json();
            // Extract PDS hostname from the API URL
            const pdsHostname = data.apiUrl ? new URL(data.apiUrl).hostname : 'bsky.social';
            
            // Handle the response based on type
            let postData;
            if (data.type === 'record' && data.data) {
              // If it's a record response, use the data directly
              postData = {
                ...data.data,
                uri: data.uri || subjectUri,
                cid: data.data.cid,
                value: data.data.value,
                pdsEndpoint: pdsHostname
              };
            } else {
              // Fallback for other response types
              postData = {...data.data, pdsEndpoint: pdsHostname};
            }
            setLikedPost(postData);
            
            if (onPostCached) {
                            onPostCached(subjectUri, postData);
            }
          }
        }

        // Fetch the author profile with caching
        const postAuthorDid = getAuthorDidFromUri(subjectUri);
        if (postAuthorDid && !authorInfo) {
          // Check cache first
          const cachedProfile = profileCache?.get(postAuthorDid);
          if (cachedProfile) {
            const profileInfo = extractProfileInfo(cachedProfile, postAuthorDid);
            setAuthorInfo(profileInfo);
          } else {
                        
            // Use request deduplication if available
            if (getOrCreateProfileRequest) {
                            const profileData = await getOrCreateProfileRequest(postAuthorDid, async () => {
                return await fetchProfileData(postAuthorDid);
              });
              
              if (profileData) {
                const profileInfo = extractProfileInfo(profileData, postAuthorDid);
                                setAuthorInfo(profileInfo);
              }
              
              // Cache the result only if successful
              if (onProfileCached && profileData) {
                                onProfileCached(postAuthorDid, profileData);
              }
            } else {
              // Fallback to direct fetch if no deduplication helper
                            const profileData = await fetchProfileData(postAuthorDid);
              if (profileData) {
                const profileInfo = extractProfileInfo(profileData, postAuthorDid);
                                setAuthorInfo(profileInfo);
                
                if (onProfileCached && profileData) {
                                    onProfileCached(postAuthorDid, profileData);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching liked post:', err);
        setError(err instanceof Error ? err.message : 'Failed to load liked post');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLikedPost();
  }, [likeRecord.uri, likeRecord.value.subject.uri]);

  const renderContent = () => {
    if (!likedPost) return null;
    
    return (
      <PostCard 
        post={{...likedPost, service: likedPost?.pdsEndpoint || 'bsky.social'}} 
        authorInfo={authorInfo} 
        isQuote={true} 
        hideLinks={true}
        profileCache={profileCache}
        onProfileCached={onProfileCached}
        getOrCreateProfileRequest={getOrCreateProfileRequest}
        postCache={postCache}
        onPostCached={onPostCached}
        getOrCreatePostRequest={getOrCreatePostRequest}
      />
    );
  };

  return (
    <BaseCollectionItem
      record={likeRecord}
      theme={RECORD_THEMES.like}
      loadingText="Loading liked post..."
      errorText="Unable to load liked post content"
      isLoading={isLoading}
      error={error}
      renderContent={renderContent}
    />
  );
} 
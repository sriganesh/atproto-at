import React, { useState, useEffect } from 'react';
import PostCard from '../posts/PostCard';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';
import { useViewerCacheContext } from '../viewer/context/ViewerCacheContext';
import { fetchProfileData, extractProfileInfo, type ProfileInfo } from '../../../lib/utils/profile';
import BaseCollectionItem from './BaseCollectionItem';
import { getAuthorDidFromUri } from '@/lib/utils/atproto';

type RepostedItemProps = {
  repostRecord: {
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

export default function RepostedItem({ 
  repostRecord
}: RepostedItemProps) {
  // Use cache context instead of props
  const {
    profileCache,
    postCache,
    handleProfileCached: onProfileCached,
    handlePostCached: onPostCached,
    getOrCreateProfileRequest,
    getOrCreatePostRequest
  } = useViewerCacheContext();
  const [repostedPost, setRepostedPost] = useState<any>(null);
  const [authorInfo, setAuthorInfo] = useState<ProfileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the reposted post content
  useEffect(() => {
    const fetchRepostedPost = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const subjectUri = repostRecord.value.subject.uri;
        if (!subjectUri) {
          throw new Error('Missing subject URI');
        }

        // Fetch the reposted post with caching
        // Check cache first
        if (postCache?.has(subjectUri)) {
          const cachedPost = postCache.get(subjectUri);
                    if (cachedPost) {
            setRepostedPost(cachedPost);
          }
        } else {
                    
          // Use request deduplication if available
          if (getOrCreatePostRequest) {
                        const postData = await getOrCreatePostRequest(subjectUri, async () => {
              const cleanUri = subjectUri.replace(/^at:\/\//i, '');
              const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
              
              if (!response.ok) {
                throw new Error(`Failed to fetch reposted post: ${response.status}`);
              }
              
              const data = await response.json();
              // Extract PDS hostname from the API URL
              const pdsHostname = data.apiUrl ? new URL(data.apiUrl).hostname : 'bsky.social';
              return {...data.data, pdsEndpoint: pdsHostname};
            });
            
            if (postData) {
              setRepostedPost(postData);
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
              throw new Error(`Failed to fetch reposted post: ${response.status}`);
            }
            
            const data = await response.json();
            // Extract PDS hostname from the API URL
            const pdsHostname = data.apiUrl ? new URL(data.apiUrl).hostname : 'bsky.social';
            const postData = {...data.data, pdsEndpoint: pdsHostname};
            setRepostedPost(postData);
            
            if (onPostCached) {
                            onPostCached(subjectUri, postData);
            }
          }
        }

        // Fetch the author profile with caching
        const postAuthorDid = getAuthorDidFromUri(subjectUri);
        if (postAuthorDid) {
          // Check cache first
          if (profileCache?.has(postAuthorDid)) {
            const cachedProfile = profileCache.get(postAuthorDid);
                        if (cachedProfile) {
              const profileInfo = extractProfileInfo(cachedProfile, postAuthorDid);
              setAuthorInfo(profileInfo);
            }
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
              
              // Cache the result
              if (onProfileCached) {
                                onProfileCached(postAuthorDid, profileData);
              }
            } else {
              // Fallback to direct fetch if no deduplication helper
                            const profileData = await fetchProfileData(postAuthorDid);
              if (profileData) {
                const profileInfo = extractProfileInfo(profileData, postAuthorDid);
                                setAuthorInfo(profileInfo);
                
                if (onProfileCached) {
                                    onProfileCached(postAuthorDid, profileData);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching reposted post:', err);
        setError(err instanceof Error ? err.message : 'Failed to load reposted post');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepostedPost();
  }, [repostRecord, getOrCreateProfileRequest, getOrCreatePostRequest]);

  const renderContent = () => {
    if (!repostedPost) return null;
    
    return (
      <PostCard 
        post={{...repostedPost, service: repostedPost?.pdsEndpoint || 'bsky.social'}} 
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
      record={repostRecord}
      theme={RECORD_THEMES.repost}
      loadingText="Loading reposted post..."
      errorText="Unable to load reposted post content"
      isLoading={isLoading}
      error={error}
      renderContent={renderContent}
    />
  );
} 
import React, { useState, useEffect } from 'react';
import UserAvatar from '../profiles/UserAvatar';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';
import { useViewerCacheContext } from '../viewer/context/ViewerCacheContext';
import { fetchProfileData, extractProfileInfo, createMinimalProfileInfo, type ProfileInfo } from '../../../lib/utils/profile';
import BaseCollectionItem from './BaseCollectionItem';

type FollowedUserItemProps = {
  followRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      subject: string; // DID of the followed user
      createdAt?: string;
      [key: string]: any;
    };
  };
};

export default function FollowedUserItem({ 
  followRecord
}: FollowedUserItemProps) {
  // Use cache context instead of props
  const { profileCache, handleProfileCached: onProfileCached, getOrCreateProfileRequest } = useViewerCacheContext();
  const [followedUserProfile, setFollowedUserProfile] = useState<ProfileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the followed user's profile
  useEffect(() => {
    const fetchFollowedUser = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const subjectDid = followRecord.value.subject;
        if (!subjectDid) {
          throw new Error('Missing subject DID');
        }

        // Fetch the followed user's profile with caching
        // Check cache first
        if (profileCache?.has(subjectDid)) {
          const cachedProfile = profileCache.get(subjectDid);
          if (cachedProfile) {
            const profileInfo = extractProfileInfo(cachedProfile, subjectDid);
            setFollowedUserProfile(profileInfo);
          }
        } else {
          // Use request deduplication if available
          if (getOrCreateProfileRequest) {
            const profileData = await getOrCreateProfileRequest(subjectDid, async () => {
              return await fetchProfileData(subjectDid);
            });
            
            if (profileData) {
              const profileInfo = extractProfileInfo(profileData, subjectDid);
              setFollowedUserProfile(profileInfo);
            } else {
              // If we can't fetch the profile, still show the DID
              setFollowedUserProfile(createMinimalProfileInfo(subjectDid));
            }
            
            // Cache the result
            if (onProfileCached) {
              onProfileCached(subjectDid, profileData);
            }
          } else {
            // Fallback to direct fetch if no deduplication helper
            const profileData = await fetchProfileData(subjectDid);
            if (profileData) {
              const profileInfo = extractProfileInfo(profileData, subjectDid);
              setFollowedUserProfile(profileInfo);
            } else {
              // If we can't fetch the profile, still show the DID
              setFollowedUserProfile(createMinimalProfileInfo(subjectDid));
            }
            
            if (onProfileCached) {
              onProfileCached(subjectDid, profileData);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching followed user:', err);
        setError(err instanceof Error ? err.message : 'Failed to load followed user');
        
        // Show minimal info even on error
        setFollowedUserProfile(createMinimalProfileInfo(followRecord.value.subject));
      } finally {
        setIsLoading(false);
      }
    };

    fetchFollowedUser();
  }, [followRecord, getOrCreateProfileRequest]);

  const renderContent = () => {
    if (!followedUserProfile) return null;
    
    return (
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <UserAvatar 
              avatar={followedUserProfile.avatar} 
              handle={followedUserProfile.handle} 
              size="md"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {followedUserProfile.displayName}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                @{followedUserProfile.handle}
              </p>
              <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                {followedUserProfile.did}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseCollectionItem
      record={followRecord}
      theme={RECORD_THEMES.follow}
      loadingText="Loading followed user..."
      errorText="Unable to load followed user information"
      isLoading={isLoading}
      error={error}
      renderContent={renderContent}
    />
  );
}
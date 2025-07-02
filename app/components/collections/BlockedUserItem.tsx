import React, { useState, useEffect } from 'react';
import UserAvatar from '../profiles/UserAvatar';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';
import { useViewerCacheContext } from '../viewer/context/ViewerCacheContext';
import { fetchProfileData, extractProfileInfo, createMinimalProfileInfo, type ProfileInfo } from '../../../lib/utils/profile';
import BaseCollectionItem from './BaseCollectionItem';

type BlockedUserItemProps = {
  blockRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      subject: string; // DID of the blocked user
      createdAt?: string;
      [key: string]: any;
    };
  };
};

export default function BlockedUserItem({ 
  blockRecord
}: BlockedUserItemProps) {
  // Use cache context instead of props
  const { profileCache, handleProfileCached: onProfileCached, getOrCreateProfileRequest } = useViewerCacheContext();
  const [blockedUserProfile, setBlockedUserProfile] = useState<ProfileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the blocked user's profile
  useEffect(() => {
    const fetchBlockedUser = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const subjectDid = blockRecord.value.subject;
        if (!subjectDid) {
          throw new Error('Missing subject DID');
        }

        // Fetch the blocked user's profile with caching
        // Check cache first
        if (profileCache?.has(subjectDid)) {
          const cachedProfile = profileCache.get(subjectDid);
          if (cachedProfile) {
            const profileInfo = extractProfileInfo(cachedProfile, subjectDid);
            setBlockedUserProfile(profileInfo);
          }
        } else {
          // Use request deduplication if available
          if (getOrCreateProfileRequest) {
            const profileData = await getOrCreateProfileRequest(subjectDid, async () => {
              return await fetchProfileData(subjectDid);
            });
            
            if (profileData) {
              const profileInfo = extractProfileInfo(profileData, subjectDid);
              setBlockedUserProfile(profileInfo);
            } else {
              // If we can't fetch the profile, still show the DID
              setBlockedUserProfile(createMinimalProfileInfo(subjectDid));
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
              setBlockedUserProfile(profileInfo);
            } else {
              // If we can't fetch the profile, still show the DID
              setBlockedUserProfile(createMinimalProfileInfo(subjectDid));
            }
            
            if (onProfileCached) {
              onProfileCached(subjectDid, profileData);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching blocked user:', err);
        setError(err instanceof Error ? err.message : 'Failed to load blocked user');
        
        // Show minimal info even on error
        setBlockedUserProfile(createMinimalProfileInfo(blockRecord.value.subject));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockedUser();
  }, [blockRecord, getOrCreateProfileRequest]);

  const renderContent = () => {
    if (!blockedUserProfile) return null;
    
    return (
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <UserAvatar 
              avatar={blockedUserProfile.avatar} 
              handle={blockedUserProfile.handle} 
              size="md"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {blockedUserProfile.displayName}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                @{blockedUserProfile.handle}
              </p>
              <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                {blockedUserProfile.did}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseCollectionItem
      record={blockRecord}
      theme={RECORD_THEMES.block}
      loadingText="Loading blocked user..."
      errorText="Unable to load blocked user information"
      isLoading={isLoading}
      error={error}
      renderContent={renderContent}
    />
  );
}
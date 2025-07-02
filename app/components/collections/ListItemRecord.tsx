import React, { useState, useEffect } from 'react';
import UserAvatar from '../profiles/UserAvatar';
import { resolveDid, fetchRecord } from '@/lib/edge-atproto';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';
import { useViewerCacheContext } from '../viewer/context/ViewerCacheContext';
import { fetchProfileData, extractProfileInfo, type ProfileInfo } from '../../../lib/utils/profile';
import BaseCollectionItem from './BaseCollectionItem';

type ListItemRecordProps = {
  listItemRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      subject: string; // DID of the user in the list
      list: string; // AT-URI of the list
      createdAt?: string;
      [key: string]: any;
    };
  };
};

export default function ListItemRecord({ 
  listItemRecord
}: ListItemRecordProps) {
  // Use cache context instead of props
  const {
    profileCache,
    listCache,
    handleProfileCached: onProfileCached,
    handleListCached: onListCached,
    getOrCreateProfileRequest,
    getOrCreateListRequest
  } = useViewerCacheContext();
  const [subjectProfile, setSubjectProfile] = useState<any>(null);
  const [listInfo, setListInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  // Load the subject profile and list information with caching
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        const subjectDid = listItemRecord.value.subject;
        const listUri = listItemRecord.value.list;
        
                        
        // Check cache for profile first
        if (profileCache?.has(subjectDid)) {
          const cachedProfile = profileCache.get(subjectDid);
                    setSubjectProfile(cachedProfile);
        } else {
                    
          // Use request deduplication if available
          if (getOrCreateProfileRequest) {
                        const profileResult = await getOrCreateProfileRequest(subjectDid, async () => {
              return await fetchProfileData(subjectDid);
            });
            
            setSubjectProfile(profileResult);
            // Cache the result
            if (onProfileCached) {
                            onProfileCached(subjectDid, profileResult);
            }
          } else {
                        // Fallback to direct fetch if no deduplication helper
            const profileData = await fetchProfileData(subjectDid);
            setSubjectProfile(profileData);
            if (onProfileCached) {
              onProfileCached(subjectDid, profileData);
            }
          }
        }
        
                        
        // Check cache for list first
        if (listCache?.has(listUri)) {
          const cachedList = listCache.get(listUri);
                    setListInfo(cachedList);
        } else {
                    
          // Use request deduplication if available
          if (getOrCreateListRequest) {
                        const listResult = await getOrCreateListRequest(listUri, async () => {
              if (listUri) {
                const listUriParts = listUri.replace('at://', '').split('/');
                
                if (listUriParts.length >= 3) {
                  const listDid = listUriParts[0];
                  const listCollection = listUriParts[1];
                  const listRkey = listUriParts[2];
                  
                  const listPds = await resolveDid(listDid);
                  
                  if (listPds) {
                    const result = await fetchRecord(listPds, listDid, listCollection, listRkey);
                    if (result.success) {
                      return result.data;
                    } else {
                      return null; // Cache failures as null
                    }
                  }
                }
              }
              return null;
            });
            
            setListInfo(listResult);
            // Cache the result
            if (onListCached) {
                            onListCached(listUri, listResult);
            }
          } else {
                        // Fallback to direct fetch if no deduplication helper
            if (listUri) {
              const listUriParts = listUri.replace('at://', '').split('/');
              
              if (listUriParts.length >= 3) {
                const listDid = listUriParts[0];
                const listCollection = listUriParts[1];
                const listRkey = listUriParts[2];
                
                const listPds = await resolveDid(listDid);
                
                if (listPds) {
                  const listResult = await fetchRecord(listPds, listDid, listCollection, listRkey);
                  if (listResult.success) {
                    setListInfo(listResult.data);
                    if (onListCached) {
                                            onListCached(listUri, listResult.data);
                    }
                  } else {
                    setListInfo(null);
                    if (onListCached) {
                                            onListCached(listUri, null);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching list item data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load list item data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [listItemRecord.uri, getOrCreateProfileRequest, getOrCreateListRequest]);

  // Extract basic info from the listitem record
  const listUri = listItemRecord.value.list;
  
  // Extract list rkey from the list URI for display
  const listUriParts = listUri.replace('at://', '').split('/');
  const listRkey = listUriParts[listUriParts.length - 1];

  const subjectDid = listItemRecord.value.subject;
  const profile = subjectProfile ? extractProfileInfo(subjectProfile, subjectDid) : null;

  const renderContent = () => {
    return (
      <div className="p-4">
        <div className="flex items-center space-x-3">
          {/* User avatar */}
          <div className="flex-shrink-0">
            <UserAvatar 
              avatar={profile?.avatar} 
              handle={profile?.handle || 'unknown'} 
              size="sm"
            />
          </div>
          
          {/* Horizontal layout with descriptive text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {profile?.displayName || 'Unknown User'}
              </span>
              <span className="text-gray-500">was added to</span>
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {listInfo ? (listInfo.value?.name || 'Untitled List') : `List ${listRkey}`}
              </span>
              {!listInfo && (
                <span className="text-xs text-gray-400">
                  (List may no longer exist)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseCollectionItem
      record={listItemRecord}
      theme={{
        icon: '➕',
        ...RECORD_THEMES.listitem
      }}
      loadingText="Loading user and list information..."
      errorText="Unable to load list item data"
      isLoading={isLoading}
      error={error}
      renderContent={renderContent}
    />
  );
} 
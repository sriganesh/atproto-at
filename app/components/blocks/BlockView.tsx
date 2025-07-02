import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import UserAvatar from '../profiles/UserAvatar';
import { getAuthorDidFromUri } from '@/lib/utils/atproto';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '../../hooks/useAuthenticatedRequest';
import RecordEditor from '../records/RecordEditor';

type BlockViewProps = {
  data: any;
  activeTab: 'info' | 'raw';
  setActiveTab: (tab: 'info' | 'raw') => void;
};

export default function BlockView({ data, activeTab, setActiveTab }: BlockViewProps) {
  const [blockedUserProfile, setBlockedUserProfile] = useState<any>(null);
  const [blockerInfo, setBlockerInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { session } = useAuth();
  const { isReadOnly, isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  
  // Check if user owns this block and can edit/delete it
  const ownerDid = getAuthorDidFromUri(data.uri);
  const isOwner = session?.did === ownerDid;
  const canDeveloperEdit = isDeveloperMode && !isReadOnly && isOwner && !!session;
  
  const tabs = [
    { id: 'info', label: 'Block Information' },
    { id: 'raw', label: 'Raw Data' }
  ];
  
  // Handle delete record
  const handleDelete = async () => {
    if (!canDeveloperEdit || isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      await executeRequest(async (agent) => {
        // Extract collection and rkey from URI
        const uriParts = data.uri.replace('at://', '').split('/');
        const repo = uriParts[0];
        const collection = uriParts[1];
        const rkey = uriParts[2];
        
        await agent.com.atproto.repo.deleteRecord({
          repo,
          collection,
          rkey
        });
      });
      
      // Show a message about the delay
      const loadingToast = document.createElement('div');
      loadingToast.innerHTML = `
        <div class="text-center">
          <div class="font-medium">Block deleted successfully!</div>
          <div class="text-sm mt-1 opacity-90">Redirecting to collection...</div>
        </div>
      `;
      loadingToast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm';
      document.body.appendChild(loadingToast);
      
      // Redirect to collection after deletion
      setTimeout(() => {
        const collectionUri = data.uri.split('/').slice(0, -1).join('/');
        window.location.href = `/viewer?uri=${collectionUri}`;
      }, 2500);
    } catch (error) {
      console.error('Failed to delete block:', error);
      alert('Failed to delete block. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Extract block data
  const block = data.data;
  const blockValue = block.value;
  
  
  // Get blocker DID from the block record URI
  const blockerDid = getAuthorDidFromUri(data.uri);
  
  // Fetch profile data for a DID
  const fetchProfileData = async (did: string) => {
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
  const extractProfileInfo = (profileResponse: any, fallbackDid?: string) => {
    if (!profileResponse) {
      console.warn('No profile response to extract from');
      return { 
        handle: fallbackDid ? fallbackDid.substring(0, 10) + '...' : 'unknown',
        displayName: 'Unknown User',
        avatar: undefined,
        did: fallbackDid || 'unknown'
      };
    }
    
    // The actual profile data structure depends on where it's coming from
    const profileData = profileResponse.data || {};
    
    let displayName = '';
    let handle = '';
    let avatar = undefined;
    let authorDid = '';
    
    // Get the DID
    authorDid = profileData.did || getAuthorDidFromUri(profileResponse.uri || '') || fallbackDid || '';
    
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
      displayName: displayName || handle || 'Unknown User',
      handle: handle || 'unknown',
      avatar,
      did: authorDid
    };
  };

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
  
  // Load the blocked user and blocker profile information
  useEffect(() => {
    const fetchBlockData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch blocker profile
        if (blockerDid) {
          const blockerProfileData = await fetchProfileData(blockerDid);
          if (blockerProfileData) {
            setBlockerInfo(extractProfileInfo(blockerProfileData, blockerDid));
          }
        }
        
        // Fetch the blocked user profile
        const blockedUserDid = blockValue.subject;
        if (blockedUserDid) {
          const blockedUserProfileData = await fetchProfileData(blockedUserDid);
          if (blockedUserProfileData) {
            setBlockedUserProfile(extractProfileInfo(blockedUserProfileData, blockedUserDid));
          } else {
            // If we can't fetch the profile, still show the DID
            setBlockedUserProfile({
              displayName: 'Unknown User',
              handle: blockedUserDid.substring(0, 10) + '...',
              avatar: undefined,
              did: blockedUserDid
            });
          }
        }
      } catch (err) {
        console.error('Error fetching block data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load block data');
        
        // Show minimal info even on error
        if (blockValue.subject) {
          setBlockedUserProfile({
            displayName: 'Unknown User',
            handle: blockValue.subject.substring(0, 10) + '...',
            avatar: undefined,
            did: blockValue.subject
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBlockData();
  }, [data.uri, blockerDid, blockValue]);
  
  return (
    <>
      <TabsContainer 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={(tab) => setActiveTab(tab as 'info' | 'raw')}
        rightContent={
          canDeveloperEdit ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3 py-1 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600 transition-colors"
              >
                Edit Record
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Delete Record
              </button>
            </div>
          ) : undefined
        }
      >
        {activeTab === 'info' && (
          <div className="space-y-4">
            {isLoading && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-center text-sm text-gray-500">
                Loading block information...
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900 rounded-lg text-center text-sm text-red-500">
                {error}
              </div>
            )}
            
            {!isLoading && !error && (
              <>
                {/* Block header showing who blocked whom */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl" role="img" aria-label="block">🚫</span>
                    <div className="flex items-center space-x-2">
                      {blockerInfo && (
                        <UserAvatar 
                          avatar={blockerInfo.avatar} 
                          handle={blockerInfo.handle} 
                          size="sm"
                        />
                      )}
                      <div>
                        <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                          {blockerInfo ? (
                            <>
                              <span className="font-semibold">{blockerInfo.displayName}</span>
                              <span className="text-gray-500 ml-1">@{blockerInfo.handle}</span>
                            </>
                          ) : (
                            'Someone'
                          )} blocked this user
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(blockValue.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Blocked user information */}
                {blockedUserProfile && (
                  <div className="border-2 border-red-400 dark:border-red-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-md">
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
                          
                          <div className="mt-3 flex items-center gap-4 text-sm">
                            <a
                              href={`/viewer?uri=${blockedUserProfile.did}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline flex items-center gap-1"
                            >
                              atproto.at
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                            
                            <a
                              href={`https://bsky.app/profile/${blockedUserProfile.did}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline flex items-center gap-1"
                            >
                              🦋
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
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
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-3">Delete Block?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              This action cannot be undone. This block will be permanently deleted.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              URI: {data.uri}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Record Modal */}
      {showEditModal && (
        <RecordEditor
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          recordData={block}
          recordUri={data.uri}
          onRecordUpdated={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
} 
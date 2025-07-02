import React, { useState } from 'react';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import { useLoadingState } from '../../hooks/useLoadingState';
import { useErrorHandler, getUserFriendlyMessage } from '../../hooks/useErrorHandler';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '../../hooks/useAuthenticatedRequest';
import RecordEditor from '../records/RecordEditor';

type ListblockViewProps = {
  data: any;
  activeTab: 'info' | 'raw';
  setActiveTab: (tab: 'info' | 'raw') => void;
  profileCache?: Map<string, any>;
  onProfileCached?: (did: string, profileData: any) => void;
  getOrCreateProfileRequest?: (did: string, requestFn: () => Promise<any>) => Promise<any>;
};

export default function ListblockView({ 
  data, 
  activeTab, 
  setActiveTab,
  profileCache,
  onProfileCached,
  getOrCreateProfileRequest
}: ListblockViewProps) {
  const { data: listData, isLoading, error, execute } = useLoadingState<any>();
  const { handleError } = useErrorHandler();
  const [blockerHandle, setBlockerHandle] = React.useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { session } = useAuth();
  const { isReadOnly, isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  
  // Check if user owns this listblock and can edit/delete it
  const ownerDid = getBlockerDid();
  const isOwner = session?.did === ownerDid;
  const canDeveloperEdit = isDeveloperMode && !isReadOnly && isOwner && !!session;
  
  const tabs = [
    { id: 'info', label: 'List Block Information' },
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
          <div class="font-medium">List block deleted successfully!</div>
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
      console.error('Failed to delete list block:', error);
      alert('Failed to delete list block. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Extract listblock data
  const listblock = data.data;
  const listblockValue = listblock.value;
  
  // Get the blocker's DID from the URI - moved before usage
  function getBlockerDid() {
    const parts = data.uri.replace('at://', '').split('/');
    return parts[0];
  }
  
  // Get blocker's handle or DID for display
  const getBlockerHandle = () => {
    if (blockerHandle) {
      return blockerHandle;
    }
    return getBlockerDid();
  };
  
  // Format the date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch (err) {
      return '';
    }
  };

  // Extract creator DID from the blocked list URI
  const getCreatorDid = () => {
    if (!listblockValue.subject) return '';
    const parts = listblockValue.subject.replace('at://', '').split('/');
    return parts[0]; // The DID is the first part
  };

  // Extract rkey from the blocked list URI
  const getRkey = () => {
    if (!listblockValue.subject) return '';
    const parts = listblockValue.subject.split('/');
    return parts[parts.length - 1]; // The rkey is the last part
  };

  // Get creator handle from fetched list data
  const getCreatorHandle = () => {
    if (listData?.data?.creatorProfile?.handle) {
      return listData.data.creatorProfile.handle;
    }
    return getCreatorDid(); // Fallback to DID if no handle
  };

  // Get creator PDS from fetched data
  const getCreatorPds = () => {
    // Try to get from the fetched profile data
    if (listData?.data?.creatorPdsInfo) {
      return listData.data.creatorPdsInfo;
    }
    // Fallback to default
    return 'https://bsky.social';
  };

  // Get list avatar URL
  const getListAvatarUrl = () => {
    if (listData?.data?.value?.avatar?.ref?.$link) {
      return `https://cdn.bsky.app/img/avatar/plain/${getCreatorDid()}/${listData.data.value.avatar.ref.$link}@jpeg`;
    }
    return null;
  };

  // Fetch the list data
  React.useEffect(() => {
    const fetchListData = async () => {
      try {
        await execute((async () => {
          if (!listblockValue.subject) {
            throw new Error('Missing list URI in listblock');
          }

          const listUri = listblockValue.subject;
          const cleanUri = listUri.replace(/^at:\/\//i, '');
          
          const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch list: ${response.status}`);
          }
          
          const listData = await response.json();
          
          // Also fetch creator profile to get handle
          let creatorProfile = null;
          let creatorPdsInfo = null;
          const creatorDid = getCreatorDid();
          
          if (creatorDid) {
            try {
              const profileResponse = await fetch(`/api/atproto?uri=${encodeURIComponent(creatorDid)}`);
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                if (profileData.data) {
                  creatorProfile = profileData.data;
                  creatorPdsInfo = profileData.data.service || 'https://bsky.social';
                }
              }
            } catch (error) {
              console.error('Error fetching creator profile:', error);
            }
          }
          
          return {
            ...listData,
            data: {
              ...listData.data,
              creatorProfile,
              creatorPdsInfo
            }
          };
        })());
      } catch (err) {
        const errorInfo = handleError(err, 'ListblockView.fetchListData');
      }
    };

    // Fetch blocker's profile to get handle
    const fetchBlockerProfile = async () => {
      const blockerDid = getBlockerDid();
      if (blockerDid) {
        try {
          const response = await fetch(`/api/atproto?uri=${encodeURIComponent(blockerDid)}`);
          if (response.ok) {
            const profileData = await response.json();
            // Check different possible locations for handle
            const handle = profileData.data?.handle || 
                          profileData.data?.repoInfo?.handle || 
                          profileData.handle ||
                          null;
            if (handle) {
              setBlockerHandle(handle);
            }
          }
        } catch (error) {
          console.error('Error fetching blocker profile:', error);
        }
      }
    };

    if (listblockValue.subject) {
      fetchListData();
      fetchBlockerProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listblockValue.subject, execute]);

  return (
    <>
      <TabsContainer 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={(tabId) => setActiveTab(tabId as 'info' | 'raw')}
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
        <div style={{ display: activeTab === 'info' ? 'block' : 'none' }}>
          <div className="space-y-6">
            {isLoading && (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading list block information...</div>
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
            
            {!isLoading && !error && (
              <>
                {/* Blocker info header */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl" role="img" aria-label="block">🚫</span>
                    <div>
                      <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                        {getBlockerHandle()} is blocking all users in this list
                      </div>
                      <div className="text-xs text-gray-500">
                        Created {formatDate(listblockValue.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* List block card */}
                <div className="border-2 border-red-400 dark:border-red-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-md">
                  <div className="p-4">
                    
                    {/* Blocked list info */}
                    {listData && listData.data && listData.data.value ? (
                      <>
                        <div className="flex items-start space-x-4">
                          {/* List avatar */}
                          {getListAvatarUrl() ? (
                            <img 
                              src={getListAvatarUrl()} 
                              alt=""
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-2xl">📋</span>
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <h3 className="font-medium text-lg mb-2">{listData.data.value.name || 'Unnamed List'}</h3>
                            {listData.data.value.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {listData.data.value.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                          <a
                            href={`/viewer?uri=${listblockValue.subject}`}
                            className="hover:text-blue-500 hover:underline flex items-center gap-1"
                          >
                            atproto.at
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          
                          <a
                            href={`https://bsky.app/profile/${getCreatorHandle()}/lists/${getRkey()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-500 hover:underline flex items-center gap-1"
                          >
                            🦋
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          
                          <a
                            href={`${getCreatorPds()}/xrpc/com.atproto.repo.getRecord?repo=${getCreatorDid()}&collection=app.bsky.graph.list&rkey=${getRkey()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-500 hover:underline flex items-center gap-1"
                          >
                            PDS
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start space-x-4">
                          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">📋</span>
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-medium text-lg mb-2">Blocked List</h3>
                            <div className="font-mono text-xs break-all text-gray-600 dark:text-gray-400">
                              {listblockValue.subject}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                          <a
                            href={`/viewer?uri=${listblockValue.subject}`}
                            className="hover:text-blue-500 hover:underline flex items-center gap-1"
                          >
                            atproto.at
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          
                          <a
                            href={`https://bsky.app/profile/${getCreatorHandle()}/lists/${getRkey()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-500 hover:underline flex items-center gap-1"
                          >
                            🦋
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          
                          <a
                            href={`${getCreatorPds()}/xrpc/com.atproto.repo.getRecord?repo=${getCreatorDid()}&collection=app.bsky.graph.list&rkey=${getRkey()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-500 hover:underline flex items-center gap-1"
                          >
                            PDS
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div style={{ display: activeTab === 'raw' ? 'block' : 'none' }}>
          <JsonViewer data={data.data} />
        </div>
      </TabsContainer>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-3">Delete List Block?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              This action cannot be undone. This list block will be permanently deleted.
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
          recordData={listblock}
          recordUri={data.uri}
          onRecordUpdated={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
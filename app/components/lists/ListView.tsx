import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import UserAvatar from '../profiles/UserAvatar';
import LoadMoreButton from '../collections/LoadMoreButton';
import { useLoadingState, useLoadingOnly } from '../../hooks/useLoadingState';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '../../hooks/useAuthenticatedRequest';
import AddUsersModal from './AddUsersModal';
import RecordEditor from '../records/RecordEditor';

type ListViewProps = {
  data: any;
  activeTab: 'info' | 'raw';
  setActiveTab: (tab: 'info' | 'raw') => void;
};

export default function ListView({ data, activeTab, setActiveTab }: ListViewProps) {
  const { session } = useAuth();
  const { isReadOnly, isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  const [allItems, setAllItems] = useState<any[]>([]);
  const { isLoading: isLoadingMore, execute: executeLoadMore } = useLoadingOnly();
  const [cursor, setCursor] = useState<string | null>(null);
  const [showAddUsersModal, setShowAddUsersModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: listData, isLoading, error, execute } = useLoadingState<{
    creatorProfile: any;
    creatorPdsInfo: string | null;
  }>();
  
  const tabs = [
    { id: 'info', label: 'List Information' },
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
          <div class="font-medium">List deleted successfully!</div>
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
      console.error('Failed to delete list:', error);
      alert('Failed to delete list. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Extract list data from the record
  const listRecord = data.data;
  const listValue = listRecord.value;
  const listUri = data.uri;
  
  // Check if user can manage the list
  const ownerDid = listUri.replace('at://', '').split('/')[0];
  const isOwner = session?.did === ownerDid;
  const canManageList = isOwner && !isReadOnly;
  const canDeveloperEdit = isDeveloperMode && !isReadOnly && isOwner && !!session;
  
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

  // Load list members using Bluesky API
  const loadListMembers = async (cursor?: string) => {
    try {
      const listUri = data.uri.replace('at://', '');
      const url = `https://public.api.bsky.app/xrpc/app.bsky.graph.getList?list=${encodeURIComponent(`at://${listUri}`)}&limit=50${cursor ? `&cursor=${cursor}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch list: ${response.statusText}`);
      }
      
      const listData = await response.json();
      return listData;
    } catch (error) {
      console.error('Error fetching list members:', error);
      throw error;
    }
  };

  // Load more items
  const loadMoreItems = async () => {
    if (!cursor || isLoadingMore) return;
    
    try {
      await executeLoadMore(async () => {
        const listData = await loadListMembers(cursor);
        setAllItems(prev => [...prev, ...(listData.items || [])]);
        setCursor(listData.cursor || null);
      });
    } catch (error) {
      console.error('Error loading more items:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        await execute(async () => {
          // Load list members
          const listData = await loadListMembers();
          setAllItems(listData.items || []);
          setCursor(listData.cursor || null);
          
          let creatorProfile = null;
          let creatorPdsInfo = null;
          
          // Fetch creator profile information
          if (listData.creator) {
            creatorProfile = listData.creator;
          }

          // Get PDS information from creator's DID (from URI, not API response)
          const creatorDid = getCreatorDid();
          if (creatorDid) {
            try {
              const profileResponse = await fetch(`/api/atproto?uri=${creatorDid}`);
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                if (profileData.data && profileData.data.service) {
                  creatorPdsInfo = profileData.data.service;
                }
              }
            } catch (error) {
              console.error('Error fetching creator PDS info:', error);
            }
          }
          
          return {
            creatorProfile,
            creatorPdsInfo
          };
        });
      } catch (err) {
        console.error('Error fetching list data:', err);
      }
    };
    
    fetchData();
  }, [data.uri, execute]);

  // Extract creator handle for Bluesky link
  const getCreatorHandle = () => {
    if (listData?.creatorProfile?.handle) {
      return listData.creatorProfile.handle;
    }
    // If no handle available, use DID from the URI
    return getCreatorDid();
  };

  // Extract rkey from URI for Bluesky link
  const getRkey = () => {
    const uriParts = data.uri.split('/');
    return uriParts[uriParts.length - 1];
  };

  // Get creator DID from URI
  const getCreatorDid = () => {
    const uriParts = data.uri.replace('at://', '').split('/');
    return uriParts[0]; // The DID is the first part
  };

  // Format purpose for display
  const formatPurpose = (purpose?: string) => {
    if (!purpose) return '';
    // Remove the AT Protocol prefix and just show the purpose name
    return purpose.replace('app.bsky.graph.defs#', '');
  };

  // Get list avatar URL from blob reference
  const getListAvatarUrl = () => {
    if (listValue.avatar && listValue.avatar.ref && listValue.avatar.ref.$link) {
      const creatorDid = getCreatorDid();
      return `https://cdn.bsky.app/img/avatar/plain/${creatorDid}/${listValue.avatar.ref.$link}@jpeg`;
    }
    return null;
  };

  const listAvatarUrl = getListAvatarUrl();
  
  // Handle adding users to list
  const handleAddUsers = async (userDids: string[]) => {
    if (!session) return;
    
    try {
      await executeRequest(async (agent) => {
        // Add each user to the list
        for (const userDid of userDids) {
          await agent.app.bsky.graph.listitem.create(
            { repo: session.did },
            {
              subject: userDid,
              list: listUri,
              createdAt: new Date().toISOString()
            }
          );
        }
      });
      
      // Close modal and refresh
      setShowAddUsersModal(false);
      
      // Show a message about the delay
      const loadingToast = document.createElement('div');
      loadingToast.innerHTML = `
        <div class="text-center">
          <div class="font-medium">Users added successfully!</div>
          <div class="text-sm mt-1 opacity-90">Changes may take a few seconds to appear. Refreshing...</div>
        </div>
      `;
      loadingToast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm';
      document.body.appendChild(loadingToast);
      
      // Simple refresh
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (error) {
      console.error('Failed to add users to list:', error);
      alert('Failed to add users to the list. Please try again.');
    }
  };
  
  // Handle removing user from list
  const handleRemoveUser = async (userDid: string, listItemUri: string) => {
    if (!session || !canManageList) return;
    
    if (!confirm('Are you sure you want to remove this user from the list?')) {
      return;
    }
    
    try {
      await executeRequest(async (agent) => {
        // Extract rkey from the list item URI
        const uriParts = listItemUri.split('/');
        const rkey = uriParts[uriParts.length - 1];
        
        await agent.com.atproto.repo.deleteRecord({
          repo: session.did,
          collection: 'app.bsky.graph.listitem',
          rkey: rkey
        });
      });
      
      // Show a message about the delay
      const loadingToast = document.createElement('div');
      loadingToast.innerHTML = `
        <div class="text-center">
          <div class="font-medium">User removed successfully!</div>
          <div class="text-sm mt-1 opacity-90">Changes may take a few seconds to appear. Refreshing...</div>
        </div>
      `;
      loadingToast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm';
      document.body.appendChild(loadingToast);
      
      // Simple refresh
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (error) {
      console.error('Failed to remove user from list:', error);
      alert('Failed to remove user from the list. Please try again.');
    }
  };

  return (
    <>
      <TabsContainer 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={(tab) => setActiveTab(tab as 'info' | 'raw')}
        rightContent={
          (canManageList || canDeveloperEdit) ? (
            <div className="flex items-center gap-2">
              {canManageList && (
                <button
                  onClick={() => setShowAddUsersModal(true)}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Add Users
                </button>
              )}
              {canDeveloperEdit && (
                <>
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
                </>
              )}
            </div>
          ) : undefined
        }
      >
        {activeTab === 'info' && (
          <div className="space-y-4">
            {isLoading && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-center text-sm text-gray-500">
                Loading list information...
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900 rounded-lg text-center text-sm text-red-500">
                {error}
              </div>
            )}
            
            {!isLoading && !error && (
              <>
                {/* List header */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-6">
                  <div className="flex items-start space-x-4">
                    {listAvatarUrl ? (
                      <img 
                        src={listAvatarUrl} 
                        alt={`${listValue.name || 'List'} avatar`}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <span className="text-3xl flex-shrink-0" role="img" aria-label="list">
                        📋
                      </span>
                    )}
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {listValue.name || 'Untitled List'}
                      </h2>
                      {listValue.description && (
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                          {listValue.description}
                        </p>
                      )}
                      
                      {listValue.purpose && (
                        <div className="mb-3">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                            {formatPurpose(listValue.purpose)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {listValue.createdAt && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Created:</span>
                            <span>{formatDate(listValue.createdAt)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Total Items:</span>
                          <span>{allItems.length}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Loaded:</span>
                          <span>{allItems.length}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center gap-4 text-sm">
                        <a
                          href={`https://bsky.app/profile/${getCreatorHandle()}/lists/${getRkey()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          🦋
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        
                        <a
                          href={`${listData?.creatorPdsInfo || 'https://bsky.social'}/xrpc/com.atproto.repo.getRecord?repo=${getCreatorDid()}&collection=app.bsky.graph.list&rkey=${getRkey()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          PDS
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Creator information */}
                {listData?.creatorProfile && (
                  <div className="border-2 border-purple-400 dark:border-purple-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-md">
                    <div className="bg-purple-100 dark:bg-purple-900/30 px-4 py-2 border-b border-purple-200 dark:border-purple-700">
                      <h3 className="font-medium text-purple-800 dark:text-purple-200">Created by</h3>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <UserAvatar 
                            avatar={listData.creatorProfile.avatar} 
                            handle={listData.creatorProfile.handle} 
                            size="md"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {listData.creatorProfile.displayName || listData.creatorProfile.handle || 'Unknown User'}
                            </h4>
                            <p className="text-sm text-gray-500 truncate">
                              @{listData.creatorProfile.handle || 'unknown'}
                            </p>
                            {listData.creatorProfile.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {listData.creatorProfile.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                              {listData.creatorProfile.did}
                            </p>
                          </div>
                          
                          <div className="mt-3 flex items-center gap-4 text-sm">
                            <a
                              href={`/viewer?uri=${listData.creatorProfile.did}`}
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
                              href={`https://bsky.app/profile/${listData.creatorProfile.did}`}
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

                {/* List members */}
                {allItems.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      List Members
                    </h3>
                    
                    <div className="space-y-3">
                      {allItems.map((item, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <UserAvatar 
                                avatar={item.subject?.avatar} 
                                handle={item.subject?.handle} 
                                size="md"
                              />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex flex-col">
                                    <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {item.subject?.displayName || item.subject?.handle || 'Unknown User'}
                                    </h4>
                                    <p className="text-sm text-gray-500 truncate">
                                      @{item.subject?.handle || 'unknown'}
                                    </p>
                                    {item.subject?.description && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                        {item.subject.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {canManageList && item.uri && (
                                  <button
                                    onClick={() => handleRemoveUser(item.subject?.did, item.uri)}
                                    className="ml-2 px-2 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="Remove from list"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              
                              <div className="mt-3 flex items-center gap-4 text-sm">
                                <a
                                  href={`/viewer?uri=${item.subject?.did}`}
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
                                  href={`https://bsky.app/profile/${item.subject?.did}`}
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
                      ))}
                    </div>
                    
                    {cursor && allItems.length >= 50 && (
                      <div className="mt-4">
                        <LoadMoreButton 
                          onClick={loadMoreItems}
                          isLoading={isLoadingMore}
                        />
                      </div>
                    )}
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
      
      {/* Add Users Modal */}
      {showAddUsersModal && (
        <AddUsersModal
          onClose={() => setShowAddUsersModal(false)}
          onAdd={handleAddUsers}
          listUri={listUri}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-3">Delete List?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              This action cannot be undone. This list will be permanently deleted.
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
          recordData={listRecord}
          recordUri={data.uri}
          onRecordUpdated={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
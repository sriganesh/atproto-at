import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import UserAvatar from '../profiles/UserAvatar';
import { resolveDid, fetchRecord } from '@/lib/edge-atproto';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '../../hooks/useAuthenticatedRequest';
import RecordEditor from '../records/RecordEditor';
import { getAuthorDidFromUri } from '@/lib/utils/atproto';

type ListItemViewProps = {
  data: any;
  activeTab: 'info' | 'raw';
  setActiveTab: (tab: 'info' | 'raw') => void;
};

export default function ListItemView({ data, activeTab, setActiveTab }: ListItemViewProps) {
  const [subjectProfile, setSubjectProfile] = useState<any>(null);
  const [listInfo, setListInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { session } = useAuth();
  const { isReadOnly, isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  
  // Check if user owns this list item and can edit/delete it
  const ownerDid = getAuthorDidFromUri(data.uri);
  const isOwner = session?.did === ownerDid;
  const canDeveloperEdit = isDeveloperMode && !isReadOnly && isOwner && !!session;
  
  const tabs = [
    { id: 'info', label: 'List Item Information' },
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
          <div class="font-medium">List item deleted successfully!</div>
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
      console.error('Failed to delete list item:', error);
      alert('Failed to delete list item. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Extract listitem data
  const listItem = data.data;
  const listItemValue = listItem.value;
  
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

  // Get basic repository information without making Bluesky API calls
  const fetchRepoInfo = async (pds: string, did: string) => {
    try {
      const describeUrl = new URL(`/xrpc/com.atproto.repo.describeRepo`, pds);
      describeUrl.searchParams.set('repo', did);
      
      const response = await fetch(describeUrl.toString());
      
      if (response.ok) {
        const repoInfo = await response.json();
        return {
          success: true,
          data: {
            handle: repoInfo.handle || null,
            did: did,
            repoInfo: repoInfo
          }
        };
      } else {
        return {
          success: false,
          error: `Repository unavailable: ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
  
  // Load the subject profile and list information using direct PDS calls
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch subject repository info (not profile)
        if (listItemValue.subject) {
          const subjectDid = listItemValue.subject;
          const subjectPds = await resolveDid(subjectDid);
          
          if (subjectPds) {
            const subjectResult = await fetchRepoInfo(subjectPds, subjectDid);
            if (subjectResult.success) {
              setSubjectProfile(subjectResult.data);
            }
          }
        }
        
        // Fetch list information using direct PDS calls
        if (listItemValue.list) {
          const listUri = listItemValue.list.replace('at://', '');
          const listUriParts = listUri.split('/');
          
          if (listUriParts.length >= 3) {
            const listDid = listUriParts[0];
            const listCollection = listUriParts[1];
            const listRkey = listUriParts[2];
            
            const listPds = await resolveDid(listDid);
            
            if (listPds) {
              const listResult = await fetchRecord(listPds, listDid, listCollection, listRkey);
              if (listResult.success) {
                setListInfo(listResult.data);
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
  }, [data.uri, listItemValue.subject, listItemValue.list]);
  
  // Extract profile information from repository data
  const extractProfileInfo = (repoData: any) => {
    if (!repoData) return null;
    
    const handle = repoData.handle || 'unknown';
    const did = repoData.did || listItemValue.subject;
    
    // For users without handles, show a shortened DID
    const displayHandle = handle === 'unknown' || !handle ? 
      (did.length > 20 ? `${did.substring(0, 8)}...${did.substring(did.length - 8)}` : did) : 
      handle;
    
    return {
      displayName: displayHandle,
      handle: displayHandle,
      avatar: undefined, // No avatar from repository info
      description: '',
      did
    };
  };
  
  const profile = extractProfileInfo(subjectProfile);
  
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
                Loading list item information...
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900 rounded-lg text-center text-sm text-red-500">
                {error}
              </div>
            )}
            
            {!isLoading && !error && (
              <>
                {/* List item header */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-6">
                  <div className="flex items-start space-x-4">
                    <span className="text-3xl" role="img" aria-label="list item">➕</span>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        List Membership
                      </h2>
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        User added to list
                      </p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {listItemValue.createdAt && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Added:</span>
                            <span>{formatDate(listItemValue.createdAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Subject user information */}
                {profile && (
                  <div className="border-2 border-blue-400 dark:border-blue-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-md">
                    <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-2 border-b border-blue-200 dark:border-blue-700">
                      <h3 className="font-medium text-blue-800 dark:text-blue-200">Added User</h3>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <UserAvatar 
                            avatar={profile.avatar} 
                            handle={profile.handle} 
                            size="md"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {profile.displayName}
                            </h4>
                            <p className="text-sm text-gray-500 truncate">
                              @{profile.handle}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                              {profile.did}
                            </p>
                          </div>
                          
                          <div className="mt-3 flex items-center gap-4 text-sm">
                            <a
                              href={`/viewer?uri=${profile.did}`}
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
                              href={`https://bsky.app/profile/${profile.did}`}
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
                
                {/* List information */}
                {listInfo && (
                  <div className="border-2 border-purple-400 dark:border-purple-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-md">
                    <div className="bg-purple-100 dark:bg-purple-900/30 px-4 py-2 border-b border-purple-200 dark:border-purple-700">
                      <h3 className="font-medium text-purple-800 dark:text-purple-200">Added to List</h3>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl" role="img" aria-label="list">📋</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                            {listInfo.value?.name || 'Untitled List'}
                          </h4>
                          {listInfo.value?.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {listInfo.value.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm">
                            <a
                              href={`/viewer?uri=${listItemValue.list.replace('at://', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline flex items-center gap-1"
                            >
                              atproto.at
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
            <h3 className="text-lg font-semibold mb-3">Delete List Item?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              This action cannot be undone. This list item will be permanently deleted.
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
          recordData={listItem}
          recordUri={data.uri}
          onRecordUpdated={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
} 
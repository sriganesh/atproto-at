import React, { useState } from 'react';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '../../hooks/useAuthenticatedRequest';
import AddUsersModal from '../lists/AddUsersModal';
import RecordEditor from './RecordEditor';
import SupporterBadgeView from '../supporter/SupporterBadgeView';

type RecordViewProps = {
  data: any;
  activeTab: 'info' | 'raw';
  setActiveTab: (tab: 'info' | 'raw') => void;
};

export default function RecordView({ data, activeTab, setActiveTab }: RecordViewProps) {
  const { session } = useAuth();
  const { isReadOnly, isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  const [showAddUsersModal, setShowAddUsersModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const record = data.data;
  const recordValue = record.value;
  const recordUri = data.uri;
  
  // Check if this is a list record
  const isList = recordValue.$type === 'app.bsky.graph.list';
  
  // Check if this is a supporter badge
  const isSupporterBadge = recordValue.$type === 'at.atproto.supporter.badge';
  
  // Extract owner DID from URI
  const ownerDid = recordUri.replace('at://', '').split('/')[0];
  const isOwner = session?.did === ownerDid;
  const canManageList = isList && isOwner && !isReadOnly;
  const canDeveloperEdit = isDeveloperMode && !isReadOnly && isOwner && !!session;
  
  const tabs = [
    { id: 'info', label: 'Record Information' },
    { id: 'raw', label: 'Raw Data' }
  ];
  
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
              list: recordUri,
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
  
  // Handle delete record
  const handleDelete = async () => {
    if (!canDeveloperEdit || isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      await executeRequest(async (agent) => {
        // Extract collection and rkey from URI
        const uriParts = recordUri.replace('at://', '').split('/');
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
          <div class="font-medium">Record deleted successfully!</div>
          <div class="text-sm mt-1 opacity-90">Redirecting to collection...</div>
        </div>
      `;
      loadingToast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm';
      document.body.appendChild(loadingToast);
      
      // Redirect to collection after deletion
      setTimeout(() => {
        const collectionUri = recordUri.split('/').slice(0, -1).join('/');
        window.location.href = `/viewer?uri=${collectionUri}`;
      }, 2500);
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('Failed to delete record. Please try again.');
    } finally {
      setIsDeleting(false);
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
        <div style={{ display: activeTab === 'info' ? 'block' : 'none' }}>
          <div className="p-4 space-y-4">
            {/* List info in purple box */}
            {isList && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📋</span>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-purple-900 dark:text-purple-100">
                      {recordValue.name || 'Untitled List'}
                    </h2>
                    
                    <div className="mt-2 text-purple-800 dark:text-purple-200 text-sm">
                      {recordValue.purpose || 'curatelist'}
                    </div>
                    
                    {recordValue.description && (
                      <p className="mt-2 text-gray-700 dark:text-gray-300">
                        {recordValue.description}
                      </p>
                    )}
                    
                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      {recordValue.createdAt && (
                        <span>Created: {new Date(recordValue.createdAt).toLocaleDateString()}</span>
                      )}
                      <span>Total Items: 1</span>
                      <span>Loaded: 1</span>
                    </div>
                    
                    <div className="mt-4 flex items-center gap-4">
                      <a
                        href={`${recordUri}/app.bsky.graph.listitem`}
                        className="text-blue-500 hover:underline text-sm"
                      >
                        🦋 View List Members
                      </a>
                      <a
                        href={`https://bsky.app/profile/${ownerDid}/lists/${recordUri.split('/').pop()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm flex items-center gap-1"
                      >
                        🦋 View on Bluesky
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Supporter Badge */}
            {isSupporterBadge && (
              <SupporterBadgeView
                recordData={record}
                recordUri={recordUri}
              />
            )}
            
            {/* Generic record info for non-lists and non-badges */}
            {!isList && !isSupporterBadge && (
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-3">Record Information</h2>
                
                {/* Display text field if present */}
                {recordValue.text && (
                  <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{recordValue.text}</p>
                  </div>
                )}
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Type:</span> <span className="text-gray-800 dark:text-gray-200">{recordValue.$type}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">URI:</span> <span className="text-gray-800 dark:text-gray-200 break-all">{recordUri}</span>
                  </div>
                  {recordValue.createdAt && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Created:</span> <span className="text-gray-800 dark:text-gray-200">{new Date(recordValue.createdAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {activeTab === 'raw' && (
          <div className="p-4">
            <JsonViewer data={record} uri={recordUri} />
          </div>
        )}
      </TabsContainer>
      
      {/* Add Users Modal */}
      {showAddUsersModal && (
        <AddUsersModal
          onClose={() => setShowAddUsersModal(false)}
          onAdd={handleAddUsers}
          listUri={recordUri}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-3">Delete Record?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              This action cannot be undone. This record will be permanently deleted.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              <span className="font-medium">URI:</span>
              <p className="mt-1 break-all">{recordUri}</p>
            </div>
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
      
      {/* Edit Record Modal - To be implemented */}
      {showEditModal && (
        <RecordEditor
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          recordData={record}
          recordUri={recordUri}
          onRecordUpdated={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
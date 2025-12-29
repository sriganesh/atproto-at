import React, { useState } from 'react';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import { getRelativeTime } from '@/lib/utils/date';
import JetstreamTab from '@/app/viewer/components/jetstream/JetstreamTab';
import { JetstreamContextType } from '@/app/viewer/components/jetstream/types';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '../../hooks/useAuthenticatedRequest';
import RecordEditor from '../records/RecordEditor';

type StatusSphereViewProps = {
  data: {
    uri: string;
    cid?: string;
    value?: {
      status?: string;
      createdAt?: string;
    };
    data?: {
      uri?: string;
      cid?: string;
      value?: {
        status?: string;
        createdAt?: string;
      };
    };
  };
  activeTab: 'info' | 'raw' | 'live';
  setActiveTab: (tab: 'info' | 'raw' | 'live') => void;
};

export default function StatusSphereView({
  data,
  activeTab,
  setActiveTab
}: StatusSphereViewProps) {
  // Auth hooks
  const { session } = useAuth();
  const { isReadOnly, isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();

  // State for modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract the actual record data from the wrapper
  const statusRecord = data?.data || data;
  const createdAt = new Date(statusRecord?.value?.createdAt || new Date());
  const timeAgo = getRelativeTime(createdAt);

  // Extract owner DID from URI
  const recordUri = statusRecord?.uri || data?.uri || '';
  const ownerDid = recordUri.replace('at://', '').split('/')[0];
  const isOwner = session?.did === ownerDid;
  const canDeveloperEdit = isDeveloperMode && !isReadOnly && isOwner && !!session;

  const tabs = [
    { id: 'info' as const, label: 'Record Information' },
    { id: 'raw' as const, label: 'Raw Data' },
    { id: 'live' as const, label: 'Jetstream' }
  ];

  // Create Jetstream context for live updates
  const jetstreamContext: JetstreamContextType = {
    type: 'collection',
    did: (statusRecord?.uri || data?.uri)?.split('/')[2] || '',
    collection: 'xyz.statusphere.status'
  };

  // Handle delete record
  const handleDelete = async () => {
    if (!canDeveloperEdit || isDeleting) return;

    setIsDeleting(true);

    try {
      await executeRequest(async (agent) => {
        // Parse the URI to get collection and record key
        const uriParts = recordUri.replace('at://', '').split('/');
        const did = uriParts[0];
        const collection = uriParts[1];
        const rkey = uriParts[2];

        // Delete the record
        await agent.api.com.atproto.repo.deleteRecord({
          repo: did,
          collection: collection,
          rkey: rkey
        });
      });

      // Redirect to the collection view after successful deletion
      const collectionUri = recordUri.split('/').slice(0, -1).join('/');
      window.location.href = `/viewer?uri=${collectionUri.replace('at://', '')}`;
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('Failed to delete record. Please try again.');
      setIsDeleting(false);
    }
  };
  
  return (
    <div>
      <TabsContainer
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={(tabId) => setActiveTab(tabId as 'info' | 'raw' | 'live')}
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
      />
      
      {activeTab === 'info' && (
        <div className="mt-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{RECORD_THEMES.statusphere.icon}</span>
              <h3 className="text-lg font-semibold">{(statusRecord?.uri || data?.uri)?.split('/').pop()}</h3>
            </div>
            
            <div className="flex items-center justify-center my-8">
              <div className={`text-7xl ${RECORD_THEMES.statusphere.bgColor} rounded-2xl p-8 shadow-inner`}>
                {statusRecord?.value?.status || '?'}
              </div>
            </div>
            
            <div className="text-center space-y-3">
              <p className="text-gray-700 dark:text-gray-300">
                Status posted {timeAgo}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {createdAt.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'raw' && (
        <div className="mt-6">
          <JsonViewer data={statusRecord} />
        </div>
      )}
      
      {activeTab === 'live' && (
        <div className="mt-6">
          <JetstreamTab context={jetstreamContext} />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-3">Delete Status?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              This action cannot be undone. This status will be permanently deleted.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              <span className="font-medium">Status:</span>
              <span className="text-2xl ml-2">{statusRecord?.value?.status}</span>
            </div>
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

      {/* Edit Record Modal */}
      {showEditModal && (
        <RecordEditor
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          recordData={statusRecord}
          recordUri={recordUri}
          onRecordUpdated={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
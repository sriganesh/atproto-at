import React, { useState } from 'react';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '../../hooks/useAuthenticatedRequest';
import RecordEditor from '../records/RecordEditor';
import { getAuthorDidFromUri } from '@/lib/utils/atproto';

type LabelerViewProps = {
  data: any;
  activeTab: 'info' | 'raw';
  setActiveTab: (tab: 'info' | 'raw') => void;
};

export default function LabelerView({ 
  data, 
  activeTab, 
  setActiveTab
}: LabelerViewProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { session } = useAuth();
  const { isReadOnly, isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  
  // Check if user owns this labeler and can edit/delete it
  const ownerDid = getAuthorDidFromUri(data.uri);
  const isOwner = session?.did === ownerDid;
  const canDeveloperEdit = isDeveloperMode && !isReadOnly && isOwner && !!session;
  
  const tabs = [
    { id: 'info', label: 'Labeler Service Information' },
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
          <div class="font-medium">Labeler service deleted successfully!</div>
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
      console.error('Failed to delete labeler service:', error);
      alert('Failed to delete labeler service. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Extract labeler data
  const labeler = data.data;
  const labelerValue = labeler.value;
  
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

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'inform':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'alert':
        return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
      case 'none':
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  // Get default setting color
  const getDefaultSettingColor = (setting: string) => {
    switch (setting) {
      case 'hide':
        return 'text-red-600 dark:text-red-400';
      case 'warn':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'show':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

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
            {/* Labeler header */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl" role="img" aria-label="labeler">🏷️</span>
                <div>
                  <div className="text-lg font-medium text-purple-700 dark:text-purple-300">
                    Labeler Service
                  </div>
                  <div className="text-xs text-gray-500">
                    Created {formatDate(labelerValue.createdAt)}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Labeler policies */}
            {labelerValue.policies && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Labeler Policies</h3>
                
                {/* Label values */}
                {labelerValue.policies.labelValues && labelerValue.policies.labelValues.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Supported Labels ({labelerValue.policies.labelValues.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {labelerValue.policies.labelValues.map((label: string) => (
                        <span 
                          key={label}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 dark:bg-gray-700"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Label definitions */}
                {labelerValue.policies.labelValueDefinitions && labelerValue.policies.labelValueDefinitions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Label Definitions</h4>
                    <div className="grid gap-3">
                      {labelerValue.policies.labelValueDefinitions.map((def: any) => (
                        <div 
                          key={def.identifier}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <span className="font-mono text-sm">{def.identifier}</span>
                              <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(def.severity)}`}>
                                {def.severity}
                              </span>
                              {def.adultOnly && (
                                <span className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                  18+
                                </span>
                              )}
                            </div>
                            <span className={`text-sm ${getDefaultSettingColor(def.defaultSetting)}`}>
                              Default: {def.defaultSetting}
                            </span>
                          </div>
                          
                          {def.locales && def.locales[0] && (
                            <div className="space-y-1">
                              <div className="font-medium text-sm">
                                {def.locales[0].name}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {def.locales[0].description}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>Blurs: {def.blurs || 'none'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* No policies defined */}
            {!labelerValue.policies && (
              <div className="text-center py-8 text-gray-500">
                No labeler policies defined
              </div>
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
            <h3 className="text-lg font-semibold mb-3">Delete Labeler Service?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              This action cannot be undone. This labeler service will be permanently deleted.
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
          recordData={labeler}
          recordUri={data.uri}
          onRecordUpdated={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
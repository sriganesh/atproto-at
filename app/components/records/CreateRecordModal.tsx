'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useAuthenticatedRequest } from '@/app/hooks/useAuthenticatedRequest';
import { generateTid } from '@/lib/utils/tid';
import Toast from '../ui/Toast';
import JsonEditor from '../ui/JsonEditor';

interface CreateRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoDid: string;
  defaultCollection?: string;
  onRecordCreated?: (uri: string) => void;
}

export default function CreateRecordModal({ 
  isOpen, 
  onClose, 
  repoDid,
  defaultCollection = '',
  onRecordCreated 
}: CreateRecordModalProps) {
  const { session } = useAuth();
  const { executeRequest } = useAuthenticatedRequest();
  
  // State
  const [collection, setCollection] = useState(defaultCollection);
  const [rkey, setRkey] = useState('');
  const [jsonContent, setJsonContent] = useState(() => {
    const timestamp = new Date().toISOString();
    return defaultCollection 
      ? `{\n  "$type": "${defaultCollection}",\n  "createdAt": "${timestamp}"\n}`
      : `{\n  "$type": "",\n  "createdAt": "${timestamp}"\n}`;
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Update JSON when collection changes
  useEffect(() => {
    if (collection) {
      const timestamp = new Date().toISOString();
      setJsonContent(`{
  "$type": "${collection}",
  "createdAt": "${timestamp}"
}`);
    }
  }, [collection]);
  
  // Generate a unique rkey if not provided using TID format
  const generateRkey = () => {
    return generateTid();
  };
  
  const handleCreate = async () => {
    if (!session || isCreating) return;
    
    // Validate inputs
    if (!collection.trim()) {
      setError('Collection name is required');
      return;
    }
    
    const finalRkey = rkey.trim() || generateRkey();
    
    setIsCreating(true);
    setError(null);
    
    try {
      // Parse the JSON to validate it
      let parsedValue;
      try {
        parsedValue = JSON.parse(jsonContent);
      } catch (parseErr) {
        setError('Invalid JSON format. Please check your syntax.');
        setIsCreating(false);
        return;
      }
      
      // Ensure $type matches collection
      if (parsedValue.$type && parsedValue.$type !== collection) {
        setError(`$type field must match collection name: ${collection}`);
        setIsCreating(false);
        return;
      }
      
      // Add $type if not present
      if (!parsedValue.$type) {
        parsedValue.$type = collection;
      }
      
      await executeRequest(async (agent) => {
        // Use createRecord to create the new record
        await agent.com.atproto.repo.createRecord({
          repo: repoDid,
          collection: collection,
          rkey: finalRkey,
          record: parsedValue
        });
      });
      
      setToast({ message: 'Record created successfully', type: 'success' });
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
        
        // Notify parent immediately
        if (onRecordCreated) {
          const newUri = `at://${repoDid}/${collection}/${finalRkey}`;
          onRecordCreated(newUri);
        }
      }, 1000);
    } catch (err) {
      console.error('Failed to create record:', err);
      setError(err instanceof Error ? err.message : 'Failed to create record');
    } finally {
      setIsCreating(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[110] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Create New Record
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Repository: {repoDid}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {/* Collection Name */}
            <div className="mb-4">
              <label htmlFor="collection" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Collection Name
              </label>
              <input
                id="collection"
                type="text"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="e.g., app.bsky.feed.post"
                disabled={!!defaultCollection}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The NSID of the collection (e.g., app.bsky.feed.post, app.bsky.graph.list)
              </p>
            </div>
            
            {/* Record Key */}
            <div className="mb-4">
              <label htmlFor="rkey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Record Key (optional)
              </label>
              <input
                id="rkey"
                type="text"
                value={rkey}
                onChange={(e) => setRkey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Leave blank to auto-generate"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                A unique identifier for this record. If left blank, one will be generated.
              </p>
            </div>
            
            {/* JSON Editor */}
            <div className="mb-4">
              <JsonEditor
                value={jsonContent}
                onChange={setJsonContent}
                minHeight="240px"
                maxHeight="400px"
              />
            </div>
            
            {/* Warning message */}
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Warning:</strong> Creating records with invalid data structures can break functionality. Make sure the JSON matches the expected schema for the collection type.
              </p>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !collection.trim() || !jsonContent.trim()}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                isCreating || !collection.trim() || !jsonContent.trim()
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              {isCreating ? 'Creating...' : 'Create Record'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
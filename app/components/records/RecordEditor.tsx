'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useAuthenticatedRequest } from '@/app/hooks/useAuthenticatedRequest';
import Toast from '../ui/Toast';
import JsonEditor from '../ui/JsonEditor';

interface RecordEditorProps {
  isOpen: boolean;
  onClose: () => void;
  recordData: any;
  recordUri: string;
  onRecordUpdated?: () => void;
}

export default function RecordEditor({ 
  isOpen, 
  onClose, 
  recordData,
  recordUri,
  onRecordUpdated 
}: RecordEditorProps) {
  const { session } = useAuth();
  const { executeRequest } = useAuthenticatedRequest();
  
  // State
  const [jsonContent, setJsonContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Initialize JSON content
  useEffect(() => {
    if (recordData?.value) {
      setJsonContent(JSON.stringify(recordData.value, null, 2));
    }
  }, [recordData]);
  
  const handleSave = async () => {
    if (!session || isSaving) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Parse the JSON to validate it
      let parsedValue;
      try {
        parsedValue = JSON.parse(jsonContent);
      } catch (parseErr) {
        setError('Invalid JSON format. Please check your syntax.');
        setIsSaving(false);
        return;
      }
      
      await executeRequest(async (agent) => {
        // Extract collection and rkey from URI
        const uriParts = recordUri.replace('at://', '').split('/');
        const repo = uriParts[0];
        const collection = uriParts[1];
        const rkey = uriParts[2];
        
        // Use putRecord to update the record
        await agent.com.atproto.repo.putRecord({
          repo,
          collection,
          rkey,
          record: parsedValue,
          swapRecord: recordData.cid // Use current CID for optimistic concurrency control
        });
      });
      
      setToast({ message: 'Record updated successfully', type: 'success' });
      
      // Notify parent component
      if (onRecordUpdated) {
        // Call the update callback immediately
        onRecordUpdated();
      }
      
      // Close modal after showing success message
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update record:', err);
      setError(err instanceof Error ? err.message : 'Failed to update record');
    } finally {
      setIsSaving(false);
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
                Edit Record
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {recordUri}
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
            {/* JSON Editor */}
            <div className="mb-4">
              <JsonEditor
                value={jsonContent}
                onChange={setJsonContent}
                minHeight="350px"
                maxHeight="500px"
              />
            </div>
            
            {/* Warning message */}
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Warning:</strong> Editing raw record data can break functionality. Make sure the JSON structure matches the expected schema for this record type.
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
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !jsonContent.trim()}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                isSaving || !jsonContent.trim()
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
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
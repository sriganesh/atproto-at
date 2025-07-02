import React from 'react';
import CopyButton from '../ui/CopyButton';
import { JsonViewer } from '../ui/JsonViewer';
import { fetchDidDocument } from '@/lib/edge-atproto';
import { useLoadingState } from '../../hooks/useLoadingState';

type DidDocumentPopupProps = {
  did: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function DidDocumentPopup({ did, isOpen, onClose }: DidDocumentPopupProps) {
  const { data: documentData, isLoading: loading, error, execute } = useLoadingState<{ document: any; url: string | null }>();
  const document = documentData?.document || null;
  const documentUrl = documentData?.url || null;

  // Fetch DID document when popup is opened
  React.useEffect(() => {
    async function fetchDocument() {
      if (!isOpen || !did) return;
      
      try {
        await execute(
          fetchDidDocument(did).then(result => {
            if (!result.success) {
              throw new Error(result.error);
            }
            return {
              document: result.data,
              url: result.url
            };
          })
        );
      } catch (err) {
        console.error('Error fetching DID document:', err);
        // Error is already handled by the hook
      }
    }
    
    fetchDocument();
  }, [did, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-medium">DID Document</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-auto flex-grow">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3">Loading DID document...</span>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          ) : document ? (
            <div>
              <div className="flex flex-col space-y-2 mb-3">
                <h4 className="text-md font-medium">{did}</h4>
                {documentUrl && (
                  <div className="text-xs">
                    <a href={documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                      PLC Directory
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
              <JsonViewer 
                data={document} 
                title=""
                maxHeight="max-h-[60vh] overflow-auto"
              />
            </div>
          ) : (
            <div className="text-gray-500 text-center py-10">No DID document available</div>
          )}
        </div>
      </div>
    </div>
  );
} 
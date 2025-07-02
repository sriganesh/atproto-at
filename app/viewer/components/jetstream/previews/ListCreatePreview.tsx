import React, { useState, useEffect } from 'react';

interface ListCreatePreviewProps {
  listRecord: any;
  authorDid: string;
  recordKey: string;
}

export default function ListCreatePreview({ listRecord, authorDid, recordKey }: ListCreatePreviewProps) {
  const [pdsEndpoint, setPdsEndpoint] = useState<string>('bsky.social');

  const getPurposeDisplay = (purpose: string) => {
    if (purpose === 'app.bsky.graph.defs#curatelist') {
      return 'Curation List';
    } else if (purpose === 'app.bsky.graph.defs#modlist') {
      return 'Moderation List';
    }
    return purpose;
  };

  // Fetch PDS endpoint for the author
  useEffect(() => {
    const fetchPdsEndpoint = async () => {
      try {
        const response = await fetch(`/api/atproto?uri=${encodeURIComponent(authorDid)}`);
        if (response.ok) {
          const result = await response.json();
          if (result.apiUrl) {
            const pdsHostname = new URL(result.apiUrl).hostname;
            setPdsEndpoint(pdsHostname);
          }
        }
      } catch (error) {
        console.error('Failed to fetch PDS endpoint:', error);
      }
    };

    fetchPdsEndpoint();
  }, [authorDid]);

  const listUri = `at://${authorDid}/app.bsky.graph.list/${recordKey}`;

  return (
    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
      {/* Header */}
      <div className="text-green-600 dark:text-green-400 text-xs font-medium mb-2">
        📝 New List
      </div>
      
      {/* List Details */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {listRecord.name}
        </div>
        
        {listRecord.description && (
          <div className="text-xs text-gray-600 dark:text-gray-300">
            {listRecord.description.length > 100 
              ? `${listRecord.description.substring(0, 100)}...`
              : listRecord.description
            }
          </div>
        )}
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Purpose: {getPurposeDisplay(listRecord.purpose)}
        </div>
      </div>
      
      {/* Action links */}
      <div className="flex items-center gap-3 text-xs mt-3">
        <a
          href={`/viewer?uri=${listUri.replace('at://', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center gap-1"
        >
          atproto.at
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        
        <a
          href={`https://bsky.app/profile/${authorDid}/lists/${recordKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center gap-1"
        >
          🦋
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        
        <a
          href={`https://${pdsEndpoint}/xrpc/com.atproto.repo.getRecord?repo=${authorDid}&collection=app.bsky.graph.list&rkey=${recordKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline flex items-center gap-1"
        >
          PDS
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
} 
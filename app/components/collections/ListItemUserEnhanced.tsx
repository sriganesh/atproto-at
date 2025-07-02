'use client';

import React, { useState } from 'react';
import UserAvatar from '../profiles/UserAvatar';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';
import BaseCollectionItem from './BaseCollectionItem';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { useAuthMode } from '@/app/components/auth/AuthModeProvider';
import { useAuthenticatedRequest } from '@/app/hooks/useAuthenticatedRequest';

type ListItemUserEnhancedProps = {
  listItemRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      subject: string; // DID of the user in the list
      list: string; // AT-URI of the list
      createdAt?: string;
      [key: string]: any;
    };
  };
  // For list items, we often get the subject profile data directly from the API
  subjectProfile?: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    description?: string;
    [key: string]: any;
  };
  listOwnerDid?: string;
  onRemove?: () => void;
};

export default function ListItemUserEnhanced({ 
  listItemRecord, 
  subjectProfile,
  listOwnerDid,
  onRemove
}: ListItemUserEnhancedProps) {
  const { session } = useAuth();
  const { isReadOnly } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  const [isRemoving, setIsRemoving] = useState(false);

  // Use provided subject profile or create fallback
  const userProfile = subjectProfile || {
    did: listItemRecord.value.subject,
    handle: listItemRecord.value.subject.substring(0, 10) + '...',
    displayName: 'Unknown User',
    avatar: undefined,
    description: undefined
  };

  const isListOwner = session?.did === listOwnerDid;
  const canRemove = isListOwner && !isReadOnly && session;

  const handleRemove = async () => {
    if (!canRemove || !confirm(`Remove ${userProfile.displayName || userProfile.handle} from this list?`)) {
      return;
    }

    setIsRemoving(true);

    try {
      // Extract rkey from the listitem URI
      const rkey = listItemRecord.uri.split('/').pop();
      
      await executeRequest(async (agent) => {
        return await agent.com.atproto.repo.deleteRecord({
          repo: session.did,
          collection: 'app.bsky.graph.listitem',
          rkey,
        });
      });

      // Call the onRemove callback to update the UI
      if (onRemove) {
        onRemove();
      }
    } catch (err) {
      console.error('Failed to remove user from list:', err);
      alert(err instanceof Error ? err.message : 'Failed to remove user from list');
    } finally {
      setIsRemoving(false);
    }
  };

  const renderContent = () => {
    return (
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0">
              <UserAvatar 
                avatar={userProfile.avatar} 
                handle={userProfile.handle} 
                size="md"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {userProfile.displayName || userProfile.handle}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  @{userProfile.handle}
                </p>
                {userProfile.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {userProfile.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                  {userProfile.did}
                </p>
              </div>
            </div>
          </div>

          {canRemove && (
            <button
              onClick={handleRemove}
              disabled={isRemoving}
              className="ml-3 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove from list"
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <BaseCollectionItem
      record={listItemRecord}
      theme={RECORD_THEMES.listitem}
      renderContent={renderContent}
    />
  );
}
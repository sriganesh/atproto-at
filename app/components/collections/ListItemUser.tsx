import React from 'react';
import UserAvatar from '../profiles/UserAvatar';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';
import BaseCollectionItem from './BaseCollectionItem';

type ListItemUserProps = {
  listItemRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      subject: string; // DID of the user in the list
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
};

export default function ListItemUser({ listItemRecord, subjectProfile }: ListItemUserProps) {
  // Use provided subject profile or create fallback
  const userProfile = subjectProfile || {
    did: listItemRecord.value.subject,
    handle: listItemRecord.value.subject.substring(0, 10) + '...',
    displayName: 'Unknown User',
    avatar: undefined,
    description: undefined
  };

  const renderContent = () => {
    return (
      <div className="p-4">
        <div className="flex items-start space-x-3">
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
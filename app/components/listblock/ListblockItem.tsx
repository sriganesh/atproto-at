import React, { useState, useEffect } from 'react';
import BaseCollectionItem from '../collections/BaseCollectionItem';

type ListblockItemProps = {
  listblockRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      subject: string;
      createdAt?: string;
      [key: string]: any;
    };
  };
};

export default function ListblockItem({ listblockRecord }: ListblockItemProps) {
  const [listData, setListData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { value } = listblockRecord;
  
  // Extract creator DID from the blocked list URI
  const getCreatorDid = () => {
    if (!value.subject) return '';
    const parts = value.subject.replace('at://', '').split('/');
    return parts[0];
  };
  
  useEffect(() => {
    const fetchListData = async () => {
      if (!value.subject) {
        setIsLoading(false);
        return;
      }
      
      try {
        const cleanUri = value.subject.replace(/^at:\/\//i, '');
        const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
        
        if (response.ok) {
          const result = await response.json();
          setListData(result.data);
        } else {
          setError('Failed to load list');
        }
      } catch (error) {
        console.error('Error fetching list data:', error);
        setError('Error loading list');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchListData();
  }, [value.subject]);
  
  // Get list avatar URL
  const getListAvatarUrl = () => {
    if (listData?.value?.avatar?.ref?.$link) {
      return `https://cdn.bsky.app/img/avatar/plain/${getCreatorDid()}/${listData.value.avatar.ref.$link}@jpeg`;
    }
    return null;
  };
  
  const renderContent = () => {
    const listAvatarUrl = getListAvatarUrl();
    
    if (isLoading) {
      return (
        <div className="p-4 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      );
    }
    
    if (error || !listData) {
      return (
        <div className="p-4 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🚫</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-red-600 dark:text-red-400">List Block</div>
              <div className="text-sm text-gray-500">
                Unable to load list information
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center space-x-3">
          {listAvatarUrl ? (
            <img 
              src={listAvatarUrl} 
              alt=""
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🚫</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {listData.value?.name || 'Unnamed List'}
            </div>
            {listData.value?.description && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {listData.value.description}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <BaseCollectionItem
      record={listblockRecord}
      theme={{
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        textColor: 'text-red-600 dark:text-red-400',
        icon: '🚫'
      }}
      loadingText="Loading list block..."
      errorText="Unable to load list block"
      isLoading={false}
      error={null}
      renderContent={renderContent}
    />
  );
}
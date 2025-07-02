import React, { useState, useEffect } from 'react';
import BaseCollectionItem from '../collections/BaseCollectionItem';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';

type ThreadgateItemProps = {
  threadgateRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      post: string;
      createdAt?: string;
      allow?: any[];
      hiddenReplies?: string[];
      [key: string]: any;
    };
  };
};

export default function ThreadgateItem({ threadgateRecord }: ThreadgateItemProps) {
  const [postData, setPostData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { value } = threadgateRecord;
  
  useEffect(() => {
    const fetchPostData = async () => {
      if (!value.post) {
        setIsLoading(false);
        return;
      }
      
      try {
        const cleanUri = value.post.replace(/^at:\/\//i, '');
        const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
        
        if (response.ok) {
          const result = await response.json();
          setPostData(result.data);
        }
      } catch (error) {
        console.error('Error fetching post data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPostData();
  }, [value.post]);
  
  const getRestrictionSummary = () => {
    if (!value.allow || value.allow.length === 0) {
      return 'No reply restrictions';
    }
    
    const descriptions = value.allow.map((rule: any) => {
      if (rule.$type === 'app.bsky.feed.threadgate#mentionRule') {
        return 'mentioned users';
      } else if (rule.$type === 'app.bsky.feed.threadgate#followingRule') {
        return 'following only';
      } else if (rule.$type === 'app.bsky.feed.threadgate#listRule') {
        return 'list members';
      }
      return 'custom';
    });
    
    return `Replies: ${descriptions.join(', ')}`;
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-3">
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      );
    }
    
    return (
      <div className="p-4 space-y-3">
        {postData?.value?.text ? (
          <div className="text-gray-800 dark:text-gray-200">
            {postData.value.text}
          </div>
        ) : (
          <div className="text-gray-500 italic">
            Post content unavailable
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-yellow-600 dark:text-yellow-400 font-medium">
            {getRestrictionSummary()}
          </span>
          {value.hiddenReplies && value.hiddenReplies.length > 0 && (
            <span className="text-gray-500">
              {value.hiddenReplies.length} hidden
            </span>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <BaseCollectionItem
      record={threadgateRecord}
      theme={{
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        textColor: 'text-yellow-600 dark:text-yellow-400',
        icon: '🚪'
      }}
      loadingText="Loading threadgate..."
      errorText="Unable to load threadgate"
      isLoading={false}
      error={null}
      renderContent={renderContent}
    />
  );
}
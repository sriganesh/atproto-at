import React, { useState, useEffect } from 'react';
import BaseCollectionItem from '../collections/BaseCollectionItem';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';

type PostgateItemProps = {
  postgateRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      post: string;
      createdAt?: string;
      detachedEmbeddingUris?: string[];
      embeddingRules?: Array<{
        $type?: string;
        [key: string]: any;
      }>;
      [key: string]: any;
    };
  };
};

export default function PostgateItem({ postgateRecord }: PostgateItemProps) {
  const [postData, setPostData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { value } = postgateRecord;
  
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
  
  const getEmbeddingRestrictions = () => {
    if (!value.embeddingRules || value.embeddingRules.length === 0) {
      return 'Embedding allowed';
    }
    
    const hasDisableRule = value.embeddingRules.some(
      rule => rule.$type === 'app.bsky.feed.postgate#disableRule'
    );
    
    if (hasDisableRule) {
      return 'Embedding disabled';
    }
    
    return 'Custom embedding rules';
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
          <span className="text-purple-600 dark:text-purple-400 font-medium">
            {getEmbeddingRestrictions()}
          </span>
          {value.detachedEmbeddingUris && value.detachedEmbeddingUris.length > 0 && (
            <span className="text-gray-500">
              {value.detachedEmbeddingUris.length} detached
            </span>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <BaseCollectionItem
      record={postgateRecord}
      theme={{
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
        textColor: 'text-purple-600 dark:text-purple-400',
        icon: '🚫'
      }}
      loadingText="Loading postgate..."
      errorText="Unable to load postgate"
      isLoading={false}
      error={null}
      renderContent={renderContent}
    />
  );
}
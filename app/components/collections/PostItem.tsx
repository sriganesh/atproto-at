import React from 'react';
import PostCard from '../posts/PostCard';
import { getPostTheme } from '@/lib/utils/browser/theme';
import BaseCollectionItem from './BaseCollectionItem';
import { useAuthorProfile } from '../../hooks/useAuthorProfile';
import { useViewerCacheContext } from '../viewer/context/ViewerCacheContext';

type PostItemProps = {
  postRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      text?: string;
      createdAt?: string;
      embed?: any;
      reply?: {
        root?: { uri: string, cid: string };
        parent?: { uri: string, cid: string };
      };
      [key: string]: any;
    };
  };
};

export default function PostItem({ postRecord }: PostItemProps) {
  const { authorInfo, isLoading, error } = useAuthorProfile(postRecord.uri);
  const isReply = !!postRecord.value.reply;
  const theme = getPostTheme(isReply);
  
  // Get cache context
  const {
    profileCache,
    postCache,
    onProfileCached,
    onPostCached,
    getOrCreateProfileRequest,
    getOrCreatePostRequest
  } = useViewerCacheContext();

  return (
    <BaseCollectionItem
      record={postRecord}
      theme={theme}
      loadingText="Loading post..."
      errorText="Unable to load post content"
      isLoading={isLoading}
      error={error}
      renderContent={() => (
        <PostCard 
          post={{
            ...postRecord,
            value: postRecord.value,
            service: 'bsky.social'
          }} 
          authorInfo={authorInfo} 
          isQuote={true} 
          hideLinks={true}
          profileCache={profileCache}
          onProfileCached={onProfileCached}
          getOrCreateProfileRequest={getOrCreateProfileRequest}
          postCache={postCache}
          onPostCached={onPostCached}
          getOrCreatePostRequest={getOrCreatePostRequest}
        />
      )}
      headerExtra={isReply ? (
        <span className="ml-2 text-xs text-gray-500">Reply</span>
      ) : null}
    />
  );
}
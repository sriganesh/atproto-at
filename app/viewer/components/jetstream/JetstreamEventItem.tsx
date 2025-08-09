import React from 'react';
import { JetstreamEvent } from './types';
import LikedPostPreview from './previews/LikedPostPreview';
import RepostPreview from './previews/RepostPreview';
import FollowPreview from './previews/FollowPreview';
import PostPreview from './previews/PostPreview';
import ListCreatePreview from './previews/ListCreatePreview';
import ListUpdatePreview from './previews/ListUpdatePreview';
import ListItemCreatePreview from './previews/ListItemCreatePreview';
import StatusSpherePreview from './previews/StatusSpherePreview';
import { JETSTREAM_COLORS, getJetstreamEventColor } from '@/lib/utils/browser/theme';

interface JetstreamEventItemProps {
  event: JetstreamEvent;
  context?: {
    type: 'profile' | 'collection';
    collection?: string;
  };
}

function getEventIcon(event: JetstreamEvent): string {
  if (event.kind === 'commit' && event.commit) {
    switch (event.commit.operation) {
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
    }
  } else if (event.kind === 'identity') {
    return '🆔';
  } else if (event.kind === 'account') {
    return '👤';
  }
  return '📝';
}

// Use centralized color function from theme
// (function moved to utils/theme.ts as getJetstreamEventColor)

function formatTimestamp(timeUs: number): string {
  const date = new Date(timeUs / 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 60000) { // Less than 1 minute
    return 'just now';
  } else if (diffMs < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes}m ago`;
  } else if (diffMs < 86400000) { // Less than 1 day
    const hours = Math.floor(diffMs / 3600000);
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

function getCollectionDisplayName(collection: string): string {
  const parts = collection.split('.');
  if (parts.length >= 3) {
    return parts.slice(2).join('.');
  }
  return collection;
}

function truncateDID(did: string): string {
  if (did.length <= 20) return did;
  return `${did.substring(0, 15)}...${did.substring(did.length - 10)}`;
}

function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export default React.memo(function JetstreamEventItem({ event, context }: JetstreamEventItemProps) {
  const icon = getEventIcon(event);
  const color = getJetstreamEventColor(event);
  const timestamp = formatTimestamp(event.time_us);

  // Determine if we should show the collection name
  const shouldShowCollection = () => {
    if (!event.commit?.collection) return false;
    
    // If we're in a profile context, show the full collection name
    if (context?.type === 'profile') {
      return true;
    }
    
    // If we're in a collection context, don't show collection name (it's redundant)
    if (context?.type === 'collection') {
      return false;
    }
    
    // Default: show collection
    return true;
  };

  const getDisplayCollectionName = () => {
    if (!event.commit?.collection) return '';
    
    // For profile context, show full collection name
    if (context?.type === 'profile') {
      return event.commit.collection;
    }
    
    // Otherwise use the shortened version
    return getCollectionDisplayName(event.commit.collection);
  };

  return (
    <div className={`border rounded-lg p-3 ${JETSTREAM_COLORS[color]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-sm">
            {event.kind === 'commit' ? event.commit?.operation : event.kind}
          </span>
          {shouldShowCollection() && (
            <span className="text-xs px-2 py-1 bg-white dark:bg-gray-700 rounded-full">
              {getDisplayCollectionName()}
            </span>
          )}
          {event.commit?.rkey && (
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded-full font-mono text-gray-700 dark:text-gray-300">
              {event.commit.rkey}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {timestamp}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {/* Removed DID display since it's redundant when viewing a specific profile */}
        
        {event.commit && (
          <>
            {event.commit.record && (
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                {event.commit.record.$type === 'app.bsky.feed.post' && (
                  <PostPreview 
                    postRecord={event.commit.record} 
                    authorDid={event.did} 
                    recordKey={event.commit.rkey || ''} 
                  />
                )}
                
                {event.commit.record.$type === 'app.bsky.actor.profile' && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 text-xs">Profile: </span>
                    {event.commit.record.displayName && (
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {event.commit.record.displayName}
                      </span>
                    )}
                    {event.commit.record.description && (
                      <div className="text-gray-700 dark:text-gray-300 text-xs mt-1">
                        {truncateText(event.commit.record.description)}
                      </div>
                    )}
                  </div>
                )}
                
                {event.commit.record.$type === 'app.bsky.graph.follow' && event.commit.record.subject && (
                  <FollowPreview 
                    followRecord={event.commit.record} 
                    followerDid={event.did}
                    recordKey={event.commit.rkey || ''}
                  />
                )}
                
                {event.commit.record.$type === 'app.bsky.feed.repost' && event.commit.record.subject && (
                  <RepostPreview repostRecord={event.commit.record} />
                )}
                
                {event.commit.record.$type === 'app.bsky.feed.like' && event.commit.record.subject && (
                  <LikedPostPreview likeRecord={event.commit.record} />
                )}
                
                {event.commit.record.$type === 'app.bsky.graph.list' && event.commit.operation === 'create' && (
                  <ListCreatePreview 
                    listRecord={event.commit.record} 
                    authorDid={event.did}
                    recordKey={event.commit.rkey || ''}
                  />
                )}
                
                {event.commit.record.$type === 'app.bsky.graph.list' && event.commit.operation === 'update' && (
                  <ListUpdatePreview 
                    listRecord={event.commit.record} 
                    authorDid={event.did}
                    recordKey={event.commit.rkey || ''}
                  />
                )}
                
                {event.commit.record.$type === 'app.bsky.graph.listitem' && event.commit.operation === 'create' && (
                  <ListItemCreatePreview 
                    listItemRecord={event.commit.record} 
                    authorDid={event.did}
                    recordKey={event.commit.rkey || ''}
                  />
                )}
                
                {event.commit.record.$type === 'xyz.statusphere.status' && (
                  <StatusSpherePreview 
                    statusRecord={event.commit.record} 
                    authorDid={event.did}
                    recordKey={event.commit.rkey || ''}
                  />
                )}
                
                {!['app.bsky.feed.post', 'app.bsky.actor.profile', 'app.bsky.graph.follow', 'app.bsky.feed.like', 'app.bsky.feed.repost', 'app.bsky.graph.list', 'app.bsky.graph.listitem', 'xyz.statusphere.status'].includes(event.commit.record.$type) && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 text-xs">Type: </span>
                    <span className="font-mono text-xs">{event.commit.record.$type}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {event.identity && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded border">
            <div className="space-y-1">
              {event.identity.handle && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400 text-xs">Handle: </span>
                  <span className="text-gray-900 dark:text-gray-100">{event.identity.handle}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600 dark:text-gray-400 text-xs">Sequence: </span>
                <span className="font-mono text-xs">{event.identity.seq}</span>
              </div>
            </div>
          </div>
        )}

        {event.account && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded border">
            <div className="space-y-1">
              <div>
                <span className="text-gray-600 dark:text-gray-400 text-xs">Status: </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  event.account.active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {event.account.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400 text-xs">Sequence: </span>
                <span className="font-mono text-xs">{event.account.seq}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - return true if props are equal (prevent re-render)
  return (
    prevProps.event.time_us === nextProps.event.time_us &&
    prevProps.event.did === nextProps.event.did &&
    prevProps.event.kind === nextProps.event.kind &&
    prevProps.event.commit?.operation === nextProps.event.commit?.operation &&
    prevProps.event.commit?.collection === nextProps.event.commit?.collection &&
    prevProps.event.commit?.rkey === nextProps.event.commit?.rkey &&
    prevProps.event.commit?.rev === nextProps.event.commit?.rev &&
    prevProps.event.commit?.cid === nextProps.event.commit?.cid &&
    prevProps.context?.type === nextProps.context?.type &&
    prevProps.context?.collection === nextProps.context?.collection
  );
}); 
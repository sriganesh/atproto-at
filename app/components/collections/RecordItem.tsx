import React from 'react';
import ExternalEmbed from '../posts/ExternalEmbed';
import { getRecordTheme, getPostTheme } from '@/lib/utils/browser/theme';
import BaseCollectionItem from './BaseCollectionItem';
import { getAuthorDidFromUri } from '@/lib/utils/atproto';

type RecordItemProps = {
  record: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      text?: string;
      createdAt?: string;
      reply?: {
        root?: { uri: string, cid: string };
        parent?: { uri: string, cid: string };
      };
      [key: string]: any;
    };
  };
  collectionUri: string;
};

export default function RecordItem({ record, collectionUri }: RecordItemProps) {
  const authorDid = getAuthorDidFromUri(record.uri);

  // Get theme from centralized system
  const type = record.value?.$type || '';
  const theme = type.includes('post') 
    ? getPostTheme(!!record.value?.reply)
    : getRecordTheme(type);

  const renderContent = () => {
    // Check if we have any content to display
    const hasText = !!record.value?.text;
    const isFeedGenerator = record.value?.$type === 'app.bsky.feed.generator';
    const isStarterPack = record.value?.$type === 'app.bsky.graph.starterpack';
    const isList = record.value?.$type === 'app.bsky.graph.list';
    const hasEmbed = !!record.value?.embed;
    
    // For unknown types without text or embeds, return null to hide content area
    if (!hasText && !isFeedGenerator && !isStarterPack && !isList && !hasEmbed) {
      return null;
    }

    return (
      <div className="p-4">
        {/* Post or Generator text display */}
        {record.value?.text && (
          <p className="text-gray-900 dark:text-gray-100 mb-3 whitespace-pre-wrap break-words">
            {record.value.text}
          </p>
        )}
        
        {/* Feed generator specific fields */}
        {record.value?.$type === 'app.bsky.feed.generator' && (
          <div className="space-y-2 text-sm">
            {record.value.displayName && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Display Name:</span>{' '}
                <span className="text-gray-900 dark:text-gray-100">{record.value.displayName}</span>
              </div>
            )}
            {record.value.description && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>{' '}
                <span className="text-gray-900 dark:text-gray-100">{record.value.description}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Starter pack specific fields */}
        {record.value?.$type === 'app.bsky.graph.starterpack' && (
          <div className="space-y-2 text-sm">
            {record.value.name && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>{' '}
                <span className="text-gray-900 dark:text-gray-100">{record.value.name}</span>
              </div>
            )}
            {record.value.description && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>{' '}
                <span className="text-gray-900 dark:text-gray-100">{record.value.description}</span>
              </div>
            )}
            {record.value.list && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">List:</span>{' '}
                <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                  {record.value.list}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* List specific fields - match production purple box style */}
        {record.value?.$type === 'app.bsky.graph.list' && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {record.value.name || 'Untitled List'}
            </h3>
            
            <div className="mb-2">
              <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                {record.value.purpose?.split('#')[1] || 'curatelist'}
              </span>
            </div>
            
            {record.value.description && (
              <p className="text-gray-700 dark:text-gray-300">
                {record.value.description}
              </p>
            )}
          </div>
        )}
        
        {/* Post embeds */}
        {record.value?.embed && record.value.embed.$type === 'app.bsky.embed.external' && (
          <div className="mt-3">
            <ExternalEmbed
              external={record.value.embed.external}
              authorDid={authorDid}
            />
          </div>
        )}
        
        {/* Other embeds - show type */}
        {record.value?.embed && record.value.embed.$type !== 'app.bsky.embed.external' && (
          <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-600 dark:text-gray-400">
            Embed: {record.value.embed.$type}
          </div>
        )}
        
      </div>
    );
  };

  return (
    <BaseCollectionItem
      record={record}
      theme={theme}
      renderContent={renderContent}
    />
  );
}
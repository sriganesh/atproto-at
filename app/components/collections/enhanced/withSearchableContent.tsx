/**
 * Higher-Order Component that makes collection items searchable
 */

import React, { useEffect, ComponentType } from 'react';
import { useCollectionSearchContext } from '../search/CollectionSearchProvider';
import { ContentLoadStatus } from '../search/types';

export interface WithSearchableContentProps {
  recordUri: string;
  onContentLoaded?: (content: any) => void;
}

/**
 * HOC that wraps a component to make its content searchable
 */
export function withSearchableContent<P extends object>(
  WrappedComponent: ComponentType<P>,
  contentExtractor: (props: P & any) => { type: 'post' | 'profile' | 'list'; content: any } | null
) {
  return function SearchableComponent(props: P & WithSearchableContentProps) {
    const searchContext = useCollectionSearchContext();
    const { recordUri, onContentLoaded, ...componentProps } = props as any;

    useEffect(() => {
      // If we're not in a search context, nothing to do
      if (!searchContext) return;

      // Extract content from props
      const extracted = contentExtractor(props);
      if (!extracted || !extracted.content) return;

      // Register the content with the search system
      const { type, content } = extracted;
      let searchableContent: any = {};

      switch (type) {
        case 'post':
          searchableContent = {
            post: {
              text: content.text || content.value?.text,
              author: {
                handle: content.authorInfo?.handle || content.author?.handle,
                displayName: content.authorInfo?.displayName || content.author?.displayName
              }
            }
          };
          break;
        case 'profile':
          searchableContent = {
            profile: {
              handle: content.handle,
              displayName: content.displayName,
              description: content.description || content.value?.description
            }
          };
          break;
        case 'list':
          searchableContent = {
            list: {
              name: content.name || content.value?.name,
              description: content.description || content.value?.description
            }
          };
          break;
      }

      searchContext.registerContent({
        recordUri,
        content: searchableContent,
        contentType: type
      });

      // Call the original onContentLoaded if provided
      if (onContentLoaded) {
        onContentLoaded(content);
      }
    }, [searchContext, recordUri, onContentLoaded, props]);

    // Notify search context of loading status
    useEffect(() => {
      if (!searchContext || !recordUri) return;

      // Check if the component has loading/error states in props
      const isLoading = (props as any).isLoading;
      const error = (props as any).error;
      const hasContent = (props as any).likedPost || (props as any).repostedPost || (props as any).post;

      if (isLoading) {
        searchContext.updateLoadStatus(recordUri, ContentLoadStatus.Loading);
      } else if (error) {
        searchContext.updateLoadStatus(recordUri, ContentLoadStatus.Failed);
      } else if (hasContent) {
        searchContext.updateLoadStatus(recordUri, ContentLoadStatus.Loaded);
      }
    }, [(props as any).isLoading, (props as any).error, searchContext, recordUri]);

    return <WrappedComponent {...(componentProps as P)} />;
  };
}
/**
 * Searchable version of PostgateItem that integrates with the search system
 */

import React, { useState, useEffect } from 'react';
import PostgateItem from '../../postgate/PostgateItem';
import { useCollectionSearchContext } from '../search/CollectionSearchProvider';
import { ContentLoadStatus } from '../search/types';

type PostgateItemProps = {
  postgateRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      post: string;
      detachedEmbeddingUris?: string[];
      embeddingRules?: Array<{
        $type: string;
        [key: string]: any;
      }>;
      createdAt?: string;
      [key: string]: any;
    };
  };
};

export default function SearchablePostgateItem(props: PostgateItemProps) {
  const { postgateRecord } = props;
  const searchContext = useCollectionSearchContext();
  const [hasRegistered, setHasRegistered] = useState(false);

  useEffect(() => {
    if (!searchContext || hasRegistered) return;
    
    // The PostgateItem already loads and displays the post content
    // We should extract it from the rendered DOM instead of making duplicate API calls
    
    // For now, just register the postgate rules themselves
    const searchableContent = {
      post: {
        text: JSON.stringify(postgateRecord.value.embeddingRules || []) + ' ' + 
              (postgateRecord.value.detachedEmbeddingUris || []).join(' '),
        author: {
          handle: '',
          displayName: ''
        }
      }
    };
    
    searchContext.registerContent({
      recordUri: postgateRecord.uri,
      content: searchableContent,
      contentType: 'post'
    });
    
    searchContext.updateLoadStatus(postgateRecord.uri, ContentLoadStatus.Loaded);
    setHasRegistered(true);
  }, [searchContext, postgateRecord, hasRegistered]);

  return <PostgateItem {...props} />;
}
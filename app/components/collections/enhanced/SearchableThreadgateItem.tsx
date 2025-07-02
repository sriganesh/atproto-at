/**
 * Searchable version of ThreadgateItem that integrates with the search system
 */

import React, { useState, useEffect } from 'react';
import ThreadgateItem from '../../threadgate/ThreadgateItem';
import { useCollectionSearchContext } from '../search/CollectionSearchProvider';
import { ContentLoadStatus } from '../search/types';

type ThreadgateItemProps = {
  threadgateRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      post: string;
      allow?: Array<{
        $type: string;
        [key: string]: any;
      }>;
      createdAt?: string;
      [key: string]: any;
    };
  };
};

export default function SearchableThreadgateItem(props: ThreadgateItemProps) {
  const { threadgateRecord } = props;
  const searchContext = useCollectionSearchContext();
  const [hasRegistered, setHasRegistered] = useState(false);

  useEffect(() => {
    if (!searchContext || hasRegistered) return;
    
    // Mark as not loaded initially
    searchContext.updateLoadStatus(threadgateRecord.uri, ContentLoadStatus.NotLoaded);
    setHasRegistered(true);
  }, [searchContext, threadgateRecord.uri, hasRegistered]);

  return <ThreadgateItem {...props} />;
}
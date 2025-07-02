/**
 * Searchable version of RepostedItem that integrates with the search system
 */

import React, { useState, useEffect } from 'react';
import RepostedItem from '../RepostedItem';
import { useCollectionSearchContext } from '../search/CollectionSearchProvider';
import { ContentLoadStatus } from '../search/types';

type RepostedItemProps = {
  repostRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      subject: {
        uri: string;
        cid: string;
      };
      createdAt?: string;
      [key: string]: any;
    };
  };
};

export default function SearchableRepostedItem(props: RepostedItemProps) {
  const { repostRecord } = props;
  const searchContext = useCollectionSearchContext();
  const [hasRegistered, setHasRegistered] = useState(false);

  useEffect(() => {
    if (!searchContext || hasRegistered) return;
    
    // Mark as not loaded initially
    searchContext.updateLoadStatus(repostRecord.uri, ContentLoadStatus.NotLoaded);
    setHasRegistered(true);
  }, [searchContext, repostRecord.uri, hasRegistered]);

  return <RepostedItem {...props} />;
}
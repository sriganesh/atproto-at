/**
 * Searchable version of LikedPostItem that integrates with the search system
 */

import React, { useState, useEffect } from 'react';
import LikedPostItem from '../LikedPostItem';
import { useCollectionSearchContext } from '../search/CollectionSearchProvider';
import { ContentLoadStatus } from '../search/types';

type LikedPostItemProps = {
  likeRecord: {
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

export default function SearchableLikedPostItem(props: LikedPostItemProps) {
  const { likeRecord } = props;
  const searchContext = useCollectionSearchContext();
  const [hasRegistered, setHasRegistered] = useState(false);

  // Monitor the DOM for when content is loaded
  useEffect(() => {
    if (!searchContext || hasRegistered) return;

    // Mark as not loaded initially
    searchContext.updateLoadStatus(likeRecord.uri, ContentLoadStatus.NotLoaded);
    setHasRegistered(true);
  }, [searchContext, likeRecord.uri, hasRegistered]);

  return (
    <div data-record-uri={likeRecord.uri}>
      <LikedPostItem {...props} />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useLoadingOnly } from '../../hooks/useLoadingState';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import CollectionHeader from './CollectionHeader';
import CollectionSearch from './CollectionSearch';
import RecordItem from './RecordItem';
import PostItem from './PostItem';
import LikedPostItem from './LikedPostItem';
import RepostedItem from './RepostedItem';
import BlockedUserItem from './BlockedUserItem';
import FollowedUserItem from './FollowedUserItem';
import ListItemUserEnhanced from './ListItemUserEnhanced';
import ListItemRecord from './ListItemRecord';
import ThreadgateItem from '../threadgate/ThreadgateItem';
import PostgateItem from '../postgate/PostgateItem';
import ListblockItem from '../listblock/ListblockItem';
import LabelerItem from '../labeler/LabelerItem';
import LoadMoreButton from './LoadMoreButton';
import JetstreamTab from '../../viewer/components/jetstream/JetstreamTab';
import { JetstreamContextType } from '../../viewer/components/jetstream/types';
import { useViewerCacheContext } from '../viewer/context/ViewerCacheContext';
import { filterRecords, SearchableRecord } from './utils/searchUtils';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '../../hooks/useAuthenticatedRequest';
import CreateListModal from '../lists/CreateListModal';
import PostComposer from '../composer/PostComposer';
import CreateRecordModal from '../records/CreateRecordModal';
import BadgeCollectionView from '../badges/BadgeCollectionView';
import StatusSphereCollectionView from '../statusphere/StatusSphereCollectionView';
import StatusSphereItem from '../statusphere/StatusSphereItem';

// Progressive search components
import SearchableCollectionView from './search/SearchableCollectionView';
import { useCollectionSearchContext } from './search/CollectionSearchProvider';
import ProgressiveSearchInput from './search/ProgressiveSearchInput';
import SearchableLikedPostItem from './enhanced/SearchableLikedPostItem';
import SearchableRepostedItem from './enhanced/SearchableRepostedItem';
import SearchableThreadgateItem from './enhanced/SearchableThreadgateItem';
import SearchablePostgateItem from './enhanced/SearchablePostgateItem';

type RecordItem = {
  uri: string;
  cid: string;
  value: {
    $type: string;
    text?: string;
    createdAt?: string;
    subject?: {
      uri: string;
      cid: string;
    };
    [key: string]: any;
  };
};

type CollectionViewProps = {
  data: any;
  activeTab: 'info' | 'raw' | 'live';
  setActiveTab: (tab: 'info' | 'raw' | 'live') => void;
};

type CollectionViewInnerProps = CollectionViewProps & {
  allRecords?: RecordItem[];
  setAllRecords?: (records: RecordItem[]) => void;
};

function CollectionViewInner({ 
  data, 
  activeTab, 
  setActiveTab,
  allRecords: propsAllRecords,
  setAllRecords: propsSetAllRecords
}: CollectionViewInnerProps) {
  // Use cache context instead of props
  const cacheContext = useViewerCacheContext();
  
  // Use props records if provided (for searchable collections), otherwise manage locally
  const initialRecordsRef = React.useRef<RecordItem[]>(data.data?.records || []);
  
  const [localAllRecords, setLocalAllRecords] = useState<RecordItem[]>(() => [...(initialRecordsRef.current || [])]);
  const allRecords = propsAllRecords || localAllRecords;
  const setAllRecords = propsSetAllRecords || setLocalAllRecords;
  const { isLoading, execute } = useLoadingOnly();
  const [cursor, setCursor] = useState<string | null>(data.data?.cursor || null);
  const [combinedData, setCombinedData] = useState(data.data);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  
  // Auth hooks
  const { session } = useAuth();
  const { isReadOnly, isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  const [showCreateRecordModal, setShowCreateRecordModal] = useState(false);
  
  // Check if we're in a search context
  const searchContext = useCollectionSearchContext();
  const isInSearchContext = searchContext !== null;
  
  // Use context search query if available, otherwise use local
  const searchQuery = isInSearchContext && searchContext.state.query !== undefined 
    ? searchContext.state.query 
    : localSearchQuery;
  const setSearchQuery = isInSearchContext && searchContext.updateSearchQuery 
    ? searchContext.updateSearchQuery 
    : setLocalSearchQuery;
  
  // Determine collection type to apply specific styling
  const collectionName = data.uri.split('/').pop();
  const isLikeCollection = collectionName === 'app.bsky.feed.like';
  const isRepostCollection = collectionName === 'app.bsky.feed.repost';
  const isBlockCollection = collectionName === 'app.bsky.graph.block';
  const isFollowCollection = collectionName === 'app.bsky.graph.follow';
  const isListCollection = collectionName === 'app.bsky.graph.list';
  const isListItemCollection = collectionName === 'app.bsky.graph.listitem';
  const isThreadgateCollection = collectionName === 'app.bsky.feed.threadgate';
  const isPostgateCollection = collectionName === 'app.bsky.feed.postgate';
  const isListblockCollection = collectionName === 'app.bsky.graph.listblock';
  const isLabelerCollection = collectionName === 'app.bsky.labeler.service';
  const isPostCollection = collectionName === 'app.bsky.feed.post';
  const isBadgeCollection = collectionName === 'at.atproto.supporter.badge';
  const isStatusSphereCollection = collectionName === 'xyz.statusphere.status';
  
  // Check if user is viewing their own list collection
  const collectionOwnerDid = data.uri.replace('at://', '').split('/')[0];
  const isOwnListCollection = isListCollection && session?.did === collectionOwnerDid;
  const canCreateList = isOwnListCollection && !!session && !isReadOnly;
  const isOwnPostCollection = isPostCollection && session?.did === collectionOwnerDid;
  const canCreatePost = isOwnPostCollection && !!session && !isReadOnly;
  
  // Check if it's a non-Bluesky collection and developer mode is on
  const isNonBlueskyCollection = !collectionName.startsWith('app.bsky.');
  const canDeveloperCreate = isDeveloperMode && !isReadOnly && session?.did === collectionOwnerDid;
  
  const tabs = [
    { id: 'info', label: 'Collection Information' },
    { id: 'raw', label: 'Raw Data' },
    { id: 'live', label: 'Jet Stream' }
  ];
  
  // Prepare Jetstream context for collection
  const jetstreamContext: JetstreamContextType = {
    type: 'collection',
    did: data.uri.replace('at://', '').split('/')[0],
    collection: collectionName,
    handle: data.data?.handle || data.data?.repoInfo?.handle
  };
  
  // Update combinedData whenever allRecords or cursor changes
  useEffect(() => {
    if (data.data && allRecords) {
      setCombinedData({
        ...data.data,
        records: allRecords,
        cursor: cursor  // Update the cursor in the JSON to reflect current state
      });
    }
  }, [allRecords, cursor, data.data]);

  // Compute filtered records directly instead of using state
  const filteredRecords = React.useMemo(() => {
    return filterRecords(allRecords, searchQuery);
  }, [searchQuery, allRecords]);
  
  // Load more records
  const loadMoreRecords = async () => {
    if (!cursor || isLoading) return;
    
    try {
      await execute((async () => {
        // Extract the collection path from the URI
        const collectionPath = data.uri.replace('at://', '');
        
        // Add cursor to fetch the next batch of records
        const response = await fetch(`/api/atproto?uri=${encodeURIComponent(collectionPath)}&cursor=${encodeURIComponent(cursor)}`);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.data?.records) {
            // Append the new records to the existing ones
            setAllRecords([...allRecords, ...result.data.records]);
            
            // Update cursor for next pagination
            setCursor(result.data.cursor || null);
          } else {
            // No more records or no cursor returned
            setCursor(null);
          }
        } else {
          console.error('Failed to load more records:', await response.text());
          setCursor(null);
        }
      })());
    } catch (error) {
      console.error('Error loading more records:', error);
      setCursor(null);
    }
  };

  // No records found message component
  const NoRecordsMessage = ({ error }: { error?: string }) => (
    <div className="text-gray-500 text-sm py-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
      {error ? (
        <div className="text-red-500">Error: {error}</div>
      ) : (
        <div>No records found in this collection</div>
      )}
    </div>
  );

  // Use progressive search results if available
  const displayRecords = React.useMemo(() => {
    if (isInSearchContext && searchQuery) {
      // Filter records based on search results from context
      const searchResultUris = new Set(searchContext.state.searchResults);
      return allRecords.filter(record => searchResultUris.has(record.uri));
    }
    return filteredRecords;
  }, [isInSearchContext, searchContext, searchQuery, allRecords, filteredRecords]);

  // Render the appropriate record item based on collection type
  const renderRecordItem = (record: RecordItem | SearchableRecord, index: number) => {
    // Use a stable key based on URI or CID
    const recordKey = record.uri || record.cid || `record-${index}`;
    
    if (record.value.$type === 'app.bsky.feed.post') {
      return (
        <PostItem
          key={recordKey}
          postRecord={record as any}
        />
      );
    } else if (isLikeCollection && record.value.$type === 'app.bsky.feed.like' && record.value.subject) {
      // Use searchable version when in search context
      return isInSearchContext ? (
        <SearchableLikedPostItem
          key={recordKey}
          likeRecord={record as any}
        />
      ) : (
        <LikedPostItem
          key={recordKey}
          likeRecord={record as any}
        />
      );
    } else if (isRepostCollection && record.value.$type === 'app.bsky.feed.repost' && record.value.subject) {
      // Use searchable version when in search context
      return isInSearchContext ? (
        <SearchableRepostedItem
          key={recordKey}
          repostRecord={record as any}
        />
      ) : (
        <RepostedItem
          key={recordKey}
          repostRecord={record as any}
        />
      );
    } else if (isBlockCollection && record.value.$type === 'app.bsky.graph.block' && record.value.subject) {
      return (
        <BlockedUserItem
          key={recordKey}
          blockRecord={record as any}
        />
      );
    } else if (isFollowCollection && record.value.$type === 'app.bsky.graph.follow' && record.value.subject) {
      return (
        <FollowedUserItem
          key={recordKey}
          followRecord={record as any}
        />
      );
    } else if (isListCollection && record.value.$type === 'app.bsky.graph.list') {
      // When viewing a collection of lists, show list records
      return (
        <RecordItem 
          key={recordKey}
          record={record}
          collectionUri={data.uri}
        />
      );
    } else if (data.uri.includes('/app.bsky.graph.list/') && data.uri.endsWith('/app.bsky.graph.listitem') && record.value.$type === 'app.bsky.graph.listitem') {
      // When viewing list items (members of a specific list)
      // Extract list owner DID from the collection URI
      const listOwnerDid = data.uri.replace('at://', '').split('/')[0];
      
      return (
        <ListItemUserEnhanced
          key={recordKey}
          listItemRecord={record as any}
          subjectProfile={(record as any).subject}
          listOwnerDid={listOwnerDid}
          onRemove={async () => {
            // Reload the collection to update the list
            const collectionPath = data.uri.replace('at://', '');
            try {
              const response = await fetch(`/api/atproto?uri=${encodeURIComponent(collectionPath)}`);
              if (response.ok) {
                const result = await response.json();
                if (result.data?.records) {
                  setAllRecords(result.data.records);
                }
              }
            } catch (error) {
              console.error('Failed to refresh list after removal:', error);
            }
          }}
        />
      );
    } else if (isListItemCollection && record.value.$type === 'app.bsky.graph.listitem') {
      // When viewing a collection of list items (not specific to one list)
      return (
        <ListItemRecord
          key={recordKey}
          listItemRecord={record as any}
        />
      );
    } else if (isThreadgateCollection && record.value.$type === 'app.bsky.feed.threadgate') {
      return isInSearchContext ? (
        <SearchableThreadgateItem
          key={recordKey}
          threadgateRecord={record as any}
        />
      ) : (
        <ThreadgateItem
          key={recordKey}
          threadgateRecord={record as any}
        />
      );
    } else if (isPostgateCollection && record.value.$type === 'app.bsky.feed.postgate') {
      return isInSearchContext ? (
        <SearchablePostgateItem
          key={recordKey}
          postgateRecord={record as any}
        />
      ) : (
        <PostgateItem
          key={recordKey}
          postgateRecord={record as any}
        />
      );
    } else if (isListblockCollection && record.value.$type === 'app.bsky.graph.listblock') {
      return (
        <ListblockItem
          key={recordKey}
          listblockRecord={record as any}
        />
      );
    } else if (isLabelerCollection && record.value.$type === 'app.bsky.labeler.service') {
      return (
        <LabelerItem
          key={recordKey}
          labelerRecord={record as any}
        />
      );
    } else if (record.value.$type === 'xyz.statusphere.status') {
      return (
        <StatusSphereItem
          key={recordKey}
          statusRecord={record as any}
        />
      );
    } else {
      return (
        <RecordItem 
          key={recordKey}
          record={record}
          collectionUri={data.uri}
        />
      );
    }
  };

  // Handle list creation
  const handleCreateList = async (listData: { name: string; description?: string; purpose: string }) => {
    try {
      const result = await executeRequest(async (agent) => {
        const record = {
          $type: 'app.bsky.graph.list',
          purpose: listData.purpose,
          name: listData.name,
          description: listData.description,
          createdAt: new Date().toISOString()
        };
        
        return await agent.api.com.atproto.repo.createRecord({
          repo: session!.did,
          collection: 'app.bsky.graph.list',
          record
        });
      });
      
      // Redirect to the new list record
      const newListUri = `at://${session!.did}/app.bsky.graph.list/${result.data.uri.split('/').pop()}`;
      window.location.href = `/viewer?uri=${newListUri}`;
    } catch (error) {
      console.error('Failed to create list:', error);
      alert('Failed to create list. Please try again.');
    }
  };


  return (
    <>
      <TabsContainer 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={(tab) => setActiveTab(tab as 'info' | 'raw' | 'live')}
      >
        <div style={{ display: activeTab === 'info' ? 'block' : 'none' }}>
          <CollectionHeader 
            name={collectionName}
            recordCount={allRecords.length}
            hasMore={!!cursor && allRecords.length >= 50}
            isLoading={isLoading}
            onLoadMore={loadMoreRecords}
          />
          
          {/* Create New List Button - Only show for list collections when user is authenticated */}
          {canCreateList && (
            <div className="mb-4">
              <button
                onClick={() => setShowCreateListModal(true)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Create New List
              </button>
            </div>
          )}
          
          {/* Create New Post Button - Only show for post collections when user is authenticated */}
          {canCreatePost && (
            <div className="mb-4">
              <button
                onClick={() => setShowCreatePostModal(true)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Create New Post
              </button>
            </div>
          )}
          
          {/* Create New Record Button - Only show for non-Bluesky collections in developer mode */}
          {canDeveloperCreate && (isNonBlueskyCollection || (!canCreateList && !canCreatePost)) && (
            <div className="mb-4">
              <button
                onClick={() => setShowCreateRecordModal(true)}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
              >
                Create New Record
              </button>
            </div>
          )}
          
          {/* Search Input - Always show if records exist */}
          {allRecords.length > 0 && (
            <>
              {!isInSearchContext ? (
                <CollectionSearch
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  totalRecords={allRecords.length}
                  filteredCount={filteredRecords.length}
                />
              ) : (
                <ProgressiveSearchInput />
              )}
            </>
          )}
          
          {/* Custom Badge Collection View */}
          {isBadgeCollection ? (
            <BadgeCollectionView 
              records={displayRecords as any}
              ownerDid={collectionOwnerDid}
              ownerHandle={data.data?.handle || data.data?.repoInfo?.handle}
            />
          ) : isStatusSphereCollection ? (
            /* Custom StatusSphere Collection View */
            <StatusSphereCollectionView 
              records={displayRecords as any}
              ownerDid={collectionOwnerDid}
              ownerHandle={data.data?.handle || data.data?.repoInfo?.handle}
            />
          ) : (
            <div className="space-y-4">
              {displayRecords.length > 0 ? (
                <>
                  {displayRecords.map((record, index) => renderRecordItem(record, index))}
                  
                  {/* Load More Button - only show if we have at least 50 records and there's more data */}
                  {cursor && allRecords.length >= 50 && !searchQuery && (
                    <LoadMoreButton
                      onClick={loadMoreRecords}
                      isLoading={isLoading}
                    />
                  )}
                </>
              ) : searchQuery ? (
              <div className="text-gray-500 text-sm py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <div className="mb-2">No records found matching "{searchQuery}"</div>
                <div className="space-y-2">
                  {/* Show index button if in search context */}
                  {isInSearchContext && searchContext && (
                    <div>
                      {searchContext.state.loadingProgress.loading > 0 ? (
                        <div className="space-y-2">
                          <div className="text-gray-500 flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Indexing content... ({searchContext.getSearchProgress().loaded} of {searchContext.getSearchProgress().total})
                          </div>
                          <div className="text-xs text-gray-400">
                            Search will automatically retry when complete
                          </div>
                        </div>
                      ) : searchContext.state.loadAllRequested && searchContext.state.loadingProgress.loading === 0 ? (
                        <div className="text-gray-500 text-sm space-y-1">
                          <div>All content indexed. Still no results found.</div>
                          <div className="text-xs">
                            Search is in beta and may not be accurate. Try using your browser's built-in search (Ctrl+F/Cmd+F) instead.
                          </div>
                        </div>
                      ) : searchContext.getSearchProgress().loaded < searchContext.getSearchProgress().total ? (
                        <button
                          onClick={() => {
                            searchContext.requestLoadAll();
                          }}
                          className="text-blue-500 hover:text-blue-600 text-sm"
                        >
                          Index all content and retry search
                        </button>
                      ) : null}
                    </div>
                  )}
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    Clear search
                  </button>
                </div>
              </div>
            ) : (
              <NoRecordsMessage error={data.data?.error} />
            )}
          </div>
          )}
        </div>
        
        <div style={{ display: activeTab === 'raw' ? 'block' : 'none' }}>
          <JsonViewer data={combinedData} uri={data.uri} />
        </div>

        <div style={{ display: activeTab === 'live' ? 'block' : 'none' }}>
          <JetstreamTab context={jetstreamContext} />
        </div>
      </TabsContainer>
      
      {/* Create List Modal */}
      {showCreateListModal && (
        <CreateListModal
          onClose={() => setShowCreateListModal(false)}
          onCreate={handleCreateList}
        />
      )}
      
      {/* Create Post Modal */}
      {showCreatePostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4">
          <div className="max-w-2xl w-full">
            <PostComposer
              onPostCreated={(postUri) => {
                setShowCreatePostModal(false);
                if (postUri) {
                  // Redirect to the new post
                  window.location.href = `/viewer?uri=${postUri}`;
                } else {
                  // Reload the collection to show the new post
                  window.location.reload();
                }
              }}
              onCancel={() => setShowCreatePostModal(false)}
              autoFocus={true}
            />
          </div>
        </div>
      )}
      
      {/* Create Record Modal - Developer Mode */}
      {showCreateRecordModal && (
        <CreateRecordModal
          isOpen={showCreateRecordModal}
          onClose={() => setShowCreateRecordModal(false)}
          repoDid={collectionOwnerDid}
          defaultCollection={collectionName}
          onRecordCreated={(uri) => {
            window.location.href = `/viewer?uri=${uri}`;
          }}
        />
      )}
    </>
  );
}

// Main export component
export default function CollectionView(props: CollectionViewProps) {
  const { data } = props;
  const collectionName = data.uri.split('/').pop();
  const isSearchableCollection = 
    collectionName === 'app.bsky.feed.like' || 
    collectionName === 'app.bsky.feed.repost' ||
    collectionName === 'app.bsky.graph.follow' ||
    collectionName === 'app.bsky.graph.block' ||
    collectionName === 'app.bsky.feed.threadgate' ||
    collectionName === 'app.bsky.feed.postgate';

  // State management for records needs to be at this level for searchable collections
  const initialRecordsRef = React.useRef<RecordItem[]>(data.data?.records || []);
  
  const [allRecords, setAllRecords] = useState<RecordItem[]>(() => [...(initialRecordsRef.current || [])]);

  // For searchable collections, wrap with SearchableCollectionView
  if (isSearchableCollection && data.data?.records?.length > 0) {
    return (
      <SearchableCollectionView
        records={allRecords}
        isSearchEnabled={true}
        showSearchInput={true}
      >
        <CollectionViewInner 
          {...props} 
          allRecords={allRecords}
          setAllRecords={setAllRecords}
        />
      </SearchableCollectionView>
    );
  }

  // For non-searchable collections, render directly
  return <CollectionViewInner {...props} />;
}
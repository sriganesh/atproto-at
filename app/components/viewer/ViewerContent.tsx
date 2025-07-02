'use client';

import { useState, useEffect, useRef } from 'react';
import { useLoadingState } from '../../hooks/useLoadingState';
import { useSearchParams, useRouter } from 'next/navigation';
import { resolveHandleInUri } from '@/lib/utils/atproto/handleResolver';
import { cleanInput } from '@/lib/utils/format/string-utils';

// Import components
import LoadingIndicator from '../ui/LoadingIndicator';
import ErrorDisplay from '../ui/ErrorDisplay';
import BreadcrumbNavigation from '../layout/BreadcrumbNavigation';
import PostView from '../posts/PostView';
import ProfileRecordView from '../profiles/ProfileRecordView';
import RepostView from '../reposts/RepostView';
import BlockView from '../blocks/BlockView';
import FollowView from '../follows/FollowView';
import LikeView from '../likes/LikeView';
import ListView from '../lists/ListView';
import ListItemView from '../listitems/ListItemView';
import ThreadgateView from '../threadgate/ThreadgateView';
import PostgateView from '../postgate/PostgateView';
import ListblockView from '../listblock/ListblockView';
import LabelerView from '../labeler/LabelerView';
import CollectionView from '../collections/CollectionView';
import ProfileView from '../profiles/ProfileView';
import RecordView from '../records/RecordView';
import { JsonViewer } from '../ui/JsonViewer';
import CopyButton from '../ui/CopyButton';
import DocumentIcon from '../ui/DocumentIcon';
import DidDocumentPopup from './DidDocumentPopup';

// Import extracted components and utilities
import RepositoryStatusWarnings from './RepositoryStatusWarnings';
import FallbackMessage from './FallbackMessage';
import { ViewerCacheProvider, useViewerCacheContext } from './context/ViewerCacheContext';
import { recordTypeHelpers, getDid } from './utils/recordTypeHelpers';
import { getBreadcrumbs } from './utils/breadcrumbUtils';

function ViewerContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isLoading: loading, error, execute, setData, setError, setIsLoading } = useLoadingState<any>();
  const [loadingMessage, setLoadingMessage] = useState('Loading AT Protocol data...');
  const [profileData, setProfileData] = useState<any>(null);
  const [pinnedPostData, setPinnedPostData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'raw'>('info');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [didDocumentOpen, setDidDocumentOpen] = useState(false);
  const sectionsInitialized = useRef(false);
  
  // Get cache context - must be called before any conditional returns
  const cacheContext = useViewerCacheContext();
  
  // Get URI from query params and clean it
  const dirtyUri = searchParams.get('uri');
  const uri = cleanInput(dirtyUri);
  
  useEffect(() => {
    async function fetchData() {
      if (!uri) {
        setIsLoading(false);
        setError(null);
        setData(null);
        return;
      }

      setIsLoading(true);
      setLoadingMessage('Loading AT Protocol data...');
      setError(null);
      
      try {
        // Check if the URI uses a handle format
        const { resolvedUri, error: resolveError } = await resolveHandleInUri(uri);
        
        if (resolveError && !resolvedUri) {
          throw new Error(resolveError);
        }

        // If the URI has been resolved (handle -> DID), redirect to maintain consistent URL patterns
        if (resolvedUri !== uri) {
          setIsLoading(true);
          setLoadingMessage(`Redirecting to normalized URI...`);
          router.replace(`/viewer?uri=${resolvedUri}`);
          return;
        }
        
        // Fetch data from API
        setLoadingMessage('Fetching record data...');
        const response = await fetch(`/api/atproto?uri=${encodeURIComponent(resolvedUri)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch data');
        }
        
        const result = await response.json();
        setData(result);

        // If we're viewing a collection or record, fetch the profile data for breadcrumbs
        if (result.type !== 'profile') {
          const didPart = result.uri.replace('at://', '').split('/')[0];
          
          try {
            const profileResponse = await fetch(`/api/atproto?uri=${encodeURIComponent(didPart)}`);
            if (profileResponse.ok) {
              const profileResult = await profileResponse.json();
              setProfileData(profileResult.data);
            }
          } catch (profileErr) {
            console.error('Failed to fetch profile data for breadcrumbs:', profileErr);
          }
        }
        
        // If we have a profile with a pinned post, fetch the pinned post data
        if (result.type === 'record' && 
            result.data?.value?.$type === 'app.bsky.actor.profile' && 
            result.data.value.pinnedPost?.uri) {
          try {
            const pinnedPostResponse = await fetch(`/api/atproto?uri=${encodeURIComponent(result.data.value.pinnedPost.uri)}`);
            if (pinnedPostResponse.ok) {
              const pinnedPostResult = await pinnedPostResponse.json();
              setPinnedPostData(pinnedPostResult.data);
            }
          } catch (pinnedPostErr) {
            console.error('Failed to fetch pinned post data:', pinnedPostErr);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [uri, router]);
  
  // Initialize expanded sections after data is loaded
  useEffect(() => {
    if (data && !sectionsInitialized.current) {
      const collections = data.data?.repoInfo?.collections || [];
      if (collections.length > 0) {
        const namespaces = new Set<string>();
        collections.forEach((collection: string) => {
          const parts = collection.split('.');
          namespaces.add(parts[0]);
        });
        
        const initialState: Record<string, boolean> = {};
        namespaces.forEach(namespace => {
          initialState[namespace] = true;
        });
        
        // Initialize PLC history section as collapsed by default
        if (data.type === 'profile' && data.plcLog && data.plcLog.length > 0) {
          initialState['plc-history'] = false;
        }
        
        setExpandedSections(initialState);
        sectionsInitialized.current = true;
      }
    }
  }, [data]);
  
  if (loading) {
    return <LoadingIndicator message={loadingMessage} />;
  }
  
  if (error) {
    return <ErrorDisplay error={error} />;
  }
  
  // Only show the placeholder when there's no data AND no URI
  if (!data && !uri) {
    return (
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <p>Enter an AT Protocol URI to view data</p>
        <p className="text-sm mt-2">Examples:</p>
        <ul className="text-sm ml-4 list-disc">
          <li>AT URI: <code>did:plc:example/app.bsky.feed.post/12345</code></li>
          <li>Plain DID: <code>did:plc:example</code></li>
          <li>Handle: <code>username.bsky.social</code></li>
          <li>Bluesky URL: <code>https://bsky.app/profile/username.bsky.social/post/12345</code></li>
        </ul>
      </div>
    );
  }
  
  // If we have a URI but no data yet (could be a loading state that wasn't caught)
  if (!data && uri) {
    return <LoadingIndicator message="Loading AT Protocol data..." />;
  }
  
  // Generate breadcrumbs for navigation
  const breadcrumbs = getBreadcrumbs(data, profileData);
  
  return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <BreadcrumbNavigation items={breadcrumbs} uri={data.uri} />
      )}
      
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center">
          <h2 className="text-lg font-medium">
            {data.type === 'record' && 'AT Protocol Record'}
            {data.type === 'collection' && 'AT Protocol Collection'}
            {data.type === 'profile' && 'AT Protocol Profile'}
          </h2>
        </div>
        <div className="mt-1 text-sm text-gray-500 break-all font-mono flex items-center">
          <span className="flex-1">{data.uri}</span>
          <CopyButton 
            textToCopy={data.uri ? data.uri.trim() : ''}
            title="Copy URI"
          />
        </div>
        
        {/* Repository status warnings */}
        <RepositoryStatusWarnings data={data} />
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Show fallback message if API fell back to a different level */}
        <FallbackMessage data={data} />
        
        {/* Record-specific display */}
        {data.type === 'record' && recordTypeHelpers.hasBskyPost(data) && (
          <PostView 
            data={data} 
            activeTab={activeTab} 
            setActiveTab={(tab) => setActiveTab(tab)}
            profileCache={cacheContext.profileCache}
            onProfileCached={cacheContext.handleProfileCached}
            getOrCreateProfileRequest={cacheContext.getOrCreateProfileRequest}
            postCache={cacheContext.postCache}
            onPostCached={cacheContext.handlePostCached}
            getOrCreatePostRequest={cacheContext.getOrCreatePostRequest}
          />
        )}
        
        {/* Profile record display */}
        {data.type === 'record' && recordTypeHelpers.hasBskyProfile(data) && (
          <ProfileRecordView 
            data={data} 
            pinnedPostData={pinnedPostData} 
            activeTab={activeTab} 
            setActiveTab={(tab) => setActiveTab(tab)} 
          />
        )}
        
        {/* Repost record display */}
        {data.type === 'record' && recordTypeHelpers.hasBskyRepost(data) && (
          <RepostView 
            data={data} 
            activeTab={activeTab} 
            setActiveTab={(tab) => setActiveTab(tab)}
            profileCache={cacheContext.profileCache}
            onProfileCached={cacheContext.handleProfileCached}
            getOrCreateProfileRequest={cacheContext.getOrCreateProfileRequest}
            postCache={cacheContext.postCache}
            onPostCached={cacheContext.handlePostCached}
            getOrCreatePostRequest={cacheContext.getOrCreatePostRequest}
          />
        )}
        
        {/* Block record display */}
        {data.type === 'record' && recordTypeHelpers.hasBskyBlock(data) && (
          <BlockView 
            data={data} 
            activeTab={activeTab} 
            setActiveTab={(tab) => setActiveTab(tab)} 
          />
        )}
        
        {/* Follow record display */}
        {data.type === 'record' && recordTypeHelpers.hasBskyFollow(data) && (
          <FollowView 
            data={data} 
            activeTab={activeTab} 
            setActiveTab={(tab) => setActiveTab(tab)} 
          />
        )}
        
        {/* Like record display */}
        {data.type === 'record' && recordTypeHelpers.hasBskyLike(data) && (
          <LikeView 
            data={data} 
            activeTab={activeTab} 
            setActiveTab={(tab) => setActiveTab(tab)}
            profileCache={cacheContext.profileCache}
            onProfileCached={cacheContext.handleProfileCached}
            getOrCreateProfileRequest={cacheContext.getOrCreateProfileRequest}
            postCache={cacheContext.postCache}
            onPostCached={cacheContext.handlePostCached}
            getOrCreatePostRequest={cacheContext.getOrCreatePostRequest}
          />
        )}
        
        {/* List record display */}
        {data.type === 'record' && recordTypeHelpers.hasBskyList(data) && (
          <ListView 
            data={data} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
          />
        )}
        
        {/* ListItem record display */}
        {data.type === 'record' && recordTypeHelpers.hasBskyListItem(data) && (
          <ListItemView 
            data={data} 
            activeTab={activeTab} 
            setActiveTab={(tab) => setActiveTab(tab)} 
          />
        )}
        
        {/* Threadgate record display */}
        {data.type === 'record' && recordTypeHelpers.hasBskyThreadgate(data) && (
          <ThreadgateView 
            data={data} 
            activeTab={activeTab} 
            setActiveTab={(tab) => setActiveTab(tab)}
            profileCache={cacheContext.profileCache}
            onProfileCached={cacheContext.handleProfileCached}
            getOrCreateProfileRequest={cacheContext.getOrCreateProfileRequest}
            postCache={cacheContext.postCache}
            onPostCached={cacheContext.handlePostCached}
            getOrCreatePostRequest={cacheContext.getOrCreatePostRequest}
          />
        )}
        
        {/* Postgate record display */}
        {data.type === 'record' && recordTypeHelpers.hasBskyPostgate(data) && (
          <PostgateView 
            data={data} 
            activeTab={activeTab} 
            setActiveTab={(tab) => setActiveTab(tab)}
            profileCache={cacheContext.profileCache}
            onProfileCached={cacheContext.handleProfileCached}
            getOrCreateProfileRequest={cacheContext.getOrCreateProfileRequest}
            postCache={cacheContext.postCache}
            onPostCached={cacheContext.handlePostCached}
            getOrCreatePostRequest={cacheContext.getOrCreatePostRequest}
          />
        )}
        
        {/* Listblock record display */}
        {data.type === 'record' && recordTypeHelpers.hasBskyListblock(data) && (
          <ListblockView 
            data={data} 
            activeTab={activeTab} 
            setActiveTab={(tab) => setActiveTab(tab)}
            profileCache={cacheContext.profileCache}
            onProfileCached={cacheContext.handleProfileCached}
            getOrCreateProfileRequest={cacheContext.getOrCreateProfileRequest}
          />
        )}
        
        {/* Labeler service display */}
        {data.type === 'record' && recordTypeHelpers.hasBskyLabeler(data) && (
          <LabelerView 
            data={data} 
            activeTab={activeTab} 
            setActiveTab={(tab) => setActiveTab(tab)}
          />
        )}
        
        {/* Collection display */}
        {data.type === 'collection' && (
          <CollectionView 
            data={data}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}
        
        {/* Profile display */}
        {data.type === 'profile' && (
          <ProfileView 
            data={data}
            plcLog={data.plcLog || []}
            showDidDocument={() => setDidDocumentOpen(true)}
          />
        )}
        
        {/* Default generic record display for unknown record types */}
        {data.type === 'record' && 
         !recordTypeHelpers.hasBskyPost(data) && 
         !recordTypeHelpers.hasBskyProfile(data) && 
         !recordTypeHelpers.hasBskyRepost(data) && 
         !recordTypeHelpers.hasBskyBlock(data) && 
         !recordTypeHelpers.hasBskyFollow(data) && 
         !recordTypeHelpers.hasBskyLike(data) && 
         !recordTypeHelpers.hasBskyList(data) && 
         !recordTypeHelpers.hasBskyListItem(data) && 
         !recordTypeHelpers.hasBskyThreadgate(data) && 
         !recordTypeHelpers.hasBskyPostgate(data) && 
         !recordTypeHelpers.hasBskyListblock(data) && 
         !recordTypeHelpers.hasBskyLabeler(data) && (
          <RecordView 
            data={data} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
          />
        )}
      </div>
      
      {/* DID Document Popup */}
      {didDocumentOpen && (
        <DidDocumentPopup 
          did={getDid(data)} 
          isOpen={didDocumentOpen}
          onClose={() => setDidDocumentOpen(false)} 
        />
      )}
    </div>
  );
}

export default function ViewerContent() {
  return (
    <ViewerCacheProvider>
      <ViewerContentInner />
    </ViewerCacheProvider>
  );
} 
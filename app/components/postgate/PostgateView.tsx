import React, { useState } from 'react';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import PostCard from '../posts/PostCard';
import { useLoadingState } from '../../hooks/useLoadingState';
import { useErrorHandler, getUserFriendlyMessage } from '../../hooks/useErrorHandler';
import { getAuthorDidFromUri } from '@/lib/utils/atproto';
import { fetchProfileData, extractProfileInfo } from '@/lib/utils/profile';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '../../hooks/useAuthenticatedRequest';
import RecordEditor from '../records/RecordEditor';

type PostgateViewProps = {
  data: any;
  activeTab: 'info' | 'raw';
  setActiveTab: (tab: 'info' | 'raw') => void;
  profileCache?: Map<string, any>;
  onProfileCached?: (did: string, profileData: any) => void;
  getOrCreateProfileRequest?: (did: string, requestFn: () => Promise<any>) => Promise<any>;
  postCache?: Map<string, any>;
  onPostCached?: (postUri: string, postData: any) => void;
  getOrCreatePostRequest?: (postUri: string, requestFn: () => Promise<any>) => Promise<any>;
};

export default function PostgateView({ 
  data, 
  activeTab, 
  setActiveTab,
  profileCache,
  onProfileCached,
  getOrCreateProfileRequest,
  postCache,
  onPostCached,
  getOrCreatePostRequest
}: PostgateViewProps) {
  const { data: postgateData, isLoading, error, execute } = useLoadingState<{
    post: any;
    authorInfo: any;
  }>();
  
  const { handleError } = useErrorHandler();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { session } = useAuth();
  const { isReadOnly, isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  
  // Check if user owns this postgate and can edit/delete it
  const ownerDid = getAuthorDidFromUri(data.uri);
  const isOwner = session?.did === ownerDid;
  const canDeveloperEdit = isDeveloperMode && !isReadOnly && isOwner && !!session;
  
  const tabs = [
    { id: 'info', label: 'Postgate Information' },
    { id: 'raw', label: 'Raw Data' }
  ];
  
  // Handle delete record
  const handleDelete = async () => {
    if (!canDeveloperEdit || isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      await executeRequest(async (agent) => {
        // Extract collection and rkey from URI
        const uriParts = data.uri.replace('at://', '').split('/');
        const repo = uriParts[0];
        const collection = uriParts[1];
        const rkey = uriParts[2];
        
        await agent.com.atproto.repo.deleteRecord({
          repo,
          collection,
          rkey
        });
      });
      
      // Show a message about the delay
      const loadingToast = document.createElement('div');
      loadingToast.innerHTML = `
        <div class="text-center">
          <div class="font-medium">Postgate deleted successfully!</div>
          <div class="text-sm mt-1 opacity-90">Redirecting to collection...</div>
        </div>
      `;
      loadingToast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm';
      document.body.appendChild(loadingToast);
      
      // Redirect to collection after deletion
      setTimeout(() => {
        const collectionUri = data.uri.split('/').slice(0, -1).join('/');
        window.location.href = `/viewer?uri=${collectionUri}`;
      }, 2500);
    } catch (error) {
      console.error('Failed to delete postgate:', error);
      alert('Failed to delete postgate. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Extract postgate data
  const postgate = data.data;
  const postgateValue = postgate.value;
  
  // Format the date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch (err) {
      return '';
    }
  };

  // Fetch the post this postgate applies to
  React.useEffect(() => {
    const fetchPostgateData = async () => {
      try {
        await execute((async () => {
          if (!postgateValue.post) {
            throw new Error('Missing post URI in postgate');
          }

          // Fetch the post with caching
          let postData;
          const postUri = postgateValue.post;
          const cleanUri = postUri.replace(/^at:\/\//i, '');
          
          // Check cache first
          if (postCache?.has(postUri)) {
            const cachedData = postCache.get(postUri);
            postData = { data: cachedData };
          } else if (getOrCreatePostRequest) {
            // Use request deduplication
            const fetchedData = await getOrCreatePostRequest(postUri, async () => {
              const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
              if (!response.ok) {
                throw new Error(`Failed to fetch post: ${response.status}`);
              }
              const result = await response.json();
              return result.data;
            });
            postData = { data: fetchedData };
            
            // Cache the result
            if (onPostCached && fetchedData) {
              onPostCached(postUri, fetchedData);
            }
          } else {
            // Direct fetch as fallback
            const response = await fetch(`/api/atproto?uri=${encodeURIComponent(cleanUri)}`);
            if (!response.ok) {
              throw new Error(`Failed to fetch post: ${response.status}`);
            }
            postData = await response.json();
          }
          
          // Extract PDS hostname from the API URL
          const pdsHostname = postData.apiUrl ? new URL(postData.apiUrl || 'https://bsky.social').hostname : 'bsky.social';
          const post = {...postData.data, pdsEndpoint: pdsHostname};

          // Fetch author profile
          let authorInfo = null;
          const postAuthorDid = getAuthorDidFromUri(postUri);
          if (postAuthorDid) {
            try {
              // Check cache first
              if (profileCache?.has(postAuthorDid)) {
                const cachedProfile = profileCache.get(postAuthorDid);
                authorInfo = extractProfileInfo(cachedProfile);
              } else if (getOrCreateProfileRequest) {
                // Use request deduplication
                const profileData = await getOrCreateProfileRequest(postAuthorDid, async () => {
                  return await fetchProfileData(postAuthorDid);
                });
                
                authorInfo = extractProfileInfo(profileData);
                
                // Cache the result
                if (onProfileCached && profileData) {
                  onProfileCached(postAuthorDid, profileData);
                }
              } else {
                // Direct fetch as fallback
                const profileData = await fetchProfileData(postAuthorDid);
                authorInfo = extractProfileInfo(profileData);
              }
            } catch (profileError) {
              console.error('Error fetching author profile:', profileError);
              // Use fallback info
              authorInfo = {
                handle: postAuthorDid.substring(8, 16) + '...',
                displayName: 'Unknown User',
                did: postAuthorDid
              };
            }
          }

          return {
            post,
            authorInfo
          };
        })());
      } catch (err) {
        const errorInfo = handleError(err, 'PostgateView.fetchPostgateData');
      }
    };

    fetchPostgateData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postgateValue.post, execute]);

  return (
    <>
      <TabsContainer 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={(tabId) => setActiveTab(tabId as 'info' | 'raw')}
        rightContent={
          canDeveloperEdit ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-3 py-1 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600 transition-colors"
              >
                Edit Record
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Delete Record
              </button>
            </div>
          ) : undefined
        }
      >
        <div style={{ display: activeTab === 'info' ? 'block' : 'none' }}>
          <div className="space-y-6">
            {isLoading && (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading postgate information...</div>
              </div>
            )}
            
            {error && (
              <div className="text-center py-8">
                <div className="text-red-500">
                  {getUserFriendlyMessage({ 
                    message: error, 
                    timestamp: new Date() 
                  })}
                </div>
              </div>
            )}
            
            {!isLoading && !error && (
              <>
                {/* Postgate header */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl" role="img" aria-label="postgate">🚫</span>
                    <div>
                      <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                        Post Embedding Restrictions
                      </div>
                      <div className="text-xs text-gray-500">
                        Created {formatDate(postgateValue.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Restrictions info */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <h3 className="font-medium mb-3">Embedding Restrictions</h3>
                  
                  {/* Embedding rules */}
                  {postgateValue.embeddingRules && postgateValue.embeddingRules.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Embedding status:
                      </h4>
                      <ul className="space-y-2">
                        {postgateValue.embeddingRules.map((rule: any, index: number) => (
                          <li key={index} className="flex items-center space-x-2 text-sm">
                            <span className="text-red-500">✗</span>
                            <span>{describeEmbeddingRule(rule)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Detached embeddings */}
                  {postgateValue.detachedEmbeddingUris && postgateValue.detachedEmbeddingUris.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Detached embeddings: {postgateValue.detachedEmbeddingUris.length}
                      </h4>
                      <div className="text-sm text-gray-500">
                        The author has detached some previous embeddings of this post
                      </div>
                    </div>
                  )}
                  
                  {/* No restrictions */}
                  {(!postgateValue.embeddingRules || postgateValue.embeddingRules.length === 0) && 
                   (!postgateValue.detachedEmbeddingUris || postgateValue.detachedEmbeddingUris.length === 0) && (
                    <div className="text-sm text-gray-500">
                      No embedding restrictions configured - this post can be quoted/embedded freely
                    </div>
                  )}
                </div>
                
                {/* Original post */}
                {postgateData && postgateData.post && (
                  <div>
                    <h3 className="font-medium mb-3">Original Post</h3>
                    <div className="border-2 border-purple-400 dark:border-purple-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-md">
                      <PostCard 
                        post={{...postgateData.post, service: postgateData.post?.pdsEndpoint || 'bsky.social'}} 
                        authorInfo={postgateData.authorInfo}
                        profileCache={profileCache}
                        onProfileCached={onProfileCached}
                        getOrCreateProfileRequest={getOrCreateProfileRequest}
                        postCache={postCache}
                        onPostCached={onPostCached}
                        getOrCreatePostRequest={getOrCreatePostRequest}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        <div style={{ display: activeTab === 'raw' ? 'block' : 'none' }}>
          <JsonViewer data={data.data} />
        </div>
      </TabsContainer>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-3">Delete Postgate?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              This action cannot be undone. This postgate will be permanently deleted.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              URI: {data.uri}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Record Modal */}
      {showEditModal && (
        <RecordEditor
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          recordData={postgate}
          recordUri={data.uri}
          onRecordUpdated={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

// Helper function to describe embedding rules
function describeEmbeddingRule(rule: any): string {
  if (rule.$type === 'app.bsky.feed.postgate#disableRule') {
    return 'Embedding/quoting is disabled for this post';
  } else {
    return 'Custom embedding rule';
  }
}
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import UserAvatar from '../profiles/UserAvatar';
import RichTextContent from './RichTextContent';
import ImageEmbed from './ImageEmbed';
import VideoEmbed from './VideoEmbed';
import ExternalEmbed from './ExternalEmbed';
import EmbeddedPost from './EmbeddedPost';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '@/app/hooks/useAuthenticatedRequest';
import PostComposer from '../composer/PostComposer';

type AuthorInfo = {
  displayName?: string;
  handle?: string;
  avatar?: string;
};

type PostCardProps = {
  post: any;
  authorInfo?: AuthorInfo;
  isReply?: boolean;
  isQuote?: boolean;
  quoteDepth?: number;
  hideLinks?: boolean;
  // Cache for profile and post content to avoid repeated fetches
  profileCache?: Map<string, any>;
  onProfileCached?: (did: string, profileData: any) => void;
  getOrCreateProfileRequest?: (did: string, requestFn: () => Promise<any>) => Promise<any>;
  postCache?: Map<string, any>;
  onPostCached?: (postUri: string, postData: any) => void;
  getOrCreatePostRequest?: (postUri: string, requestFn: () => Promise<any>) => Promise<any>;
};

export default function PostCard({ 
  post, 
  authorInfo, 
  isReply = false, 
  isQuote = false, 
  quoteDepth = 0, 
  hideLinks = false,
  profileCache,
  onProfileCached,
  getOrCreateProfileRequest,
  postCache,
  onPostCached,
  getOrCreatePostRequest
}: PostCardProps) {
  if (!post) return null;
  
  const { session } = useAuth();
  const { isReadOnly } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const [likeUri, setLikeUri] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [repostUri, setRepostUri] = useState<string | null>(null);
  const [isReposting, setIsReposting] = useState(false);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const postValue = post.value;
  const postTime = postValue?.createdAt ? new Date(postValue.createdAt) : null;
  const formattedTime = postTime ? formatDistanceToNow(postTime, { addSuffix: true }) : '';
  
  // Handle author information
  const author = authorInfo || {};
  const handle = author.handle || 'unknown';
  const displayName = author.displayName || handle;
  const avatar = author.avatar;
  
  // Debug author info to help diagnose issues
    
  // Extract post URI components
  const uriParts = post.uri?.split('/') || [];
  const authorDid = uriParts.length > 0 ? uriParts[2] : '';
  const recordId = uriParts.length > 3 ? uriParts[4] : '';
  
  // Check if current user is the author
  const isOwnPost = session?.did === authorDid;
  
  // Determine PDS service
  const pdsService = post.service || 'bsky.social';
  
  // Extract embedded content
  const hasEmbed = !!postValue?.embed;
  const embedType = hasEmbed ? postValue.embed.$type : null;
  
  
  // Check if current user has liked/reposted this post
  useEffect(() => {
    const checkViewerState = async () => {
      if (!session || !post.uri || !post.cid) return;
      
      try {
        // Get post with viewer state
        const response = await executeRequest(async (agent) => {
          return await agent.app.bsky.feed.getPostThread({
            uri: post.uri,
            depth: 0
          });
        });
        
        // Check viewer state from the post
        const viewer = response.data.thread?.post?.viewer;
        if (viewer) {
          // Check like status
          if (viewer.like) {
            setIsLiked(true);
            setLikeUri(viewer.like);
          }
          
          // Check repost status
          if (viewer.repost) {
            setIsReposted(true);
            setRepostUri(viewer.repost);
          }
        }
      } catch (error) {
        // Silently fail - user might not have permission to view post
        console.error('Error checking viewer state:', error);
      }
    };
    
    if (!isReadOnly && session) {
      checkViewerState();
    }
  }, [session, post.uri, post.cid, executeRequest, isReadOnly]);
  
  // Handle like/unlike
  const handleLike = async () => {
    if (!session || !post.uri || !post.cid || isReadOnly || isLiking) return;
    
    setIsLiking(true);
    
    // Optimistic update
    const wasLiked = isLiked;
    const previousLikeUri = likeUri;
    setIsLiked(!wasLiked);
    
    try {
      if (wasLiked && previousLikeUri) {
        // Unlike
        await executeRequest(async (agent) => {
          await agent.deleteLike(previousLikeUri);
        });
        setLikeUri(null);
      } else {
        // Like
        const result = await executeRequest(async (agent) => {
          return await agent.like(post.uri, post.cid);
        });
        setLikeUri(result.uri);
        // Redirect to the like record
        const cleanUri = result.uri.replace('at://', '');
        router.push(`/viewer?uri=${cleanUri}`);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setLikeUri(previousLikeUri);
    } finally {
      setIsLiking(false);
    }
  };
  
  // Handle repost/unrepost
  const handleRepost = async () => {
    if (!session || !post.uri || !post.cid || isReadOnly || isReposting) return;
    
    setIsReposting(true);
    
    // Optimistic update
    const wasReposted = isReposted;
    const previousRepostUri = repostUri;
    setIsReposted(!wasReposted);
    
    try {
      if (wasReposted && previousRepostUri) {
        // Unrepost
        await executeRequest(async (agent) => {
          await agent.deleteRepost(previousRepostUri);
        });
        setRepostUri(null);
      } else {
        // Repost
        const result = await executeRequest(async (agent) => {
          return await agent.repost(post.uri, post.cid);
        });
        setRepostUri(result.uri);
        // Redirect to the repost record
        const cleanUri = result.uri.replace('at://', '');
        router.push(`/viewer?uri=${cleanUri}`);
      }
    } catch (error) {
      console.error('Error toggling repost:', error);
      // Revert optimistic update on error
      setIsReposted(wasReposted);
      setRepostUri(previousRepostUri);
    } finally {
      setIsReposting(false);
    }
  };
  
  // Handle delete post
  const handleDelete = async () => {
    if (!session || !post.uri || !isOwnPost || isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      await executeRequest(async (agent) => {
        // Extract rkey from URI
        const rkey = recordId;
        // Use the proper deleteRecord method with full parameters
        await agent.com.atproto.repo.deleteRecord({
          repo: session.did, // Use the user's DID, not the shortened version
          collection: 'app.bsky.feed.post',
          rkey: rkey
        });
      });
      
      // Close confirmation dialog
      setShowDeleteConfirm(false);
      
      // TODO: Notify parent component to remove post from view
      // For now, just reload the page
      window.location.reload();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };
  
  
  // Function to render the appropriate embed
  const renderEmbed = () => {
    if (!hasEmbed) return null;
    
    switch (embedType) {
      case 'app.bsky.embed.images':
        return <ImageEmbed images={postValue.embed.images} authorDid={authorDid} />;
      
      case 'app.bsky.embed.video':
        return <VideoEmbed videoData={postValue.embed} authorDid={authorDid} postUri={post.uri} />;
      
      case 'app.bsky.embed.record':
        return <EmbeddedPost 
          embed={postValue.embed} 
          authorDid={authorDid} 
          depth={quoteDepth + 1}
          profileCache={profileCache}
          onProfileCached={onProfileCached}
          getOrCreateProfileRequest={getOrCreateProfileRequest}
          postCache={postCache}
          onPostCached={onPostCached}
          getOrCreatePostRequest={getOrCreatePostRequest}
        />;
      
      case 'app.bsky.embed.recordWithMedia':
        // This combines a record embed with media
        const mediaEmbed = postValue.embed.media;
        return (
          <div>
            {mediaEmbed.$type === 'app.bsky.embed.images' && 
              <ImageEmbed images={mediaEmbed.images} authorDid={authorDid} />
            }
            {mediaEmbed.$type === 'app.bsky.embed.video' && 
              <VideoEmbed videoData={mediaEmbed} authorDid={authorDid} postUri={post.uri} />
            }
            <EmbeddedPost 
              embed={postValue.embed} 
              authorDid={authorDid} 
              depth={quoteDepth + 1}
              profileCache={profileCache}
              onProfileCached={onProfileCached}
              getOrCreateProfileRequest={getOrCreateProfileRequest}
              postCache={postCache}
              onPostCached={onPostCached}
              getOrCreatePostRequest={getOrCreatePostRequest}
            />
          </div>
        );
      
      case 'app.bsky.embed.external':
        return <ExternalEmbed external={postValue.embed.external} authorDid={authorDid} hideLink={hideLinks} />;
      
      default:
        return (
          <div className="mt-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
            <p className="text-sm text-gray-500">
              Unknown embed type: {embedType}
            </p>
          </div>
        );
    }
  };
  
  const cardClasses = `p-4 ${isQuote ? 'bg-gray-50 dark:bg-gray-900 rounded-lg' : ''}`;
  
  return (
    <div className={cardClasses}>
      <div className="flex items-start">
        <div className="mr-3 flex-shrink-0">
          <UserAvatar avatar={avatar} handle={handle} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {displayName}
            </h3>
            <span className="text-sm text-gray-500">
              @{handle}
            </span>
            {postTime && (
              <span className="text-sm text-gray-500">
                · {formattedTime}
              </span>
            )}
          </div>
          
          {/* Post content */}
          <div className="mt-1">
            <RichTextContent 
              text={postValue?.text || ''} 
              facets={postValue?.facets}
              className="text-gray-800 dark:text-gray-200"
            />
          </div>
          
          {/* Embedded content */}
          {renderEmbed()}
          
          {/* Post actions/metadata */}
          {!hideLinks && (
            <div className="mt-3">
              {/* Desktop layout: flex with space between */}
              <div className="hidden sm:flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <a
                    href={`/viewer?uri=${authorDid}/app.bsky.feed.post/${recordId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-500 hover:underline flex items-center gap-1"
                  >
                    atproto.at
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  
                  <a
                    href={`https://bsky.app/profile/${authorDid}/post/${recordId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-500 hover:underline flex items-center gap-1"
                  >
                    🦋
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  
                  <a
                    href={`https://${pdsService}/xrpc/com.atproto.repo.getRecord?repo=${authorDid}&collection=app.bsky.feed.post&rkey=${recordId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-500 hover:underline flex items-center gap-1"
                  >
                    PDS
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
                
                {/* Action buttons on desktop */}
                {session && !isReadOnly && (
                  <div className="flex items-center gap-3">
                  {/* Reply button */}
                  <button
                    onClick={() => setShowReplyComposer(!showReplyComposer)}
                    className="p-1.5 rounded transition-colors text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Reply to post"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                  </button>
                  
                  {/* Like button */}
                  <button
                    onClick={handleLike}
                    disabled={isLiking}
                    className={`p-1.5 rounded transition-colors ${
                      isLiked
                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={isLiked ? 'Unlike post' : 'Like post'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill={isLiked ? 'currentColor' : 'none'}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                  
                  {/* Repost button */}
                  <button
                    onClick={handleRepost}
                    disabled={isReposting}
                    className={`p-1.5 rounded transition-colors ${
                      isReposted
                        ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                        : 'text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                    } ${isReposting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={isReposted ? 'Undo repost' : 'Repost'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 7h16M4 7l4-4M4 7l4 4m12 10H4m16 0l-4 4m4-4l-4-4"
                      />
                    </svg>
                  </button>
                  
                  {/* Delete button - only show for own posts */}
                  {isOwnPost && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting}
                      className={`p-1.5 rounded transition-colors text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      aria-label="Delete post"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                  
                  </div>
                )}
              </div>
              
              {/* Mobile layout: stacked */}
              <div className="sm:hidden space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <a
                    href={`/viewer?uri=${authorDid}/app.bsky.feed.post/${recordId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-500 hover:underline flex items-center gap-1"
                  >
                    atproto.at
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  
                  <a
                    href={`https://bsky.app/profile/${authorDid}/post/${recordId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-500 hover:underline flex items-center gap-1"
                  >
                    🦋
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  
                  <a
                    href={`https://${pdsService}/xrpc/com.atproto.repo.getRecord?repo=${authorDid}&collection=app.bsky.feed.post&rkey=${recordId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-500 hover:underline flex items-center gap-1"
                  >
                    PDS
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
                
                {/* Action buttons on mobile */}
                {session && !isReadOnly && (
                  <div className="flex items-center gap-4">
                    {/* Reply button */}
                    <button
                      onClick={() => setShowReplyComposer(!showReplyComposer)}
                      className="p-1.5 rounded transition-colors text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-label="Reply to post"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                        />
                      </svg>
                    </button>
                    
                    {/* Like button */}
                    <button
                      onClick={handleLike}
                      disabled={isLiking}
                      className={`p-1.5 rounded transition-colors ${
                        isLiked
                          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                      } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={isLiked ? 'Unlike post' : 'Like post'}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill={isLiked ? 'currentColor' : 'none'}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                    
                    {/* Repost button */}
                    <button
                      onClick={handleRepost}
                      disabled={isReposting}
                      className={`p-1.5 rounded transition-colors ${
                        isReposted
                          ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                          : 'text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                      } ${isReposting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={isReposted ? 'Undo repost' : 'Repost'}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 7h16M4 7l4-4M4 7l4 4m12 10H4m16 0l-4 4m4-4l-4-4"
                        />
                      </svg>
                    </button>
                    
                    {/* Delete button - only show for own posts */}
                    {isOwnPost && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isDeleting}
                        className={`p-1.5 rounded transition-colors text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        aria-label="Delete post"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Reply composer */}
      {showReplyComposer && session && !isReadOnly && (
        <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          <PostComposer
            replyTo={{
              root: postValue?.reply?.root || { uri: post.uri, cid: post.cid },
              parent: { uri: post.uri, cid: post.cid }
            }}
            replyingToHandle={handle}
            onPostCreated={(postUri) => {
              setShowReplyComposer(false);
              // Redirect to the new reply post
              if (postUri) {
                const cleanUri = postUri.replace('at://', '');
                router.push(`/viewer?uri=${cleanUri}`);
              }
            }}
            onCancel={() => setShowReplyComposer(false)}
            autoFocus={true}
          />
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-3">Delete Post?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This action cannot be undone. This post will be permanently deleted.
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
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
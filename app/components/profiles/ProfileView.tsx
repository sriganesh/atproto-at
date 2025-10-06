import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import CopyableField from '../ui/CopyableField';
import ExpandableSection from '../ui/ExpandableSection';
import PlcDirectoryView from '../viewer/PlcDirectoryView';
import DownloadDropdown, { DownloadFormat } from '../ui/DownloadDropdown';
import Toast from '../ui/Toast';
import JetstreamTab from '../../viewer/components/jetstream/JetstreamTab';
import { JetstreamContextType } from '../../viewer/components/jetstream/types';
import { downloadRepoEnhanced } from '@/lib/utils/export/downloadRepoEnhanced';
import BlobsView from '../blobs/BlobsView';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '@/app/hooks/useAuthenticatedRequest';
import CreateRecordModal from '../records/CreateRecordModal';

type ProfileViewProps = {
  data: any;
  plcLog: any[];
  isTakendown?: boolean;
  isDeactivated?: boolean;
  isUnavailable?: boolean;
  repoUnavailable?: boolean;
  showDidDocument?: () => void;
};

export default function ProfileView({ 
  data, 
  plcLog, 
  isTakendown = false, 
  isDeactivated = false, 
  isUnavailable = false,
  repoUnavailable = false,
  showDidDocument
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'raw' | 'blobs' | 'live'>('info');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Auth hooks for follow functionality
  const { session } = useAuth();
  const { isReadOnly, isDeveloperMode } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  const [showCreateRecordModal, setShowCreateRecordModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followUri, setFollowUri] = useState<string | null>(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMuteLoading, setIsMuteLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockUri, setBlockUri] = useState<string | null>(null);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);
  const [isSuspendedOnBluesky, setIsSuspendedOnBluesky] = useState(false);

  // Calculate anniversary/new account status
  const getAccountAgeEmoji = () => {
    if (!plcLog || plcLog.length === 0) return null;
    
    // Find the account creation entry
    // It's the first entry in the array (oldest chronologically)
    const creationEntry = plcLog[0];
    
    if (!creationEntry?.createdAt) return null;
    
    const creationDate = new Date(creationEntry.createdAt);
    const today = new Date();
    
    // Check if account was created today (comparing UTC dates)
    const createdToday = 
      creationDate.getUTCFullYear() === today.getUTCFullYear() &&
      creationDate.getUTCMonth() === today.getUTCMonth() &&
      creationDate.getUTCDate() === today.getUTCDate();
    
    if (createdToday) {
      return { emoji: '👶', title: 'New account - created today!' };
    }
    
    // Check if it's the anniversary (same month and day, different year)
    if (
      creationDate.getUTCMonth() === today.getUTCMonth() &&
      creationDate.getUTCDate() === today.getUTCDate() &&
      creationDate.getUTCFullYear() !== today.getUTCFullYear() &&
      creationDate.getUTCFullYear() < today.getUTCFullYear()
    ) {
      const years = today.getUTCFullYear() - creationDate.getUTCFullYear();
      return { emoji: '🎂', title: `Account anniversary - ${years} year${years > 1 ? 's' : ''} old!` };
    }
    
    return null;
  };
  
  // Persistent blob state across tab switches
  const [blobState, setBlobState] = useState<{
    blobs: string[];
    cursor: string | null;
    isLoading: boolean;
    isLoadingMore: boolean;
    error: string | null;
    hasLoaded: boolean;
  }>({
    blobs: [],
    cursor: null,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    hasLoaded: false
  });
  
  const tabs = [
    { id: 'info', label: 'Profile Information' },
    { id: 'raw', label: 'Raw Data' },
    { id: 'blobs', label: 'Blobs' },
    { id: 'live', label: 'Jet Stream' }
  ];
  
  // Prepare Jetstream context
  const jetstreamContext: JetstreamContextType = {
    type: 'profile',
    did: data.data.did || data.uri.replace('at://', ''),
    handle: data.data?.handle || data.data?.repoInfo?.handle
  };
  
  // Helper to extract PDS endpoint from didDoc
  const getPdsEndpoint = () => {
    if (!data?.data?.repoInfo?.didDoc?.service) return null;
    
    const pdsService = data.data.repoInfo.didDoc.service.find(
      (s: any) => s.type === 'AtprotoPersonalDataServer' || s.id === '#atproto_pds' || s.id.endsWith('atproto_pds')
    );
    
    return pdsService?.serviceEndpoint || null;
  };
  
  // Helper to get the DID
  const getDid = () => data.data.did || data.uri.replace('at://', '');
  
  // Helper to get the handle
  const getHandle = () => data.data?.handle || data.data?.repoInfo?.handle || null;

  // Handle repository download
  const handleDownloadRepo = async (format: DownloadFormat = 'car') => {
    const pdsUrl = getPdsEndpoint();
    const did = getDid();
    const handle = getHandle();
    
    if (!pdsUrl) {
      setToast({
        message: 'PDS URL not found in profile data',
        type: 'error'
      });
      return;
    }
    
    setIsDownloading(true);
    
    try {
      const result = await downloadRepoEnhanced(pdsUrl, did, format, handle);
      
      if (result.success) {
        setToast({
          message: result.message,
          type: 'success'
        });
      } else {
        setToast({
          message: result.message,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error downloading repository:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to download repository',
        type: 'error'
      });
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Organize collections by namespace (using two-level grouping)
  const organizeCollections = (collections: string[] = []) => {
    const organized: Record<string, string[]> = {};
    
    collections.forEach(collection => {
      // Split by dot to get the namespace parts
      const parts = collection.split('.');
      
      // Use first two parts as namespace if available, otherwise just first part
      let namespace = parts[0];
      if (parts.length > 1) {
        namespace = `${parts[0]}.${parts[1]}`;
      }
      
      if (!organized[namespace]) {
        organized[namespace] = [];
      }
      
      organized[namespace].push(collection);
    });
    
    return organized;
  };
  
  // Toggle section expansion
  const toggleSection = (namespace: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [namespace]: !prev[namespace]
    }));
  };
  
  // Copy a specific field value to clipboard
  const copyFieldToClipboard = (value: string, fieldName: string) => {
    navigator.clipboard.writeText(value)
      .then(() => {
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
      })
      .catch(err => {
        console.error(`Failed to copy ${fieldName}:`, err);
      });
  };
  
  // Check if collections exist and repo is available
  const hasCollections = !repoUnavailable && data.data?.repoInfo?.collections && data.data.repoInfo.collections.length > 0;
  
  // Get the profile DID
  const profileDid = data.data?.did || data.uri?.replace('at://', '');
  
  // Check if current user is following/muting this profile
  useEffect(() => {
    const checkViewerStatus = async () => {
      if (!session || !profileDid || session.did === profileDid) return;
      
      try {
        // Get the user's profile with viewer state
        const response = await executeRequest(async (agent) => {
          return await agent.app.bsky.actor.getProfile({
            actor: profileDid
          });
        });
        
        // Check viewer state from the profile
        const viewer = response.data.viewer;
        if (viewer) {
          if (viewer.following) {
            setIsFollowing(true);
            setFollowUri(viewer.following);
          }
          if (viewer.muted) {
            setIsMuted(true);
          }
          if (viewer.blocking) {
            setIsBlocked(true);
            setBlockUri(viewer.blocking);
          }
          if (viewer.blockedBy) {
            setIsBlockedBy(true);
          }
        }
      } catch (error) {
        console.error('Error checking viewer status:', error);
      }
    };
    
    if (!isReadOnly && session) {
      checkViewerStatus();
    }
  }, [session, profileDid, executeRequest, isReadOnly]);

  // Check if account is suspended on Bluesky
  useEffect(() => {
    const checkSuspensionStatus = async () => {
      if (!profileDid) return;

      try {
        // Check suspension status via public Bluesky API
        const response = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(profileDid)}`
        );

        if (!response.ok) {
          // Check if it's an AccountTakedown error
          const errorData = await response.json();
          if (errorData.error === 'AccountTakedown') {
            setIsSuspendedOnBluesky(true);
          }
        } else {
          // Account is active
          setIsSuspendedOnBluesky(false);
        }
      } catch (error) {
        console.error('Error checking suspension status:', error);
        // Don't set suspension status on network errors
      }
    };

    checkSuspensionStatus();
  }, [profileDid]);

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!session || !profileDid || session.did === profileDid || isReadOnly || isFollowLoading) return;
    
    setIsFollowLoading(true);
    
    // Optimistic update
    const wasFollowing = isFollowing;
    const previousFollowUri = followUri;
    setIsFollowing(!wasFollowing);
    
    try {
      if (wasFollowing && previousFollowUri) {
        // Unfollow
        await executeRequest(async (agent) => {
          await agent.deleteFollow(previousFollowUri);
        });
        setFollowUri(null);
        setToast({ message: 'Unfollowed successfully', type: 'success' });
      } else {
        // Follow
        const result = await executeRequest(async (agent) => {
          return await agent.follow(profileDid);
        });
        setFollowUri(result.uri);
        setToast({ message: 'Followed successfully', type: 'success' });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revert optimistic update on error
      setIsFollowing(wasFollowing);
      setFollowUri(previousFollowUri);
      setToast({ 
        message: `Failed to ${wasFollowing ? 'unfollow' : 'follow'}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: 'error' 
      });
    } finally {
      setIsFollowLoading(false);
    }
  };
  
  // Handle mute/unmute
  const handleMute = async () => {
    if (!session || !profileDid || session.did === profileDid || isReadOnly || isMuteLoading) return;
    
    setIsMuteLoading(true);
    
    // Optimistic update
    const wasMuted = isMuted;
    setIsMuted(!wasMuted);
    
    try {
      if (wasMuted) {
        // Unmute
        await executeRequest(async (agent) => {
          await agent.unmute(profileDid);
        });
        setToast({ message: 'Unmuted successfully', type: 'success' });
      } else {
        // Mute
        await executeRequest(async (agent) => {
          await agent.mute(profileDid);
        });
        setToast({ message: 'Muted successfully', type: 'success' });
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
      // Revert optimistic update on error
      setIsMuted(wasMuted);
      setToast({ 
        message: `Failed to ${wasMuted ? 'unmute' : 'mute'}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: 'error' 
      });
    } finally {
      setIsMuteLoading(false);
    }
  };
  
  // Handle block/unblock
  const handleBlock = async () => {
    if (!session || !profileDid || session.did === profileDid || isReadOnly || isBlockLoading) return;
    
    setIsBlockLoading(true);
    
    // Optimistic update
    const wasBlocked = isBlocked;
    const previousBlockUri = blockUri;
    setIsBlocked(!wasBlocked);
    
    try {
      if (wasBlocked && previousBlockUri) {
        // Unblock
        await executeRequest(async (agent) => {
          // Delete the block record
          const uriParts = previousBlockUri.split('/');
          const rkey = uriParts[uriParts.length - 1];
          await agent.com.atproto.repo.deleteRecord({
            repo: session.did,
            collection: 'app.bsky.graph.block',
            rkey: rkey
          });
        });
        setBlockUri(null);
        setToast({ message: 'Unblocked successfully', type: 'success' });
      } else {
        // Block
        const result = await executeRequest(async (agent) => {
          return await agent.app.bsky.graph.block.create(
            { repo: session.did },
            {
              subject: profileDid,
              createdAt: new Date().toISOString()
            }
          );
        });
        setBlockUri(result.uri);
        setToast({ message: 'Blocked successfully', type: 'success' });
      }
    } catch (error) {
      console.error('Error toggling block:', error);
      // Revert optimistic update on error
      setIsBlocked(wasBlocked);
      setBlockUri(previousBlockUri);
      setToast({ 
        message: `Failed to ${wasBlocked ? 'unblock' : 'block'}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: 'error' 
      });
    } finally {
      setIsBlockLoading(false);
    }
  };
  
  return (
    <>
      <TabsContainer 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={(tab) => setActiveTab(tab as 'info' | 'raw' | 'blobs' | 'live')}
      >
        {activeTab === 'info' && (
          <>
            {/* Profile Information Section */}
            <div className="mb-6 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-lg">Profile Information</h3>
                  {(data.data?.handle || data.data?.repoInfo?.handle) && (
                    <a
                      href={`https://bsky.app/profile/${data.data?.handle || data.data?.repoInfo?.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 transition-colors inline-flex items-center gap-1 text-sm"
                      title={isSuspendedOnBluesky
                        ? `⚠️ Account may be suspended on Bluesky`
                        : `View ${data.data?.handle || data.data?.repoInfo?.handle} on Bluesky`}
                    >
                      <span className={isSuspendedOnBluesky ? 'line-through decoration-2 text-red-500' : ''}>🦋</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  {(() => {
                    const ageInfo = getAccountAgeEmoji();
                    return ageInfo ? (
                      <span className="text-lg" title={ageInfo.title}>
                        {ageInfo.emoji}
                      </span>
                    ) : null;
                  })()}
                </div>
                
                {/* Follow, Mute, and Block buttons (for other profiles) */}
                {session && !isReadOnly && profileDid && session.did !== profileDid && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleFollow}
                      disabled={isFollowLoading}
                      className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${
                        isFollowing
                          ? 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                          : 'border-blue-500 text-white bg-blue-500 hover:bg-blue-600'
                      } ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={isFollowing ? 'Unfollow user' : 'Follow user'}
                    >
                      {isFollowLoading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {isFollowing ? 'Unfollowing...' : 'Following...'}
                      </span>
                      ) : (
                        isFollowing ? 'Following' : 'Follow'
                      )}
                    </button>
                    
                    <button
                      onClick={handleMute}
                      disabled={isMuteLoading}
                      className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${
                        isMuted
                          ? 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      } ${isMuteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={isMuted ? 'Unmute user' : 'Mute user'}
                      title={isMuted ? 'Unmute this user' : 'Mute this user'}
                    >
                      {isMuteLoading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </span>
                      ) : (
                        isMuted ? 'Muted' : 'Mute'
                      )}
                    </button>
                    
                    <button
                      onClick={handleBlock}
                      disabled={isBlockLoading || isBlockedBy}
                      className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${
                        isBlocked
                          ? 'border-red-500 text-white bg-red-500 hover:bg-red-600'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      } ${isBlockLoading || isBlockedBy ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={isBlocked ? 'Unblock user' : 'Block user'}
                      title={isBlockedBy ? 'This user has blocked you' : (isBlocked ? 'Unblock this user' : 'Block this user')}
                    >
                      {isBlockLoading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </span>
                      ) : (
                        isBlockedBy ? 'Blocked by user' : (isBlocked ? 'Blocked' : 'Block')
                      )}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Show blocked by warning */}
              {isBlockedBy && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm font-medium">This user has blocked you</span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-2">
                <CopyableField
                  label="DID:"
                  value={data.data.did || data.uri.replace('at://', '')}
                  fieldName="did"
                  copiedField={copiedField}
                  onCopy={copyFieldToClipboard}
                />
                
                {!repoUnavailable && getPdsEndpoint() && (
                  <CopyableField
                    label="PDS:"
                    value={getPdsEndpoint() || ''}
                    fieldName="pds"
                    copiedField={copiedField}
                    onCopy={copyFieldToClipboard}
                  />
                )}
                
                {data.data?.handle && (
                  <CopyableField
                    label="Handle:"
                    value={data.data.handle}
                    fieldName="handle"
                    copiedField={copiedField}
                    onCopy={copyFieldToClipboard}
                  />
                )}
                
                {data.data?.displayName && (
                  <div className="flex items-start">
                    <span className="font-medium text-gray-500 w-24">Name:</span> 
                    <span>{data.data.displayName}</span>
                  </div>
                )}
                
                {data.data?.description && (
                  <div className="flex items-start">
                    <span className="font-medium text-gray-500 w-24">Description:</span> 
                    <span>{data.data.description}</span>
                  </div>
                )}
                
                {data.data?.repoInfo?.handle && !data.data.handle && (
                  <CopyableField
                    label="Handle:"
                    value={data.data.repoInfo.handle}
                    fieldName="handle"
                    copiedField={copiedField}
                    onCopy={copyFieldToClipboard}
                  />
                )}
              </div>
            </div>
            
            {/* PDS Collections - Only show if repo is available */}
            {hasCollections && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-lg">PDS Collections</h3>
                  <div className="flex items-center gap-2">
                    {!repoUnavailable && session?.did === profileDid && isDeveloperMode && !isReadOnly && (
                      <button
                        onClick={() => setShowCreateRecordModal(true)}
                        className="px-3 py-1 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600 transition-colors"
                      >
                        Create Record
                      </button>
                    )}
                    {!repoUnavailable && (
                      <DownloadDropdown 
                        onDownload={handleDownloadRepo}
                        loading={isDownloading}
                        disabled={!getPdsEndpoint()}
                      />
                    )}
                  </div>
                </div>
                
                {/* Organized collections by namespace */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {Object.entries(organizeCollections(data.data.repoInfo.collections)).map(([namespace, collections]) => (
                    <ExpandableSection
                      key={namespace}
                      title={namespace}
                      isExpanded={expandedSections[namespace] || false}
                      onToggle={() => toggleSection(namespace)}
                      itemCount={collections.length}
                    >
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {collections.map((collection, index) => (
                          <li key={index} className="pl-10 pr-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <Link 
                              href={`/viewer?uri=${data.uri.replace('at://', '')}/${collection}`}
                              className="text-blue-500 hover:underline text-sm flex items-center group"
                            >
                              <span className="flex-1">
                                {collection}
                              </span>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </ExpandableSection>
                  ))}
                </div>
              </div>
            )}
            
            {/* PLC Directory section */}
            {plcLog && plcLog.length > 0 && (
              <PlcDirectoryView plcLog={plcLog} showDidDocument={showDidDocument} />
            )}
          </>
        )}
        
        {activeTab === 'raw' && (
          <JsonViewer data={data.data} uri={profileDid} />
        )}

        {activeTab === 'blobs' && (
          <BlobsView 
            did={data.data.did || data.uri.replace('at://', '')} 
            pdsEndpoint={getPdsEndpoint()} 
            persistentState={blobState}
            onStateChange={setBlobState}
          />
        )}

        {activeTab === 'live' && (
          <JetstreamTab context={jetstreamContext} />
        )}
      </TabsContainer>
      
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Create Record Modal */}
      {showCreateRecordModal && (
        <CreateRecordModal
          isOpen={showCreateRecordModal}
          onClose={() => setShowCreateRecordModal(false)}
          repoDid={profileDid}
          onRecordCreated={(uri) => {
            window.location.href = `/viewer?uri=${uri}`;
          }}
        />
      )}
      
    </>
  );
} 
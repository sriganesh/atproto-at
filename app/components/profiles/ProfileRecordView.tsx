import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import UserAvatar from './UserAvatar';
import RichTextContent from '../posts/RichTextContent';
import PostCard from '../posts/PostCard';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import ProfileEditor from './ProfileEditor';

type ProfileRecordViewProps = {
  data: any;
  pinnedPostData: any;
  activeTab: 'info' | 'raw';
  setActiveTab: (tab: 'info' | 'raw') => void;
};

export default function ProfileRecordView({ 
  data, 
  pinnedPostData, 
  activeTab, 
  setActiveTab 
}: ProfileRecordViewProps) {
  const { session } = useAuth();
  const { isReadOnly } = useAuthMode();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  
  const tabs = [
    { id: 'info', label: 'Profile Preview' },
    { id: 'raw', label: 'Raw Data' }
  ];

  const didPart = data.uri.match(/at:\/\/(did:[^\/]+)/)?.[1] || '';
  const profileValue = data.data.value;
  
  // Check if this is the user's own profile record
  const isOwnProfile = session?.did === didPart && data.uri.includes('/self');
  const canEditProfile = isOwnProfile && !isReadOnly;
  
  // Extract profile information
  const displayName = profileValue.displayName || '';
  const description = profileValue.description || '';
  const handle = data.data.handle || '';
  
  // Create avatar URL if available
  const avatarUrl = profileValue.avatar 
    ? `https://cdn.bsky.app/img/avatar/plain/${didPart}/${profileValue.avatar.ref.$link}@jpeg`
    : undefined;
  
  // Create banner URL if available
  const bannerUrl = profileValue.banner
    ? `https://cdn.bsky.app/img/banner/plain/${didPart}/${profileValue.banner.ref.$link}@jpeg`
    : null;

  // Create author info object for the pinned post
  const authorInfo = {
    displayName: displayName,
    handle: handle,
    avatar: avatarUrl
  };

  return (
    <>
      <TabsContainer 
        tabs={tabs} 
        activeTab={activeTab} 
        setActiveTab={(tab) => setActiveTab(tab as 'info' | 'raw')}
        rightContent={
          canEditProfile ? (
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Edit Profile
            </button>
          ) : undefined
        }
      >
        {activeTab === 'info' && (
          <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Banner */}
            {bannerUrl && (
              <div className="w-full h-32 mb-4 overflow-hidden rounded-lg relative">
                <img 
                  src={bannerUrl}
                  alt="Profile Banner"
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
            
            {/* Profile header with avatar */}
            <div className="flex items-start mb-4">
              <div className="mr-4 flex-shrink-0">
                <UserAvatar 
                  avatar={avatarUrl} 
                  handle={handle} 
                  size="lg" 
                />
              </div>
              
              <div>
                {displayName && (
                  <h2 className="text-xl font-bold">{displayName}</h2>
                )}
                {handle && (
                  <div className="text-gray-500">@{handle}</div>
                )}
              </div>
            </div>
            
            {/* Profile description */}
            {description && (
              <div className="mt-3 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                <RichTextContent text={description} />
              </div>
            )}
            
            {/* External links */}
            <div className="mt-4 flex gap-4">
              <a
                href={`/viewer?uri=${didPart}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm flex items-center gap-1"
              >
                atproto.at
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              
              <a 
                href={`https://bsky.app/profile/${didPart}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm flex items-center gap-1"
              >
                🦋
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              
              <a 
                href={`https://${data.apiUrl ? new URL(data.apiUrl).hostname : 'bsky.social'}/xrpc/com.atproto.repo.getRecord?repo=${didPart}&collection=app.bsky.actor.profile&rkey=self`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm flex items-center gap-1"
              >
                PDS
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            
            {/* Pinned post */}
            {profileValue.pinnedPost && pinnedPostData && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium mb-2">Pinned Post</div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                  <PostCard 
                    post={{
                      ...pinnedPostData,
                      uri: profileValue.pinnedPost.uri,
                      service: data.apiUrl ? new URL(data.apiUrl).hostname : 'bsky.social'
                    }} 
                    authorInfo={authorInfo}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'raw' && (
          <JsonViewer data={data.data} />
        )}
      </TabsContainer>
      
      {/* Profile Editor Modal */}
      {isEditProfileOpen && (
        <ProfileEditor
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          currentProfile={{
            displayName: profileValue.displayName,
            description: profileValue.description,
            avatar: avatarUrl,
            banner: bannerUrl || undefined
          }}
          onProfileUpdated={() => {
            // Refresh the page to show updated profile
            window.location.reload();
          }}
        />
      )}
    </>
  );
} 
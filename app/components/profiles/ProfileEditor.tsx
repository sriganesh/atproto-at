'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useAuthenticatedRequest } from '@/app/hooks/useAuthenticatedRequest';
import Toast from '../ui/Toast';

interface ProfileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: {
    displayName?: string;
    description?: string;
    avatar?: string;
    banner?: string;
  };
  onProfileUpdated?: () => void;
}

interface ImagePreview {
  file: File | null;
  preview: string;
  isUploading: boolean;
}

export default function ProfileEditor({ 
  isOpen, 
  onClose, 
  currentProfile,
  onProfileUpdated 
}: ProfileEditorProps) {
  const { session } = useAuth();
  const { executeRequest } = useAuthenticatedRequest();
  
  // Form state
  const [displayName, setDisplayName] = useState(currentProfile.displayName || '');
  const [description, setDescription] = useState(currentProfile.description || '');
  const [avatar, setAvatar] = useState<ImagePreview>({
    file: null,
    preview: currentProfile.avatar || '',
    isUploading: false
  });
  const [banner, setBanner] = useState<ImagePreview>({
    file: null,
    preview: currentProfile.banner || '',
    isUploading: false
  });
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  // Character limits
  const DISPLAY_NAME_LIMIT = 64;
  const DESCRIPTION_LIMIT = 256;
  const MAX_IMAGE_SIZE = 1000000; // 1MB
  
  // Update form when currentProfile changes
  useEffect(() => {
    setDisplayName(currentProfile.displayName || '');
    setDescription(currentProfile.description || '');
    setAvatar({
      file: null,
      preview: currentProfile.avatar || '',
      isUploading: false
    });
    setBanner({
      file: null,
      preview: currentProfile.banner || '',
      isUploading: false
    });
  }, [currentProfile]);
  
  // Cleanup image previews
  useEffect(() => {
    return () => {
      if (avatar.file && avatar.preview && avatar.preview !== currentProfile.avatar) {
        URL.revokeObjectURL(avatar.preview);
      }
      if (banner.file && banner.preview && banner.preview !== currentProfile.banner) {
        URL.revokeObjectURL(banner.preview);
      }
    };
  }, [avatar, banner, currentProfile]);
  
  const handleImageSelect = (type: 'avatar' | 'banner') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }
    
    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      setError(`Image is too large. Maximum size is 1MB`);
      return;
    }
    
    const preview = URL.createObjectURL(file);
    
    if (type === 'avatar') {
      // Clean up old preview if it exists
      if (avatar.file && avatar.preview && avatar.preview !== currentProfile.avatar) {
        URL.revokeObjectURL(avatar.preview);
      }
      setAvatar({ file, preview, isUploading: false });
    } else {
      // Clean up old preview if it exists
      if (banner.file && banner.preview && banner.preview !== currentProfile.banner) {
        URL.revokeObjectURL(banner.preview);
      }
      setBanner({ file, preview, isUploading: false });
    }
    
    setError(null);
  };
  
  const removeImage = (type: 'avatar' | 'banner') => {
    if (type === 'avatar') {
      if (avatar.file && avatar.preview && avatar.preview !== currentProfile.avatar) {
        URL.revokeObjectURL(avatar.preview);
      }
      setAvatar({ file: null, preview: '', isUploading: false });
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    } else {
      if (banner.file && banner.preview && banner.preview !== currentProfile.banner) {
        URL.revokeObjectURL(banner.preview);
      }
      setBanner({ file: null, preview: '', isUploading: false });
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    }
  };
  
  const handleSave = async () => {
    if (!session || isSaving) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      await executeRequest(async (agent) => {
        const profileData: any = {};
        
        // Add text fields if they've changed
        if (displayName !== currentProfile.displayName) {
          profileData.displayName = displayName.trim();
        }
        if (description !== currentProfile.description) {
          profileData.description = description.trim();
        }
        
        // Upload and add avatar if changed
        if (avatar.file) {
          setAvatar(prev => ({ ...prev, isUploading: true }));
          try {
            const buffer = await avatar.file.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            
            const response = await agent.uploadBlob(uint8Array, {
              encoding: avatar.file.type,
            });
            
            profileData.avatar = response.data.blob;
          } catch (uploadErr) {
            console.error('Failed to upload avatar:', uploadErr);
            throw new Error('Failed to upload avatar image');
          }
          setAvatar(prev => ({ ...prev, isUploading: false }));
        } else if (avatar.preview === '' && currentProfile.avatar) {
          // User removed the avatar
          profileData.avatar = null;
        }
        
        // Upload and add banner if changed
        if (banner.file) {
          setBanner(prev => ({ ...prev, isUploading: true }));
          try {
            const buffer = await banner.file.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            
            const response = await agent.uploadBlob(uint8Array, {
              encoding: banner.file.type,
            });
            
            profileData.banner = response.data.blob;
          } catch (uploadErr) {
            console.error('Failed to upload banner:', uploadErr);
            throw new Error('Failed to upload banner image');
          }
          setBanner(prev => ({ ...prev, isUploading: false }));
        } else if (banner.preview === '' && currentProfile.banner) {
          // User removed the banner
          profileData.banner = null;
        }
        
        // Only update if there are changes
        if (Object.keys(profileData).length > 0) {
          await agent.upsertProfile((existing) => {
            return {
              ...existing,
              ...profileData
            };
          });
        }
      });
      
      setToast({ message: 'Profile updated successfully', type: 'success' });
      
      // Notify parent component
      if (onProfileUpdated) {
        onProfileUpdated();
      }
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!isOpen) return null;
  
  const hasChanges = 
    displayName !== (currentProfile.displayName || '') ||
    description !== (currentProfile.description || '') ||
    avatar.file !== null ||
    (avatar.preview === '' && currentProfile.avatar) ||
    banner.file !== null ||
    (banner.preview === '' && currentProfile.banner);
  
  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Edit Profile
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {/* Banner Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Banner
              </label>
              <div className="relative">
                {banner.preview ? (
                  <div className="relative group">
                    <img
                      src={banner.preview}
                      alt="Banner preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-4">
                      <button
                        onClick={() => bannerInputRef.current?.click()}
                        className="p-2 bg-white bg-opacity-20 rounded-full text-white hover:bg-opacity-30 transition-colors"
                        type="button"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeImage('banner')}
                        className="p-2 bg-white bg-opacity-20 rounded-full text-white hover:bg-opacity-30 transition-colors"
                        type="button"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center justify-center"
                    type="button"
                  >
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Click to upload banner
                      </p>
                    </div>
                  </button>
                )}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect('banner')}
                  className="hidden"
                />
              </div>
            </div>
            
            {/* Avatar Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Avatar
              </label>
              <div className="flex items-center gap-4">
                {avatar.preview ? (
                  <div className="relative group">
                    <img
                      src={avatar.preview}
                      alt="Avatar preview"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        className="p-2 text-white hover:text-gray-200 transition-colors"
                        type="button"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center justify-center"
                    type="button"
                  >
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
                <div className="flex-1">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    type="button"
                  >
                    Change avatar
                  </button>
                  {avatar.preview && (
                    <button
                      onClick={() => removeImage('avatar')}
                      className="ml-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                      type="button"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect('avatar')}
                  className="hidden"
                />
              </div>
            </div>
            
            {/* Display Name */}
            <div className="mb-6">
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={DISPLAY_NAME_LIMIT}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder="Your display name"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {displayName.length}/{DISPLAY_NAME_LIMIT} characters
              </p>
            </div>
            
            {/* Description */}
            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={DESCRIPTION_LIMIT}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
                placeholder="Tell us about yourself"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {description.length}/{DESCRIPTION_LIMIT} characters
              </p>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || displayName.length > DISPLAY_NAME_LIMIT || description.length > DESCRIPTION_LIMIT}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                !hasChanges || isSaving || displayName.length > DISPLAY_NAME_LIMIT || description.length > DESCRIPTION_LIMIT
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {avatar.isUploading || banner.isUploading ? 'Uploading...' : 'Saving...'}
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
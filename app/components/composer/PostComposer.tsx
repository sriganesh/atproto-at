'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useAuthMode } from '../auth/AuthModeProvider';
import { useAuthenticatedRequest } from '@/app/hooks/useAuthenticatedRequest';
import MentionAutocomplete from './MentionAutocomplete';
import { RichText } from '@atproto/api';

interface ReplyReference {
  root: {
    uri: string;
    cid: string;
  };
  parent: {
    uri: string;
    cid: string;
  };
}

interface ThreadPost {
  text: string;
  images?: ImageFile[];
}

interface PostComposerProps {
  onPostCreated?: (postUri?: string, postData?: any) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  replyTo?: ReplyReference;
  replyingToHandle?: string;
}

interface ImageFile {
  file: File;
  preview: string;
  alt: string;
}

export default function PostComposer({ 
  onPostCreated, 
  onCancel,
  placeholder,
  autoFocus = false,
  replyTo,
  replyingToHandle
}: PostComposerProps) {
  const { session } = useAuth();
  const { isReadOnly } = useAuthMode();
  const { executeRequest } = useAuthenticatedRequest();
  
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [threadPosts, setThreadPosts] = useState<ThreadPost[]>([]);
  const [isThreadMode, setIsThreadMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  
  const MAX_LENGTH = 300;
  const MAX_IMAGES = 4;
  const MAX_IMAGE_SIZE = 1000000; // 1MB
  const remainingChars = MAX_LENGTH - text.length;
  const isOverLimit = remainingChars < 0;
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [text]);
  
  // Auto focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);
  
  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, [images]);
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Check if we can add more images
    if (images.length + files.length > MAX_IMAGES) {
      setError(`You can only add up to ${MAX_IMAGES} images`);
      return;
    }
    
    const newImages: ImageFile[] = [];
    
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        continue;
      }
      
      // Validate file size
      if (file.size > MAX_IMAGE_SIZE) {
        setError(`Image ${file.name} is too large. Maximum size is 1MB`);
        continue;
      }
      
      const preview = URL.createObjectURL(file);
      newImages.push({
        file,
        preview,
        alt: ''
      });
    }
    
    setImages(prev => [...prev, ...newImages]);
    setError(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };
  
  const updateImageAlt = (index: number, alt: string) => {
    setImages(prev => {
      const newImages = [...prev];
      newImages[index] = { ...newImages[index], alt };
      return newImages;
    });
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const newCursorPos = e.target.selectionStart;
    setText(newText);
    setCursorPosition(newCursorPos);
    
    // Check for @ mentions
    const beforeCursor = newText.slice(0, newCursorPos);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const searchTerm = mentionMatch[1];
      setMentionSearchTerm(searchTerm);
      
      // Calculate position for autocomplete dropdown
      if (textareaRef.current && composerRef.current) {
        const textarea = textareaRef.current;
        const textBeforeMention = beforeCursor.slice(0, -mentionMatch[0].length);
        
        // Create a temporary element to measure text width
        const measurer = document.createElement('div');
        measurer.style.cssText = window.getComputedStyle(textarea).cssText;
        measurer.style.position = 'absolute';
        measurer.style.visibility = 'hidden';
        measurer.style.whiteSpace = 'pre-wrap';
        measurer.style.width = textarea.clientWidth + 'px';
        measurer.textContent = textBeforeMention;
        document.body.appendChild(measurer);
        
        const textHeight = measurer.offsetHeight;
        document.body.removeChild(measurer);
        
        const composerRect = composerRef.current.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();
        
        setMentionPosition({
          top: textareaRect.top - composerRect.top + textHeight + 20,
          left: textareaRect.left - composerRect.left
        });
      }
      
      setShowMentionAutocomplete(true);
    } else {
      setShowMentionAutocomplete(false);
    }
  };
  
  const addToThread = () => {
    if (!text.trim() && images.length === 0) return;
    
    // Add current post to thread
    setThreadPosts(prev => [...prev, { text: text.trim(), images: [...images] }]);
    
    // Clear current post
    setText('');
    setImages([]);
    setError(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Focus back on textarea for next post
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };
  
  const handleMentionSelect = (mention: { did: string; handle: string; displayName?: string }) => {
    if (!textareaRef.current) return;
    
    const beforeCursor = text.slice(0, cursorPosition);
    const afterCursor = text.slice(cursorPosition);
    
    // Find the @ symbol position
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    if (!mentionMatch) return;
    
    const mentionStart = beforeCursor.length - mentionMatch[0].length;
    const newText = text.slice(0, mentionStart) + `@${mention.handle} ` + afterCursor;
    
    setText(newText);
    setShowMentionAutocomplete(false);
    
    // Set cursor position after the mention
    const newCursorPos = mentionStart + mention.handle.length + 2; // +2 for @ and space
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };
  
  const handleSubmit = async () => {
    if (!session || isReadOnly || isPosting) return;
    
    // Check if we have content to post
    const hasCurrentPost = text.trim() || images.length > 0;
    const hasThreadPosts = threadPosts.length > 0;
    
    if (!hasCurrentPost && !hasThreadPosts) return;
    if (hasCurrentPost && isOverLimit) return;
    
    setIsPosting(true);
    setError(null);
    
    try {
      // Prepare all posts to be created
      const postsToCreate: ThreadPost[] = hasThreadPosts ? [...threadPosts] : [];
      if (hasCurrentPost) {
        postsToCreate.push({ text: text.trim(), images: [...images] });
      }
      
      if (postsToCreate.length === 0) return;
      
      const result = await executeRequest(async (agent) => {
        const createdPosts: any[] = [];
        
        for (let i = 0; i < postsToCreate.length; i++) {
          const post = postsToCreate[i];
          
          // Use RichText to properly parse mentions and create facets
          const rt = new RichText({ text: post.text });
          await rt.detectFacets(agent); // This will detect mentions, links, etc.
          
          const postData: any = {
            text: rt.text,
            facets: rt.facets,
            createdAt: new Date().toISOString(),
          };
          
          // Add reply data
          if (replyTo && i === 0) {
            // First post in thread replies to the original post
            postData.reply = replyTo;
          } else if (i > 0) {
            // Subsequent posts reply to the previous post in the thread
            const prevPost = createdPosts[i - 1];
            postData.reply = {
              root: createdPosts[0].uri ? { uri: createdPosts[0].uri, cid: createdPosts[0].cid } : replyTo?.root || { uri: prevPost.uri, cid: prevPost.cid },
              parent: {
                uri: prevPost.uri,
                cid: prevPost.cid
              }
            };
          }
          
          // Upload images if any
          if (post.images && post.images.length > 0) {
            setIsUploadingImage(true);
            const imageBlobs = [];
            
            for (const img of post.images) {
              try {
                // Convert file to ArrayBuffer
                const buffer = await img.file.arrayBuffer();
                const uint8Array = new Uint8Array(buffer);
                
                // Upload blob
                const response = await agent.uploadBlob(uint8Array, {
                  encoding: img.file.type,
                });
                
                imageBlobs.push({
                  alt: img.alt || '',
                  image: response.data.blob,
                });
              } catch (uploadErr) {
                console.error('Failed to upload image:', uploadErr);
                throw new Error(`Failed to upload ${img.file.name}`);
              }
            }
            
            setIsUploadingImage(false);
            
            // Add images embed
            postData.embed = {
              $type: 'app.bsky.embed.images',
              images: imageBlobs,
            };
          }
          
          const result = await agent.post(postData);
          createdPosts.push({ ...result, text: postData.text, createdAt: postData.createdAt });
        }
        
        return createdPosts;
      });
      
      // Clear the form
      setText('');
      setImages([]);
      setThreadPosts([]);
      setIsThreadMode(false);
      
      // Notify parent component with the first post URI
      if (onPostCreated && result?.length > 0 && result[0]?.uri) {
        onPostCreated(result[0].uri, result);
      } else if (onPostCreated) {
        onPostCreated();
      }
    } catch (err) {
      console.error('Failed to create post:', err);
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };
  
  // Don't render if not logged in or in read-only mode
  if (!session || isReadOnly) {
    return null;
  }
  
  return (
    <div ref={composerRef} className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3">
      {/* Thread mode indicator */}
      {threadPosts.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Thread Mode</h3>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Creating a thread with {threadPosts.length} {threadPosts.length === 1 ? 'post' : 'posts'}
              </p>
            </div>
            <button
              onClick={() => {
                setIsThreadMode(false);
                setThreadPosts([]);
              }}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
            >
              Cancel Thread
            </button>
          </div>
          
          {/* Show thread preview */}
          <div className="mt-3 space-y-2">
            {threadPosts.map((post, index) => (
              <div key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="font-medium flex-shrink-0">{index + 1}.</span>
                <div className="flex-1">
                  <div>{post.text.substring(0, 100)}
                    {post.text.length > 100 && '...'}
                  </div>
                  {post.images && post.images.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {post.images.length} image{post.images.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    const newThreadPosts = threadPosts.filter((_, i) => i !== index);
                    setThreadPosts(newThreadPosts);
                    // Exit thread mode if no posts left
                    if (newThreadPosts.length === 0) {
                      setIsThreadMode(false);
                    }
                  }}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex items-start gap-2.5">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          {session.avatar ? (
            <img
              src={session.avatar}
              alt={session.handle}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {session.handle?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>
        
        {/* Composer */}
        <div className="flex-1">
          {/* Reply indicator */}
          {replyingToHandle && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Replying to <span className="text-blue-500 font-medium">@{replyingToHandle}</span>
            </div>
          )}
          
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder={placeholder || (replyTo ? "Post your reply" : (threadPosts.length > 0 ? `Add post ${threadPosts.length + 1} to thread` : "What's happening?"))}
            disabled={isPosting}
            className="w-full p-1 -ml-1 border-0 focus:ring-0 resize-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-[16px] leading-relaxed focus:outline-none"
            style={{ minHeight: '100px' }}
          />
          
          {/* Image previews */}
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative group overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <img
                    src={img.preview}
                    alt={img.alt || 'Uploaded image'}
                    className="w-full h-36 object-cover"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/80"
                    type="button"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    placeholder="Add alt text"
                    value={img.alt}
                    onChange={(e) => updateImageAlt(index, e.target.value)}
                    className="absolute bottom-0 left-0 right-0 px-3 py-2 text-xs bg-gradient-to-t from-black/80 to-black/40 backdrop-blur-sm text-white placeholder-gray-300 opacity-0 group-hover:opacity-100 transition-all duration-200 border-0 focus:ring-0"
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="mt-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
              {error}
            </div>
          )}
          
          {/* Actions bar */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Image upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPosting || images.length >= MAX_IMAGES}
                className={`p-2.5 rounded-full transition-all duration-200 ${
                  images.length >= MAX_IMAGES
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
                title={images.length >= MAX_IMAGES ? `Maximum ${MAX_IMAGES} images` : 'Add image'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                disabled={isPosting}
              />
              
              {/* Image count indicator */}
              {images.length > 0 && (
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-full">
                  {images.length}/{MAX_IMAGES}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {/* Character count with visual indicator */}
              <div className="relative w-8 h-8 flex-shrink-0">
                <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 12}`}
                    strokeDashoffset={`${2 * Math.PI * 12 * (1 - Math.max(0, Math.min(1, (MAX_LENGTH - text.length) / MAX_LENGTH)))}`}
                    className={`transition-all duration-300 ${
                      isOverLimit 
                        ? 'text-red-500' 
                        : remainingChars <= 20 
                        ? 'text-yellow-500' 
                        : 'text-blue-500'
                    }`}
                  />
                </svg>
                <span 
                  className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold ${
                    isOverLimit 
                      ? 'text-red-600 dark:text-red-400' 
                      : remainingChars <= 20 
                      ? 'text-yellow-600 dark:text-yellow-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {text.length === 0 ? MAX_LENGTH : Math.abs(remainingChars)}
                </span>
              </div>
              
              {/* Add to Thread button */}
              {(text.trim() || images.length > 0) && !isOverLimit && (
                <button
                  onClick={() => {
                    addToThread();
                    setIsThreadMode(true);
                  }}
                  disabled={isPosting}
                  className="px-2 sm:px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              )}
              
              {/* Cancel button */}
              {onCancel && (
                <button
                  onClick={onCancel}
                  disabled={isPosting}
                  className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
              )}
              
              {/* Post button */}
              <button
                onClick={handleSubmit}
                disabled={((!text.trim() && images.length === 0) && threadPosts.length === 0) || isOverLimit || isPosting}
                className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm ${
                  ((!text.trim() && images.length === 0) && threadPosts.length === 0) || isOverLimit || isPosting
                    ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white hover:shadow-md transform hover:-translate-y-0.5'
                }`}
              >
                {isPosting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isUploadingImage ? 'Uploading...' : 'Posting...'}
                  </span>
                ) : (
                  threadPosts.length > 0 ? `Post Thread (${threadPosts.length + (text.trim() || images.length > 0 ? 1 : 0)} posts)` : 'Post'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mention Autocomplete */}
      {showMentionAutocomplete && (
        <MentionAutocomplete
          searchTerm={mentionSearchTerm}
          onSelect={handleMentionSelect}
          onClose={() => setShowMentionAutocomplete(false)}
          position={mentionPosition}
        />
      )}
    </div>
  );
}
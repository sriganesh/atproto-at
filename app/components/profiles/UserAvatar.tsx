import React, { useState, useEffect } from 'react';

type UserAvatarProps = {
  avatar?: string;
  handle?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

export default function UserAvatar({ avatar, handle, size = 'md' }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(avatar);
  
  // Effect to handle avatar URL updates
  useEffect(() => {
    if (avatar) {
            
      // If the avatar URL already contains cdn.bsky.app, use it as is
      if (avatar.includes('cdn.bsky.app')) {
                setAvatarUrl(avatar);
      } 
      // Handle any other avatar URL format
      else {
                setAvatarUrl(avatar);
      }
      
      setImageError(false);
    } else {
            setAvatarUrl(undefined);
    }
  }, [avatar]);
  
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };
  
  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const firstLetter = handle ? handle.charAt(0).toUpperCase() : '?';
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    console.error(`Failed to load avatar image: ${target.src}`);
    console.error(`Error event:`, e);
    setImageError(true);
  };

  if (avatarUrl && !imageError) {
    return (
      <img 
        src={avatarUrl} 
        alt={`Avatar for ${handle || 'user'}`} 
        className={`${sizeClasses[size]} rounded-full object-cover`}
        onError={handleImageError}
      />
    );
  }
  
  // Fallback to initials avatar
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-blue-500 flex items-center justify-center text-white ${textSizeClasses[size]} font-semibold`}>
      {firstLetter}
    </div>
  );
} 
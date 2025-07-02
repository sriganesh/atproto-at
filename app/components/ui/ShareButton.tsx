"use client";

import React, { useState, useEffect } from 'react';

type ShareButtonProps = {
  className?: string;
  uri?: string;
};

export default function ShareButton({ className = '', uri = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  
  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [copied]);
  
  const copyShareableUrl = () => {
    // If we have a URI passed as prop, use that for formatting
    // Otherwise fall back to current window location
    let urlToCopy;
    
    if (uri) {
      // Format the AT Protocol URI for sharing and ensure no leading/trailing spaces
      const shareableLink = uri.trim().replace('at://', '');
      urlToCopy = `https://atproto.at://${shareableLink}`;
    } else if (typeof window !== 'undefined') {
      // Use the current window location as fallback
      urlToCopy = window.location.href;
    } else {
      return; // Can't copy if no URI and not in browser
    }
    
    navigator.clipboard.writeText(urlToCopy)
      .then(() => {
        setCopied(true);
      })
      .catch(err => {
        console.error('Failed to copy URL:', err);
      });
  };
  
  return (
    <button 
      onClick={copyShareableUrl}
      className={`px-2 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm rounded-md transition-colors flex items-center justify-center ${
        copied 
          ? 'bg-green-500 text-white' 
          : 'bg-blue-500 hover:bg-blue-600 text-white'
      } ${className}`}
      aria-label="Share"
    >
      <span>{copied ? 'Copied!' : 'Copy Link'}</span>
    </button>
  );
} 
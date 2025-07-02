'use client';

import React from 'react';

type LoadingIndicatorProps = {
  message?: string;
  fullPage?: boolean;
};

export default function LoadingIndicator({ 
  message = 'Loading AT Protocol data...', 
  fullPage = true
}: LoadingIndicatorProps) {
  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-foreground">{message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p className="mt-4 text-foreground">{message}</p>
    </div>
  );
} 
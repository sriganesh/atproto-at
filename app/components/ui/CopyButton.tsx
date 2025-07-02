import React, { useState, useEffect } from 'react';

// Custom SVG for copy icon (double square style)
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
  </svg>
);

// Custom SVG for copy success icon
const CopySuccessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

type CopyButtonProps = {
  textToCopy: string;
  onCopy?: () => void;
  buttonText?: string;
  buttonClassName?: string;
  iconOnly?: boolean;
  title?: string;
};

export default function CopyButton({ 
  textToCopy, 
  onCopy,
  buttonText = 'Copy',
  buttonClassName = 'ml-2 p-1 text-gray-500 hover:text-blue-500 transition-colors',
  iconOnly = true,
  title = 'Copy to clipboard'
}: CopyButtonProps) {
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
  
  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopied(true);
        if (onCopy) onCopy();
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };
  
  if (iconOnly) {
    return (
      <button 
        onClick={handleCopy}
        className={buttonClassName}
        title={title}
      >
        {copied ? <CopySuccessIcon /> : <CopyIcon />}
      </button>
    );
  }
  
  // For text buttons (like "Copy JSON") - don't use buttonClassName to avoid conflicts
  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        copied 
          ? 'bg-green-500 text-white' 
          : 'bg-blue-500 hover:bg-blue-600 text-white'
      }`}
    >
      {copied ? 'Copied!' : buttonText}
    </button>
  );
}

export { CopyIcon, CopySuccessIcon }; 
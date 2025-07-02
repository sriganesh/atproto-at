import React, { useState, useEffect } from 'react';

type DocumentIconProps = {
  onClick: () => void;
  className?: string;
};

export default function DocumentIcon({ onClick, className = '' }: DocumentIconProps) {
  const [animated, setAnimated] = useState(true);
  
  // Remove animation after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimated(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <button
      onClick={onClick}
      className={`text-blue-500 hover:text-blue-700 transition-colors flex items-center ml-2 ${
        animated ? 'animate-pulse' : ''
      } ${className}`}
      title="View DID Document"
      aria-label="View DID Document"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="ml-1 text-sm font-medium">DID Doc</span>
    </button>
  );
} 
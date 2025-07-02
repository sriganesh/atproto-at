import React, { useState, useEffect, useRef } from 'react';

type InfoTooltipProps = {
  tooltipText: string;
  className?: string;
}

/**
 * A mobile-friendly info tooltip component
 * 
 * This component displays an information icon that, when clicked,
 * shows a tooltip with additional information. Works on both
 * desktop and mobile devices.
 */
export default function InfoTooltip({ 
  tooltipText,
  className = '' 
}: InfoTooltipProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsTooltipVisible(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative inline-flex items-center ml-1 ${className}`} ref={tooltipRef}>
      <button
        onClick={() => setIsTooltipVisible(!isTooltipVisible)}
        className="text-blue-500 hover:text-blue-700 focus:outline-none p-1 rounded-full hover:bg-blue-100 transition-colors"
        aria-label="More information"
        type="button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {isTooltipVisible && (
        <div className="absolute z-10 bg-gray-900 text-white text-xs rounded py-2 px-3 bottom-full mb-2 -ml-16 w-56 shadow-lg">
          {tooltipText}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -mb-1 left-1/2 -ml-1 bottom-0"></div>
        </div>
      )}
    </div>
  );
} 
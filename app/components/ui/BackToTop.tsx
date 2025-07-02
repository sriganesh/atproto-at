"use client";

import React, { useState, useEffect } from 'react';

type BackToTopProps = {
  threshold?: number; // Scroll threshold in pixels before showing the button
  position?: 'right' | 'left';
  bottomOffset?: number; // Distance from the bottom in pixels
  sideOffset?: number; // Distance from the side in pixels
};

export default function BackToTop({ 
  threshold = 300, 
  position = 'right',
  bottomOffset = 5,
  sideOffset = 5
}: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  // Show button when user scrolls down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    
    window.addEventListener('scroll', toggleVisibility);
    
    // Initial check in case page is loaded already scrolled
    toggleVisibility();
    
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [threshold]);
  
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Position classes based on position prop
  const positionClass = position === 'right' ? 'right-5' : 'left-5';
  
  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className={`fixed bottom-5 ${positionClass} bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-300 z-50 flex items-center justify-center cursor-pointer`}
          aria-label="Back to top"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 10l7-7m0 0l7 7m-7-7v18" 
            />
          </svg>
        </button>
      )}
    </>
  );
} 
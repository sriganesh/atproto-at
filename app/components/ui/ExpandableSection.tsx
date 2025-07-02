import React from 'react';

type ExpandableSectionProps = {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  itemCount?: number;
  children: React.ReactNode;
  className?: string;
};

export default function ExpandableSection({ 
  title, 
  isExpanded, 
  onToggle, 
  itemCount, 
  children,
  className = ''
}: ExpandableSectionProps) {
  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${className}`}>
      <div 
        className="px-4 py-3 bg-gray-50 dark:bg-gray-900 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center">
          <span className="mr-2 text-gray-500">
            {isExpanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
          </span>
          <span className="font-medium">{title}</span>
        </div>
        {itemCount !== undefined && (
          <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 dark:text-gray-400 px-2 py-1 rounded-full">
            {itemCount}
          </span>
        )}
      </div>
      
      {isExpanded && (
        <div>{children}</div>
      )}
    </div>
  );
} 
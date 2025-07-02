import React from 'react';
import Link from 'next/link';
import ShareButton from '../ui/ShareButton';

type BreadcrumbItem = {
  label: string;
  uri: string;
  path: string;
};

type BreadcrumbNavigationProps = {
  items: BreadcrumbItem[];
  uri?: string;
};

export default function BreadcrumbNavigation({ items, uri }: BreadcrumbNavigationProps) {
  if (!items || items.length === 0) return null;
  
  return (
    <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center">
        <nav className="flex-1" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3 flex-wrap">
            <li>
              <Link 
                href="/"
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
              >
                Home
              </Link>
            </li>
            
            {items.map((crumb, index) => (
              <li key={index} className="flex items-center">
                <span className="mx-2 text-gray-500">/</span>
                {index === items.length - 1 ? (
                  <span className="text-sm font-medium text-gray-500">{crumb.label}</span>
                ) : (
                  <Link 
                    href={crumb.path}
                    className="inline-flex items-center text-sm font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
        
        {/* Share Button */}
        <ShareButton uri={uri ? uri.trim() : ''} />
      </div>
    </div>
  );
} 
import React from 'react';

type Tab = {
  id: string;
  label: string;
};

type TabsContainerProps = {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  className?: string;
  children?: React.ReactNode;
  rightContent?: React.ReactNode;
};

export default function TabsContainer({ 
  tabs, 
  activeTab, 
  setActiveTab, 
  className = '',
  children,
  rightContent
}: TabsContainerProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {rightContent && (
          <div className="flex items-center pb-2">
            {rightContent}
          </div>
        )}
      </div>
      {children}
    </div>
  );
} 
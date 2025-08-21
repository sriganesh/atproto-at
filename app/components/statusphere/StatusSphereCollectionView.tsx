import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface StatusRecord {
  uri: string;
  cid: string;
  value: {
    $type: string;
    status: string;
    createdAt: string;
  };
}

interface StatusSphereCollectionViewProps {
  records: StatusRecord[];
  ownerDid: string;
  ownerHandle?: string;
}

// Extract TimelineItem component to avoid recreation on every render
const TimelineItem = ({ status, index, getRelativeDay }: { 
  status: StatusRecord; 
  index: number;
  getRelativeDay: (dateStr: string) => string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);
  
  const time = new Date(status.value.createdAt).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return (
    <div className={`relative flex items-start pb-6 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      {/* Time on the left */}
      <div className="text-sm text-gray-500 dark:text-gray-400 text-right w-20 flex-shrink-0 pt-2">{time}</div>
      
      {/* Spacer to position node on line at 104px */}
      <div className="w-6 flex-shrink-0"></div>
      
      {/* Status on the right with node */}
      <div className="relative ml-6">
        {/* Node positioned on the line */}
        <div className="absolute -left-[28px] top-3 z-10 w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
        
        <Link
          href={`/viewer?uri=${status.uri.replace('at://', '')}`}
          className="inline-block"
        >
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <span className="text-3xl block">{status.value.status}</span>
          </div>
        </Link>
      </div>
    </div>
  );
};

// Extract DaySection component to avoid recreation on every render
const DaySection = ({ day, statuses, getRelativeDay }: { 
  day: string; 
  statuses: StatusRecord[];
  getRelativeDay: (dateStr: string) => string;
}) => {
  return (
    <div className="mb-8">
      {/* Day header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {getRelativeDay(day)}
        </h3>
      </div>
      
      {/* Timeline items with continuous line */}
      <div className="relative">
        {/* Continuous vertical line */}
        <div className="absolute left-[104px] top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"></div>
        
        {/* Timeline items */}
        {statuses.map((status, index) => (
          <TimelineItem 
            key={status.uri} 
            status={status} 
            index={index}
            getRelativeDay={getRelativeDay}
          />
        ))}
      </div>
    </div>
  );
};

export default function StatusSphereCollectionView({ records, ownerDid, ownerHandle }: StatusSphereCollectionViewProps) {
  // Group statuses by day
  const groupStatusesByDay = (statuses: StatusRecord[]) => {
    const groups: Record<string, StatusRecord[]> = {};
    
    statuses.forEach(status => {
      const date = new Date(status.value.createdAt);
      const dayKey = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(status);
    });
    
    // Sort each day's statuses by time (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => 
        new Date(b.value.createdAt).getTime() - new Date(a.value.createdAt).getTime()
      );
    });
    
    return groups;
  };

  const dayGroups = groupStatusesByDay(records);
  const hasStatuses = records.length > 0;
  
  // Get relative day label
  const getRelativeDay = (dateStr: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const yesterdayStr = yesterday.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    return dateStr;
  };
  

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🎭</span>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">StatusSphere Status Timeline</h2>
          <a 
            href="https://statusphere.xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Visit StatusSphere"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {ownerHandle ? (
            <>
              <Link 
                href={`/viewer?uri=${ownerDid}`}
                className="hover:underline text-blue-600 dark:text-blue-400"
              >
                @{ownerHandle}
              </Link>
              {' · '}
            </>
          ) : null}
          {records.length} {records.length === 1 ? 'status' : 'statuses'}
        </p>
      </div>

      {/* Timeline */}
      {hasStatuses ? (
        <div className="relative">
          {/* Timeline container with padding for the line */}
          <div className="relative">
            {Object.entries(dayGroups).map(([day, statuses]) => (
              <DaySection key={day} day={day} statuses={statuses} getRelativeDay={getRelativeDay} />
            ))}
          </div>
          
          {/* Scroll to top button for long timelines */}
          {records.length > 10 && (
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-8 right-8 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full p-3 shadow-md transition-colors"
              aria-label="Scroll to top"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
          <span className="text-6xl mb-4 block">🎭</span>
          <p className="text-gray-500 dark:text-gray-400">
            No status updates in this timeline yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Start posting emoji statuses to build your timeline
          </p>
        </div>
      )}
    </div>
  );
}
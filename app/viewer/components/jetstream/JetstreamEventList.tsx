import React from 'react';
import { JetstreamEvent } from './types';
import JetstreamEventItem from './JetstreamEventItem';

interface JetstreamEventListProps {
  events: JetstreamEvent[];
  isConnected: boolean;
  eventCount: number;
  context?: {
    type: 'profile' | 'collection';
    collection?: string;
  };
}

export default React.memo(function JetstreamEventList({ 
  events, 
  isConnected, 
  eventCount,
  context
}: JetstreamEventListProps) {
  if (!isConnected && events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <div className="text-4xl mb-4">🌊</div>
        <p className="text-lg font-medium mb-2">Ready to stream</p>
        <p className="text-sm">
          Start the Jetstream connection to see real-time events for this context.
        </p>
      </div>
    );
  }

  if (isConnected && events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <div className="text-4xl mb-4 animate-pulse">📡</div>
        <p className="text-lg font-medium mb-2">Listening for events</p>
        <p className="text-sm">
          Connected and waiting for new activity. Events will appear here as they happen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isConnected && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-center">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Live - {eventCount} event{eventCount !== 1 ? 's' : ''} received
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {events.map((event) => {
          // Create a more stable key based on event properties
          const eventKey = `${event.did}-${event.time_us}-${event.kind}${
            event.commit ? `-${event.commit.operation}-${event.commit.collection}-${event.commit.rkey}` : ''
          }`;
          
          return (
            <JetstreamEventItem 
              key={eventKey}
              event={event}
              context={context}
            />
          );
        })}
      </div>

      {events.length >= 100 && (
        <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
          <p>Showing latest 100 events. Older events are automatically removed.</p>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Fast checks first
  if (prevProps.isConnected !== nextProps.isConnected ||
      prevProps.eventCount !== nextProps.eventCount ||
      prevProps.events.length !== nextProps.events.length) {
    return false; // Re-render needed
  }
  
  // Context comparison (avoid expensive JSON.stringify)
  if (prevProps.context?.type !== nextProps.context?.type ||
      prevProps.context?.collection !== nextProps.context?.collection) {
    return false; // Re-render needed
  }
  
  // If arrays are same length, check if first, middle, and last events are the same
  // This catches reordering or content changes efficiently
  if (prevProps.events.length > 0) {
    const prevFirst = prevProps.events[0];
    const nextFirst = nextProps.events[0];
    const prevLast = prevProps.events[prevProps.events.length - 1];
    const nextLast = nextProps.events[nextProps.events.length - 1];
    
    // Also check middle element for extra robustness
    const midIndex = Math.floor(prevProps.events.length / 2);
    const prevMiddle = prevProps.events[midIndex];
    const nextMiddle = nextProps.events[midIndex];
    
    if (prevFirst?.time_us !== nextFirst?.time_us ||
        prevFirst?.did !== nextFirst?.did ||
        prevLast?.time_us !== nextLast?.time_us ||
        prevLast?.did !== nextLast?.did ||
        prevMiddle?.time_us !== nextMiddle?.time_us ||
        prevMiddle?.did !== nextMiddle?.did) {
      return false; // Re-render needed
    }
  }
  
  return true; // No re-render needed
}); 
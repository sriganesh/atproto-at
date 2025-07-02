import React, { useState, useEffect } from 'react';
import { JetstreamConfig, JetstreamContextType, OFFICIAL_JETSTREAM_INSTANCES } from './types';
import { useJetstream } from '../../hooks/useJetstream';
import JetstreamControls from './JetstreamControls';
import JetstreamEventList from './JetstreamEventList';
import TabsContainer from '../../../components/ui/TabsContainer';
import { JsonViewer } from '../../../components/ui/JsonViewer';
import { apiCache } from './utils/apiCache';

interface JetstreamTabProps {
  context: JetstreamContextType;
}

export default function JetstreamTab({ context }: JetstreamTabProps) {
  const [config, setConfig] = useState<JetstreamConfig>({
    instance: OFFICIAL_JETSTREAM_INSTANCES[0], // Default to first US-East instance
  });

  const [activeStreamTab, setActiveStreamTab] = useState<'events' | 'raw'>('events');

  const {
    events,
    isConnected,
    isConnecting,
    error,
    eventCount,
    start,
    stop,
    clearEvents
  } = useJetstream(config, context);

  // Auto-scroll to top when new events arrive (optional, could be configurable)
  useEffect(() => {
    if (events.length > 0 && isConnected && activeStreamTab === 'events') {
      // Smooth scroll to top of the event list when new events arrive
      const eventList = document.querySelector('[data-jetstream-events]');
      if (eventList) {
        eventList.scrollTop = 0;
      }
    }
  }, [events.length, isConnected, activeStreamTab]);

  const streamTabs = [
    { id: 'events', label: 'Events' },
    { id: 'raw', label: 'Raw Data' }
  ];

  const handleClearEvents = () => {
    clearEvents();
    apiCache.clear();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Jet Stream
        </h2>
      </div>

      {/* Controls */}
      <JetstreamControls
        config={config}
        onConfigChange={setConfig}
        context={context}
        isConnected={isConnected}
        isConnecting={isConnecting}
        error={error}
        eventCount={eventCount}
        onStart={start}
        onStop={stop}
        onClearEvents={handleClearEvents}
      />

      {/* Stream Content with Tabs */}
      <div>
        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 mb-4">
          {streamTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStreamTab(tab.id as 'events' | 'raw')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeStreamTab === tab.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content - Both tabs are always mounted, but visibility controlled by CSS */}
        <div className="relative">
          {/* Events Tab */}
          <div 
            className={`max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent ${
              activeStreamTab === 'events' ? 'block' : 'hidden'
            }`}
            data-jetstream-events
          >
            <JetstreamEventList
              events={events}
              isConnected={isConnected}
              eventCount={eventCount}
              context={{
                type: context.type,
                collection: context.collection
              }}
            />
          </div>

          {/* Raw Data Tab */}
          <div className={`max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent ${
            activeStreamTab === 'raw' ? 'block' : 'hidden'
          }`}>
            {events.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {isConnected ? (
                  <>
                    <div className="text-4xl mb-4 animate-pulse">📡</div>
                    <p className="text-lg font-medium mb-2">Listening for events</p>
                    <p className="text-sm">
                      Raw JSON events will appear here as they are received.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-lg font-medium mb-2">Raw Event Data</p>
                    <p className="text-sm">
                      Start the stream to see the actual JSON events as they arrive.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 pb-2 border-b border-gray-200 dark:border-gray-700">
                  Showing {events.length} raw event{events.length !== 1 ? 's' : ''} (latest first)
                </div>
                <JsonViewer data={events} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
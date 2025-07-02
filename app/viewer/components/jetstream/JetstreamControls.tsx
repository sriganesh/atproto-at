import React, { useState } from 'react';
import { JetstreamInstance, JetstreamConfig, JetstreamContextType } from './types';
import JetstreamInstanceSelector from './JetstreamInstanceSelector';
import { apiCache } from './utils/apiCache';

interface JetstreamControlsProps {
  config: JetstreamConfig | null;
  onConfigChange: (config: JetstreamConfig) => void;
  context: JetstreamContextType;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  eventCount: number;
  onStart: () => void;
  onStop: () => void;
  onClearEvents: () => void;
}

export default function JetstreamControls({
  config,
  onConfigChange,
  context,
  isConnected,
  isConnecting,
  error,
  eventCount,
  onStart,
  onStop,
  onClearEvents
}: JetstreamControlsProps) {
  const [showSettings, setShowSettings] = useState(false);

  const handleInstanceChange = (instance: JetstreamInstance) => {
    if (config) {
      onConfigChange({ ...config, instance });
    }
  };

  const getContextDescription = () => {
    if (context.type === 'profile') {
      const didText = context.did || 'this DID';
      return `Real-time events for ${didText}`;
    } else if (context.type === 'collection') {
      const didText = context.did || 'this DID';
      const collectionText = context.collection || 'unknown collection';
      return `Real-time events for ${didText} in ${collectionText} collection`;
    }
    return 'Real-time activity';
  };

  return (
    <div className="space-y-4">
      {/* Context Info */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Jetstream Context
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              {getContextDescription()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={isConnected ? onStop : onStart}
            disabled={isConnecting || !config}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors
              ${isConnected 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isConnecting ? (
              <div className="flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </div>
            ) : isConnected ? (
              <div className="flex items-center">
                <div className="h-2 w-2 bg-white rounded-full mr-2"></div>
                Stop Stream
              </div>
            ) : (
              'Start Stream'
            )}
          </button>

          {eventCount > 0 && (
            <button
              onClick={() => {
                onClearEvents();
                apiCache.clear();
              }}
              disabled={isConnecting}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 
                       border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800
                       disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear events and cached data"
            >
              Clear ({eventCount})
            </button>
          )}
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 
                   hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
          title="Settings"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-red-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Connection Error
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && config && (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Jetstream Settings
          </h3>
          
          <div className="space-y-4">
            <JetstreamInstanceSelector
              selectedInstance={config.instance}
              onInstanceChange={handleInstanceChange}
              disabled={isConnected}
            />
          </div>
        </div>
      )}
    </div>
  );
} 
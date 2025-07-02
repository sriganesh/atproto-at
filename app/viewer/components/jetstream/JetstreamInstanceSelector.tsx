import React, { useState } from 'react';
import { JetstreamInstance, OFFICIAL_JETSTREAM_INSTANCES } from './types';

interface JetstreamInstanceSelectorProps {
  selectedInstance: JetstreamInstance;
  onInstanceChange: (instance: JetstreamInstance) => void;
  disabled?: boolean;
}

export default function JetstreamInstanceSelector({
  selectedInstance,
  onInstanceChange,
  disabled = false
}: JetstreamInstanceSelectorProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const handleOfficialInstanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const hostname = e.target.value;
    const instance = OFFICIAL_JETSTREAM_INSTANCES.find(i => i.hostname === hostname);
    if (instance) {
      onInstanceChange(instance);
      setShowCustomInput(false);
    } else if (hostname === 'custom') {
      setShowCustomInput(true);
    }
  };

  const handleCustomSubmit = () => {
    if (!customUrl.trim()) return;
    
    let url = customUrl.trim();
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      url = `wss://${url}`;
    }
    if (!url.includes('/subscribe')) {
      url = `${url}/subscribe`;
    }

    const customInstance: JetstreamInstance = {
      hostname: customUrl.trim(),
      region: 'Custom',
      url: url
    };

    onInstanceChange(customInstance);
    setCustomUrl('');
    setShowCustomInput(false);
  };

  const isCustomInstance = !OFFICIAL_JETSTREAM_INSTANCES.some(
    i => i.hostname === selectedInstance.hostname
  );

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Jetstream Instance
        </label>
        <select
          value={isCustomInstance ? 'custom' : selectedInstance.hostname}
          onChange={handleOfficialInstanceChange}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {OFFICIAL_JETSTREAM_INSTANCES.map((instance) => (
            <option key={instance.hostname} value={instance.hostname}>
              {instance.hostname}
            </option>
          ))}
          <option value="custom">Custom Instance...</option>
        </select>
      </div>

      {showCustomInput && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Custom Jetstream URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="jetstream.example.com or wss://jetstream.example.com/subscribe"
              disabled={disabled}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomSubmit();
                }
              }}
            />
            <button
              onClick={handleCustomSubmit}
              disabled={disabled || !customUrl.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                       focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter hostname or full WebSocket URL. Protocol and /subscribe path will be added automatically if needed.
          </p>
        </div>
      )}

      {isCustomInstance && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Using Custom Instance
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                {selectedInstance.url}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
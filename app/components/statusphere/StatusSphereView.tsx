import React from 'react';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import { getRelativeTime } from '@/lib/utils/date';
import JetstreamTab from '@/app/viewer/components/jetstream/JetstreamTab';
import { JetstreamContextType } from '@/app/viewer/components/jetstream/types';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';

type StatusSphereViewProps = {
  data: {
    uri: string;
    data?: {
      value?: {
        status?: string;
        createdAt?: string;
      };
    };
  };
  activeTab: 'info' | 'raw' | 'live';
  setActiveTab: (tab: 'info' | 'raw' | 'live') => void;
};

export default function StatusSphereView({ 
  data, 
  activeTab, 
  setActiveTab
}: StatusSphereViewProps) {
  const statusRecord = data?.data;
  const createdAt = new Date(statusRecord?.value?.createdAt || new Date());
  const timeAgo = getRelativeTime(createdAt);
  
  const tabs = [
    { id: 'info' as const, label: 'Record Information' },
    { id: 'raw' as const, label: 'Raw Data' },
    { id: 'live' as const, label: 'Jetstream' }
  ];
  
  // Create Jetstream context for live updates
  const jetstreamContext: JetstreamContextType = {
    type: 'collection',
    did: data?.uri?.split('/')[2] || '',
    collection: 'xyz.statusphere.status'
  };
  
  return (
    <div>
      <TabsContainer tabs={tabs} activeTab={activeTab} setActiveTab={(tabId) => setActiveTab(tabId as 'info' | 'raw' | 'live')} />
      
      {activeTab === 'info' && (
        <div className="mt-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{RECORD_THEMES.statusphere.icon}</span>
              <h3 className="text-lg font-semibold">{data?.uri?.split('/').pop()}</h3>
            </div>
            
            <div className="flex items-center justify-center my-8">
              <div className={`text-7xl ${RECORD_THEMES.statusphere.bgColor} rounded-2xl p-8 shadow-inner`}>
                {statusRecord?.value?.status || '?'}
              </div>
            </div>
            
            <div className="text-center space-y-3">
              <p className="text-gray-700 dark:text-gray-300">
                Status posted {timeAgo}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {createdAt.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'raw' && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Raw Data</h3>
          <JsonViewer data={data} />
        </div>
      )}
      
      {activeTab === 'live' && (
        <div className="mt-6">
          <JetstreamTab context={jetstreamContext} />
        </div>
      )}
    </div>
  );
}
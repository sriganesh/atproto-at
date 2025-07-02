import React from 'react';
import BaseCollectionItem from '../collections/BaseCollectionItem';
import { RECORD_THEMES } from '@/lib/utils/browser/theme';

type LabelerItemProps = {
  labelerRecord: {
    uri: string;
    cid: string;
    value: {
      $type: string;
      createdAt?: string;
      policies?: {
        labelValues?: string[];
        labelValueDefinitions?: any[];
      };
      [key: string]: any;
    };
  };
};

export default function LabelerItem({ labelerRecord }: LabelerItemProps) {
  const renderContent = () => {
    const { value } = labelerRecord;
    const labelCount = value.policies?.labelValues?.length || 0;
    const definitionCount = value.policies?.labelValueDefinitions?.length || 0;
    
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🏷️</span>
          <div>
            <div className="font-medium text-purple-600 dark:text-purple-400">Labeler Service</div>
            <div className="text-sm text-gray-500">
              Content moderation service
            </div>
          </div>
        </div>
        
        {/* Label stats */}
        <div className="text-sm space-y-1">
          {labelCount > 0 && (
            <div>
              <span className="font-medium">{labelCount}</span> supported labels
            </div>
          )}
          {definitionCount > 0 && (
            <div>
              <span className="font-medium">{definitionCount}</span> label definitions
            </div>
          )}
          {labelCount === 0 && definitionCount === 0 && (
            <div className="text-gray-500">No label policies defined</div>
          )}
        </div>
        
        {/* Sample labels */}
        {value.policies?.labelValues && value.policies.labelValues.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {value.policies.labelValues.slice(0, 5).map((label: string) => (
              <span 
                key={label}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
              >
                {label}
              </span>
            ))}
            {value.policies.labelValues.length > 5 && (
              <span className="text-xs text-gray-500">
                +{value.policies.labelValues.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <BaseCollectionItem
      record={labelerRecord}
      theme={{
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-100 dark:border-purple-800',
        icon: '🏷️'
      }}
      loadingText="Loading labeler service..."
      errorText="Unable to load labeler service"
      isLoading={false}
      error={null}
      renderContent={renderContent}
    />
  );
}
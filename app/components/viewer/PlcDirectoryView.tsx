import React, { useState } from 'react';
import TabsContainer from '../ui/TabsContainer';
import { JsonViewer } from '../ui/JsonViewer';
import DocumentIcon from '../ui/DocumentIcon';

type PlcDirectoryViewProps = {
  plcLog: any[];
  showDidDocument?: () => void;
};

export default function PlcDirectoryView({ plcLog, showDidDocument }: PlcDirectoryViewProps) {
  const [activePlcTab, setActivePlcTab] = useState<'formatted' | 'raw'>('formatted');
  
  const tabs = [
    { id: 'formatted', label: 'Operations' },
    { id: 'raw', label: 'Raw Data' }
  ];
  
  // Helper function to determine what changed between operations
  const getChanges = (entry: any, prevEntry: any | null) => {
    const changes = [];
    
    // If this is the first entry, it's account creation
    if (!prevEntry) {
      // First entry (account creation)
      changes.push({
        type: 'account_create',
        text: 'Account created'
      });
      if (entry.handles && entry.handles.length > 0) {
        if (entry.handles.length === 1) {
          changes.push({
            type: 'handle_init',
            text: `Initial handle: ${entry.handles[0]}`
          });
        } else {
          changes.push({
            type: 'handle_init',
            text: `Initial primary handle: ${entry.handles[0]}`
          });
          entry.handles.slice(1).forEach((handle: string, index: number) => {
            changes.push({
              type: 'handle_init',
              text: `Initial additional handle ${index + 1}: ${handle}`
            });
          });
        }
      }
      if (entry.pdsEndpoint) {
        changes.push({
          type: 'pds_init',
          text: `Initial PDS: ${entry.pdsEndpoint}`
        });
      }
      // Show initial services (if any beyond the standard PDS)
      if (entry.services) {
        Object.keys(entry.services).forEach(serviceId => {
          if (serviceId !== 'atproto_pds') {
            const service = entry.services[serviceId];
            changes.push({
              type: 'service_add',
              text: `Initial service: ${serviceId} (${service.type}) - ${service.endpoint}`
            });
          }
        });
      }
      if (entry.rotationKeys && entry.rotationKeys.length > 0) {
        // Remove the count summary line and just list keys
        entry.rotationKeys.forEach((key: string, keyIndex: number) => {
          changes.push({
            type: 'key_init',
            text: `Key ${keyIndex + 1}: ${key}`
          });
        });
      }
      
      // Show initial verification methods
      if (entry.verificationMethods) {
        Object.entries(entry.verificationMethods).forEach(([methodKey, methodValue]) => {
          changes.push({
            type: 'verification_init',
            text: `Initial ${methodKey} verification method: ${methodValue}`
          });
        });
      }
      return changes;
    }
    
    // Check for handle changes
    const prevHandles = prevEntry.handles || [];
    const currentHandles = entry.handles || [];
    
    // Check for primary handle changes (first handle)
    if (prevHandles.length > 0 && currentHandles.length > 0 && 
        prevHandles[0] !== currentHandles[0]) {
      changes.push({
        type: 'handle_change',
        text: `Changed primary handle: ${prevHandles[0]} → ${currentHandles[0]}`
      });
    } else if (prevHandles.length === 0 && currentHandles.length > 0) {
      changes.push({
        type: 'handle_add',
        text: `Added primary handle: ${currentHandles[0]}`
      });
    } else if (prevHandles.length > 0 && currentHandles.length === 0) {
      changes.push({
        type: 'handle_remove',
        text: `Removed primary handle: ${prevHandles[0]}`
      });
    }
    
    // Check for additional handle changes (beyond the first one)
    const prevAdditionalHandles = prevHandles.slice(1);
    const currentAdditionalHandles = currentHandles.slice(1);
    
    // Find added handles
    const addedHandles = currentAdditionalHandles.filter((handle: string) => !prevAdditionalHandles.includes(handle));
    addedHandles.forEach((handle: string) => {
      changes.push({
        type: 'handle_add',
        text: `Added additional handle: ${handle}`
      });
    });
    
    // Find removed handles
    const removedHandles = prevAdditionalHandles.filter((handle: string) => !currentAdditionalHandles.includes(handle));
    removedHandles.forEach((handle: string) => {
      changes.push({
        type: 'handle_remove',
        text: `Removed additional handle: ${handle}`
      });
    });
    
    // Find modified handles (handles that changed their content but are in the same position)
    // This is more complex as handles don't have fixed positions, so we'll focus on additions/removals
    
    // Check for PDS changes
    if (entry.pdsEndpoint !== prevEntry.pdsEndpoint) {
      changes.push({
        type: 'pds_change',
        text: `Changed PDS: ${prevEntry.pdsEndpoint || 'none'} → ${entry.pdsEndpoint || 'none'}`
      });
    }
    
    // Check for rotation key changes
    if (entry.rotationKeys && prevEntry.rotationKeys) {
      const prevKeys = prevEntry.rotationKeys || [];
      const currentKeys = entry.rotationKeys || [];
      
      // Check if the number of keys changed
      if (prevKeys.length !== currentKeys.length) {
        // Added keys
        const addedKeys = currentKeys.filter((key: string) => !prevKeys.includes(key));
        if (addedKeys.length > 0) {
          // Show the actual keys that were added without counts
          addedKeys.forEach((key: string) => {
            changes.push({
              type: 'key_add',
              text: `Added rotation key: ${key}`
            });
          });
        }
        
        // Removed keys
        const removedKeys = prevKeys.filter((key: string) => !currentKeys.includes(key));
        if (removedKeys.length > 0) {
          removedKeys.forEach((key: string) => {
            changes.push({
              type: 'key_remove',
              text: `Removed rotation key: ${key}`
            });
          });
        }
      } else {
        // Same number but different keys
        const addedKeys = currentKeys.filter((key: string) => !prevKeys.includes(key));
        if (addedKeys.length > 0) {
          addedKeys.forEach((key: string) => {
            changes.push({
              type: 'key_replace',
              text: `Replaced rotation key: ${key}`
            });
          });
        }
      }
    }
    
    // Check for verification method changes
    if (entry.verificationMethods && prevEntry.verificationMethods) {
      // Check for changes in the atproto verification method
      if (entry.verificationMethods.atproto !== prevEntry.verificationMethods.atproto) {
        changes.push({
          type: 'verification_change',
          text: `Changed verification method: ${prevEntry.verificationMethods.atproto} → ${entry.verificationMethods.atproto}`
        });
      }
      
      // Check for other verification methods that may be added or modified
      Object.keys(entry.verificationMethods).forEach(methodKey => {
        if (methodKey !== 'atproto' && 
            (!prevEntry.verificationMethods[methodKey] || 
              prevEntry.verificationMethods[methodKey] !== entry.verificationMethods[methodKey])) {
          if (!prevEntry.verificationMethods[methodKey]) {
            changes.push({
              type: 'verification_add',
              text: `Added ${methodKey} verification method: ${entry.verificationMethods[methodKey]}`
            });
          } else {
            changes.push({
              type: 'verification_change',
              text: `Changed ${methodKey} verification method: ${prevEntry.verificationMethods[methodKey]} → ${entry.verificationMethods[methodKey]}`
            });
          }
        }
      });
      
      // Check for removed verification methods
      Object.keys(prevEntry.verificationMethods).forEach(methodKey => {
        if (!entry.verificationMethods[methodKey]) {
          changes.push({
            type: 'verification_remove',
            text: `Removed ${methodKey} verification method: ${prevEntry.verificationMethods[methodKey]}`
          });
        }
      });
    }
    
    // Check for service changes
    if (entry.services && prevEntry.services) {
      // Check for added services
      Object.keys(entry.services).forEach(serviceId => {
        if (!prevEntry.services[serviceId]) {
          const service = entry.services[serviceId];
          changes.push({
            type: 'service_add',
            text: `Service added: ${serviceId} (${service.type}) - ${service.endpoint}`
          });
        } else if (prevEntry.services[serviceId].endpoint !== entry.services[serviceId].endpoint) {
          // Service endpoint changed
          changes.push({
            type: 'service_change',
            text: `Service ${serviceId} endpoint changed: ${prevEntry.services[serviceId].endpoint} → ${entry.services[serviceId].endpoint}`
          });
        }
      });
      
      // Check for removed services
      Object.keys(prevEntry.services).forEach(serviceId => {
        if (!entry.services[serviceId]) {
          const service = prevEntry.services[serviceId];
          changes.push({
            type: 'service_remove',
            text: `Service removed: ${serviceId} (${service.type})`
          });
        }
      });
    } else if (!prevEntry.services && entry.services) {
      // All services are new (shouldn't happen after creation, but handle it)
      Object.keys(entry.services).forEach(serviceId => {
        const service = entry.services[serviceId];
        changes.push({
          type: 'service_add',
          text: `Service added: ${serviceId} (${service.type}) - ${service.endpoint}`
        });
      });
    } else if (prevEntry.services && !entry.services) {
      // All services removed (unusual but possible)
      Object.keys(prevEntry.services).forEach(serviceId => {
        const service = prevEntry.services[serviceId];
        changes.push({
          type: 'service_remove',
          text: `Service removed: ${serviceId} (${service.type})`
        });
      });
    }
    
    return changes;
  };
  
  // Helper function to get the appropriate icon for a change type
  const getIconForChangeType = (type: string) => {
    switch (type) {
      case 'account_create':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        );
      case 'handle_change':
      case 'handle_add':
      case 'handle_remove':
      case 'handle_init':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
          </svg>
        );
      case 'pds_change':
      case 'pds_init':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        );
      case 'key_add':
      case 'key_remove':
      case 'key_replace':
      case 'key_init':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'verification_change':
      case 'verification_add':
      case 'verification_remove':
      case 'verification_init':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'service_add':
      case 'service_remove':
      case 'service_change':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-lg">PLC Directory Logs</h3>
          {showDidDocument && (
            <DocumentIcon 
              onClick={showDidDocument} 
              className=""
            />
          )}
        </div>
        <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 dark:text-gray-400 px-2 py-1 rounded-full">
          {plcLog.length}
        </span>
      </div>
      
      <TabsContainer 
        tabs={tabs} 
        activeTab={activePlcTab} 
        setActiveTab={(tab) => setActivePlcTab(tab as 'formatted' | 'raw')}
        className="mb-4"
      >
        {activePlcTab === 'formatted' && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Sort in reverse chronological order and show changes */}
            {[...plcLog].reverse().map((entry, index, array) => {
              // Format date with month names and explicitly show UTC
              const dateObj = new Date(entry.createdAt);
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const month = monthNames[dateObj.getUTCMonth()];
              const day = dateObj.getUTCDate();
              const year = dateObj.getUTCFullYear();
              const hours = dateObj.getUTCHours().toString().padStart(2, '0');
              const minutes = dateObj.getUTCMinutes().toString().padStart(2, '0');
              const seconds = dateObj.getUTCSeconds().toString().padStart(2, '0');
              const date = `${month} ${day} ${year}, ${hours}:${minutes}:${seconds} UTC`;
              
              const prevEntry = index < array.length - 1 ? array[index + 1] : null;
              
              // Get the changes between this and the previous entry
              const changes = getChanges(entry, prevEntry);
              
              return (
                <div key={index} className={`px-6 py-4 ${index > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''} ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800'}`}>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{date}</div>
                  <ul className="space-y-2">
                    {changes.map((change, changeIndex) => (
                      <li key={changeIndex} className="flex items-start gap-2 text-sm">
                        <div className="mt-0.5 flex-shrink-0">
                          {getIconForChangeType(change.type)}
                        </div>
                        <span className="flex-1 break-all overflow-hidden">{change.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        
        {activePlcTab === 'raw' && (
          <JsonViewer data={plcLog} title="PLC Directory Audit Log" />
        )}
      </TabsContainer>
    </div>
  );
} 
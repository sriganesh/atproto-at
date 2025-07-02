import React, { createContext, useContext, ReactNode } from 'react';
import { useViewerCache } from '../hooks/useViewerCache';

// Use the return type from useViewerCache hook
type ViewerCacheContextType = ReturnType<typeof useViewerCache>;

const ViewerCacheContext = createContext<ViewerCacheContextType | undefined>(undefined);

interface ViewerCacheProviderProps {
  children: ReactNode;
}

export function ViewerCacheProvider({ children }: ViewerCacheProviderProps) {
  const cacheManager = useViewerCache();
  
  return (
    <ViewerCacheContext.Provider value={cacheManager}>
      {children}
    </ViewerCacheContext.Provider>
  );
}

export function useViewerCacheContext(): ViewerCacheContextType {
  const context = useContext(ViewerCacheContext);
  if (context === undefined) {
    throw new Error('useViewerCacheContext must be used within a ViewerCacheProvider');
  }
  return context;
} 
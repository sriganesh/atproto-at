import { useState, useCallback, useEffect } from 'react';
import { UnifiedCache, createTTLCache } from '@/lib/utils/cache';

interface CacheManager {
  profileCache: UnifiedCache<string, any>;
  listCache: UnifiedCache<string, any>;
  postCache: UnifiedCache<string, any>;
  handleProfileCached: (did: string, profileData: any) => void;
  handleListCached: (listUri: string, listData: any) => void;
  handlePostCached: (postUri: string, postData: any) => void;
  getOrCreateProfileRequest: (did: string, requestFn: () => Promise<any>) => Promise<any>;
  getOrCreateListRequest: (listUri: string, requestFn: () => Promise<any>) => Promise<any>;
  getOrCreatePostRequest: (postUri: string, requestFn: () => Promise<any>) => Promise<any>;
  invalidateProfile: (did: string) => void;
  invalidatePost: (postUri: string) => void;
  invalidateList: (listUri: string) => void;
  clearAllCaches: () => void;
  getCacheStats: () => { profiles: any; lists: any; posts: any };
}

export function useViewerCache(): CacheManager {
  // Bounded persistent caches with TTL to prevent stale data
  // Different TTLs for different data types based on update frequency
  const [profileCache] = useState(() => createTTLCache<string, any>(200, 300)); // 200 profiles, 5 min TTL
  const [listCache] = useState(() => createTTLCache<string, any>(100, 180));    // 100 lists, 3 min TTL  
  const [postCache] = useState(() => createTTLCache<string, any>(500, 120));    // 500 posts, 2 min TTL
  
  // Request deduplication to prevent simultaneous calls for same data
  const [pendingProfileRequests] = useState(new Map<string, Promise<any>>());
  const [pendingListRequests] = useState(new Map<string, Promise<any>>());
  const [pendingPostRequests] = useState(new Map<string, Promise<any>>());
  
  // Cache handlers with request deduplication
  const handleProfileCached = useCallback((did: string, profileData: any) => {
    profileCache.set(did, profileData);
    pendingProfileRequests.delete(did);
  }, [profileCache, pendingProfileRequests]);

  const handleListCached = useCallback((listUri: string, listData: any) => {
    listCache.set(listUri, listData);
    pendingListRequests.delete(listUri);
  }, [listCache, pendingListRequests]);

  const handlePostCached = useCallback((postUri: string, postData: any) => {
    postCache.set(postUri, postData);
    pendingPostRequests.delete(postUri);
  }, [postCache, pendingPostRequests]);

  // Request deduplication helpers
  const getOrCreateProfileRequest = useCallback((did: string, requestFn: () => Promise<any>) => {
    if (pendingProfileRequests.has(did)) {
      return pendingProfileRequests.get(did)!;
    }
    
    const request = requestFn().finally(() => {
      pendingProfileRequests.delete(did);
    });
    
    pendingProfileRequests.set(did, request);
    return request;
  }, [pendingProfileRequests]);

  const getOrCreateListRequest = useCallback((listUri: string, requestFn: () => Promise<any>) => {
    if (pendingListRequests.has(listUri)) {
      return pendingListRequests.get(listUri)!;
    }
    
    const request = requestFn().finally(() => {
      pendingListRequests.delete(listUri);
    });
    
    pendingListRequests.set(listUri, request);
    return request;
  }, [pendingListRequests]);

  const getOrCreatePostRequest = useCallback((postUri: string, requestFn: () => Promise<any>) => {
    if (pendingPostRequests.has(postUri)) {
      return pendingPostRequests.get(postUri)!;
    }
    
    const request = requestFn().finally(() => {
      pendingPostRequests.delete(postUri);
    });
    
    pendingPostRequests.set(postUri, request);
    return request;
  }, [pendingPostRequests]);

  // Cache invalidation methods
  const invalidateProfile = useCallback((did: string) => {
    profileCache.delete(did);
  }, [profileCache]);

  const invalidatePost = useCallback((postUri: string) => {
    postCache.delete(postUri);
  }, [postCache]);

  const invalidateList = useCallback((listUri: string) => {
    listCache.delete(listUri);
  }, [listCache]);

  const clearAllCaches = useCallback(() => {
    profileCache.clear();
    listCache.clear();
    postCache.clear();
  }, [profileCache, listCache, postCache]);

  const getCacheStats = useCallback(() => {
    return {
      profiles: profileCache.getStats(),
      lists: listCache.getStats(),
      posts: postCache.getStats()
    };
  }, [profileCache, listCache, postCache]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up cache intervals
      profileCache.destroy();
      listCache.destroy();
      postCache.destroy();
    };
  }, [profileCache, listCache, postCache]);

  return {
    profileCache,
    listCache,
    postCache,
    handleProfileCached,
    handleListCached,
    handlePostCached,
    getOrCreateProfileRequest,
    getOrCreateListRequest,
    getOrCreatePostRequest,
    invalidateProfile,
    invalidatePost,
    invalidateList,
    clearAllCaches,
    getCacheStats,
  };
} 
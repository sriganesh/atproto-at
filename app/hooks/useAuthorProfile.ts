import { useState, useEffect } from 'react';
import { useViewerCacheContext } from '../components/viewer/context/ViewerCacheContext';
import { fetchProfileData, extractProfileInfo, type ProfileInfo } from '../../lib/utils/profile';
import { getAuthorDidFromUri } from '@/lib/utils/atproto';

/**
 * Custom hook to load author profile information from an AT Protocol URI
 * Handles caching, deduplication, and error states
 * 
 * @param uri - AT Protocol URI containing the author DID
 * @returns Object containing authorInfo, loading state, and error
 */
export function useAuthorProfile(uri: string) {
  const {
    profileCache,
    handleProfileCached: onProfileCached,
    getOrCreateProfileRequest,
  } = useViewerCacheContext();
  
  const [authorInfo, setAuthorInfo] = useState<ProfileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAuthorProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const authorDid = getAuthorDidFromUri(uri);
        
        if (!authorDid) {
          setIsLoading(false);
          return;
        }

        // Check cache first
        if (profileCache?.has(authorDid)) {
          const cachedProfile = profileCache.get(authorDid);
          if (cachedProfile) {
            const info = extractProfileInfo(cachedProfile, authorDid);
            setAuthorInfo(info);
            setIsLoading(false);
            return;
          }
        }

        // Use request deduplication if available
        let profileData;
        if (getOrCreateProfileRequest) {
          profileData = await getOrCreateProfileRequest(authorDid, async () => {
            return await fetchProfileData(authorDid);
          });
        } else {
          // Fallback to direct fetch
          profileData = await fetchProfileData(authorDid);
        }
        
        if (profileData) {
          const info = extractProfileInfo(profileData, authorDid);
          setAuthorInfo(info);
          
          // Cache the result
          if (onProfileCached) {
            onProfileCached(authorDid, profileData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch author profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load author profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthorProfile();
  }, [uri, profileCache, onProfileCached, getOrCreateProfileRequest]);

  return { authorInfo, isLoading, error };
}
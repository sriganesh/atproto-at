'use client';

import { useCallback } from 'react';
import { useAuth } from '@/app/components/auth/AuthProvider';

export function useAuthenticatedRequest() {
  const { session } = useAuth();

  const executeRequest = useCallback(async <T = any>(
    request: (agent: any) => Promise<T>
  ): Promise<T> => {
    if (!session) {
      throw new Error('Not authenticated');
    }

    try {
      return await request(session.agent);
    } catch (error) {
      // Handle token refresh if needed
      if (error instanceof Error && error.message.includes('token')) {
        // Token might be expired, could trigger a refresh here
        throw new Error('Session expired. Please log in again.');
      }
      throw error;
    }
  }, [session]);

  return {
    executeRequest,
    isAuthenticated: !!session,
    agent: session?.agent,
  };
}

// Example usage for future write operations:
// const { executeRequest } = useAuthenticatedRequest();
// 
// const createPost = async (text: string) => {
//   return executeRequest(async (agent) => {
//     return await agent.post({
//       text,
//       createdAt: new Date().toISOString(),
//     });
//   });
// };
//
// const likePost = async (uri: string, cid: string) => {
//   return executeRequest(async (agent) => {
//     return await agent.like(uri, cid);
//   });
// };
//
// const followUser = async (did: string) => {
//   return executeRequest(async (agent) => {
//     return await agent.follow(did);
//   });
// };
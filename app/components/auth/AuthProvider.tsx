'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Agent } from '@atproto/api';
import { getSession, getAllSessions, logout as oauthLogout, startOAuthFlow, initOAuthClient, getOAuthClient } from '@/lib/auth/oauth-client';
import { ensureProfileRecord } from '@/app/utils/profile';

interface AuthSession {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  agent: Agent;
}

interface AuthContextType {
  session: AuthSession | null;
  sessions: Array<{ did: string; handle: string }>;
  isLoading: boolean;
  error: string | null;
  login: (handle: string) => Promise<void>;
  logout: () => Promise<void>;
  switchAccount: (did: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessions, setSessions] = useState<Array<{ did: string; handle: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async (did?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const oauthSession = await getSession(did);
      
      if (oauthSession) {
        const agent = new Agent(oauthSession);
        
        // Get session info including email if available
        const sessionInfo = await agent.com.atproto.server.getSession();
        
        // Try to fetch the user's profile to get avatar and display name
        let avatar: string | undefined;
        let displayName: string | undefined;
        try {
          const profile = await agent.app.bsky.actor.getProfile({ actor: sessionInfo.data.did });
          avatar = profile.data.avatar;
          displayName = profile.data.displayName;
        } catch (err) {
        }
        
        const newSession = {
          did: sessionInfo.data.did,
          handle: sessionInfo.data.handle,
          displayName,
          avatar,
          agent,
        };
        setSession(newSession);

        // Ensure at.atproto.profile record exists
        try {
          await ensureProfileRecord(agent, sessionInfo.data.did);
        } catch (err) {
          console.error('Failed to ensure profile record:', err);
        }
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllSessions = useCallback(async () => {
    try {
      const allSessions = await getAllSessions() as Array<{ did: string; handle?: string }>;
      // Ensure allSessions is an array before mapping
      if (Array.isArray(allSessions)) {
        setSessions(allSessions.map(s => ({ did: s.did, handle: s.handle || s.did })));
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    // Initialize OAuth client first to handle any pending callbacks
    async function initialize() {
      try {
        const result = await initOAuthClient();
        if (result && result.session) {
          // OAuth callback was processed successfully
          
          // Check if this is a new OAuth callback (not just session restoration)
          const isNewOAuthCallback = window.location.pathname === '/auth/callback' || 
                                      window.location.search.includes('code=') ||
                                      window.location.search.includes('state=');
          
          // Use the session directly from the result
          try {
            // The OAuth session should work with restore
            const did = result.session.sub;
            
            // Force a small delay to ensure the session is stored
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get the OAuth client to restore the session
            const client = await getOAuthClient();
            
            // Now try to restore the session properly
            const restoredSession = await client.restore(did);
            
            if (restoredSession) {
              const agent = new Agent(restoredSession);
              
              // Use com.atproto.server.getSession to get session info
              const sessionInfo = await agent.com.atproto.server.getSession();
              
              // Try to fetch the user's profile to get avatar and display name
              let avatar: string | undefined;
              let displayName: string | undefined;
              try {
                const profile = await agent.app.bsky.actor.getProfile({ actor: sessionInfo.data.did });
                avatar = profile.data.avatar;
                displayName = profile.data.displayName;
              } catch (err) {
                    }
              
              const newSession = {
                did: sessionInfo.data.did,
                handle: sessionInfo.data.handle,
                displayName,
                avatar,
                agent,
              };
              setSession(newSession);

              // Ensure at.atproto.profile record exists
              try {
                await ensureProfileRecord(agent, sessionInfo.data.did);
              } catch (err) {
                console.error('Failed to ensure profile record:', err);
              }

              setIsLoading(false);

              // Also load all sessions
              loadAllSessions();
              
              // Only dispatch auth event for new OAuth callbacks, not session restoration
              if (isNewOAuthCallback) {
                window.dispatchEvent(new CustomEvent('authStateChange', { 
                  detail: { type: 'login' } 
                }));
              }
            } else {
              throw new Error('Failed to restore OAuth session');
            }
          } catch (err) {
            console.error('Failed to use OAuth session directly:', err);
            // Fall back to loading normally
            setIsLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await loadSession();
            await loadAllSessions();
          }
        } else {
          // Normal session loading
          loadSession();
          loadAllSessions();
        }
      } catch (err) {
        console.error('Failed to initialize OAuth client:', err);
        // Try loading sessions anyway
        loadSession();
        loadAllSessions();
      }
    }
    
    initialize();
  }, [loadSession, loadAllSessions]);

  const login = useCallback(async (handle: string) => {
    try {
      setError(null);
      await startOAuthFlow(handle);
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    if (!session) return;
    
    try {
      setError(null);
      await oauthLogout(session.did);
      setSession(null);
      await loadAllSessions();
      
      // Dispatch auth event to reset modes
      window.dispatchEvent(new CustomEvent('authStateChange', { 
        detail: { type: 'logout' } 
      }));
    } catch (err) {
      console.error('Logout failed:', err);
      setError(err instanceof Error ? err.message : 'Logout failed');
      throw err;
    }
  }, [session, loadAllSessions]);

  const switchAccount = useCallback(async (did: string) => {
    try {
      setError(null);
      await loadSession(did);
    } catch (err) {
      console.error('Account switch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch account');
      throw err;
    }
  }, [loadSession]);

  const refreshSession = useCallback(async () => {
    if (!session) return;
    await loadSession(session.did);
  }, [session, loadSession]);

  const value: AuthContextType = {
    session,
    sessions,
    isLoading,
    error,
    login,
    logout,
    switchAccount,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
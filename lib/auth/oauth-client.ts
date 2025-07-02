'use client';

import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import { AUTH_CONFIG, getRedirectUri } from './config';

let oauthClient: BrowserOAuthClient | null = null;

export async function getOAuthClient(): Promise<BrowserOAuthClient> {
  if (oauthClient) return oauthClient;

  oauthClient = new BrowserOAuthClient({
    clientMetadata: AUTH_CONFIG.clientMetadata,
    handleResolver: 'https://bsky.social',
    responseMode: 'query',
    plcDirectoryUrl: 'https://plc.directory',
    // Ensure we're using the correct redirect URI
    redirectUri: AUTH_CONFIG.redirectUri,
  });

  return oauthClient;
}

export async function startOAuthFlow(handle: string) {
  const client = await getOAuthClient();
  
  try {
    // Initiate the OAuth flow
    const authUrl = await client.authorize(handle, {
      scope: AUTH_CONFIG.scope,
    });
    
    // Redirect to the authorization server
    window.location.href = authUrl.toString();
  } catch (error) {
    console.error('Failed to start OAuth flow:', error);
    throw error;
  }
}

export async function initOAuthClient() {
  const client = await getOAuthClient();
  
  try {
    // Initialize the client - this handles the callback automatically
    const result = await client.init();
    
    // If we have a session from the init, it means OAuth callback was processed
    if (result?.session) {
      // The session is now stored, we can retrieve it
    }
    
    return result;
  } catch (error) {
    console.error('Failed to initialize OAuth client:', error);
    throw error;
  }
}

export async function getSession(did?: string) {
  const client = await getOAuthClient();
  
  try {
    if (did) {
      return await client.restore(did);
    }
    
    // Try to get stored sessions - might be undefined if none exist
    let sessions;
    try {
      sessions = await client.sessionGetter.getStored();
    } catch (err) {
      sessions = [];
    }
    
    // Handle various return types
    if (!sessions) {
      return null;
    }
    
    if (Array.isArray(sessions) && sessions.length > 0) {
      // Return the first available session
      const restoredSession = await client.restore(sessions[0].did);
      return restoredSession;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

export async function logout(did: string) {
  const client = await getOAuthClient();
  
  try {
    const session = await client.restore(did);
    if (session) {
      await session.signOut();
    }
  } catch (error) {
    console.error('Failed to logout:', error);
    throw error;
  }
}

export async function getAllSessions() {
  const client = await getOAuthClient();
  
  try {
    const sessions = await client.sessionGetter.getStored();
    return sessions || [];
  } catch (error) {
    console.error('Failed to get all sessions:', error);
    return [];
  }
}
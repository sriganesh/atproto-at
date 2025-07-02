'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthModeContextType {
  isReadOnly: boolean;
  isDeveloperMode: boolean;
  toggleReadOnly: () => void;
  toggleDeveloperMode: () => void;
  resetToDefaults: () => void;
}

const AuthModeContext = createContext<AuthModeContextType | null>(null);

export function useAuthMode() {
  const context = useContext(AuthModeContext);
  if (!context) {
    throw new Error('useAuthMode must be used within an AuthModeProvider');
  }
  return context;
}

interface AuthModeProviderProps {
  children: React.ReactNode;
}

const STORAGE_KEYS = {
  READ_ONLY: 'atproto_read_only_mode',
  DEVELOPER: 'atproto_developer_mode',
};

export function AuthModeProvider({ children }: AuthModeProviderProps) {
  // Default to read-only mode
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const storedReadOnly = localStorage.getItem(STORAGE_KEYS.READ_ONLY);
    const storedDeveloper = localStorage.getItem(STORAGE_KEYS.DEVELOPER);
    
    if (storedReadOnly !== null) {
      setIsReadOnly(storedReadOnly === 'true');
    }
    
    if (storedDeveloper !== null) {
      setIsDeveloperMode(storedDeveloper === 'true');
    }
    
    setIsInitialized(true);
  }, []);

  // Listen for auth events to reset modes
  useEffect(() => {
    const handleAuthEvent = (event: CustomEvent) => {
      if (event.detail.type === 'logout' || event.detail.type === 'login') {
        // Reset to defaults on logout or new login
        setIsReadOnly(true);
        setIsDeveloperMode(false);
      }
    };

    window.addEventListener('authStateChange' as any, handleAuthEvent);
    return () => {
      window.removeEventListener('authStateChange' as any, handleAuthEvent);
    };
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEYS.READ_ONLY, String(isReadOnly));
    }
  }, [isReadOnly, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEYS.DEVELOPER, String(isDeveloperMode));
    }
  }, [isDeveloperMode, isInitialized]);

  const toggleReadOnly = () => {
    setIsReadOnly(prev => {
      const newValue = !prev;
      // If turning read-only back on, also turn off developer mode
      if (newValue) {
        setIsDeveloperMode(false);
      }
      return newValue;
    });
  };

  const toggleDeveloperMode = () => {
    // Developer mode can only be enabled if read-only is off
    if (!isReadOnly) {
      setIsDeveloperMode(prev => !prev);
    }
  };

  const resetToDefaults = () => {
    // Reset to default state: read-only ON, developer mode OFF
    setIsReadOnly(true);
    setIsDeveloperMode(false);
  };

  return (
    <AuthModeContext.Provider
      value={{
        isReadOnly,
        isDeveloperMode,
        toggleReadOnly,
        toggleDeveloperMode,
        resetToDefaults,
      }}
    >
      {children}
    </AuthModeContext.Provider>
  );
}
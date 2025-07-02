'use client';

import React from 'react';
import { AuthProvider } from './AuthProvider';
import { AuthModeProvider } from './AuthModeProvider';

interface CombinedAuthProviderProps {
  children: React.ReactNode;
}

export function CombinedAuthProvider({ children }: CombinedAuthProviderProps) {
  return (
    <AuthProvider>
      <AuthModeProvider>
        {children}
      </AuthModeProvider>
    </AuthProvider>
  );
}
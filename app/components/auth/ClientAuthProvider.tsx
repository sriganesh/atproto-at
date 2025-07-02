'use client';

import dynamic from 'next/dynamic';

export const ClientAuthProvider = dynamic(
  () => import('./CombinedAuthProvider').then(mod => mod.CombinedAuthProvider),
  { 
    ssr: false,
    loading: () => <div className="hidden" />
  }
);
'use client';

import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const { user, isLoading } = useAuth();
  
  // This page just redirects via the layout effect, 
  // but we can show a brief splash.
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#0f172a',
      color: '#94a3b8'
    }}>
      Loading DigitalPylot...
    </div>
  );
}

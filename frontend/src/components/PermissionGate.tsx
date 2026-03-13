'use client';

import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

interface PermissionGateProps {
  children: ReactNode;
  permission: string;
  fallback?: ReactNode;
}

export default function PermissionGate({ children, permission, fallback = null }: PermissionGateProps) {
  const { hasPermission, isLoading } = useAuth();

  if (isLoading) return null;

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

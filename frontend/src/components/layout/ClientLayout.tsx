'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  
  // Don't show layout for login page
  const showLayout = pathname !== '/login';
  
  if (showLayout) {
    return <Layout>{children}</Layout>;
  }
  
  return <>{children}</>;
}

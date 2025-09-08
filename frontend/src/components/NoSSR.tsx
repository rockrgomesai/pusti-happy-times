'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Create a NoSSR wrapper to prevent hydration issues
const NoSSR = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default dynamic(() => Promise.resolve(NoSSR), {
  ssr: false,
});

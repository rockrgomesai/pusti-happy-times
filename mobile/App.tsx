/**
 * TKG Pusti HT Sales App
 * @format
 */

import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { OfflineSyncProvider } from './src/hooks/useOfflineSync';

function App() {
  return (
    <OfflineSyncProvider>
      <AppNavigator />
    </OfflineSyncProvider>
  );
}

export default App;

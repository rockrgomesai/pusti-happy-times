/**
 * useOfflineSync — global hook that:
 *   1. Listens to NetInfo; when connectivity returns, flushes the queue.
 *   2. Exposes { pendingCount, syncing, syncNow } for UI badges.
 *
 * Mount once near the app root (e.g. in App.tsx) via <OfflineSyncProvider/>.
 * Child components can read via useOfflineSync().
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import salesAPI from '../services/salesAPI';

type Ctx = {
  pendingCount: number;
  syncing: boolean;
  isOnline: boolean;
  lastSyncAt: string | null;
  syncNow: () => Promise<void>;
  refreshCount: () => Promise<void>;
};

const OfflineSyncContext = createContext<Ctx>({
  pendingCount: 0,
  syncing: false,
  isOnline: true,
  lastSyncAt: null,
  syncNow: async () => {},
  refreshCount: async () => {},
});

export const OfflineSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const syncInFlight = useRef(false);

  const refreshCount = useCallback(async () => {
    const n = await salesAPI.getPendingCount();
    setPendingCount(n);
  }, []);

  const syncNow = useCallback(async () => {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    setSyncing(true);
    try {
      const result = await salesAPI.syncPendingOrders();
      setLastSyncAt(new Date().toISOString());
      if (result.synced > 0) {
        console.log(`[OfflineSync] synced ${result.synced}, remaining ${result.remaining}`);
      }
    } catch (e) {
      console.warn('[OfflineSync] sync failed:', e);
    } finally {
      setSyncing(false);
      syncInFlight.current = false;
      await refreshCount();
    }
  }, [refreshCount]);

  // Initial queue size
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // Poll queue size every 15s so UI stays fresh if other screens enqueue.
  useEffect(() => {
    const t = setInterval(refreshCount, 15000);
    return () => clearInterval(t);
  }, [refreshCount]);

  // React to connectivity changes — auto-sync when we come back online.
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online) {
        // fire and forget
        syncNow();
      }
    });
    return () => unsub();
  }, [syncNow]);

  return (
    <OfflineSyncContext.Provider value={{ pendingCount, syncing, isOnline, lastSyncAt, syncNow, refreshCount }}>
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSync = () => useContext(OfflineSyncContext);

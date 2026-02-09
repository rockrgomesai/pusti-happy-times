/**
 * Offline Sync Service
 * Handles offline queue for failed API requests with retry logic
 * 
 * Features:
 * - Persistent queue in AsyncStorage
 * - Exponential backoff retry
 * - Auto-sync on network restore
 * - Prioritized queue (sessions > locations)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import trackingAPI from './trackingAPI';

const SYNC_QUEUE_KEY = '@sync_queue';
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRY_DELAY = 60000; // 1 minute

export interface QueuedRequest {
  id: string;
  type: 'start_session' | 'upload_locations' | 'stop_session';
  priority: number; // 1 = highest (start/stop), 2 = normal (locations)
  endpoint: string;
  method: 'POST' | 'PUT';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
}

class SyncService {
  private queue: QueuedRequest[] = [];
  private isSyncing: boolean = false;
  private isOnline: boolean = true;
  private syncListeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.initialize();
  }

  /**
   * Initialize service - load queue and setup network listener
   */
  async initialize() {
    await this.loadQueue();
    this.setupNetworkListener();
  }

  /**
   * Load queue from AsyncStorage
   */
  private async loadQueue() {
    try {
      const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (queueData) {
        this.queue = JSON.parse(queueData);
        console.log(`📦 Loaded ${this.queue.length} queued requests from storage`);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  /**
   * Save queue to AsyncStorage
   */
  private async saveQueue() {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Setup network state listener
   */
  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;

      console.log(`📡 Network status: ${this.isOnline ? 'Online' : 'Offline'}`);

      // Auto-sync when coming back online
      if (wasOffline && this.isOnline && this.queue.length > 0) {
        console.log('🔄 Network restored, starting auto-sync...');
        this.syncAll();
      }

      this.notifyListeners({
        isOnline: this.isOnline,
        queueSize: this.queue.length,
        isSyncing: this.isSyncing,
      });
    });
  }

  /**
   * Add request to queue
   */
  async addToQueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>) {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
    };

    this.queue.push(queuedRequest);
    
    // Sort by priority (1 = highest)
    this.queue.sort((a, b) => a.priority - b.priority);
    
    await this.saveQueue();

    console.log(`📥 Added to sync queue: ${request.type} (queue size: ${this.queue.length})`);

    this.notifyListeners({
      isOnline: this.isOnline,
      queueSize: this.queue.length,
      isSyncing: this.isSyncing,
    });

    // Try to sync immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.syncAll();
    }
  }

  /**
   * Sync all queued requests
   */
  async syncAll() {
    if (this.isSyncing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({
      isOnline: this.isOnline,
      queueSize: this.queue.length,
      isSyncing: true,
    });

    console.log(`🔄 Starting sync of ${this.queue.length} queued requests...`);

    while (this.queue.length > 0 && this.isOnline) {
      const request = this.queue[0];
      
      try {
        await this.executeRequest(request);
        
        // Success - remove from queue
        this.queue.shift();
        await this.saveQueue();
        
        console.log(`✅ Synced: ${request.type}`);
        
      } catch (error: any) {
        console.error(`❌ Sync failed for ${request.type}:`, error.message);
        
        request.retryCount++;
        request.lastError = error.message;

        // Check if max retries reached
        if (request.retryCount >= request.maxRetries) {
          console.log(`⚠️ Max retries reached for ${request.type}, removing from queue`);
          this.queue.shift();
          await this.saveQueue();
        } else {
          // Calculate exponential backoff delay
          const delay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, request.retryCount),
            MAX_RETRY_DELAY
          );
          
          console.log(`⏳ Will retry in ${delay / 1000}s (attempt ${request.retryCount + 1}/${request.maxRetries})`);
          
          await this.saveQueue();
          await this.sleep(delay);
        }
      }

      this.notifyListeners({
        isOnline: this.isOnline,
        queueSize: this.queue.length,
        isSyncing: true,
      });
    }

    this.isSyncing = false;
    
    this.notifyListeners({
      isOnline: this.isOnline,
      queueSize: this.queue.length,
      isSyncing: false,
    });

    console.log(`✅ Sync complete. Remaining queue: ${this.queue.length}`);
  }

  /**
   * Execute a queued request
   */
  private async executeRequest(request: QueuedRequest): Promise<any> {
    switch (request.type) {
      case 'start_session':
        return await trackingAPI.startSession(request.data);
      
      case 'upload_locations':
        return await trackingAPI.uploadLocations(
          request.data.sessionId,
          request.data.locations
        );
      
      case 'stop_session':
        return await trackingAPI.stopSession(request.data.sessionId);
      
      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }

  /**
   * Helper sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add sync status listener
   */
  addSyncListener(listener: (status: SyncStatus) => void) {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync status listener
   */
  removeSyncListener(listener: (status: SyncStatus) => void) {
    this.syncListeners = this.syncListeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(status: SyncStatus) {
    this.syncListeners.forEach(listener => listener(status));
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      queueSize: this.queue.length,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Clear all queued requests (use with caution)
   */
  async clearQueue() {
    this.queue = [];
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    console.log('🗑️ Sync queue cleared');
    
    this.notifyListeners({
      isOnline: this.isOnline,
      queueSize: 0,
      isSyncing: false,
    });
  }

  /**
   * Get queue items for debugging
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }
}

export interface SyncStatus {
  isOnline: boolean;
  queueSize: number;
  isSyncing: boolean;
}

// Singleton instance
const syncService = new SyncService();

export default syncService;

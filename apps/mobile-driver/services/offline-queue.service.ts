/**
 * Offline Queue Service - Network Resilience
 *
 * Queues driver actions (location updates, delivery confirmations)
 * when the device is offline. Syncs automatically when connectivity
 * is restored.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md - P138
 * @module services/offline-queue.service
 */

/**
 * Queued action types that can be performed offline.
 */
export enum QueuedActionType {
  LOCATION_UPDATE = 'location_update',
  DELIVERY_CONFIRMATION = 'delivery_confirmation',
  STATUS_CHANGE = 'status_change',
  PHOTO_UPLOAD = 'photo_upload',
}

/**
 * A queued action waiting for sync.
 */
export interface QueuedAction {
  id: string;
  type: QueuedActionType;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  synced: boolean;
  syncedAt: string | null;
  error: string | null;
}

/**
 * Sync status for the queue.
 */
export interface SyncStatus {
  isOnline: boolean;
  pendingActions: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
}

const MAX_QUEUE_SIZE = 500;
const MAX_RETRIES = 3;

/**
 * Manages offline action queuing and sync for the driver app.
 */
export class OfflineQueueService {
  private queue: QueuedAction[] = [];
  private isOnline = true;
  private isSyncing = false;
  private lastSyncAt: string | null = null;

  /**
   * Sets the current network status.
   * When coming back online, triggers automatic sync.
   */
  setNetworkStatus(online: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;

    if (wasOffline && online) {
      void this.syncPendingActions();
    }
  }

  /**
   * Enqueues an action for execution (immediate if online, queued if offline).
   */
  async enqueue(type: QueuedActionType, payload: Record<string, unknown>): Promise<string> {
    const action: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      synced: false,
      syncedAt: null,
      error: null,
    };

    if (this.isOnline) {
      try {
        await this.executeAction(action);
        action.synced = true;
        action.syncedAt = new Date().toISOString();
      } catch {
        // Failed while online - queue for retry
        this.addToQueue(action);
      }
    } else {
      this.addToQueue(action);
    }

    return action.id;
  }

  /**
   * Gets the current sync status.
   */
  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      pendingActions: this.queue.filter((a) => !a.synced).length,
      lastSyncAt: this.lastSyncAt,
      isSyncing: this.isSyncing,
    };
  }

  /**
   * Gets all pending (unsynced) actions.
   */
  getPendingActions(): QueuedAction[] {
    return this.queue.filter((a) => !a.synced);
  }

  /**
   * Manually triggers a sync of all pending actions.
   */
  async syncPendingActions(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing || !this.isOnline) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    const pending = this.queue.filter((a) => !a.synced && a.retryCount < a.maxRetries);

    for (const action of pending) {
      try {
        await this.executeAction(action);
        action.synced = true;
        action.syncedAt = new Date().toISOString();
        synced++;
      } catch (error) {
        action.retryCount++;
        action.error = error instanceof Error ? error.message : 'Sync failed';
        failed++;
      }
    }

    this.lastSyncAt = new Date().toISOString();
    this.isSyncing = false;

    // Clean up old synced actions (keep last 50)
    this.cleanupQueue();

    return { synced, failed };
  }

  /**
   * Clears all synced actions from the queue.
   */
  clearSyncedActions(): void {
    this.queue = this.queue.filter((a) => !a.synced);
  }

  // --- Private helpers ---

  private addToQueue(action: QueuedAction): void {
    this.queue.push(action);

    // Enforce max queue size (drop oldest synced first, then oldest pending)
    if (this.queue.length > MAX_QUEUE_SIZE) {
      const synced = this.queue.filter((a) => a.synced);
      if (synced.length > 0) {
        const oldestSynced = synced[0];
        this.queue = this.queue.filter((a) => a.id !== oldestSynced.id);
      } else {
        this.queue.shift();
      }
    }
  }

  private async executeAction(action: QueuedAction): Promise<void> {
    // In production: make API calls based on action type
    switch (action.type) {
      case QueuedActionType.LOCATION_UPDATE:
        // POST /v1/drivers/me/location
        break;
      case QueuedActionType.DELIVERY_CONFIRMATION:
        // POST /v1/orders/:id/verify-delivery
        break;
      case QueuedActionType.STATUS_CHANGE:
        // PATCH /v1/drivers/me/status
        break;
      case QueuedActionType.PHOTO_UPLOAD:
        // POST /v1/deliveries/:id/photo
        break;
    }

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private cleanupQueue(): void {
    const synced = this.queue.filter((a) => a.synced);
    const pending = this.queue.filter((a) => !a.synced);

    // Keep only last 50 synced actions
    const recentSynced = synced.slice(-50);
    this.queue = [...pending, ...recentSynced];
  }
}

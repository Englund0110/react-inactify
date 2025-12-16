import { Logger } from "../debug/logger";
import { StorageManager } from "../storage/storage-manager";
import { TabManager } from "./tab-manager";

const BASE_STORAGE_KEY_LAST_ACTIVE = "last_active";

export interface ActivityManagerOptions {
  /** Custom prefix for storage keys */
  storagePrefix?: string | undefined;
  /** Whether to sync activity across all tabs */
  syncAcrossTabs: boolean;
}

/**
 * Manages user activity tracking with support for both synchronized
 * (cross-tab) and isolated (per-tab) activity tracking
 */
export class ActivityManager {
  private options: ActivityManagerOptions;
  private readonly _storageKey: string;

  private storageListener: ((event: StorageEvent) => void) | undefined;
  private listeners = new Set<(lastActive: number) => void>();
  private isStorageListenerActive = false;
  private inactivityWatchers = new Map<
    number,
    { callbacks: Set<() => void>; timerId?: number | undefined }
  >();
  private internalListener = (lastActive: number) =>
    this.rescheduleInactivityTimers(lastActive);

  constructor(options: ActivityManagerOptions) {
    this.options = options;
    if (options.storagePrefix) {
      this._storageKey = `${options.storagePrefix}_${BASE_STORAGE_KEY_LAST_ACTIVE}`;
    } else {
      this._storageKey = BASE_STORAGE_KEY_LAST_ACTIVE;
    }

    TabManager.registerCurrentTab();

    if (!options.syncAcrossTabs) {
      this._storageKey = `${this._storageKey}_${TabManager.tabId}`;
    }

    // Add internal listener to handle rescheduling inactivity timers
    this.listeners.add(this.internalListener);
  }

  /**
   * Marks the current time as the last activity time
   */
  markActive(timestamp?: Date): void {
    const time = timestamp?.getTime() ?? Date.now();
    StorageManager.set(this._storageKey, time);
    this.notifyListeners(time);
  }

  /**
   * Gets the last activity timestamp
   */
  getLastActivityTime() {
    return StorageManager.get<number>(this._storageKey) ?? Date.now();
  }

  /**
   * Checks if the user is inactive based on a timeout in milliseconds
   */
  isInactiveFor(timeoutInMilliseconds: number): boolean {
    return Date.now() - this.getLastActivityTime() >= timeoutInMilliseconds;
  }

  /**
   * Gets the duration of inactivity in milliseconds
   */
  getInactiveDuration(): number | null {
    return Date.now() - this.getLastActivityTime();
  }

  /**
   * Subscribes to lastActive updates
   * @param callback Callback to invoke on lastActive updates
   * @returns Unsubscribe function
   */
  subscribe(callback: (lastActive: number) => void): () => void {
    this.listeners.add(callback);

    // Set up storage listener if this is the first subscriber and sync is enabled
    if (this.listeners.size === 1 && this.options.syncAcrossTabs) {
      this.setupStorageListener();
    }

    // Immediately notify the new listener with current value
    callback(this.getLastActivityTime());

    return () => {
      this.listeners.delete(callback);
      // Remove storage listener if no more subscribers
      if (this.listeners.size === 0 && this.options.syncAcrossTabs) {
        this.removeStorageListener();
      }
    };
  }

  /**
   * Subscribes to be notified when user is inactive for timeoutInMilliseconds
   * @param timeoutInMilliseconds Timeout in milliseconds
   * @param callback Callback to invoke when user is inactive
   * @returns Unsubscribe function
   */
  subscribeToInactivity(
    timeoutInMilliseconds: number,
    callback: () => void
  ): () => void {
    if (!this.inactivityWatchers.has(timeoutInMilliseconds)) {
      this.inactivityWatchers.set(timeoutInMilliseconds, {
        callbacks: new Set(),
      });
    }

    const entry = this.inactivityWatchers.get(timeoutInMilliseconds);

    if (!entry) {
      throw new Error("Inactivity watcher entry not found after creation");
    }

    entry.callbacks.add(callback);

    this.rescheduleInactivityTimers(this.getLastActivityTime());

    return () => {
      const e = this.inactivityWatchers.get(timeoutInMilliseconds);

      if (!e) {
        return;
      }

      e.callbacks.delete(callback);

      if (e.callbacks.size === 0) {
        if (e.timerId) {
          clearTimeout(e.timerId);
        }

        this.inactivityWatchers.delete(timeoutInMilliseconds);
      }
    };
  }

  /**
   * Cleans up resources used by the ActivityManager
   */
  destroy(): void {
    this.removeStorageListener();
    this.listeners.clear();

    // Clear all inactivity timers
    for (const [, entry] of this.inactivityWatchers) {
      if (entry.timerId) {
        clearTimeout(entry.timerId);
      }
    }

    this.inactivityWatchers.clear();

    Logger.info("ActivityManager destroyed");
  }

  /**
   * Sets up the storage event listener for cross-tab activity synchronization
   */
  private setupStorageListener(): void {
    if (this.storageListener) {
      return;
    }

    Logger.info("Setting up storage listener for activity sync across tabs");
    this.storageListener = (event: StorageEvent) => {
      if (event.key === this._storageKey && event.newValue) {
        try {
          Logger.info("Storage event detected for activity sync", {
            key: event.key,
            newValue: event.newValue,
          });
          const timestamp = parseInt(event.newValue);
          this.notifyListeners(timestamp);
          Logger.info("Activity synced from another tab");
        } catch (err) {
          Logger.error("Failed to parse activity timestamp", err);
        }
      }
    };

    window.addEventListener("storage", this.storageListener);
  }

  /**
   * Removes the storage listener
   */
  private removeStorageListener(): void {
    if (this.storageListener && this.isStorageListenerActive) {
      window.removeEventListener("storage", this.storageListener);
      this.storageListener = undefined;
      Logger.info("Storage listener removed");
    }
  }

  /**
   * Notifies all registered listeners of a lastActive update
   * @param lastActive The latest last active timestamp in milliseconds
   */
  private notifyListeners(lastActive: number): void {
    for (const listener of this.listeners) {
      try {
        listener(lastActive);
      } catch (err) {
        Logger.error("Error in activity listener", err);
      }
    }
  }

  /**
   * Reschedules inactivity timers based on the latest lastActive timestamp
   * @param lastActive The latest last active timestamp in milliseconds
   */
  private rescheduleInactivityTimers(lastActive: number): void {
    for (const [timeoutInMilliseconds, entry] of this.inactivityWatchers) {
      if (entry.timerId) {
        clearTimeout(entry.timerId);
        entry.timerId = undefined;
      }

      const inactiveFor = Date.now() - lastActive;
      const remaining = timeoutInMilliseconds - inactiveFor;

      if (remaining <= 0) {
        // If already inactive, trigger callbacks immediately
        for (const cb of entry.callbacks) {
          try {
            setTimeout(cb, 0);
          } catch (err) {
            Logger.error("Error in inactivity callback", err);
          }
        }
      } else {
        // Schedule timer to trigger after remaining time
        entry.timerId = window.setTimeout(() => {
          for (const cb of entry.callbacks) {
            try {
              cb();
            } catch (err) {
              Logger.error("Error in inactivity callback", err);
            }
          }
          entry.timerId = undefined;
        }, remaining);
      }
    }
  }
}

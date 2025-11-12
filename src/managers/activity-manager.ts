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
  isInactive(timeoutMs: number): boolean {
    return Date.now() - this.getLastActivityTime() >= timeoutMs;
  }

  /**
   * Gets the duration of inactivity in milliseconds
   */
  getInactiveDuration(): number | null {
    return Date.now() - this.getLastActivityTime();
  }

  /**
   * Sets up a listener for storage events to sync activity across tabs
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
   * Registers a callback to be invoked when activity state changes
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
   * Clean up resources
   */
  destroy(): void {
    this.removeStorageListener();
    this.listeners.clear();
    Logger.info("ActivityManager destroyed");
  }

  private notifyListeners(lastActive: number): void {
    for (const listener of this.listeners) {
      try {
        listener(lastActive);
      } catch (err) {
        Logger.error("Error in activity listener", err);
      }
    }
  }
}

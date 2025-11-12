import { Logger } from "../debug/logger";
import { StorageManager } from "../storage/storage-manager";

const MINUTE = 60 * 1000;
const INACTIFY_TAB_ID = "inactify_tab_id";
const INACTIFY_ACTIVE_TABS = "inactify_active_tabs";
const TAB_INACTIVE_TIMEOUT = 30 * MINUTE;

type TabEntry = Record<string, number>;

export class TabManager {
  private static _tabId: string | null = null;

  /**
   * Get or create a unique tab ID for this browser tab
   */
  static get tabId(): string {
    if (!this._tabId) {
      this._tabId = StorageManager.getSession(INACTIFY_TAB_ID) ?? "";
      if (!this._tabId) {
        if (crypto) {
          this._tabId = crypto.randomUUID();
        } else {
          this._tabId = Math.random().toString(36);
        }
        StorageManager.setSession(INACTIFY_TAB_ID, this._tabId);
      }
    }

    return this._tabId;
  }

  /**
   * Get the count of currently active tabs
   */
  static getActiveTabsCount(): number {
    try {
      const tabs = StorageManager.get<TabEntry>(INACTIFY_ACTIVE_TABS) ?? {};

      if (this.removeInactiveTabEntries(tabs)) {
        StorageManager.set(INACTIFY_ACTIVE_TABS, tabs);
      }

      return Object.keys(tabs).length;
    } catch (error) {
      Logger.error("Failed to get current tab count", error);
      return 1;
    }
  }

  /**
   * Register the current tab and start periodic tracking
   */
  static registerCurrentTab(): void {
    try {
      this.trackCurrentTab();

      const intervalId = setInterval(() => {
        this.trackCurrentTab();
      }, TAB_INACTIVE_TIMEOUT / 3);

      window.addEventListener("beforeunload", () => {
        clearInterval(intervalId);
        this.markCurrentTabInactive();
      });
    } catch (error) {
      Logger.error("Failed to register current tab", error);
    }
  }

  /**
   * Update the timestamp for the current tab
   */
  private static trackCurrentTab(): void {
    const timestamp = Date.now();
    const currentTabId = this.tabId;
    const tabs = StorageManager.get<TabEntry>(INACTIFY_ACTIVE_TABS) ?? {};

    tabs[currentTabId] = timestamp;

    this.removeInactiveTabEntries(tabs);

    StorageManager.set(INACTIFY_ACTIVE_TABS, tabs);
  }

  /**
   * Remove the current tab from active tabs list
   */
  private static markCurrentTabInactive(): void {
    const tabs = StorageManager.get<TabEntry>(INACTIFY_ACTIVE_TABS) ?? {};
    delete tabs[this.tabId];
    StorageManager.set(INACTIFY_ACTIVE_TABS, tabs);
  }

  /**
   * Remove tab entries that are older than the timeout threshold
   * @returns true if any entries were removed
   */
  private static removeInactiveTabEntries(tabs: TabEntry): boolean {
    let hasChanges = false;
    const now = Date.now();

    for (const [tabId, timestamp] of Object.entries(tabs)) {
      if (now - timestamp > TAB_INACTIVE_TIMEOUT) {
        delete tabs[tabId];
        hasChanges = true;
      }
    }

    return hasChanges;
  }

  /**
   * Get all active tab IDs
   */
  static getActiveTabIds(): string[] {
    try {
      const tabs = StorageManager.get<TabEntry>(INACTIFY_ACTIVE_TABS) ?? {};

      if (this.removeInactiveTabEntries(tabs)) {
        StorageManager.set(INACTIFY_ACTIVE_TABS, tabs);
      }

      return Object.keys(tabs);
    } catch (error) {
      Logger.error("Failed to get active tab IDs", error);
      return [this.tabId];
    }
  }

  /**
   * Check if a specific tab is still active
   */
  static isTabActive(tabId: string): boolean {
    const tabs = StorageManager.get<TabEntry>(INACTIFY_ACTIVE_TABS) ?? {};
    return tabId in tabs;
  }
}

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TabManager } from "../src/managers/tab-manager";
import { StorageManager } from "../src/storage/storage-manager";
import { Logger } from "../src/debug/logger";

// Mocking constants for consistent testing
const MINUTE = 60 * 1000;
const INACTIFY_TAB_ID = "inactify_tab_id";
const INACTIFY_ACTIVE_TABS = "inactify_active_tabs";
const TAB_INACTIVE_TIMEOUT = 30 * MINUTE;

describe("TabManager", () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();

    // Reset the private _tabId before each test
    // @ts-expect-error
    TabManager._tabId = null;

    // Mock Date.now to control time
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers after each test
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("tabId", () => {
    it("should generate a unique tab ID if one does not exist in session storage", () => {
      vi.spyOn(StorageManager, "getSession").mockReturnValueOnce(null);
      const uuidSpy = vi
        .spyOn(crypto, "randomUUID")
        .mockReturnValueOnce("be4bf048-b28b-459e-8f6b-f4a5240070f0");
      const setSessionSpy = vi.spyOn(StorageManager, "setSession");

      const id = TabManager.tabId;

      expect(id).toBe("be4bf048-b28b-459e-8f6b-f4a5240070f0");
      expect(uuidSpy).toHaveBeenCalledOnce();
      expect(setSessionSpy).toHaveBeenCalledWith(INACTIFY_TAB_ID, id);
    });

    it("should return the existing tab ID from session storage", () => {
      vi.spyOn(StorageManager, "getSession").mockReturnValueOnce(
        "existing-tab-id"
      );
      const uuidSpy = vi.spyOn(crypto, "randomUUID");
      const setSessionSpy = vi.spyOn(StorageManager, "setSession");

      const id = TabManager.tabId;

      expect(id).toBe("existing-tab-id");
      expect(uuidSpy).not.toHaveBeenCalled();
      expect(setSessionSpy).not.toHaveBeenCalled();
    });

    it("should return the same tab ID on subsequent calls within the same session", () => {
      vi.spyOn(StorageManager, "getSession").mockReturnValueOnce(null);
      vi.spyOn(crypto, "randomUUID").mockReturnValueOnce(
        "be4bf048-b28b-459e-8f6b-f4a5240070f0"
      );
      vi.spyOn(StorageManager, "setSession");

      const id1 = TabManager.tabId;
      const id2 = TabManager.tabId;

      expect(id1).toBe("be4bf048-b28b-459e-8f6b-f4a5240070f0");
      expect(id2).toBe("be4bf048-b28b-459e-8f6b-f4a5240070f0");
    });
  });

  describe("getActiveTabsCount", () => {
    it("should return 0 if no active tabs are stored", () => {
      vi.spyOn(StorageManager, "get").mockReturnValueOnce(null);
      expect(TabManager.getActiveTabsCount()).toBe(0);
    });

    it("should return the correct count of active tabs", () => {
      const mockTabs = {
        tab1: Date.now() - 1000,
        tab2: Date.now() - 2000,
      };
      vi.spyOn(StorageManager, "get").mockReturnValueOnce(mockTabs);
      expect(TabManager.getActiveTabsCount()).toBe(2);
    });

    it("should remove inactive tab entries and update storage", () => {
      const now = Date.now();
      const mockTabs = {
        activeTab: now - 1000,
        inactiveTab: now - (TAB_INACTIVE_TIMEOUT + 1000),
      };
      vi.spyOn(StorageManager, "get").mockReturnValueOnce(mockTabs);
      const setStorageSpy = vi.spyOn(StorageManager, "set");

      const count = TabManager.getActiveTabsCount();

      expect(count).toBe(1);
      expect(setStorageSpy).toHaveBeenCalledWith(INACTIFY_ACTIVE_TABS, {
        activeTab: now - 1000,
      });
    });

    it("should handle errors gracefully and log them", () => {
      vi.spyOn(StorageManager, "get").mockImplementationOnce(() => {
        throw new Error("Storage read error");
      });
      const loggerErrorSpy = vi.spyOn(Logger, "error");

      expect(TabManager.getActiveTabsCount()).toBe(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Failed to get current tab count",
        expect.any(Error)
      );
    });
  });

  describe("trackCurrentTab (private)", () => {
    it("should update the timestamp for the current tab", () => {
      const currentTabId = TabManager.tabId; // Ensure a tabId is generated
      const now = Date.now();
      vi.setSystemTime(now);

      vi.spyOn(StorageManager, "get").mockReturnValueOnce({}); // No existing tabs
      const setStorageSpy = vi.spyOn(StorageManager, "set");

      (TabManager as any).trackCurrentTab();

      expect(setStorageSpy).toHaveBeenCalledWith(INACTIFY_ACTIVE_TABS, {
        [currentTabId]: now,
      });
    });

    it("should preserve other active tabs when updating the current tab", () => {
      const currentTabId = TabManager.tabId;
      const now = Date.now();
      vi.setSystemTime(now);

      const mockExistingTabs = {
        otherTab: now - 5000,
      };
      vi.spyOn(StorageManager, "get").mockReturnValueOnce(mockExistingTabs);
      const setStorageSpy = vi.spyOn(StorageManager, "set");

      (TabManager as any).trackCurrentTab();

      expect(setStorageSpy).toHaveBeenCalledWith(INACTIFY_ACTIVE_TABS, {
        otherTab: now - 5000,
        [currentTabId]: now,
      });
    });

    it("should remove inactive tab entries when tracking", () => {
      const currentTabId = TabManager.tabId;
      const now = Date.now();
      vi.setSystemTime(now);

      const mockExistingTabs = {
        activeTab: now - 1000,
        inactiveTab: now - (TAB_INACTIVE_TIMEOUT + 1000),
      };
      vi.spyOn(StorageManager, "get").mockReturnValueOnce(mockExistingTabs);
      const setStorageSpy = vi.spyOn(StorageManager, "set");

      (TabManager as any).trackCurrentTab();

      expect(setStorageSpy).toHaveBeenCalledWith(INACTIFY_ACTIVE_TABS, {
        activeTab: now - 1000,
        [currentTabId]: now,
      });
    });
  });

  describe("markCurrentTabInactive (private)", () => {
    it("should remove the current tab from active tabs", () => {
      const currentTabId = TabManager.tabId;
      const mockTabs = {
        [currentTabId]: Date.now(),
        otherTab: Date.now(),
      };
      vi.spyOn(StorageManager, "get").mockReturnValueOnce(mockTabs);
      const setStorageSpy = vi.spyOn(StorageManager, "set");

      (TabManager as any).markCurrentTabInactive();

      expect(setStorageSpy).toHaveBeenCalledWith(INACTIFY_ACTIVE_TABS, {
        otherTab: expect.any(Number),
      });
    });

    it("should do nothing if the current tab is not found in active tabs", () => {
      vi.spyOn(TabManager, "tabId", "get").mockReturnValue("non-existent-id");
      const mockTabs = {
        otherTab: Date.now(),
      };
      vi.spyOn(StorageManager, "get").mockReturnValueOnce(mockTabs);
      const setStorageSpy = vi.spyOn(StorageManager, "set");

      (TabManager as any).markCurrentTabInactive();

      expect(setStorageSpy).toHaveBeenCalledWith(
        INACTIFY_ACTIVE_TABS,
        mockTabs
      );
    });
  });

  describe("removeInactiveTabEntries (private)", () => {
    it("should remove tabs older than TAB_INACTIVE_TIMEOUT", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const tabs = {
        activeTab1: now - 1000,
        activeTab2: now - TAB_INACTIVE_TIMEOUT / 2,
        inactiveTab1: now - (TAB_INACTIVE_TIMEOUT + 1000),
        inactiveTab2: now - (TAB_INACTIVE_TIMEOUT + 5000),
      };

      const hasChanges = (TabManager as any).removeInactiveTabEntries(tabs);

      expect(hasChanges).toBe(true);
      expect(tabs).toEqual({
        activeTab1: now - 1000,
        activeTab2: now - TAB_INACTIVE_TIMEOUT / 2,
      });
    });

    it("should return false if no tabs were removed", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const tabs = {
        activeTab1: now - 1000,
        activeTab2: now - TAB_INACTIVE_TIMEOUT / 2,
      };

      const hasChanges = (TabManager as any).removeInactiveTabEntries(tabs);

      expect(hasChanges).toBe(false);
      expect(tabs).toEqual({
        activeTab1: now - 1000,
        activeTab2: now - TAB_INACTIVE_TIMEOUT / 2,
      });
    });

    it("should handle empty tabs object", () => {
      const tabs = {};
      const hasChanges = (TabManager as any).removeInactiveTabEntries(tabs);
      expect(hasChanges).toBe(false);
      expect(tabs).toEqual({});
    });
  });

  describe("getActiveTabIds", () => {
    it("should return an empty array if no active tabs are stored", () => {
      vi.spyOn(StorageManager, "get").mockReturnValueOnce(null);
      expect(TabManager.getActiveTabIds()).toEqual([]);
    });

    it("should return the IDs of currently active tabs", () => {
      const now = Date.now();
      const mockTabs = {
        tab1: now - 1000,
        tab2: now - 2000,
      };
      vi.spyOn(StorageManager, "get").mockReturnValueOnce(mockTabs);
      expect(TabManager.getActiveTabIds()).toEqual(["tab1", "tab2"]);
    });

    it("should remove inactive tab entries and update storage when getting IDs", () => {
      const now = Date.now();
      const mockTabs = {
        activeTab: now - 1000,
        inactiveTab: now - (TAB_INACTIVE_TIMEOUT + 1000),
      };
      vi.spyOn(StorageManager, "get").mockReturnValueOnce(mockTabs);
      const setStorageSpy = vi.spyOn(StorageManager, "set");

      const activeIds = TabManager.getActiveTabIds();

      expect(activeIds).toEqual(["activeTab"]);
      expect(setStorageSpy).toHaveBeenCalledWith(INACTIFY_ACTIVE_TABS, {
        activeTab: now - 1000,
      });
    });

    it("should handle errors gracefully and log them, returning only the current tab ID", () => {
      vi.spyOn(StorageManager, "get").mockImplementationOnce(() => {
        throw new Error("Storage read error");
      });
      const loggerErrorSpy = vi.spyOn(Logger, "error");
      const currentTabId = TabManager.tabId; // Ensure tabId is initialized

      expect(TabManager.getActiveTabIds()).toEqual([currentTabId]);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Failed to get active tab IDs",
        expect.any(Error)
      );
    });
  });

  describe("isTabActive", () => {
    it("should return true if the tab ID exists in active tabs", () => {
      const mockTabs = {
        tab1: Date.now(),
        tab2: Date.now(),
      };
      vi.spyOn(StorageManager, "get").mockReturnValueOnce(mockTabs);
      expect(TabManager.isTabActive("tab1")).toBe(true);
    });

    it("should return false if the tab ID does not exist in active tabs", () => {
      const mockTabs = {
        tab1: Date.now(),
      };
      vi.spyOn(StorageManager, "get").mockReturnValueOnce(mockTabs);
      expect(TabManager.isTabActive("tab3")).toBe(false);
    });
  });
});

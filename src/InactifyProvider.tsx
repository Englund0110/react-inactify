import React from "react";
import { ActivityManager } from "./managers/activity-manager";
import { TabManager } from "./managers/tab-manager";

export interface InactifyProviderOptions {
  storagePrefix?: string;
  storage: Storage;
  syncActivityAcrossTabs?: boolean;
}

interface InactifyContextValue {
  defaultOptions: InactifyProviderOptions;
  /** Manually mark the user as active */
  markActive: () => void;
  /** Get the last activity timestamp in milliseconds */
  lastActive: () => number | null;
  /** Check if the user is inactive for a given timeout */
  isInactive: (timeout: number) => boolean;
  /** Get the current tab ID (only in per-tab mode) */
  getTabId: () => string | null;
  /** Check if this is the only active tab (only in per-tab mode) */
  isOnlyTab: () => boolean;
  /** Get the count of active tabs (only in per-tab mode) */
  getActiveTabCount: () => number;
  /** Manually update the last active time */
  updateLastActive: (value: Date) => void;
}

interface InactifyProviderProps {
  children: React.ReactNode;
  defaultOptions?: InactifyProviderOptions;
}

const DEFAULT_OPTIONS: InactifyProviderOptions = {
  storage: window.localStorage,
  syncActivityAcrossTabs: true,
} as const;

export const InactifyContext = React.createContext<
  InactifyContextValue | undefined
>(undefined);

export const InactifyProvider = ({
  children,
  defaultOptions = DEFAULT_OPTIONS,
}: InactifyProviderProps) => {
  const activityManagerRef = React.useRef<ActivityManager | null>(null);

  const getActivityManager = () => {
    if (!activityManagerRef.current) {
      activityManagerRef.current = new ActivityManager({
        syncAcrossTabs:
          defaultOptions.syncActivityAcrossTabs ??
          DEFAULT_OPTIONS.syncActivityAcrossTabs ??
          true,
        storagePrefix: defaultOptions.storagePrefix,
      });
    }
    return activityManagerRef.current;
  };

  const [lastActive, setLastActive] = React.useState<number | null>(() =>
    getActivityManager().getLastActivityTime()
  );

  React.useEffect(() => {
    const activityManager = getActivityManager();
    const unsubscribe = activityManager.subscribe(setLastActive);

    return () => {
      unsubscribe();
    };
  }, [defaultOptions.syncActivityAcrossTabs, defaultOptions.storagePrefix]);

  React.useEffect(() => {
    return () => {
      if (activityManagerRef.current) {
        activityManagerRef.current.destroy();
      }
    };
  }, []);

  const contextValue: InactifyContextValue = React.useMemo(() => {
    const activityManager = getActivityManager();

    return {
      isInactive: (timeout: number) => activityManager.isInactive(timeout),
      getTabId: () => TabManager.tabId,
      isOnlyTab: () => TabManager.getActiveTabsCount() === 1,
      getActiveTabCount: () => TabManager.getActiveTabsCount(),
      lastActive: () => lastActive,
      markActive: () => activityManager.markActive(),
      updateLastActive: (value: Date) => activityManager.markActive(value),
      defaultOptions,
    };
  }, [lastActive, defaultOptions]);

  return (
    <InactifyContext.Provider value={contextValue}>
      {children}
    </InactifyContext.Provider>
  );
};

export const useInactify = () => {
  const context = React.useContext(InactifyContext);
  if (!context) {
    throw new Error("useInactify must be used within an InactifyProvider");
  }
  return context;
};

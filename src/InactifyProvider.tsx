import React from "react";
import { StorageManager } from "./storage/storage-manager";

const STORAGE_KEY_LAST_ACTIVE = "last_active";

export interface InactifyProviderOptions {
  storagePrefix?: string;
  storage: Storage;
}

interface InactifyContextValue {
  defaultOptions: InactifyProviderOptions;
  markActive: () => void;
  updateLastActive: (value: Date) => void;
  lastActive: () => number | null;
}

type InactifyProviderProps = {
  children: React.ReactNode;
  defaultOptions?: InactifyProviderOptions;
};

const DEFAULT_OPTIONS: InactifyProviderOptions = {
  storage: window.localStorage,
};

export const InactifyContext = React.createContext<
  InactifyContextValue | undefined
>(undefined);

export const InactifyProvider = ({
  children,
  defaultOptions = DEFAULT_OPTIONS,
}: InactifyProviderProps) => {
  const [lastActive, setLastActive] = React.useState<number | null>(
    () =>
      StorageManager.get<number>(
        STORAGE_KEY_LAST_ACTIVE,
        defaultOptions.storage
      ) ?? null
  );

  const setLastActiveTime = React.useCallback(
    (value?: Date) => {
      const time = value ? value.getTime() : Date.now();
      StorageManager.set(STORAGE_KEY_LAST_ACTIVE, time, defaultOptions.storage);
      setLastActive(time);
    },
    [defaultOptions.storage]
  );

  const contextValue: InactifyContextValue = React.useMemo(
    () => ({
      lastActive: () => lastActive,
      markActive: () => setLastActiveTime(),
      updateLastActive: (value: Date) => setLastActiveTime(value),
      defaultOptions,
    }),
    [lastActive, setLastActiveTime, defaultOptions]
  );

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

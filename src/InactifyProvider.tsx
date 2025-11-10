import React from "react";

interface ProviderProps {
  children: React.ReactNode;
}

export interface ContextType {
  markActive: () => void;
  updateLastActive: (value: Date) => void;
  lastActive: () => number | null;
}

export const InactifyContext = React.createContext<ContextType | undefined>(
  undefined
);

export const InactifyProvider = ({ children }: ProviderProps) => {
  const [lastActive, setLastActive] = React.useState<number | null>(null);

  const setLastActiveTime = React.useCallback((value?: Date | undefined) => {
    if (value) {
      setLastActive(value.getTime());
    }

    setLastActive(Date.now());
  }, []);

  const getLastActiveTime = React.useCallback(() => {
    return lastActive;
  }, [lastActive]);

  return (
    <InactifyContext.Provider
      value={{
        markActive: setLastActiveTime,
        updateLastActive: setLastActiveTime,
        lastActive: getLastActiveTime,
      }}
    >
      {children}
    </InactifyContext.Provider>
  );
};

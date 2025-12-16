import { useEffect, useState } from "react";
import { InactifyProvider, useInactify } from "../../src/index";

const MarkAsActiveButton = () => {
  const { markActive } = useInactify();
  return <button onClick={markActive}>Mark as active</button>;
};

const ActivityStatus = () => {
  const { lastActive, isInactiveFor } = useInactify();
  const [idleInMilliseconds, setIdleInMilliseconds] = useState<number>(0);

  useEffect(() => {
    const calculateIdle = () => {
      const last = lastActive();
      setIdleInMilliseconds(last ? Date.now() - last : 0);
    };

    calculateIdle();
    const id = window.setInterval(calculateIdle, 1000);
    return () => clearInterval(id);
  }, [lastActive]);

  const last = lastActive();
  const isIdle = isInactiveFor(5000);

  return (
    <div>
      {last ? (
        <>
          <p>Last active: {new Date(last).toLocaleString("da-DK")}</p>
          <p>Idle: {(idleInMilliseconds / 1000).toFixed(0)}s</p>
        </>
      ) : (
        <p>No activity recorded yet.</p>
      )}

      <div>{isIdle ? <strong>User is inactive</strong> : "User is active"}</div>
    </div>
  );
};

export function App() {
  return (
    <InactifyProvider
      defaultOptions={{
        storage: window.sessionStorage,
        syncActivityAcrossTabs: false,
      }}
    >
      <MarkAsActiveButton />
      <ActivityStatus />
    </InactifyProvider>
  );
}

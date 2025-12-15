import { useEffect, useState } from "react";
import { InactifyProvider, useInactify } from "../../src/index";

const MarkAsActiveButton = () => {
  const { markActive } = useInactify();
  return (
    <>
      <button
        onClick={() => {
          markActive();
        }}
      >
        Mark as active
      </button>
    </>
  );
};

const TimeDisplay = () => {
  const { lastActive, isInactiveFor: isInActiveFor } = useInactify();
  const [idleInMilliseconds, setIdleInMilliseconds] = useState<number>(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const last = lastActive();
      setIdleInMilliseconds(last ? Date.now() - last : 0);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [lastActive]);

  const isUserIdle = isInActiveFor(5000);
  const lastActiveTime = lastActive();

  return (
    <div>
      {lastActiveTime && (
        <>
          <p>
            Last active time:{" "}
            {lastActive()
              ? new Date(lastActiveTime).toLocaleString("da-DK")
              : "N/A"}
          </p>
          <p>Idle time: {(idleInMilliseconds / 1000).toFixed(0)}s</p>
        </>
      )}
      {!lastActiveTime && <p>No activity recorded yet.</p>}
      {isUserIdle ? (
        <div>
          <strong>User is inactive</strong>
        </div>
      ) : (
        <div>User is active</div>
      )}
    </div>
  );
};

export function App() {
  return (
    <>
      <InactifyProvider
        defaultOptions={{
          storage: window.sessionStorage,
          syncActivityAcrossTabs: false,
        }}
      >
        <MarkAsActiveButton />
        <TimeDisplay />
      </InactifyProvider>
    </>
  );
}

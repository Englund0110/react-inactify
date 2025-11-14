import { InactifyProvider, useInactify } from "../../src/index";

const Button = () => {
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
  const { lastActive } = useInactify();
  return <p>Last active time: {lastActive() ?? "N/A"}</p>;
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
        <Button />
        <TimeDisplay />
      </InactifyProvider>
    </>
  );
}

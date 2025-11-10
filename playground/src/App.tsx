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
  const { lastActive: getLastActiveTime } = useInactify();
  return <p>Last active time: {getLastActiveTime() ?? "N/A"}</p>;
};

export function App() {
  return (
    <>
      <InactifyProvider defaultOptions={{ storage: window.sessionStorage }}>
        <Button />
        <TimeDisplay />
      </InactifyProvider>
    </>
  );
}

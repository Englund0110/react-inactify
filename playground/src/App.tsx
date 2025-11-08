import { InactifyProvider, useInactify } from "../../src";

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
      <InactifyProvider>
        <Button />
        <TimeDisplay />
      </InactifyProvider>
    </>
  );
}

# react-inactify

React utilities for tracking user inactivity and tab state.

`react-inactify` helps you track user activity and determine when a user becomes inactive. It does not enforce any behavior by default, but provides primitives you can use to run callbacks, timers, or sync activity across tabs.

## Features

- Exposes utilities to determine inactivity based on timeouts
- Allows subscribing to inactivity events
- Optional activity synchronization across browser tabs

## Installation

```bash
npm install react-inactify
# or
pnpm add react-inactify
```

## Usage

Wrap your app with `InactifyProvider`, then call `useInactify()` inside.

```tsx
import React from "react";
import { InactifyProvider, useInactify } from "react-inactify";

function App() {
  return (
    <InactifyProvider>
      <MyApp />
    </InactifyProvider>
  );
}

function MyApp() {
  const { subscribeToInactivity, markActive, isInactiveFor } = useInactify();

  React.useEffect(() => {
    const unsubscribe = subscribeToInactivity(5 * 60_000, () => {
      console.log("User inactive for 5 minutes");
    });

    return unsubscribe;
  }, [subscribeToInactivity]);

  return (
    <div onClick={markActive}>
      Active: {isInactiveFor(60_000) ? "no" : "yes"}
    </div>
  );
}
```

## API

### InactifyProvider

Provides inactivity state to child components.

#### Props

| Prop                                    | Type              | Description                    | Default        |
| --------------------------------------- | ----------------- | ------------------------------ | -------------- |
| `children`                              | `React.ReactNode` | Wrapped application or subtree | -              |
| `defaultOptions`                        | `object`          | Optional configuration         | -              |
| `defaultOptions.storage`                | `Storage`         | Storage used for sync          | `localStorage` |
| `defaultOptions.storagePrefix`          | `string`          | Prefix for storage keys        | -              |
| `defaultOptions.syncActivityAcrossTabs` | `boolean`         | Sync activity across tabs      | `true`         |

### useInactify

| Method                                 | Returns          | Description                                               |
| -------------------------------------- | ---------------- | --------------------------------------------------------- |
| `markActive()`                         | `void`           | Marks the user as active                                  |
| `updateLastActive(date)`               | `void`           | Manually set last activity time                           |
| `lastActive()`                         | `number \| null` | Last activity timestamp (milliseconds)                    |
| `isInactiveFor(timeoutInMilliseconds)` | `boolean`        | Whether the user has been inactive for the given duration |

### Inactivity

| Method                                                   | Returns      | Description                                          |
| -------------------------------------------------------- | ------------ | ---------------------------------------------------- |
| `subscribeToInactivity(timeoutInMilliseconds, callback)` | `() => void` | Calls `callback` once when the user becomes inactive |

### Tabs

(Only when tab tracking is enabled.)

| Method                | Returns          | Description                         |
| --------------------- | ---------------- | ----------------------------------- |
| `getTabId()`          | `string \| null` | Current tab id                      |
| `getActiveTabCount()` | `number`         | Number of active tabs               |
| `isOnlyTab()`         | `boolean`        | Whether this is the only active tab |

## Notes

- No external state libraries
- Client-side only
- Works well for auto-logout, idle timers, and pause/resume logic

## License

MIT

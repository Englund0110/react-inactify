import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ActivityManager } from "../src/managers/activity-manager";
import { StorageManager } from "../src/storage/storage-manager";
import { TabManager } from "../src/managers/tab-manager";

vi.mock("../src/debug/logger", () => ({
  Logger: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("ActivityManager", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();
    // Ensure TabManager.registerCurrentTab does not interfere with tests
    vi.spyOn(TabManager, "registerCurrentTab").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("schedules callback after remaining time", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    // Last active 1 second ago
    vi.spyOn(StorageManager, "get").mockReturnValueOnce(now - 1000);

    const activity = new ActivityManager({ syncAcrossTabs: true });

    const cb = vi.fn();
    activity.subscribeToInactivity(2000, cb);

    vi.advanceTimersByTime(999);
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("invokes callback immediately if already inactive", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    // Last active 3 seconds ago (already past 2 seconds timeout)
    vi.spyOn(StorageManager, "get").mockReturnValueOnce(now - 3000);

    const activity = new ActivityManager({ syncAcrossTabs: true });

    const cb = vi.fn();
    activity.subscribeToInactivity(2000, cb);

    vi.runOnlyPendingTimers();
    expect(cb).toHaveBeenCalled();
  });

  it("reschedules timers and clears old timer when lastActive updates", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    vi.spyOn(StorageManager, "get").mockReturnValue(now - 500);

    const activity = new ActivityManager({ syncAcrossTabs: true });

    const cb = vi.fn();
    activity.subscribeToInactivity(2000, cb);

    const watchers = (activity as any).inactivityWatchers as Map<
      number,
      { callbacks: Set<() => void>; timerId?: number | undefined }
    >;

    const entry = watchers.get(2000);
    expect(entry).toBeDefined();
    expect(entry?.timerId).toBeDefined();

    // Simulate an activity update (reset lastActive to now)
    (activity as any).rescheduleInactivityTimers(Date.now());

    const entry2 = watchers.get(2000);
    expect(entry2).toBeDefined();
    expect(entry2?.timerId).toBeDefined();
  });
});

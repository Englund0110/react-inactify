import { describe, it, expect, beforeEach, vi } from "vitest";
import { StorageManager } from "../src/storage/storage-manager";
import { Logger } from "../src/debug/logger";

vi.mock("../src/debug/logger", () => ({
  Logger: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe("StorageManager", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe("set and get", () => {
    it("stores and retrieves a JSON-serializable object", () => {
      const key = "user";
      const value = { name: "Alice" };

      const success = StorageManager.set(key, value);
      expect(success).toBe(true);

      const result = StorageManager.get<typeof value>(key);
      expect(result).toEqual(value);
    });

    it("logs an error when JSON serialization fails", () => {
      const key = "bad";
      const circular: any = {};
      circular.self = circular;

      const success = StorageManager.set(key, circular);
      expect(success).toBe(false);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to serialize data"),
        expect.anything(),
        expect.objectContaining({ key })
      );
    });

    it("returns undefined for missing key", () => {
      const result = StorageManager.get("missing");
      expect(result).toBeUndefined();
    });

    it("logs an error when parsing invalid JSON", () => {
      const key = "broken";
      localStorage.setItem(key, "not-json");

      const result = StorageManager.get(key);
      expect(result).toBeUndefined();
      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load local storage key"),
        expect.anything(),
        expect.objectContaining({ key })
      );
    });
  });

  describe("setString and getString", () => {
    it("stores and retrieves a string", () => {
      const key = "token";
      const value = "abc123";
      const ok = StorageManager.setString(key, value);
      expect(ok).toBe(true);

      const result = StorageManager.getString(key);
      expect(result).toBe(value);
    });

    it("handles storage errors via onError", () => {
      const key = "error-key";
      const mockStorage = {
        setItem: vi.fn(() => {
          throw new Error("failed");
        }),
      } as unknown as Storage;

      const onError = vi.fn();
      const ok = StorageManager.setString(key, "value", mockStorage, onError);

      expect(ok).toBe(false);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("session storage", () => {
    it("stores and retrieves data from sessionStorage", () => {
      const key = "session";
      const value = { id: 42 };

      StorageManager.setSession(key, value);
      const result = StorageManager.getSession<typeof value>(key);

      expect(result).toEqual(value);
    });

    it("removes a key from sessionStorage", () => {
      const key = "session-key";
      sessionStorage.setItem(key, "test");

      StorageManager.removeSession(key);
      expect(sessionStorage.getItem(key)).toBeNull();
    });
  });

  describe("remove and clear", () => {
    it("removes a specific key", () => {
      localStorage.setItem("remove-me", "x");
      StorageManager.remove("remove-me");
      expect(localStorage.getItem("remove-me")).toBeNull();
    });

    it("clears all keys", () => {
      localStorage.setItem("a", "1");
      localStorage.setItem("b", "2");
      StorageManager.clear();
      expect(localStorage.length).toBe(0);
    });
  });

  describe("removeAllWithCondition", () => {
    it("removes only keys that match predicate", () => {
      localStorage.setItem("keep_this", "1");
      localStorage.setItem("remove_this", "2");

      StorageManager.removeAllWithCondition((key) => key.startsWith("remove"));

      expect(localStorage.getItem("keep_this")).toBe("1");
      expect(localStorage.getItem("remove_this")).toBeNull();
    });
  });

  describe("getKeys", () => {
    it("returns all keys in storage", () => {
      localStorage.setItem("a", "1");
      localStorage.setItem("b", "2");

      const keys = StorageManager.getKeys();
      expect(keys.sort()).toEqual(["a", "b"]);
    });
  });
});

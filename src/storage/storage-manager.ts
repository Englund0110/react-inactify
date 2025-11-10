import { Logger } from "../debug/logger";

/**
 * Interface representing a storage that conforms to the StorageAPI (e.g. localStorage or sessionStorage).
 */
export type StorageApi = Storage;

/**
 * Options for retrieving data from storage.
 */
export interface GetOptions {
  /** Whether to log errors if JSON parsing fails. Defaults to true. */
  logError?: boolean;
}

/**
 * Utility class for managing persistent and session-based storage
 */
export class StorageManager {
  /**
   * Stores a value (serialized as JSON) in the provided storage.
   * @param key The storage key.
   * @param value The value to store.
   * @param storage Optional storage mechanism (defaults to localStorage).
   * @returns True if stored successfully, otherwise false.
   */
  static set<T>(
    key: string,
    value: T,
    storage: StorageApi = localStorage
  ): boolean {
    try {
      return this.setString(key, JSON.stringify(value), storage);
    } catch (err) {
      Logger.error("Failed to serialize data for the given storage key", err, {
        key,
      });
      return false;
    }
  }

  /**
   * Stores a plain string in the specified storage.
   * @param key The key to store the string under.
   * @param value The string to store.
   * @param storage Optional storage mechanism (defaults to localStorage).
   * @param onError Optional error handler.
   * @returns True if stored successfully, otherwise false.
   */
  static setString(
    key: string,
    value: string,
    storage: StorageApi = localStorage,
    onError?: (error: Error) => void
  ): boolean {
    if (!storage) {
      Logger.warning("Storage type not supported");
      return false;
    }
    try {
      storage.setItem(key, value);
      return true;
    } catch (err) {
      if (onError && err instanceof Error) onError(err);
      return false;
    }
  }

  /**
   * Stores a value in sessionStorage.
   * @param key The key to use.
   * @param value The value to store.
   * @returns True if successful, otherwise false.
   */
  static setSession<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      return this.setString(key, serialized, sessionStorage, () => {
        // Attempt to clear and retry (similar to original)
        sessionStorage.clear();
        this.setString(key, serialized, sessionStorage);
      });
    } catch (err) {
      Logger.error("Failed to serialize data for the given storage key", err, {
        key,
      });
      return false;
    }
  }

  /**
   * Retrieves a JSON-parsed value from storage.
   */
  static get<T>(
    key: string,
    storage: StorageApi = localStorage,
    options: GetOptions = { logError: true }
  ): T | undefined {
    try {
      const json = this.getString(key, storage);
      return json ? JSON.parse(json) : undefined;
    } catch (err) {
      if (options.logError)
        Logger.error("Failed to load local storage key", err, { key });

      return undefined;
    }
  }

  /**
   * Retrieves a value from sessionStorage.
   */
  static getSession<T>(key: string): T | undefined {
    try {
      const json = this.getString(key, sessionStorage);
      return json ? JSON.parse(json) : undefined;
    } catch (err) {
      Logger.error("Failed to load session storage key", err, { key });

      return undefined;
    }
  }

  /**
   * Retrieves a string value from the specified storage.
   */
  static getString(
    key: string,
    storage: StorageApi = localStorage
  ): string | undefined {
    if (!storage) {
      Logger.warning("Storage type not supported");

      return undefined;
    }
    try {
      return storage.getItem(key) ?? undefined;
    } catch (err) {
      Logger.info("Failed reading storage item", { key, error: err });

      return undefined;
    }
  }

  /**
   * Removes a specific key from storage.
   */
  static remove(key: string, storage: StorageApi = localStorage): void {
    if (!storage) {
      Logger.warning("Storage type not supported");

      return;
    }
    try {
      storage.removeItem(key);
    } catch (err) {
      Logger.info("Failed removing storage item", { key, error: err });
    }
  }

  /**
   * Removes all keys from storage that match a given predicate.
   */
  static removeAllWithCondition(
    predicate: (key: string) => boolean,
    storage: StorageApi = localStorage
  ): void {
    if (!storage) {
      Logger.warning("Storage type not supported");

      return;
    }
    for (const key of this.getKeys(storage)) {
      if (predicate(key)) storage.removeItem(key);
    }
  }

  static removeSession(key: string): void {
    this.remove(key, sessionStorage);
  }

  /**
   * Clears all keys in a given storage.
   */
  static clear(storage: StorageApi = localStorage): void {
    if (!storage) {
      Logger.warning("Storage type not supported");

      return;
    }
    storage.clear();
  }

  /**
   * Returns all keys in a given storage.
   */
  static getKeys(storage: StorageApi = localStorage): string[] {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }
}

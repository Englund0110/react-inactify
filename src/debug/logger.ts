/**
 * A structured logging utility.
 * Automatically prefixes messages with timestamps and log levels.
 */

export type LogMetadata = Record<string, unknown>;

/**
 * Logging interface.
 */
export interface Logger {
  /**
   * Logs an informational message.
   * @param message The message to log.
   * @param meta Optional structured metadata.
   */
  info(message: string, meta?: LogMetadata): void;

  /**
   * Logs a warning message.
   * @param message The message to log.
   * @param meta Optional structured metadata.
   */
  warning(message: string, meta?: LogMetadata): void;

  /**
   * Logs an error message.
   * @param message The message to log.
   * @param error Optional error object.
   * @param meta Optional structured metadata.
   */
  error(message: string, error?: unknown, meta?: LogMetadata): void;
}

/**
 * Default console-based implementation of the Logger interface.
 */
export class ConsoleLogger implements Logger {
  private formatPrefix(level: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}]`;
  }

  info(message: string, meta?: LogMetadata): void {
    const prefix = this.formatPrefix("INFO");
    if (meta) {
      console.info(prefix, message, meta);
    } else {
      console.info(prefix, message);
    }
  }

  warning(message: string, meta?: LogMetadata): void {
    const prefix = this.formatPrefix("WARN");
    if (meta) {
      console.warn(prefix, message, meta);
    } else {
      console.warn(prefix, message);
    }
  }

  error(message: string, error?: unknown, meta?: LogMetadata): void {
    const prefix = this.formatPrefix("ERROR");

    if (error instanceof Error) {
      console.error(prefix, message, error.message, {
        stack: error.stack,
        ...meta,
      });
    } else if (error) {
      console.error(prefix, message, { error, ...meta });
    } else if (meta) {
      console.error(prefix, message, meta);
    } else {
      console.error(prefix, message);
    }
  }
}

export const Logger: Logger = new ConsoleLogger();

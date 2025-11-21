/**
 * Logger utility for Firebase Cloud Functions
 *
 * Provides a consistent logging interface that can be easily extended
 * to integrate with external logging services (e.g., Cloud Logging, Sentry)
 */

interface LogContext {
  [key: string]: any;
}

/**
 * Format log message with context
 */
function formatMessage(message: string, context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }

  return `${message} ${JSON.stringify(context)}`;
}

/**
 * Logger instance
 */
export const logger = {
  /**
   * Debug level logging (verbose)
   */
  debug(message: string, context?: LogContext): void {
    console.debug(formatMessage(message, context));
  },

  /**
   * Info level logging (general information)
   */
  info(message: string, context?: LogContext): void {
    console.log(formatMessage(message, context));
  },

  /**
   * Warning level logging (potential issues)
   */
  warn(message: string, context?: LogContext): void {
    console.warn(formatMessage(message, context));
  },

  /**
   * Error level logging (errors and exceptions)
   */
  error(message: string, error?: Error | LogContext): void {
    if (error instanceof Error) {
      console.error(message, {
        error: error.message,
        stack: error.stack,
      });
    } else {
      console.error(formatMessage(message, error));
    }
  },
};

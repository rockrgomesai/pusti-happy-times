/**
 * Lightweight logger that only emits in development builds.
 *
 * Use this instead of `console.*` so that production bundles stay quiet and
 * no internal details leak to logcat / remote debugger when shipped.
 *
 *   import { logger } from '../utils/logger';
 *   logger.log('fetched', data);
 *   logger.error('failed', err);
 */

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

/* eslint-disable no-console */
export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Always keep errors available during dev; swallow in prod.
    if (isDev) console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
};
/* eslint-enable no-console */

/**
 * Produce a safe, user-facing message from an arbitrary error.
 * Network/backend details never reach the UI in production.
 */
export const friendlyErrorMessage = (
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string => {
  if (isDev) {
    if (err && typeof err === 'object') {
      const anyErr = err as any;
      return (
        anyErr?.response?.data?.message ||
        anyErr?.message ||
        fallback
      );
    }
    if (typeof err === 'string') return err;
  }
  return fallback;
};

export default logger;

/**
 * Central API configuration.
 *
 * Every service and screen that talks to the backend MUST import from here
 * instead of hard-coding `http://10.0.2.2:5000/api/v1`. The values are
 * sourced from `react-native-config` (`.env` at the mobile/ root).
 *
 * Exports:
 *   API_HOST      — scheme + host + port (no path). Use to build asset URLs.
 *   API_BASE_URL  — host + API version path, e.g. `${API_HOST}/api/v1`.
 *   resolveAssetUrl(path) — prefixes relative `/uploads/...` paths with API_HOST
 *                          and leaves already-absolute URLs untouched.
 *   API_TIMEOUTS  — canonical request timeouts used across services.
 */

import Config from 'react-native-config';

const DEFAULT_HOST = 'http://10.0.2.2:5000'; // Android-emulator dev fallback.
const DEFAULT_PATH = '/api/v1';

const stripTrailing = (s: string) => s.replace(/\/+$/, '');
const ensureLeading = (s: string) => (s.startsWith('/') ? s : `/${s}`);

export const API_HOST: string = stripTrailing(Config.API_HOST || DEFAULT_HOST);
const basePath = ensureLeading(Config.API_BASE_PATH || DEFAULT_PATH);
export const API_BASE_URL: string = `${API_HOST}${stripTrailing(basePath)}`;

/**
 * Turn a possibly-relative asset path from the backend (e.g. `/uploads/x.jpg`)
 * into a fully-qualified URL. Absolute URLs are returned unchanged. Empty /
 * nullish values return null so callers can render a fallback.
 */
export function resolveAssetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_HOST}${path.startsWith('/') ? path : `/${path}`}`;
}

export const API_TIMEOUTS = {
  short: 5000,
  default: 10000,
  long: 15000,
  upload: 30000,
} as const;

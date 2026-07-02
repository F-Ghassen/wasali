/**
 * tests/globalSetup.ts
 *
 * Runs once before any test file is imported. Loads .env.test.local so that
 * integration test credentials are available in process.env before helpers.ts
 * reads them at module initialisation time.
 *
 * Priority order (later values win):
 *   .env → .env.local → .env.test.local
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export default function globalSetup() {
  const root = resolve(__dirname, '..');
  const files = ['.env', '.env.local', '.env.test.local'];

  for (const file of files) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;

    const lines = readFileSync(path, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      // Only set if not already defined (CLI env vars take precedence)
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  }
}

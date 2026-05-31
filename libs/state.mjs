/**
 * @module libs/state
 * Persist hook phase in `~/.ai-pet/plugin-state.json` with legacy path migration.
 */
import fs from 'node:fs';
import path from 'node:path';

import { PLUGIN_STATE_PATH } from './paths.mjs';

function migrateLegacyState() {
  if (fs.existsSync(PLUGIN_STATE_PATH)) return;

  fs.mkdirSync(path.dirname(PLUGIN_STATE_PATH), { recursive: true });
}

/**
 * Read hook phase from `~/.ai-pet/plugin-state.json`.
 * @returns {{ phase: string } & Record<string, unknown>}
 */
export function readState() {
  migrateLegacyState();

  try {
    const raw = fs.readFileSync(PLUGIN_STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { phase: 'idle' };
  }
}

/**
 * Merge `patch` into persisted plugin state and set `updatedAt`.
 * @param {Record<string, unknown>} patch
 * @returns {Record<string, unknown>} Merged state written to disk.
 */
export function writeState(patch) {
  const next = { ...readState(), ...patch, updatedAt: Date.now() };
  fs.mkdirSync(path.dirname(PLUGIN_STATE_PATH), { recursive: true });
  fs.writeFileSync(
    PLUGIN_STATE_PATH,
    `${JSON.stringify(next, null, 2)}\n`,
    'utf8'
  );
  return next;
}

/**
 * @module libs/state
 * Persist hook phase, session id, transcript path, and related fields in `~/.ai-pet/plugin-state.json`.
 */
import fs from 'node:fs';
import path from 'node:path';

import { getPluginStatePath } from './paths.mjs';

/**
 * Read hook phase from `~/.ai-pet/plugin-state.json`.
 * @returns {{ phase: string } & Record<string, unknown>}
 */
export const readState = () => {
  let result = { phase: 'idle' };
  try {
    const pluginStatePath = getPluginStatePath();
    if (!fs.existsSync(pluginStatePath)) return result;

    const raw = fs.readFileSync(pluginStatePath, 'utf8');
    result = JSON.parse(raw);
  } catch {
    //
  }

  return result;
};

/**
 * Merge `patch` into persisted plugin state and set `updatedAt`.
 * @param {Record<string, unknown>} patch
 * @returns {Record<string, unknown>} Merged state written to disk.
 */
export const writeState = patch => {
  const next = { ...readState(), ...patch, updatedAt: Date.now() };

  const pluginStatePath = getPluginStatePath();
  if (!fs.existsSync(pluginStatePath)) {
    fs.mkdirSync(path.dirname(pluginStatePath), { recursive: true });
  }

  fs.writeFileSync(
    pluginStatePath,
    `${JSON.stringify(next, null, 2)}\n`,
    'utf8'
  );

  return next;
};

/**
 * @module libs/user-env
 * Read `~/.ai-pet/.env` (same keys as AI Pet desktop app).
 */
import fs from 'node:fs';

import { getUserEnvPath } from './paths.mjs';

/**
 * @param {string} content
 * @returns {Record<string, string>}
 */
const parseEnvFile = content => {
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) {
      env[key] = value;
    }
  }

  return env;
};

/**
 * @param {string | undefined} raw
 * @returns {boolean}
 */
export const isTruthyEnvValue = raw => {
  if (raw == null) return false;

  const value = String(raw).trim().toLowerCase();
  return value === 'true' || value === '1';
};

/**
 * @returns {Record<string, string>}
 */
const readUserEnv = () => {
  try {
    const raw = fs.readFileSync(getUserEnvPath(), 'utf8');
    return parseEnvFile(raw);
  } catch {
    //
  }

  return {};
};

let protocolDebugCached;

/**
 * Whether `AI_PET_DEBUG_PROTOCOL` in `~/.ai-pet/.env` is enabled.
 * Truthy values: `true`, `1` (case-insensitive).
 * @returns {boolean}
 */
export const isProtocolDebugEnabled = () => {
  if (protocolDebugCached != null) return protocolDebugCached;

  const env = readUserEnv();
  protocolDebugCached = isTruthyEnvValue(env.AI_PET_DEBUG_PROTOCOL);

  return protocolDebugCached;
};

/** Reset cached flag (for tests). */
export const resetProtocolDebugCache = () => {
  protocolDebugCached = null;
};

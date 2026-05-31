/**
 * @module libs/paths
 * Canonical paths under `~/.ai-pet` shared with the AI Pet desktop app.
 */
import os from 'node:os';
import path from 'node:path';

/** User config root (same as ai-pet: `~/.ai-pet`). */
export const AI_PET_HOME = path.join(os.homedir(), '.ai-pet');

/** Hook phase state for ai-pet-helper. */
export const PLUGIN_STATE_PATH = path.join(AI_PET_HOME, 'plugin-state.json');

/** Suggested install location for the ai-pet-helper plugin symlink. */
export const PLUGIN_INSTALL_DIR = path.join(
  AI_PET_HOME,
  'plugins',
  'ai-pet-helper'
);

/**
 * @module libs/paths
 * Canonical paths under `~/.ai-pet` shared with the AI Pet desktop app.
 */
import os from 'node:os';
import path from 'node:path';

/** User config root (same as ai-pet: `~/.ai-pet`). */
export const getAiPetHome = () => path.join(os.homedir(), '.ai-pet');

/** User environment file (`AI_PET_DEBUG_PROTOCOL`, etc.). */
export const getUserEnvPath = () => path.join(getAiPetHome(), '.env');

/** Hook phase state for ai-pet-helper. */
export const getPluginStatePath = () =>
  path.join(getAiPetHome(), 'plugin-state.json');

/** Protocol debug logs when `AI_PET_DEBUG_PROTOCOL` is enabled. */
export const getLogsDir = () => path.join(getAiPetHome(), 'logs');

/** Suggested install location for the ai-pet-helper plugin symlink. */
export const getPluginInstallDir = () =>
  path.join(getAiPetHome(), 'plugins', 'ai-pet-helper');

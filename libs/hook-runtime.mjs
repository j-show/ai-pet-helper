/**
 * @module libs/hook-runtime
 * Track active hook name and session id for protocol debug logs.
 */
import { persistHookContext } from './hook-context.mjs';
import {
  readHookInput,
  resolveLogSessionId,
  resolveSessionId
} from './hook-input.mjs';

/** @type {string} */
let activeHook = 'unknown';

/** @type {string} */
let currentSessionId = '';

/** @type {Record<string, unknown>} */
let currentState = {};

/**
 * @returns {string}
 */
export const getActiveHook = () => {
  return activeHook;
};

/**
 * @param {string} [explicit]
 * @param {string} [url]
 * @returns {string}
 */
export const getLogSessionId = (explicit = '', url = '') => {
  const fromRuntime = resolveLogSessionId({
    explicit: explicit || currentSessionId,
    url,
    state: currentState
  });
  return fromRuntime || currentSessionId || '';
};

/**
 * Read stdin once, persist session/transcript, then run the hook body.
 * @param {string} hookName
 * @param {(ctx: HookContext) => Promise<void>} fn
 * @returns {Promise<void>}
 */
export const runHook = async (hookName, fn) => {
  activeHook = hookName;
  try {
    const input = await readHookInput();
    currentState = persistHookContext(input);
    const fromState =
      typeof currentState.sessionId === 'string'
        ? currentState.sessionId.trim()
        : '';
    currentSessionId = fromState || resolveSessionId(input, currentState);

    await fn({
      input,
      state: currentState,
      sessionId: currentSessionId
    });
  } catch (error) {
    console.error(`[ai-pet-helper] ${hookName}:`, error);
    process.exit(0);
  }
};

/**
 * @module libs/hook-runtime
 * Track active hook name and session id for protocol debug logs.
 */
import {
  readHookInput,
  resolveLogSessionId,
  resolveSessionId,
  resolveProjectCwd,
  resolveTranscriptPath,
  resolveSessionType
} from './hook-input.mjs';
import { readState, writeState } from './state.mjs';

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

const persistHookContext = input => {
  const previous = readState();
  const projectCwd = resolveProjectCwd(input, previous);

  const enriched = { ...previous, projectCwd };
  const transcriptPath = resolveTranscriptPath(input, enriched);
  const sessionId = resolveSessionId(input, {
    ...enriched,
    transcriptPath: transcriptPath || previous.transcriptPath
  }).trim();
  const sessionType = resolveSessionType(input, enriched);

  const patch = { projectCwd, sessionType };

  if (sessionId) {
    patch.sessionId = sessionId;
    if (sessionId !== previous.sessionId) {
      patch.sessionTitle = '';
    }
  }

  if (transcriptPath) {
    patch.transcriptPath = transcriptPath;
  }

  return writeState(patch);
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
      sessionType: currentState.sessionType || '',
      sessionId: currentSessionId,
      sessionTitle: currentState?.sessionTitle?.trim() || ''
    });
  } catch (error) {
    console.error(`[ai-pet-helper] ${hookName}:`, error);
    process.exit(0);
  }
};

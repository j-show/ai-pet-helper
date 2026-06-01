/**
 * @module libs/hook-context
 * Persist session/transcript paths from hook stdin for later Stop events.
 */
import {
  resolveProjectCwd,
  resolveSessionId,
  resolveTranscriptPath
} from './hook-input.mjs';
import { readState, writeState } from './state.mjs';

/**
 * Merge session and transcript paths from hook input into plugin state.
 * @param {Record<string, unknown> | null | undefined} input
 * @returns {Record<string, unknown>}
 */
export const persistHookContext = input => {
  const previous = readState();
  const projectCwd = resolveProjectCwd(input, previous);
  const enriched = { ...previous, projectCwd };
  const transcriptPath = resolveTranscriptPath(input, enriched);
  const sessionId = resolveSessionId(input, {
    ...enriched,
    transcriptPath: transcriptPath || previous.transcriptPath
  });

  const patch = { projectCwd };
  if (sessionId) {
    patch.sessionId = sessionId;
  }
  if (transcriptPath) {
    patch.transcriptPath = transcriptPath;
  }

  return writeState(patch);
};

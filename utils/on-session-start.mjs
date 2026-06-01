#!/usr/bin/env node
/**
 * Lifecycle hook: persist session/transcript paths for task-end text protocol.
 * Triggered by SessionStart.
 * @module utils/on-session-start
 */
import { runHook } from '../libs/hook-runtime.mjs';
import { logHookDiagnostic } from '../libs/protocol-log.mjs';

runHook('on-session-start', async ({ state, sessionId }) => {
  logHookDiagnostic({
    sessionId,
    message: `session_start transcript=${state.transcriptPath || 'none'}`
  });
});

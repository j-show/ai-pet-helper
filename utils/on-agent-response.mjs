#!/usr/bin/env node
/**
 * Lifecycle hook: cache the latest assistant response for task-end text protocol.
 * Triggered by Cursor `afterAgentResponse` and Claude `MessageDisplay`.
 * @module utils/on-agent-response
 */
import { runHook } from '../libs/hook-runtime.mjs';
import { logHookDiagnostic } from '../libs/protocol-log.mjs';
import {
  accumulateMessageDisplay,
  extractHookText
} from '../libs/resolve-response.mjs';
import { writeState } from '../libs/state.mjs';

runHook('on-agent-response', async ({ input, state, sessionId }) => {
  if (!input) {
    return;
  }

  const event =
    typeof input.hook_event_name === 'string' ? input.hook_event_name : '';

  let text = '';
  let patch = {};

  if (event === 'MessageDisplay') {
    const accumulated = accumulateMessageDisplay(input, state);
    text =
      typeof accumulated.patch.lastResponse === 'string'
        ? accumulated.patch.lastResponse.trim()
        : '';
    patch = accumulated.patch;
  } else {
    text = extractHookText(input);
    if (text) {
      patch.lastResponse = text;
    }
  }

  if (!text) {
    logHookDiagnostic({
      sessionId,
      message: `no_response_text event=${event || 'unknown'}`
    });
    return;
  }

  writeState(patch);
  logHookDiagnostic({
    sessionId,
    message: `cached_response chars=${text.length} event=${event || 'unknown'}`
  });
});

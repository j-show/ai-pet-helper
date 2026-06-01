#!/usr/bin/env node
/**
 * Lifecycle hook: cache the latest assistant response for task-end text protocol.
 * Triggered by Cursor `afterAgentResponse`.
 * @module utils/on-agent-response
 */
import { readHookInput, resolveSessionId } from '../libs/hook-input.mjs';
import { readState, writeState } from '../libs/state.mjs';

async function main() {
  const input = await readHookInput();
  const text = typeof input?.text === 'string' ? input.text.trim() : '';
  if (!text) {
    return;
  }

  const state = readState();
  const patch = { lastResponse: text };
  const sessionId = resolveSessionId(input, state);
  if (sessionId) {
    patch.sessionId = sessionId;
  }
  writeState(patch);
}

main().catch(error => {
  console.error('[ai-pet-helper] on-agent-response:', error);
  process.exit(0);
});

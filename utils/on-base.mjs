#!/usr/bin/env node
/**
 * Lifecycle hook: reset pet to idle base animation and show task summary text.
 * Triggered by Stop, SessionEnd, and TaskCompleted events.
 * @module utils/on-base
 */
import { openAipet } from '../libs/aipet.mjs';
import { readHookInput, resolveSessionId } from '../libs/hook-input.mjs';
import { readState, writeState } from '../libs/state.mjs';
import { buildTextProtocolUrl, summarizeResponse } from '../libs/summarize.mjs';

const getFormatInput = input => {
  if (typeof input?.last_assistant_message === 'string') {
    return input.last_assistant_message;
  }

  if (typeof input?.text === 'string') {
    return input.text;
  }

  return '';
};

/**
 * @param {Record<string, unknown> | null} input
 * @param {Record<string, unknown>} state
 * @returns {string}
 */
function resolveResponseText(input, state) {
  const fromInput = getFormatInput(input);
  if (fromInput.trim()) {
    return fromInput.trim();
  }

  return typeof state.lastResponse === 'string'
    ? state.lastResponse.trim()
    : '';
}

async function main() {
  const input = await readHookInput();
  const state = readState();
  const responseText = resolveResponseText(input, state);
  const summary = responseText ? summarizeResponse(responseText) : null;
  const sessionId = resolveSessionId(input, state);

  await openAipet('aipet://base');

  if (summary) {
    await openAipet(
      buildTextProtocolUrl(summary.title, summary.text, sessionId)
    );
  }

  const patch = { phase: 'idle' };
  if (sessionId) {
    patch.sessionId = sessionId;
  }
  writeState(patch);
}

main().catch(error => {
  console.error('[ai-pet-helper] on-base:', error);
  // Async hooks must not fail the host CLI with a non-zero exit.
  process.exit(0);
});

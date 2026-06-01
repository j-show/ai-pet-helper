#!/usr/bin/env node
/**
 * Lifecycle hook: play jumping once when AI starts using tools.
 * Triggered by PreToolUse / preToolUse while phase is waiting or user_prompt.
 * @module utils/on-state-switch
 */
import { openAipet } from '../libs/aipet.mjs';
import { runHook } from '../libs/hook-runtime.mjs';
import { readState, writeState } from '../libs/state.mjs';

runHook('on-state-switch', async ({ sessionId }) => {
  const state = readState();
  if (
    state.phase === 'review' ||
    state.phase === 'failed' ||
    state.phase === 'working'
  ) {
    return;
  }
  if (state.phase !== 'waiting' && state.phase !== 'user_prompt') {
    return;
  }

  await openAipet('aipet://jumping?count=1', { sessionId });
  writeState({ phase: 'working' });
});

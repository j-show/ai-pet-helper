#!/usr/bin/env node
/**
 * Lifecycle hook: play jumping once when AI starts using tools.
 * Triggered by PreToolUse / preToolUse while phase is waiting or user_prompt.
 * @module utils/on-state-switch
 */
import { openAipet } from '../libs/aipet.mjs';
import { readState, writeState } from '../libs/state.mjs';

async function main() {
  const state = readState();
  // Skip if already in a terminal or in-progress phase (avoid duplicate jumping).
  if (
    state.phase === 'review' ||
    state.phase === 'failed' ||
    state.phase === 'working'
  ) {
    return;
  }
  // Only transition from post-prompt waiting states.
  if (state.phase !== 'waiting' && state.phase !== 'user_prompt') {
    return;
  }

  await openAipet('aipet://jumping?count=1');
  writeState({ phase: 'working' });
}

main().catch(error => {
  console.error('[ai-pet-helper] on-state-switch:', error);
  process.exit(0);
});

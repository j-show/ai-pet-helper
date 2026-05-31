#!/usr/bin/env node
/**
 * Lifecycle hook: reset pet to idle base animation.
 * Triggered by Stop, SessionEnd, and TaskCompleted events.
 * @module utils/on-base
 */
import { openAipet } from '../libs/aipet.mjs';
import { writeState } from '../libs/state.mjs';

async function main() {
  await openAipet('aipet://base');
  writeState({ phase: 'idle' });
}

main().catch(error => {
  console.error('[ai-pet-helper] on-base:', error);
  // Async hooks must not fail the host CLI with a non-zero exit.
  process.exit(0);
});

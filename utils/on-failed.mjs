#!/usr/bin/env node
/**
 * Lifecycle hook: play failed animation (3 rounds) on tool/stop failure.
 * Triggered by StopFailure and PostToolUseFailure / postToolUseFailure.
 * @module utils/on-failed
 */
import { openAipet } from '../libs/aipet.mjs';
import { writeState } from '../libs/state.mjs';

async function main() {
  await openAipet('aipet://failed?count=3');
  writeState({ phase: 'failed' });
}

main().catch(error => {
  console.error('[ai-pet-helper] on-failed:', error);
  process.exit(0);
});

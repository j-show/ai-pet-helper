#!/usr/bin/env node
/**
 * Lifecycle hook: play review animation when code-reviewer subagent starts.
 * Triggered by SubagentStart with matcher `code-reviewer|review`.
 * @module utils/on-review
 */
import { openAipet } from '../libs/aipet.mjs';
import { writeState } from '../libs/state.mjs';

async function main() {
  await openAipet('aipet://review');
  writeState({ phase: 'review' });
}

main().catch(error => {
  console.error('[ai-pet-helper] on-review:', error);
  process.exit(0);
});

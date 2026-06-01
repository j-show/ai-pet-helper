#!/usr/bin/env node
/**
 * Lifecycle hook: play running → waving → waiting sequence on user prompt.
 * Triggered by UserPromptSubmit / beforeSubmitPrompt.
 * @module utils/on-user-prompt
 */
import { openAipet, sleep } from '../libs/aipet.mjs';
import { runHook } from '../libs/hook-runtime.mjs';
import { writeState } from '../libs/state.mjs';

runHook('on-user-prompt', async ({ sessionId }) => {
  const logOptions = { sessionId };

  writeState({ phase: 'user_prompt' });

  await openAipet('aipet://running?default=true', logOptions);
  await sleep(280);
  await openAipet('aipet://waving?count=1', logOptions);
  await sleep(480);
  await openAipet('aipet://waiting', logOptions);

  writeState({ phase: 'waiting' });
});

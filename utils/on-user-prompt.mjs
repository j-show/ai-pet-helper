#!/usr/bin/env node
/**
 * Lifecycle hook: play running → waving → waiting sequence on user prompt.
 * Triggered by UserPromptSubmit / beforeSubmitPrompt.
 * @module utils/on-user-prompt
 */
import { openAipet, sleep } from '../libs/aipet.mjs';
import { resolveUserPromptText } from '../libs/hook-input.mjs';
import { runHook } from '../libs/hook-runtime.mjs';
import {
  ProtocolActionType,
  buildActionProtocolUrl
} from '../libs/protocol.mjs';
import { writeState } from '../libs/state.mjs';
import { summarizeSessionTitle } from '../libs/summarize.mjs';

runHook('on-user-prompt', async ({ input, sessionId, sessionTitle }) => {
  const logOptions = { sessionId };

  const patch = { phase: 'user_prompt' };
  const text = resolveUserPromptText(input);
  const title = sessionTitle || summarizeSessionTitle(text);

  patch.sessionTitle = title;
  writeState(patch);

  await openAipet(
    buildActionProtocolUrl(ProtocolActionType.RUNNING, { default: true }),
    logOptions
  );
  await sleep(280);

  await openAipet(
    buildActionProtocolUrl(ProtocolActionType.WAVING, { count: 1 }),
    logOptions
  );
  await sleep(480);

  await openAipet(
    buildActionProtocolUrl(ProtocolActionType.WAITING),
    logOptions
  );

  writeState({ phase: 'waiting' });
});

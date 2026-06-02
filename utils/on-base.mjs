#!/usr/bin/env node
/**
 * Lifecycle hook: show task summary text and reset pet to idle base animation.
 * Triggered by Stop, SessionEnd, and TaskCompleted events.
 * @module utils/on-base
 */
import { openAipet, sleep } from '../libs/aipet.mjs';
import { runHook } from '../libs/hook-runtime.mjs';
import { logHookDiagnostic } from '../libs/protocol-log.mjs';
import {
  buildTextProtocolUrl,
  buildActionProtocolUrl,
  ProtocolActionType
} from '../libs/protocol.mjs';
import { resolveResponseText } from '../libs/resolve-response.mjs';
import { writeState } from '../libs/state.mjs';
import {
  summarizeResponseText,
  summarizeSessionTitle
} from '../libs/summarize.mjs';

runHook('on-base', async ({ input, state, sessionId, sessionTitle }) => {
  const responseText = resolveResponseText(input, state);

  const text = summarizeResponseText(responseText);
  const title = sessionTitle || summarizeSessionTitle(responseText);

  if (!text) {
    logHookDiagnostic({
      sessionId,
      message: [
        `no_assistant_text keys=${input ? Object.keys(input).join(',') : 'none'}`,
        `cached=${Boolean(state.lastResponse)}`,
        `transcript=${state.transcriptPath || 'none'}`
      ].join(' ')
    });
  }

  await openAipet(
    buildTextProtocolUrl({
      sid: sessionId,
      title,
      text
    }),
    { sessionId }
  );
  await sleep(1000);

  await openAipet(buildActionProtocolUrl(ProtocolActionType.BASE), {
    sessionId
  });

  writeState({ phase: 'idle' });
});

#!/usr/bin/env node
/**
 * Lifecycle hook: show task summary text and reset pet to idle base animation.
 * Triggered by Stop, SessionEnd, and TaskCompleted events.
 * @module utils/on-base
 */
import { openAipet } from '../libs/aipet.mjs';
import { runHook } from '../libs/hook-runtime.mjs';
import { logHookDiagnostic } from '../libs/protocol-log.mjs';
import { resolveResponseText } from '../libs/resolve-response.mjs';
import { writeState } from '../libs/state.mjs';
import { buildTextProtocolUrl, summarizeResponse } from '../libs/summarize.mjs';

runHook('on-base', async ({ input, state, sessionId }) => {
  const responseText = resolveResponseText(input, state);
  const summary = responseText ? summarizeResponse(responseText) : null;
  const logOptions = { sessionId };

  if (summary) {
    await openAipet(
      buildTextProtocolUrl(summary.title, summary.text, sessionId),
      logOptions
    );
  } else {
    logHookDiagnostic({
      sessionId,
      message: `no_assistant_text keys=${input ? Object.keys(input).join(',') : 'none'} cached=${Boolean(state.lastResponse)} transcript=${state.transcriptPath || 'none'}`
    });
  }

  await openAipet('aipet://base', logOptions);

  writeState({ phase: 'idle' });
});

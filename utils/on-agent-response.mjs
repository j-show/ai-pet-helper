#!/usr/bin/env node
/**
 * Lifecycle hook: stream `aipet://text` as assistant outputs text.
 * Triggered by Cursor `afterAgentResponse` and Claude `MessageDisplay`.
 *
 * State keys:
 * - `lastResponse`: latest accumulated assistant text (used as fallback by task-end hooks).
 * - `lastTextProtocolSummary`: last `txt` summary sent via `aipet://text` (used for de-dup).
 * @module utils/on-agent-response
 */
import { openAipet } from '../libs/aipet.mjs';
import { runHook } from '../libs/hook-runtime.mjs';
import { logHookDiagnostic } from '../libs/protocol-log.mjs';
import { buildTextProtocolUrl } from '../libs/protocol.mjs';
import {
  accumulateMessageDisplay,
  extractHookText
} from '../libs/resolve-response.mjs';
import { writeState } from '../libs/state.mjs';
import { summarizeResponseText } from '../libs/summarize.mjs';

runHook(
  'on-agent-response',
  async ({ input, state, sessionId, sessionTitle }) => {
    if (!input) return;

    const event =
      typeof input.hook_event_name === 'string' ? input.hook_event_name : '';

    let text = '';
    let patch = {};

    if (event === 'MessageDisplay') {
      const accumulated = accumulateMessageDisplay(input, state);
      text =
        typeof accumulated.patch.lastResponse === 'string'
          ? accumulated.patch.lastResponse.trim()
          : '';
      patch = accumulated.patch;
    } else {
      text = extractHookText(input);
      if (text) {
        patch.lastResponse = text;
      }
    }

    if (!text) {
      logHookDiagnostic({
        sessionId,
        message: `no_response_text event=${event || 'unknown'}`
      });
      return;
    }

    const merged = writeState(patch);

    const summary = summarizeResponseText(text);
    if (!summary) {
      logHookDiagnostic({
        sessionId,
        message: `no_meaningful_summary chars=${text.length} event=${event || 'unknown'}`
      });
      return;
    }

    const previousSummary =
      typeof merged.lastTextProtocolSummary === 'string'
        ? merged.lastTextProtocolSummary
        : '';
    if (summary === previousSummary) return;

    await openAipet(
      buildTextProtocolUrl({
        sid: sessionId,
        icon: 'loading',
        title: sessionTitle,
        text: summary
      }),
      { sessionId }
    );

    writeState({ lastTextProtocolSummary: summary });

    logHookDiagnostic({
      sessionId,
      message: `streamed_text chars=${text.length} summary_chars=${summary.length} event=${event || 'unknown'}`
    });
  }
);

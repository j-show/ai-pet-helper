#!/usr/bin/env node
/**
 * Lifecycle hook: tool failure animation and error text.
 * Triggered by PostToolUseFailure / postToolUseFailure.
 * @module utils/on-tools-failed
 */
import { openAipet, sleep } from '../libs/aipet.mjs';
import { runHook } from '../libs/hook-runtime.mjs';
import {
  buildTextProtocolUrl,
  buildActionProtocolUrl,
  ProtocolActionType
} from '../libs/protocol.mjs';
import {
  extractToolFailureText,
  summarizeFailureForText
} from '../libs/resolve-failure.mjs';
import { writeState } from '../libs/state.mjs';
import { summarizeSessionTitle } from '../libs/summarize.mjs';

runHook(
  'on-tools-failed',
  async ({ input, sessionType, sessionId, sessionTitle }) => {
    await openAipet(
      buildActionProtocolUrl(ProtocolActionType.FAILED, {
        count: 3
      }),
      { sessionId }
    );

    writeState({ phase: 'tools_failed' });

    const failure = summarizeFailureForText({
      input,
      sessionTitle,
      extractText: extractToolFailureText,
      fallbackTitle: (hookInput, raw) => {
        const toolName =
          typeof hookInput?.tool_name === 'string'
            ? hookInput.tool_name.trim()
            : '';
        return summarizeSessionTitle(toolName || raw || '工具失败');
      }
    });

    if (failure) {
      await openAipet(
        buildTextProtocolUrl({
          sty: sessionType,
          sid: sessionId,
          icon: 'warn',
          title: failure.title,
          text: failure.text
        }),
        { sessionId }
      );

      await sleep(3000);

      await openAipet(buildTextProtocolUrl({ sid: sessionId }), { sessionId });
    }
  }
);

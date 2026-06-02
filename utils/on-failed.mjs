#!/usr/bin/env node
/**
 * Lifecycle hook: play failed animation (3 rounds) on tool/stop failure.
 * Triggered by StopFailure and PostToolUseFailure / postToolUseFailure.
 * @module utils/on-failed
 */
import { openAipet } from '../libs/aipet.mjs';
import { runHook } from '../libs/hook-runtime.mjs';
import {
  buildActionProtocolUrl,
  ProtocolActionType
} from '../libs/protocol.mjs';
import { writeState } from '../libs/state.mjs';

runHook('on-failed', async ({ sessionId }) => {
  await openAipet(
    buildActionProtocolUrl(ProtocolActionType.FAILED, {
      count: 3
    }),
    { sessionId }
  );

  writeState({ phase: 'failed' });
});

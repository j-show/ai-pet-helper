#!/usr/bin/env node
/**
 * Lifecycle hook: play review animation when code-reviewer subagent starts.
 * Triggered by SubagentStart with matcher `code-reviewer|review`.
 * @module utils/on-review
 */
import { openAipet } from '../libs/aipet.mjs';
import { runHook } from '../libs/hook-runtime.mjs';
import {
  buildActionProtocolUrl,
  ProtocolActionType
} from '../libs/protocol.mjs';
import { writeState } from '../libs/state.mjs';

runHook('on-review', async ({ sessionId }) => {
  await openAipet(buildActionProtocolUrl(ProtocolActionType.REVIEW), {
    sessionId
  });

  writeState({ phase: 'review' });
});

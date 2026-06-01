import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  resolveSessionId,
  sessionIdFromTextProtocolUrl,
  sessionIdFromTranscriptPath
} from '../libs/hook-input.mjs';

test('resolveSessionId prefers session_id then conversation_id', () => {
  assert.equal(
    resolveSessionId({ session_id: 'sess-a', conversation_id: 'conv-b' }),
    'sess-a'
  );
  assert.equal(resolveSessionId({ conversation_id: 'conv-b' }), 'conv-b');
  assert.equal(resolveSessionId(null, { sessionId: 'cached' }), 'cached');
});

test('resolveSessionId derives id from transcript_path via shared resolver', () => {
  const id = '00893aaf-19fa-41d2-8238-13269b9b3ca0';
  const transcriptPath = `/tmp/projects/foo/${id}.jsonl`;
  assert.equal(resolveSessionId({}, { transcriptPath }), id);
});

test('sessionIdFromTranscriptPath reads uuid basename', () => {
  const id = '00893aaf-19fa-41d2-8238-13269b9b3ca0';
  assert.equal(
    sessionIdFromTranscriptPath(
      `C:\\Users\\me\\.claude\\projects\\foo\\${id}.jsonl`
    ),
    id
  );
});

test('sessionIdFromTextProtocolUrl reads sid query param', () => {
  assert.equal(
    sessionIdFromTextProtocolUrl('aipet://text?tl=a&txt=b&sid=sess-xyz'),
    'sess-xyz'
  );
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveSessionId } from '../libs/hook-input.mjs';

test('resolveSessionId prefers session_id then conversation_id', () => {
  assert.equal(
    resolveSessionId({ session_id: 'sess-a', conversation_id: 'conv-b' }),
    'sess-a'
  );
  assert.equal(resolveSessionId({ conversation_id: 'conv-b' }), 'conv-b');
  assert.equal(resolveSessionId(null, { sessionId: 'cached' }), 'cached');
  assert.equal(resolveSessionId({}, {}), '');
});

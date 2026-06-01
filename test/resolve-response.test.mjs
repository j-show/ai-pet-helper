import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { resolveTranscriptPath } from '../libs/hook-input.mjs';
import {
  accumulateMessageDisplay,
  extractHookText,
  resolveResponseText
} from '../libs/resolve-response.mjs';

test('extractHookText checks common field aliases', () => {
  assert.equal(
    extractHookText({ last_assistant_message: 'from stop' }),
    'from stop'
  );
  assert.equal(extractHookText({ text: 'from cursor' }), 'from cursor');
});

test('resolveTranscriptPath falls back to state and CURSOR_TRANSCRIPT_PATH', () => {
  const previous = process.env.CURSOR_TRANSCRIPT_PATH;
  process.env.CURSOR_TRANSCRIPT_PATH = '/tmp/transcript.jsonl';
  try {
    assert.equal(resolveTranscriptPath({}), '/tmp/transcript.jsonl');
    assert.equal(
      resolveTranscriptPath({}, { transcriptPath: 'C:\\cached.jsonl' }),
      'C:\\cached.jsonl'
    );
  } finally {
    if (previous == null) {
      delete process.env.CURSOR_TRANSCRIPT_PATH;
    } else {
      process.env.CURSOR_TRANSCRIPT_PATH = previous;
    }
  }
});

test('resolveResponseText reads transcript when hook and cache are empty', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'aipet-resolve-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const file = join(dir, 'transcript.jsonl');
  await writeFile(
    file,
    '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"来自 transcript"}]}}\n',
    'utf8'
  );

  const text = resolveResponseText({ transcript_path: file }, {});
  assert.equal(text, '来自 transcript');
});

test('accumulateMessageDisplay appends delta for same message_id', () => {
  const first = accumulateMessageDisplay(
    { message_id: 'm1', delta: 'Hello ' },
    { lastMessageId: '', lastResponse: '' }
  );
  assert.equal(first.patch.lastResponse, 'Hello ');

  const second = accumulateMessageDisplay(
    { message_id: 'm1', delta: 'world', final: true },
    {
      lastMessageId: first.patch.lastMessageId,
      lastResponse: first.patch.lastResponse
    }
  );
  assert.equal(second.patch.lastResponse, 'Hello world');
});

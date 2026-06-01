import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  extractAssistantTextFromEntry,
  readLastAssistantFromTranscript
} from '../libs/transcript.mjs';

test('extractAssistantTextFromEntry supports Claude/Cursor assistant lines', () => {
  const claudeEntry = {
    type: 'assistant',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: '任务已完成。' }]
    }
  };
  assert.equal(extractAssistantTextFromEntry(claudeEntry), '任务已完成。');

  const cursorEntry = {
    role: 'assistant',
    message: {
      content: [{ type: 'text', text: 'Cursor 最终回复' }]
    }
  };
  assert.equal(extractAssistantTextFromEntry(cursorEntry), 'Cursor 最终回复');
});

test('extractAssistantTextFromEntry skips placeholder-only text', () => {
  const entry = {
    role: 'assistant',
    message: {
      content: [{ type: 'text', text: '[REDACTED]' }]
    }
  };
  assert.equal(extractAssistantTextFromEntry(entry), '');
});

test('readLastAssistantFromTranscript returns the last assistant message', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'aipet-transcript-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  const file = join(dir, 'transcript.jsonl');
  await writeFile(
    file,
    [
      '{"type":"user","message":{"role":"user","content":"hi"}}',
      '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"第一段"}]}}',
      '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"最终回复"}]}}'
    ].join('\n'),
    'utf8'
  );

  assert.equal(readLastAssistantFromTranscript(file), '最终回复');
});

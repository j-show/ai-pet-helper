import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildTextProtocolUrl,
  stripMarkdown,
  summarizeResponse
} from '../libs/summarize.mjs';

test('stripMarkdown removes common markdown syntax', () => {
  const plain = stripMarkdown('# Title\n\n**Bold** and `code`');
  assert.equal(plain, 'Title Bold and code');
});

test('summarizeResponse prefers markdown heading as title', () => {
  const summary = summarizeResponse(
    '# 修复完成\n\n已将 hooks 配置更新，并补充 text 协议触发逻辑。'
  );
  assert.ok(summary);
  assert.equal(summary.title, '修复完成');
  assert.match(summary.text, /hooks/);
});

test('summarizeResponse falls back to first sentence for title', () => {
  const summary = summarizeResponse('任务已完成。详细说明见下文。');
  assert.ok(summary);
  assert.equal(summary.title, '任务已完成');
});

test('buildTextProtocolUrl encodes query parameters', () => {
  const url = buildTextProtocolUrl('标题 A', '内容 B & C', 'sess-123');
  assert.equal(
    url,
    'aipet://text?tl=%E6%A0%87%E9%A2%98+A&txt=%E5%86%85%E5%AE%B9+B+%26+C&sid=sess-123'
  );
});

test('buildTextProtocolUrl omits sid when session id is empty', () => {
  const url = buildTextProtocolUrl('标题', '内容');
  assert.equal(
    url,
    'aipet://text?tl=%E6%A0%87%E9%A2%98&txt=%E5%86%85%E5%AE%B9'
  );
});

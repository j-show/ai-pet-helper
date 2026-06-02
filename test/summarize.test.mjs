import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildTextProtocolUrl,
  SUMMARY_MAX_TITLE,
  stripMarkdown,
  summarizeResponse,
  summarizeResponseText,
  summarizeSessionTitle,
  SUMMARY_MAX_TEXT,
  truncateChars
} from '../libs/summarize.mjs';

test('stripMarkdown removes common markdown syntax', () => {
  const plain = stripMarkdown('# Title\n\n**Bold** and `code`');
  assert.equal(plain, 'Title Bold and code');
});

test('summarizeSessionTitle uses first line of user prompt', () => {
  assert.equal(
    summarizeSessionTitle('修复 hooks 配置\n第二行忽略'),
    '修复 hooks 配置'
  );
});

test('summarizeResponseText prefers body after markdown heading', () => {
  const summary = summarizeResponseText(
    '# 修复完成\n\n已将 hooks 配置更新，并补充 text 协议触发逻辑。'
  );
  assert.ok(summary);
  assert.match(summary, /hooks/);
  assert.notEqual(summary, '修复完成');
});

test('summarizeResponseText truncates to SUMMARY_MAX_TEXT', () => {
  const long = '中'.repeat(SUMMARY_MAX_TEXT + 10);
  const summary = summarizeResponseText(long);
  assert.ok(summary);
  assert.equal(summary.length, SUMMARY_MAX_TEXT);
  assert.ok(summary.endsWith('…'));
});

test('summarizeResponseText counts CJK as one character', () => {
  const fifty = '汉'.repeat(50);
  assert.equal(summarizeResponseText(fifty), fifty);
  const fiftyOne = '汉'.repeat(51);
  const summary = summarizeResponseText(fiftyOne);
  assert.ok(summary);
  if (SUMMARY_MAX_TEXT >= 51) {
    assert.equal(summary, fiftyOne);
  } else {
    assert.equal(summary.length, SUMMARY_MAX_TEXT);
  }
});

test('summarizeResponse combines session title and response summary', () => {
  const summary = summarizeResponse('任务已完成。详细说明见下文。');
  assert.ok(summary);
  assert.equal(summary.title, '任务已完成');
  assert.match(summary.text, /详细说明/);
});

test('buildTextProtocolUrl encodes query parameters', () => {
  const url = buildTextProtocolUrl('会话标题', '内容 B & C', 'sess-123');
  const parsed = new URL(url);
  assert.equal(parsed.protocol, 'aipet:');
  assert.equal(parsed.host, 'text');
  assert.equal(parsed.searchParams.get('tl'), '会话标题');
  assert.equal(parsed.searchParams.get('txt'), '内容 B & C');
  assert.equal(parsed.searchParams.get('sid'), 'sess-123');
});

test('buildTextProtocolUrl omits sid when session id is empty', () => {
  const url = buildTextProtocolUrl('标题', '内容', '');
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('sid'), null);
});

test('buildTextProtocolUrl places txt before sid for Windows URL limits', () => {
  const sid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const url = buildTextProtocolUrl('标题 A', '内容 B', sid);
  const txtIndex = url.indexOf('txt=');
  const sidIndex = url.indexOf('sid=');
  assert.ok(txtIndex >= 0);
  assert.ok(sidIndex >= 0);
  assert.ok(txtIndex < sidIndex);
});

test('buildTextProtocolUrl truncates txt to SUMMARY_MAX_TEXT', () => {
  const longTxt = '字'.repeat(SUMMARY_MAX_TEXT + 5);
  const url = buildTextProtocolUrl('标题', longTxt, 'sess-1');
  const parsed = new URL(url);
  const txt = parsed.searchParams.get('txt');
  assert.ok(txt);
  assert.equal(txt.length, SUMMARY_MAX_TEXT);
});

test('truncateChars respects SUMMARY_MAX_TITLE', () => {
  const long = 'a'.repeat(SUMMARY_MAX_TITLE + 5);
  assert.equal(
    truncateChars(long, SUMMARY_MAX_TITLE).length,
    SUMMARY_MAX_TITLE
  );
});

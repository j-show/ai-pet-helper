import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
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

test('truncateChars respects SUMMARY_MAX_TITLE', () => {
  const long = 'a'.repeat(SUMMARY_MAX_TITLE + 5);
  assert.equal(
    truncateChars(long, SUMMARY_MAX_TITLE).length,
    SUMMARY_MAX_TITLE
  );
});

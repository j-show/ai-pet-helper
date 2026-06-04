import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  extractStopFailureText,
  extractToolFailureText,
  summarizeFailureForText
} from '../libs/resolve-failure.mjs';
import { SUMMARY_MAX_TEXT } from '../libs/summarize.mjs';

test('extractToolFailureText prefers Cursor error_message with context', () => {
  assert.equal(
    extractToolFailureText({
      tool_name: 'Shell',
      failure_type: 'timeout',
      error_message: 'Command timed out after 30s'
    }),
    'Shell · 超时: Command timed out after 30s'
  );
});

test('extractToolFailureText uses Claude error field', () => {
  assert.equal(
    extractToolFailureText({
      tool_name: 'Bash',
      error: 'exit code 1'
    }),
    'Bash: exit code 1'
  );
});

test('extractToolFailureText falls back to tool label when no detail', () => {
  assert.equal(
    extractToolFailureText({
      tool_name: 'Read',
      is_interrupt: true
    }),
    'Read · 已中断 失败'
  );
});

test('extractStopFailureText combines category and message', () => {
  assert.equal(
    extractStopFailureText({
      error: 'rate_limit',
      message: 'Too many requests'
    }),
    'rate_limit: Too many requests'
  );
});

test('extractStopFailureText uses last_assistant_message when no message', () => {
  assert.equal(
    extractStopFailureText({
      last_assistant_message: 'Partial reply before outage'
    }),
    'Partial reply before outage'
  );
});

test('summarizeFailureForText returns null when nothing to show', () => {
  assert.equal(
    summarizeFailureForText({
      input: {},
      sessionTitle: '',
      extractText: extractToolFailureText
    }),
    null
  );
});

test('summarizeFailureForText truncates long tool errors', () => {
  const failure = summarizeFailureForText({
    input: { error_message: 'x'.repeat(80) },
    sessionTitle: '我的任务',
    extractText: extractToolFailureText
  });

  assert.ok(failure);
  assert.equal(failure.title, '我的任务');
  assert.ok(failure.text.length <= SUMMARY_MAX_TEXT);
});

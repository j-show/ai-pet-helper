/**
 * @module libs/resolve-failure
 * Extract failure messages from PostToolUseFailure / StopFailure hook stdin.
 */

import { summarizeResponseText, summarizeSessionTitle } from './summarize.mjs';

const FAILURE_TYPE_LABELS = {
  error: '错误',
  timeout: '超时',
  permission_denied: '权限拒绝'
};

/**
 * @param {unknown[]} list
 * @returns {string}
 */
const pickFirstTrimmedString = list => {
  for (const item of list) {
    if (typeof item !== 'string') continue;

    const trimmed = item.trim();
    if (trimmed) return trimmed;
  }

  return '';
};

/**
 * PostToolUseFailure / postToolUseFailure (Cursor + Claude Code).
 * @param {Record<string, unknown> | null | undefined} input
 * @returns {string}
 */
export const extractToolFailureText = input => {
  if (!input) return '';

  const detail = pickFirstTrimmedString([input.error_message, input.error]);

  const toolName =
    typeof input.tool_name === 'string' ? input.tool_name.trim() : '';
  const failureType =
    typeof input.failure_type === 'string' ? input.failure_type.trim() : '';
  const failureLabel = failureType
    ? FAILURE_TYPE_LABELS[failureType] || failureType
    : '';
  const isInterrupt = input.is_interrupt === true;

  const labels = [];
  if (toolName) labels.push(toolName);
  if (failureLabel) labels.push(failureLabel);
  if (isInterrupt) labels.push('已中断');

  if (detail) {
    return labels.length ? `${labels.join(' · ')}: ${detail}` : detail;
  }

  if (labels.length) return `${labels.join(' · ')} 失败`;

  return '';
};

/**
 * StopFailure (Claude Code API / turn-level errors).
 * @param {Record<string, unknown> | null | undefined} input
 * @returns {string}
 */
export const extractStopFailureText = input => {
  if (!input) return '';

  const category = typeof input.error === 'string' ? input.error.trim() : '';
  const message = pickFirstTrimmedString([input.message]);
  const lastAssistant = pickFirstTrimmedString([
    input.last_assistant_message,
    input.lastAssistantMessage
  ]);

  let text = '';
  if (message) {
    text = category ? `${category}: ${message}` : message;
  } else if (category) {
    text = category;
  }

  if (text) return text;

  return lastAssistant;
};

/**
 * Map hook stdin to `aipet://text` title and truncated `txt`.
 * @param {object} options
 * @param {Record<string, unknown> | null | undefined} options.input Hook stdin JSON.
 * @param {string} options.sessionTitle Persisted session title (`tl` when set).
 * @param {(input: Record<string, unknown> | null | undefined) => string} options.extractText Platform-specific failure extractor.
 * @param {(input: Record<string, unknown> | null | undefined, raw: string) => string} [options.fallbackTitle Title when `sessionTitle` is empty.
 * @returns {{ title: string, text: string } | null} Null when no displayable failure text.
 */
export const summarizeFailureForText = ({
  input,
  sessionTitle,
  extractText,
  fallbackTitle
}) => {
  const raw = extractText(input);
  const text = summarizeResponseText(raw);
  if (!text) return null;

  const title =
    sessionTitle ||
    (fallbackTitle ? fallbackTitle(input, raw) : '') ||
    summarizeSessionTitle(raw) ||
    '';

  return { title, text };
};

/**
 * @module libs/resolve-response
 * Resolve assistant reply text from hook input, cached state, or transcript.
 */
import { resolveTranscriptPath } from './hook-input.mjs';
import { readLastAssistantFromTranscript } from './transcript.mjs';

const DIRECT_TEXT_KEYS = [
  'last_assistant_message',
  'text',
  'response',
  'message',
  'content',
  'assistant_message',
  'assistantMessage',
  'final_text',
  'finalText'
];

/**
 * @param {Record<string, unknown> | null | undefined} input
 * @returns {string}
 */
export const extractHookText = input => {
  if (!input) return '';

  for (const key of DIRECT_TEXT_KEYS) {
    const value = String(input[key] || '').trim();
    if (value) return value;
  }

  const delta = String(input.delta || '').trim();
  if (delta) return delta;

  return '';
};

/**
 * @param {Record<string, unknown> | null | undefined} input
 * @param {Record<string, unknown>} [state]
 * @returns {string}
 */
export const resolveResponseText = (input, state = {}) => {
  const fromHook = extractHookText(input);
  if (fromHook) return fromHook;

  const lastResponse = String(state.lastResponse || '').trim();
  if (lastResponse) return lastResponse;

  const transcriptPath = resolveTranscriptPath(input, state);
  if (transcriptPath) {
    return readLastAssistantFromTranscript(transcriptPath);
  }

  return '';
};

/**
 * @param {Record<string, unknown> | null | undefined} input
 * @param {Record<string, unknown>} state
 * @returns {{ patch: Record<string, unknown> }}
 */
export const accumulateMessageDisplay = (input, state) => {
  const messageId =
    typeof input?.message_id === 'string' ? input.message_id : '';
  const delta = typeof input?.delta === 'string' ? input.delta : '';
  const isFinal = input?.final === true;

  let text = delta;
  if (messageId && messageId === state.lastMessageId) {
    text = `${typeof state.lastResponse === 'string' ? state.lastResponse : ''}${delta}`;
  }

  const patch = {
    lastResponse: text,
    lastMessageId: messageId || state.lastMessageId
  };

  if (isFinal && text.trim()) {
    patch.lastResponse = text.trim();
  }

  return { patch };
};

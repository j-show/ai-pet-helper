/**
 * @module libs/transcript
 * Read the latest assistant text from Claude/Cursor JSONL transcripts.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * @param {string} filePath
 * @returns {string}
 */
export const expandHomePath = filePath => {
  let trimmed = filePath.trim();
  if (!trimmed) return '';

  if (process.platform === 'win32') {
    const profile = process.env.USERPROFILE;
    if (profile) {
      trimmed = trimmed.replace(/^%USERPROFILE%/i, profile);
      trimmed = trimmed.replace(/^%HOME%/i, profile);
    }
  }

  if (trimmed.startsWith('~/')) {
    return path.join(os.homedir(), trimmed.slice(2));
  }

  return trimmed;
};

/**
 * @param {unknown} content
 * @returns {string}
 */
export const extractMessageContent = content => {
  if (typeof content === 'string') return content.trim();

  if (!Array.isArray(content)) return '';

  return content
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('')
    .trim();
};

/**
 * @param {string} text
 * @returns {boolean}
 */
export const isMeaningfulAssistantText = text => {
  const trimmed = text.trim();
  return Boolean(trimmed) && trimmed !== '[REDACTED]';
};

/**
 * @param {Record<string, unknown>} entry
 * @returns {string}
 */
export const extractAssistantTextFromEntry = entry => {
  if (typeof entry.last_assistant_message === 'string') {
    const text = entry.last_assistant_message.trim();
    return isMeaningfulAssistantText(text) ? text : '';
  }

  const message =
    entry.message && typeof entry.message === 'object'
      ? /** @type {Record<string, unknown>} */ (entry.message)
      : null;

  const fromMessage = message ? extractMessageContent(message.content) : '';
  if (isMeaningfulAssistantText(fromMessage)) return fromMessage;

  if (entry.role === 'assistant' && typeof entry.text === 'string') {
    const text = entry.text.trim();
    return isMeaningfulAssistantText(text) ? text : '';
  }

  return '';
};

/**
 * @param {string | null | undefined} transcriptPath
 * @returns {string}
 */
export const readLastAssistantFromTranscript = transcriptPath => {
  const resolved = expandHomePath(transcriptPath ?? '');
  if (!resolved || !fs.existsSync(resolved)) return '';

  let lastText = '';

  try {
    const lines = fs.readFileSync(resolved, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const entry = JSON.parse(trimmed);
        const text = extractAssistantTextFromEntry(entry);
        if (isMeaningfulAssistantText(text)) {
          lastText = text;
        }
      } catch {
        // Skip malformed lines.
      }
    }
  } catch {
    return '';
  }

  return lastText;
};

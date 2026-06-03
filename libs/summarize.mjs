/**
 * @module libs/summarize
 * Session title (`tl`) and per-response summary (`txt`) for `aipet://text`.
 */

import { getSummaryMaxText, getSummaryMaxTitle } from './user-env.mjs';

/** Max length for session title (`tl`), fixed for the session. */
export const SUMMARY_MAX_TITLE = getSummaryMaxTitle();
/** Max length for response summary (`txt`), per task-end output. */
export const SUMMARY_MAX_TEXT = getSummaryMaxText();

/**
 * @param {string} text
 * @returns {string}
 */
export const stripMarkdown = text => {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/[*_~>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
export const truncateChars = (text, max) => {
  if (text.length <= max) return text;

  return `${text.slice(0, max - 1).trimEnd()}…`;
};

/**
 * Derive fixed session title from the user's prompt (first line / sentence).
 * @param {string} text
 * @returns {string}
 */
export const summarizeSessionTitle = text => {
  const source = text?.trim();
  if (!source) return '';

  const firstLineRaw = source.split(/\r?\n/)[0]?.trim() || source;
  const plain = stripMarkdown(firstLineRaw);
  if (!plain) return '';

  const firstSentence = plain.split(/[.!?。！？]/)[0]?.trim() || plain;

  return truncateChars(firstSentence, SUMMARY_MAX_TITLE);
};

/**
 * @param {string} source
 * @param {string} plain
 * @returns {string}
 */
const responseBodyPlain = (source, plain) => {
  const headingMatch = source.match(/^#{1,6}\s+(.+)$/m);
  if (!headingMatch) {
    return plain;
  }

  const afterHeading = source
    .slice(source.indexOf(headingMatch[0]) + headingMatch[0].length)
    .trim();

  return stripMarkdown(afterHeading) || plain;
};

/**
 * Per-output summary for `txt` (dynamic, max {@link SUMMARY_MAX_TEXT} chars).
 * @param {string} text Assistant response text.
 * @returns {string | null}
 */
export const summarizeResponseText = text => {
  const source = text?.trim();
  if (!source) return null;

  const plain = stripMarkdown(source);
  if (!plain) return null;

  const body = responseBodyPlain(source, plain);

  return truncateChars(body, SUMMARY_MAX_TEXT) || null;
};

/**
 * Backward-compatible summary API.
 * @deprecated Prefer {@link summarizeSessionTitle} + {@link summarizeResponseText}.
 * @param {string} text
 * @returns {{ title: string, text: string } | null}
 */
export const summarizeResponse = text => {
  const txt = summarizeResponseText(text);
  if (!txt) return null;

  const title = summarizeSessionTitle(text) || txt;
  return { title, text: txt };
};

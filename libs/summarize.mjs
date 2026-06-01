/**
 * @module libs/summarize
 * Derive title and brief text summaries for `aipet://text`.
 */
import { writeTextPayload } from './text-payload.mjs';

const TITLE_MAX = 40;
const TEXT_MAX = 120;

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
const truncate = (text, max) => {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}…`;
};

/**
 * @param {string} text
 * @returns {{ title: string, text: string } | null}
 */
export const summarizeResponse = text => {
  const source = text?.trim();
  if (!source) {
    return null;
  }

  const plain = stripMarkdown(source);
  if (!plain) {
    return null;
  }

  const headingMatch = source.match(/^#{1,6}\s+(.+)$/m);
  let title = headingMatch ? stripMarkdown(headingMatch[1]) : '';
  if (!title) {
    const firstSentence = plain.split(/[.!?。！？：:\n]/)[0]?.trim() || plain;
    title = truncate(firstSentence, TITLE_MAX);
  } else {
    title = truncate(title, TITLE_MAX);
  }

  let body = plain;
  if (headingMatch) {
    const afterHeading = source
      .slice(source.indexOf(headingMatch[0]) + headingMatch[0].length)
      .trim();
    const bodyFromHeading = stripMarkdown(afterHeading);
    if (bodyFromHeading) {
      body = bodyFromHeading;
    }
  } else if (title && body.startsWith(title)) {
    const rest = body.slice(title.length).trim();
    if (rest) {
      body = rest;
    }
  }

  let summaryText = truncate(body, TEXT_MAX);
  if (!summaryText || summaryText === title) {
    const fallback = truncate(plain, TEXT_MAX);
    if (fallback && fallback !== title) {
      summaryText = fallback;
    }
  }

  return {
    title,
    text: summaryText || title
  };
};

/** Omit inline `txt` when URL would be long (Windows handlers may truncate query strings). */
const INLINE_TXT_MAX_URL_LENGTH = 900;

/**
 * @param {string} title
 * @param {string} text
 * @param {string} [sessionId]
 * @returns {string}
 */
export const buildTextProtocolUrl = (title, text, sessionId = '') => {
  const sid = sessionId.trim();
  const bodyText = (text || title || '').trim();
  const params = new URLSearchParams();
  params.set('tl', title);

  // Put `txt` before `sid`: Windows protocol handlers often truncate long URLs
  // from the end, which would drop `txt` when order was tl → sid → txt.
  const inlineCandidate = `aipet://text?${params.toString()}&txt=`;
  const inlineBudget = Math.max(
    0,
    INLINE_TXT_MAX_URL_LENGTH - inlineCandidate.length - 16
  );
  if (bodyText && inlineBudget > 0) {
    const inlineText =
      bodyText.length > inlineBudget
        ? `${bodyText.slice(0, inlineBudget - 1).trim()}…`
        : bodyText;
    params.set('txt', inlineText);
  }

  if (sid) {
    writeTextPayload(sid, { title, text: bodyText });
    params.set('sid', sid);
  }

  return `aipet://text?${params.toString()}`;
};

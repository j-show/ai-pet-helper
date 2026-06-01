/**
 * @module libs/summarize
 * Derive title and brief text summaries for `aipet://text`.
 */

const TITLE_MAX = 40;
const TEXT_MAX = 120;

/**
 * @param {string} text
 * @returns {string}
 */
export function stripMarkdown(text) {
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
}

/**
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function truncate(text, max) {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * @param {string} text
 * @returns {{ title: string, text: string } | null}
 */
export function summarizeResponse(text) {
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
    const firstSentence = plain.split(/[.!?。！？\n]/)[0]?.trim() || plain;
    title = truncate(firstSentence, TITLE_MAX);
  } else {
    title = truncate(title, TITLE_MAX);
  }

  let body = plain;
  if (body.startsWith(title)) {
    body = body.slice(title.length).trim();
  }
  if (!body) {
    body = plain;
  }

  return {
    title,
    text: truncate(body, TEXT_MAX)
  };
}

/**
 * @param {string} title
 * @param {string} text
 * @param {string} [sessionId]
 * @returns {string}
 */
export function buildTextProtocolUrl(title, text, sessionId = '') {
  const params = new URLSearchParams({
    tl: decodeURIComponent(title),
    txt: decodeURIComponent(text)
  });
  const sid = sessionId.trim();
  if (sid) {
    params.set('sid', sid);
  }
  return `aipet://text?${params.toString()}`;
}

/**
 * @module libs/hook-input
 * Read JSON hook payload from stdin when invoked by the host IDE.
 */

/**
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function readHookInput() {
  if (process.stdin.isTTY) {
    return null;
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} input
 * @param {Record<string, unknown>} [state]
 * @returns {string}
 */
export function resolveSessionId(input, state = {}) {
  const candidates = [
    input?.session_id,
    input?.conversation_id,
    state.sessionId
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

/**
 * @module libs/text-payload
 * Persist full text bubble payload for AI Pet (avoids long `aipet://text` URLs on Windows).
 */
import fs from 'node:fs';
import path from 'node:path';

import { getAiPetHome } from './paths.mjs';
import { isProtocolDebugEnabled } from './user-env.mjs';

/**
 * @param {string} sessionId
 * @returns {string}
 */
export const textPayloadPath = sessionId => {
  const safe = sessionId.trim();

  const ph = path.join(getAiPetHome(), 'messages');
  if (!fs.existsSync(ph)) fs.mkdirSync(ph, { recursive: true });

  return path.join(ph, `${safe || 'default'}.json`);
};

/**
 * @param {string} sessionId
 * @param {{ title: string, text: string }} payload
 */
export const writeTextPayload = (sessionId, payload) => {
  if (!isProtocolDebugEnabled()) return;

  const sid = sessionId.trim();
  if (!sid) return;

  const filePath = textPayloadPath(sid);
  fs.writeFileSync(
    filePath,
    `${JSON.stringify({
      title: payload.title,
      text: payload.text,
      updatedAt: Date.now()
    })}\n`,
    'utf8'
  );
};

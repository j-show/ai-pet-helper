/**
 * @module libs/aipet
 * Open `aipet://` URLs via Vite dev bridge (127.0.0.1:1420) or OS protocol handler.
 */
import { spawnSync } from 'node:child_process';

import { getActiveHook, getLogSessionId } from './hook-runtime.mjs';
import { logProtocolActivation } from './protocol-log.mjs';

const DEV_PROTOCOL_PATH = '/__aipet/protocol';
const DEV_SERVER = 'http://127.0.0.1:1420';

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const sleep = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

const sendToDevServer = async url => {
  const response = await fetch(`${DEV_SERVER}${DEV_PROTOCOL_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  if (!response.ok) {
    throw new Error(`dev bridge responded ${response.status}`);
  }
};

const openWithSystem = url => {
  const platform = process.platform;
  let result;

  if (platform === 'win32') {
    result = spawnSync('rundll32', ['url.dll,FileProtocolHandler', url], {
      encoding: 'utf8',
      shell: false
    });
  } else if (platform === 'darwin') {
    result = spawnSync('open', [url], { encoding: 'utf8' });
  } else {
    result = spawnSync('xdg-open', [url], { encoding: 'utf8' });
  }

  if (result.error) throw result.error;

  if (result.status !== 0) {
    const message =
      result.stderr?.trim() || result.stdout?.trim() || 'system open failed';
    throw new Error(message);
  }
};

/**
 * Open one `aipet://` URL: POST to Vite dev bridge when available, else OS handler.
 * @param {string} url
 * @param {{ sessionId?: string, hook?: string }} [options]
 * @returns {Promise<void>}
 * @throws {Error} When URL does not start with `aipet://`, or system open fails.
 */
export const openAipet = async (url, options = {}) => {
  if (!url?.startsWith('aipet://')) {
    throw new Error(`Invalid aipet URL: ${url}`);
  }

  const sessionId = getLogSessionId(options.sessionId, url);

  logProtocolActivation({
    url,
    sessionId,
    hook: options.hook || getActiveHook()
  });

  try {
    await sendToDevServer(url);
    return;
  } catch {
    openWithSystem(url);
  }
};

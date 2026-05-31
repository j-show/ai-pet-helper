/**
 * @module libs/aipet
 * Open `aipet://` URLs via Vite dev bridge (127.0.0.1:1420) or OS protocol handler.
 */
import { spawnSync } from 'node:child_process';

const DEV_PROTOCOL_PATH = '/__aipet/protocol';
const DEV_SERVER = 'http://127.0.0.1:1420';

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function sendToDevServer(url) {
  const endpoint = `${DEV_SERVER}${DEV_PROTOCOL_PATH}?url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`dev bridge responded ${response.status}`);
  }
}

function openWithSystem(url) {
  const platform = process.platform;
  let result;

  if (platform === 'win32') {
    result = spawnSync('cmd', ['/c', 'start', '', url], {
      encoding: 'utf8',
      shell: false
    });
  } else if (platform === 'darwin') {
    result = spawnSync('open', [url], { encoding: 'utf8' });
  } else {
    result = spawnSync('xdg-open', [url], { encoding: 'utf8' });
  }

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const message =
      result.stderr?.trim() || result.stdout?.trim() || 'system open failed';
    throw new Error(message);
  }
}

/**
 * Open one `aipet://` URL: POST to Vite dev bridge when available, else OS handler.
 * @param {string} url
 * @returns {Promise<void>}
 * @throws {Error} When URL does not start with `aipet://`, or system open fails.
 */
export async function openAipet(url) {
  if (!url?.startsWith('aipet://')) {
    throw new Error(`Invalid aipet URL: ${url}`);
  }

  try {
    await sendToDevServer(url);
    return;
  } catch {
    openWithSystem(url);
  }
}

/**
 * Fire protocol URLs in order with optional delay between each.
 * @param {string[]} urls
 * @param {number} [gapMs]
 * @returns {Promise<void>}
 */
export async function openAipetSequence(urls, gapMs = 0) {
  for (let i = 0; i < urls.length; i += 1) {
    if (i > 0 && gapMs > 0) {
      await sleep(gapMs);
    }
    await openAipet(urls[i]);
  }
}

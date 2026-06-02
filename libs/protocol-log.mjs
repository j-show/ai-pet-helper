/**
 * @module libs/protocol-log
 * Append protocol activation lines to `~/.ai-pet/logs/<session-id>.log`.
 */
import fs from 'node:fs';
import path from 'node:path';

import { getActiveHook, getLogSessionId } from './hook-runtime.mjs';
import { getLogsDir } from './paths.mjs';
import { isProtocolDebugEnabled } from './user-env.mjs';

/**
 * @param {string} sessionId
 * @returns {string}
 */
const sanitizeLogSessionId = sessionId => {
  const safe = sessionId
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 120);
  return safe;
};

/**
 * @param {string} sessionId
 * @returns {string}
 */
const logFilePath = sessionId => {
  const safe = sanitizeLogSessionId(sessionId);
  if (!safe) {
    throw new Error('log file requires a non-empty session id');
  }
  return path.join(getLogsDir(), `${safe}.log`);
};

/**
 * @param {string} sessionId
 * @param {string} line
 */
const appendLogLine = (sessionId, line) => {
  if (!isProtocolDebugEnabled()) return;

  fs.mkdirSync(getLogsDir(), { recursive: true });

  const resolved = getLogSessionId(sessionId);
  if (resolved) {
    fs.appendFileSync(logFilePath(resolved), `${line}\n`, 'utf8');
    return;
  }

  fs.appendFileSync(path.join(getLogsDir(), 'latest.log'), `${line}\n`, 'utf8');
  console.error(
    '[ai-pet-helper] protocol-log: no session id; wrote to latest.log'
  );
};

/**
 * @param {object} options
 * @param {string} [options.sessionId]
 * @param {string} [options.hook]
 * @param {string} options.field
 * @param {string} options.value
 */
const appendHookLogEntry = ({ sessionId = '', hook, field, value }) => {
  if (!isProtocolDebugEnabled()) return;

  const at = new Date().toISOString();
  const hookName = hook || getActiveHook();
  appendLogLine(sessionId, `${at}\thook=${hookName}\t${field}=${value}`);
};

/**
 * @param {object} options
 * @param {string} options.url
 * @param {string} [options.sessionId]
 * @param {string} [options.hook]
 */
export const logProtocolActivation = ({ url, sessionId = '', hook }) => {
  appendHookLogEntry({ sessionId, hook, field: 'protocol', value: url });
};

/**
 * @param {object} options
 * @param {string} [options.sessionId]
 * @param {string} options.message
 * @param {string} [options.hook]
 */
export const logHookDiagnostic = ({ sessionId = '', message, hook }) => {
  appendHookLogEntry({ sessionId, hook, field: 'diagnostic', value: message });
};

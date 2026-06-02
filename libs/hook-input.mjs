/**
 * @module libs/hook-input
 * Read JSON hook payload from stdin when invoked by the host IDE.
 */
import fs from 'node:fs';
import path from 'node:path';

import { discoverRecentTranscript } from './transcript-discover.mjs';

const SESSION_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param {unknown[]} list
 * @returns {string}
 */
const pickFirstTrimmedString = list => {
  for (const item of list) {
    if (typeof item !== 'string') continue;

    const trimmed = item.trim();
    if (trimmed) return trimmed;
  }

  return '';
};

/**
 * Read piped stdin synchronously (reliable on Windows hook processes).
 * @returns {string}
 */
const readStdinSync = () => {
  if (process.stdin.isTTY) return '';

  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    //
  }

  return '';
};

/**
 * @returns {Promise<Record<string, unknown> | null>}
 */
export const readHookInput = async () => {
  const raw = readStdinSync().trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    //
  }

  return null;
};

/**
 * Claude/Cursor store the session id as the transcript jsonl basename.
 * @param {string | null | undefined} transcriptPath
 * @returns {string}
 */
export const sessionIdFromTranscriptPath = transcriptPath => {
  if (typeof transcriptPath !== 'string' || !transcriptPath.trim()) return '';

  const trimmed = transcriptPath.trim();
  const base =
    trimmed.includes('\\') && process.platform !== 'win32'
      ? path.win32.basename(trimmed, '.jsonl')
      : path.basename(trimmed, '.jsonl');
  return SESSION_UUID.test(base) ? base : '';
};

/**
 * @param {string | null | undefined} url
 * @returns {string}
 */
export const sessionIdFromTextProtocolUrl = url => {
  if (!url?.startsWith('aipet://')) return '';

  try {
    const parsed = new URL(url);
    const sid = parsed.searchParams.get('sid');
    return sid?.trim() || '';
  } catch {
    //
  }
  return '';
};

const getFormContent = input => {
  const content = input?.content;
  if (typeof content === 'string') return content;

  if (
    content &&
    typeof content === 'object' &&
    typeof content.text === 'string'
  )
    return content.text;

  return '';
};

/**
 * User prompt text from UserPromptSubmit / beforeSubmitPrompt hook stdin.
 * @param {Record<string, unknown> | null | undefined} input
 * @returns {string}
 */
export const resolveUserPromptText = input => {
  const fromContent = getFormContent(input);

  return pickFirstTrimmedString([
    input?.prompt,
    input?.user_message,
    input?.userMessage,
    input?.message,
    input?.text,
    fromContent
  ]);
};

export const resolveProjectCwd = (input, state = {}) => {
  const roots = input?.workspace_roots;
  const fromRoots =
    Array.isArray(roots) && typeof roots[0] === 'string' ? roots[0].trim() : '';

  const resolved = pickFirstTrimmedString([
    input?.cwd,
    input?.workspace,
    input?.workspace_root,
    input?.project_path,
    input?.projectPath,
    input?.working_directory,
    fromRoots,
    state.projectCwd,
    process.env.CLAUDE_PROJECT_DIR,
    process.env.CURSOR_WORKSPACE
  ]);

  return resolved ? path.resolve(resolved) : process.cwd();
};

/**
 * @param {string | undefined} transcriptPath
 * @returns {boolean}
 */
const isStaleCursorTranscriptForClaude = transcriptPath => {
  if (!transcriptPath?.trim()) return false;

  const inClaudeHost = Boolean(
    process.env.CLAUDE_PLUGIN_ROOT?.trim() ||
    process.env.CLAUDE_CODE_ENTRYPOINT?.trim()
  );
  if (!inClaudeHost) return false;

  return transcriptPath.replace(/\\/g, '/').includes('/.cursor/');
};

/**
 * @param {Record<string, unknown> | null | undefined} input
 * @param {Record<string, unknown>} [state]
 * @returns {string}
 */
export const resolveTranscriptPath = (input, state = {}) => {
  const projectCwd = resolveProjectCwd(input, state);
  const transcriptPath = String(state.transcriptPath || '').trim();
  const stateTranscript = !isStaleCursorTranscriptForClaude(transcriptPath)
    ? transcriptPath
    : '';

  const withoutDiscover = pickFirstTrimmedString([
    String(input?.transcript_path || '').trim(),
    stateTranscript,
    process.env.CLAUDE_TRANSCRIPT_PATH,
    process.env.CURSOR_TRANSCRIPT_PATH
  ]);
  if (withoutDiscover) return withoutDiscover;

  return discoverRecentTranscript(projectCwd).trim();
};

/**
 * @param {Record<string, unknown> | null | undefined} input
 * @param {Record<string, unknown>} [state]
 * @returns {string}
 */
export const resolveSessionId = (input, state = {}) => {
  const fromKnown = pickFirstTrimmedString([
    input?.session_id,
    input?.conversation_id,
    input?.sessionId,
    state.sessionId,
    sessionIdFromTranscriptPath(String(input?.transcript_path || '').trim()),
    sessionIdFromTranscriptPath(String(state.transcriptPath || '').trim())
  ]);
  if (fromKnown) return fromKnown;

  return sessionIdFromTranscriptPath(resolveTranscriptPath(input, state));
};

/**
 * Resolve session id for logging (hook runtime, state, text URL).
 * @param {object} [options]
 * @param {string} [options.explicit]
 * @param {string} [options.url]
 * @param {Record<string, unknown>} [options.state]
 * @returns {string}
 */
export const resolveLogSessionId = (options = {}) => {
  const { explicit, url, state = {} } = options;

  return pickFirstTrimmedString([
    explicit,
    sessionIdFromTextProtocolUrl(url),
    state.sessionId,
    sessionIdFromTranscriptPath(state.transcriptPath)
  ]);
};

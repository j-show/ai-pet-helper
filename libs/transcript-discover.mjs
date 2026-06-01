/**
 * @module libs/transcript-discover
 * Locate Claude/Cursor transcript jsonl when hook stdin omits `transcript_path`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expandHomePath } from './transcript.mjs';

/**
 * Cursor encodes `D:\github\jshow\ai-pet-helper` as `d-github-jshow-ai-pet-helper`.
 * @param {string} cwd
 * @returns {string}
 */
const cursorProjectDirName = cwd => {
  const resolved = path.resolve(cwd);

  if (process.platform === 'win32') {
    const match = /^([a-zA-Z]):[\\/]*(.*)$/.exec(resolved);
    if (match) {
      const drive = match[1].toLowerCase();
      const rest = match[2]
        .replace(/\\/g, '-')
        .replace(/\//g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return rest ? `${drive}-${rest}` : drive;
    }
  }

  return resolved
    .replace(/[/\\:]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * @param {string} cwd
 * @returns {string[]}
 */
const claudeProjectDirCandidates = cwd => {
  const resolved = path.resolve(cwd);
  const variants = new Set([
    resolved,
    resolved.replace(/\\/g, '/'),
    resolved.replace(/:/g, '-'),
    resolved.replace(/\\/g, '-').replace(/:/g, '-'),
    resolved
      .replace(/^[a-zA-Z]:/, letter => `${letter.toLowerCase()}-`)
      .replace(/\\/g, '-'),
    cursorProjectDirName(cwd)
  ]);

  return [...variants].map(value =>
    value
      .replace(/[/\\:]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  );
};

/**
 * @param {string} dir
 * @param {number} maxAgeMs
 * @param {string} [preferToken]
 * @returns {{ path: string, mtime: number, score: number }[]}
 */
const collectJsonlFiles = (dir, maxAgeMs, preferToken = '') => {
  /** @type {{ path: string, mtime: number, score: number }[]} */
  const found = [];
  const token = preferToken.toLowerCase();

  /** @param {string} current */
  const walk = current => {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      if (!entry.name.endsWith('.jsonl')) {
        continue;
      }

      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }

      if (Date.now() - stat.mtimeMs > maxAgeMs) {
        continue;
      }

      const lower = full.toLowerCase();
      let score = stat.mtimeMs;
      if (token && lower.includes(token)) {
        score += 1_000_000_000_000;
      }
      if (lower.includes('agent-transcripts')) {
        score += 500_000_000_000;
      }

      found.push({ path: full, mtime: stat.mtimeMs, score });
    }
  };

  walk(dir);
  return found;
};

/**
 * @param {string} root
 * @param {string} cwd
 * @param {number} maxAgeMs
 * @param {string} preferToken
 * @param {string[]} encodedDirs
 * @returns {{ path: string, mtime: number, score: number }[]}
 */
const collectFromProjectsRoot = (
  root,
  cwd,
  maxAgeMs,
  preferToken,
  encodedDirs
) => {
  if (!fs.existsSync(root)) {
    return [];
  }

  /** @type {{ path: string, mtime: number, score: number }[]} */
  let candidates = [];

  try {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (entry.name.toLowerCase().includes(preferToken.toLowerCase())) {
        candidates = candidates.concat(
          collectJsonlFiles(path.join(root, entry.name), maxAgeMs, preferToken)
        );
      }
    }
  } catch {
    // Ignore unreadable roots.
  }

  for (const encoded of encodedDirs) {
    const projectDir = path.join(root, encoded);
    const agentDir = path.join(projectDir, 'agent-transcripts');
    if (fs.existsSync(agentDir)) {
      candidates = candidates.concat(
        collectJsonlFiles(agentDir, maxAgeMs, preferToken)
      );
    }
    candidates = candidates.concat(
      collectJsonlFiles(projectDir, maxAgeMs, preferToken)
    );
  }

  if (candidates.length === 0) {
    candidates = collectJsonlFiles(root, maxAgeMs, preferToken);
  }

  if (candidates.length === 0) {
    candidates = collectJsonlFiles(root, Number.POSITIVE_INFINITY, preferToken);
  }

  return candidates;
};

/**
 * @param {string} [cwd]
 * @param {number} [maxAgeMs]
 * @returns {string}
 */
const discoverClaudeTranscript = (
  cwd = process.cwd(),
  maxAgeMs = 2 * 60 * 60 * 1000
) => {
  const root = path.join(os.homedir(), '.claude', 'projects');
  const preferToken = path.basename(cwd);
  const candidates = collectFromProjectsRoot(
    root,
    cwd,
    maxAgeMs,
    preferToken,
    claudeProjectDirCandidates(cwd)
  );

  candidates.sort((a, b) => b.score - a.score || b.mtime - a.mtime);
  const best = candidates[0]?.path ?? '';
  return best ? expandHomePath(best) : '';
};

/**
 * @param {string} [cwd]
 * @param {number} [maxAgeMs]
 * @returns {string}
 */
const discoverCursorTranscript = (
  cwd = process.cwd(),
  maxAgeMs = 2 * 60 * 60 * 1000
) => {
  const root = path.join(os.homedir(), '.cursor', 'projects');
  const preferToken = path.basename(cwd);
  const encoded = new Set([
    cursorProjectDirName(cwd),
    ...claudeProjectDirCandidates(cwd)
  ]);

  const candidates = collectFromProjectsRoot(root, cwd, maxAgeMs, preferToken, [
    ...encoded
  ]);

  candidates.sort((a, b) => b.score - a.score || b.mtime - a.mtime);
  const best = candidates[0]?.path ?? '';
  return best ? expandHomePath(best) : '';
};

/**
 * Find the most recently updated transcript jsonl for the current workspace.
 * @param {string} [cwd]
 * @param {number} [maxAgeMs]
 * @returns {string}
 */
/**
 * Prefer Claude transcripts when hooks run inside Claude Code (not Cursor).
 * @returns {boolean}
 */
const preferClaudeTranscripts = () => {
  return Boolean(
    process.env.CLAUDE_PLUGIN_ROOT?.trim() ||
    process.env.CLAUDE_CODE_ENTRYPOINT?.trim()
  );
};

/**
 * @param {string} [cwd]
 * @param {number} [maxAgeMs]
 * @returns {string}
 */
export const discoverRecentTranscript = (
  cwd = process.cwd(),
  maxAgeMs = 2 * 60 * 60 * 1000
) => {
  const claude = discoverClaudeTranscript(cwd, maxAgeMs);
  const cursor = discoverCursorTranscript(cwd, maxAgeMs);

  if (preferClaudeTranscripts()) {
    if (claude) {
      return claude;
    }
    return cursor;
  }

  if (cursor) {
    return cursor;
  }
  return claude;
};

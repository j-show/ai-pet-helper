/**
 * @module libs/install-plugin
 * Symlink ai-pet-helper into `~/.ai-pet` and register via Claude Code / Codex CLI.
 */
import { spawn } from 'node:child_process';
import { access, lstat, mkdir, readlink, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AI_PET_HOME, PLUGIN_INSTALL_DIR } from './paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** ai-pet-helper package root (parent of libs/). */
export const PACKAGE_ROOT = path.resolve(__dirname, '..');
/** Local marketplace root (`.claude-plugin/marketplace.json` at package root). */
export const MARKETPLACE_DIR = PACKAGE_ROOT;
export const MARKETPLACE_NAME = 'ai-pet-marketplace';
export const PLUGIN_NAME = 'ai-pet-helper';
export const PLUGIN_SELECTOR = `${PLUGIN_NAME}@${MARKETPLACE_NAME}`;
export const MARKETPLACE_PLUGIN_LINK = path.join(
  MARKETPLACE_DIR,
  'plugins',
  PLUGIN_NAME
);
export const USER_MARKETPLACE_DIR = path.join(
  AI_PET_HOME,
  'marketplace',
  MARKETPLACE_NAME
);

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} linkPath
 * @returns {Promise<string | null>}
 */
async function readSymlinkTarget(linkPath) {
  try {
    const stat = await lstat(linkPath);
    if (!stat.isSymbolicLink()) {
      return null;
    }
    return await readlink(linkPath);
  } catch {
    return null;
  }
}

/**
 * Create or replace a symlink at `linkPath` pointing at `targetPath`.
 * @param {string} linkPath
 * @param {string} targetPath
 * @returns {Promise<void>}
 */
export async function ensureSymlink(linkPath, targetPath) {
  const parent = path.dirname(linkPath);
  await mkdir(parent, { recursive: true });

  const existing = await readSymlinkTarget(linkPath);
  const resolvedTarget = path.resolve(targetPath);
  if (existing) {
    const resolvedExisting = path.resolve(path.dirname(linkPath), existing);
    if (resolvedExisting === resolvedTarget) {
      return;
    }
    await rm(linkPath, { force: true });
  } else if (await pathExists(linkPath)) {
    await rm(linkPath, { recursive: true, force: true });
  }

  await symlink(resolvedTarget, linkPath);
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<void>}
 */
async function runCommand(command, args, options = {}) {
  const printable = [command, ...args].join(' ');
  if (options.dryRun) {
    console.log(`[dry-run] ${printable}`);
    return;
  }

  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed (${code}): ${printable}`));
      }
    });
  });
}

/**
 * Run CLI step; ignore non-zero exit (marketplace/plugin may already exist).
 * @param {string} command
 * @param {string[]} args
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<void>}
 */
async function runCommandLenient(command, args, options = {}) {
  try {
    await runCommand(command, args, options);
  } catch (error) {
    if (!options.dryRun) {
      const printable = [command, ...args].join(' ');
      console.warn(`提示: 跳过（可能已安装）: ${printable}`);
      if (error instanceof Error && error.message) {
        console.warn(`  ${error.message}`);
      }
    }
  }
}

/**
 * @param {string} command
 * @returns {Promise<boolean>}
 */
async function commandExists(command) {
  return new Promise(resolve => {
    const child = spawn('command', ['-v', command], {
      stdio: 'ignore'
    });
    child.on('error', () => resolve(false));
    child.on('close', code => resolve(code === 0));
  });
}

/**
 * Register the local marketplace and install `ai-pet-helper@ai-pet-marketplace` for one host.
 * @param {'claude' | 'codex'} target
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<void>}
 * @throws {Error} When the required CLI (`claude` or `codex`) is not on PATH.
 */
export async function installForTarget(target, options = {}) {
  if (target === 'claude') {
    if (!(await commandExists('claude'))) {
      throw new Error(
        '未找到 `claude` 命令。请先安装 Claude Code CLI：https://code.claude.com/docs'
      );
    }
    await runCommandLenient(
      'claude',
      ['plugin', 'marketplace', 'add', USER_MARKETPLACE_DIR],
      options
    );
    await runCommandLenient(
      'claude',
      ['plugin', 'install', PLUGIN_SELECTOR],
      options
    );
    await runCommandLenient(
      'claude',
      ['plugin', 'enable', PLUGIN_SELECTOR],
      options
    );
    return;
  }

  if (!(await commandExists('codex'))) {
    throw new Error(
      '未找到 `codex` 命令。请先安装 Codex CLI 或 Codex 桌面应用。'
    );
  }
  await runCommandLenient(
    'codex',
    ['plugin', 'marketplace', 'add', USER_MARKETPLACE_DIR],
    options
  );
  await runCommandLenient('codex', ['plugin', 'add', PLUGIN_SELECTOR], options);
}

/**
 * Remove plugin and marketplace entries for one host (best-effort if CLI missing).
 * @param {'claude' | 'codex'} target
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<void>}
 */
export async function uninstallForTarget(target, options = {}) {
  if (target === 'claude') {
    if (await commandExists('claude')) {
      await runCommand(
        'claude',
        ['plugin', 'uninstall', PLUGIN_SELECTOR],
        options
      ).catch(() => {});
      await runCommand(
        'claude',
        ['plugin', 'marketplace', 'remove', MARKETPLACE_NAME],
        options
      ).catch(() => {});
    }
    return;
  }

  if (await commandExists('codex')) {
    await runCommand(
      'codex',
      ['plugin', 'remove', PLUGIN_SELECTOR],
      options
    ).catch(() => {});
    await runCommand(
      'codex',
      ['plugin', 'marketplace', 'remove', MARKETPLACE_NAME],
      options
    ).catch(() => {});
  }
}

/**
 * Symlink ai-pet-helper into `~/.ai-pet` and install via Claude Code / Codex CLI.
 * @param {object} [options]
 * @param {'claude' | 'codex' | 'all'} [options.target] Host(s) to configure; default `all`.
 * @param {string} [options.source] Absolute path to ai-pet-helper package root.
 * @param {boolean} [options.uninstall] Remove symlinks and uninstall from CLIs.
 * @param {boolean} [options.dryRun] Print planned symlinks and commands only.
 * @returns {Promise<void>}
 * @throws {Error} When a selected host CLI is missing (install mode only).
 */
export async function installPlugin(options = {}) {
  const target = options.target ?? 'all';
  const sourceRoot = path.resolve(options.source ?? PACKAGE_ROOT);
  const dryRun = options.dryRun ?? false;

  if (options.uninstall) {
    const targets =
      target === 'all' ? ['claude', 'codex'] : [/** @type {const} */ (target)];
    for (const item of targets) {
      await uninstallForTarget(item, { dryRun });
    }
    if (!dryRun) {
      await rm(PLUGIN_INSTALL_DIR, { force: true });
      await rm(USER_MARKETPLACE_DIR, { recursive: true, force: true });
      await rm(MARKETPLACE_PLUGIN_LINK, { force: true });
    }
    console.log('已卸载 ai-pet-helper 插件配置。');
    return;
  }

  await mkdir(AI_PET_HOME, { recursive: true });
  if (!dryRun) {
    await ensureSymlink(PLUGIN_INSTALL_DIR, sourceRoot);
    await ensureSymlink(MARKETPLACE_PLUGIN_LINK, sourceRoot);
    await ensureSymlink(USER_MARKETPLACE_DIR, MARKETPLACE_DIR);
  } else {
    console.log(`[dry-run] symlink ${PLUGIN_INSTALL_DIR} -> ${sourceRoot}`);
    console.log(
      `[dry-run] symlink ${MARKETPLACE_PLUGIN_LINK} -> ${sourceRoot}`
    );
    console.log(
      `[dry-run] symlink ${USER_MARKETPLACE_DIR} -> ${MARKETPLACE_DIR}`
    );
  }

  const targets =
    target === 'all' ? ['claude', 'codex'] : [/** @type {const} */ (target)];

  for (const item of targets) {
    await installForTarget(item, { dryRun });
  }

  console.log('');
  console.log('ai-pet-helper 已配置：');
  console.log(`  插件目录: ${PLUGIN_INSTALL_DIR}`);
  console.log(`  市场目录: ${USER_MARKETPLACE_DIR}`);
  console.log(`  插件 ID:  ${PLUGIN_SELECTOR}`);
  if (targets.includes('codex')) {
    console.log('  Codex: 请重启 Codex 使 hooks 生效。');
  }
  if (targets.includes('claude')) {
    console.log('  Claude Code: 新开一次会话或重启 CLI 使 hooks 生效。');
  }
}

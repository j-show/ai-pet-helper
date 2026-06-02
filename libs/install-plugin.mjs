/**
 * @module libs/install-plugin
 * Symlink ai-pet-helper into `~/.ai-pet` and register via Claude Code / Codex CLI.
 */
import { spawn } from 'node:child_process';
import {
  access,
  lstat,
  mkdir,
  readlink,
  realpath,
  rm,
  symlink
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAiPetHome, getPluginInstallDir } from './paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** ai-pet-helper package root (parent of libs/). */
export const PACKAGE_ROOT = path.resolve(__dirname, '..');
/** Local marketplace root (`.claude-plugin/marketplace.json` at package root). */
export const MARKETPLACE_DIR = PACKAGE_ROOT;
export const MARKETPLACE_NAME = 'ai-pet-marketplace';
export const PLUGIN_NAME = 'ai-pet-helper';
export const PLUGIN_SELECTOR = `${PLUGIN_NAME}@${MARKETPLACE_NAME}`;

export const USER_MARKETPLACE_DIR = path.join(
  getAiPetHome(),
  'marketplace',
  MARKETPLACE_NAME
);

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
const pathExists = async filePath => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * @param {string} linkPath
 * @returns {Promise<string | null>}
 */
const readSymlinkTarget = async linkPath => {
  try {
    const stat = await lstat(linkPath);
    if (!stat.isSymbolicLink()) return null;

    return await readlink(linkPath);
  } catch {
    return null;
  }
};

/**
 * @param {string} linkPath
 * @param {string} targetPath
 * @returns {Promise<void>}
 */
const runMklinkJunction = async (linkPath, targetPath) => {
  await new Promise((resolve, reject) => {
    const child = spawn(
      'cmd.exe',
      ['/d', '/s', '/c', 'mklink', '/J', linkPath, targetPath],
      { stdio: 'pipe', windowsHide: true }
    );
    let stderr = '';
    child.stderr?.on('data', chunk => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          stderr.trim() ||
            `mklink /J failed with exit code ${code ?? 'unknown'}`
        )
      );
    });
  });
};

/**
 * @param {unknown[]} errors
 * @param {string} targetPath
 * @param {string} linkPath
 * @returns {string}
 */
const formatWindowsLinkError = (errors, targetPath, linkPath) => {
  const detail = errors
    .map(error => (error instanceof Error ? error.message : String(error)))
    .filter(Boolean)
    .join('; ');

  return [
    `无法在 Windows 上创建目录链接: ${linkPath} -> ${targetPath}`,
    detail,
    '',
    '可选方案：',
    '  1. 设置 → 隐私和安全性 → 开发者选项 → 开启“开发人员模式”（推荐）',
    '  2. 以管理员身份运行终端后重试',
    '  3. 使用 Claude 临时加载：claude --plugin-dir "' + targetPath + '"',
    '  4. 手动创建目录联接：mklink /J "' + linkPath + '" "' + targetPath + '"'
  ].join('\n');
};

/**
 * @param {string} targetPath Absolute directory target.
 * @param {string} linkPath Absolute junction/symlink path.
 * @returns {Promise<void>}
 */
const createDirectoryLink = async (targetPath, linkPath) => {
  if (process.platform !== 'win32') {
    await symlink(targetPath, linkPath);
    return;
  }

  /** @type {unknown[]} */
  const errors = [];

  for (const type of ['junction', 'dir']) {
    try {
      await symlink(targetPath, linkPath, type);
      return;
    } catch (error) {
      errors.push(error);
      if (await pathExists(linkPath)) {
        await rm(linkPath, { recursive: true, force: true });
      }
    }
  }

  try {
    await runMklinkJunction(linkPath, targetPath);
    return;
  } catch (error) {
    errors.push(error);
    if (await pathExists(linkPath)) {
      await rm(linkPath, { recursive: true, force: true });
    }
  }

  throw new Error(formatWindowsLinkError(errors, targetPath, linkPath));
};

/**
 * Create or replace a directory link at `linkPath` pointing at `targetPath`.
 * On Windows uses junction / `mklink /J` when symlinks are not permitted.
 * @param {string} linkPath
 * @param {string} targetPath
 * @returns {Promise<void>}
 */
export const ensureSymlink = async (linkPath, targetPath) => {
  const parent = path.dirname(linkPath);
  await mkdir(parent, { recursive: true });

  const resolvedTarget = path.resolve(targetPath);

  if (await pathExists(linkPath)) {
    const existing = await readSymlinkTarget(linkPath);
    if (existing) {
      const resolvedExisting = path.resolve(path.dirname(linkPath), existing);
      if (resolvedExisting === resolvedTarget) {
        return;
      }
    } else {
      try {
        const resolvedExisting = await realpath(linkPath);
        if (path.resolve(resolvedExisting) === resolvedTarget) {
          return;
        }
      } catch {
        // Replace broken or mismatched link below.
      }
    }
    await rm(linkPath, { recursive: true, force: true });
  }

  await createDirectoryLink(resolvedTarget, path.resolve(linkPath));
};

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<void>}
 */
/**
 * @param {string} command
 * @param {string[]} args
 * @returns {{ executable: string; args: string[]; shell: boolean }}
 */
const spawnSpecForCommand = (command, args) => {
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(command)) {
    return {
      executable: 'cmd.exe',
      args: ['/d', '/s', '/c', command, ...args],
      shell: false
    };
  }

  return { executable: command, args, shell: false };
};

/**
 * Run CLI step; ignore non-zero exit (marketplace/plugin may already exist).
 * @param {string} command
 * @param {string[]} args
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<void>}
 */
/**
 * @param {string} output
 * @returns {boolean}
 */
const isBenignClaudePluginMessage = output => {
  return /already enabled|already installed|already on disk/i.test(output);
};

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{ ok: boolean; output: string }>}
 */
const runCommandCapture = async (command, args, options = {}) => {
  const printable = [command, ...args].join(' ');
  if (options.dryRun) {
    console.log(`[dry-run] ${printable}`);
    return { ok: true, output: '' };
  }

  const spec = spawnSpecForCommand(command, args);

  return new Promise((resolve, reject) => {
    let output = '';
    const child = spawn(spec.executable, spec.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      shell: spec.shell,
      windowsHide: true
    });
    child.stdout?.on('data', chunk => {
      const text = String(chunk);
      output += text;
      process.stdout.write(text);
    });
    child.stderr?.on('data', chunk => {
      const text = String(chunk);
      output += text;
      process.stderr.write(text);
    });
    child.on('error', reject);
    child.on('close', code => {
      resolve({ ok: code === 0, output });
    });
  });
};

const runCommandLenient = async (command, args, options = {}) => {
  try {
    const result = await runCommandCapture(command, args, options);
    if (!result.ok && !isBenignClaudePluginMessage(result.output)) {
      throw new Error(`Command failed: ${[command, ...args].join(' ')}`);
    }
  } catch (error) {
    if (!options.dryRun) {
      const printable = [command, ...args].join(' ');
      console.warn(`提示: 跳过（可能已安装）: ${printable}`);
      if (error instanceof Error && error.message) {
        console.warn(`  ${error.message}`);
      }
    }
  }
};

/**
 * @param {string} command
 * @returns {Promise<string[]>}
 */
const whereExecutable = async command => {
  if (process.platform === 'win32') {
    return new Promise(resolve => {
      const child = spawn('where.exe', [command], {
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true
      });
      let stdout = '';
      child.stdout?.on('data', chunk => {
        stdout += String(chunk);
      });
      child.on('error', () => resolve([]));
      child.on('close', code => {
        if (code !== 0) {
          resolve([]);
          return;
        }
        resolve(
          stdout
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
        );
      });
    });
  }

  return new Promise(resolve => {
    const child = spawn('command', ['-v', command], {
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: true
    });
    let stdout = '';
    child.stdout?.on('data', chunk => {
      stdout += String(chunk);
    });
    child.on('error', () => resolve([]));
    child.on('close', code => {
      const found = stdout.trim().split(/\r?\n/)[0];
      resolve(code === 0 && found ? [found] : []);
    });
  });
};

/**
 * Resolve CLI executable (prefers Windows `.cmd` npm shims).
 * @param {string} command
 * @returns {Promise<string | null>}
 */
export const findCommand = async command => {
  const paths = await whereExecutable(command);
  if (paths.length === 0) {
    return null;
  }

  if (process.platform === 'win32') {
    const cmdShim = paths.find(entry => /\.cmd$/i.test(entry));
    if (cmdShim) {
      return cmdShim;
    }
    const exe = paths.find(entry => /\.exe$/i.test(entry));
    if (exe) {
      return exe;
    }
  }

  return paths[0];
};

/**
 * @param {string} sourceRoot
 */
const printClaudePluginInstallEpermHelp = sourceRoot => {
  console.warn('');
  console.warn(
    'Claude `plugin install` 在 Windows 上因符号链接权限失败（常见于未开启开发人员模式）。'
  );
  console.warn('若下方已显示插件 enabled，可直接重启 Claude Code 使用。');
  console.warn('');
  console.warn('可选方案：');
  console.warn('  1. 设置 → 隐私和安全性 → 开发人员模式 → 开启后重试 install');
  console.warn('  2. 临时加载（推荐开发调试）：');
  console.warn(`     claude --plugin-dir "${sourceRoot}"`);
  console.warn('');
};

/**
 * @param {string} sourceRoot
 */
const printClaudeCliMissingHelp = sourceRoot => {
  console.warn('');
  console.warn('未在 PATH 中找到 `claude` CLI，已跳过 marketplace 注册。');
  console.warn('目录联接若已创建，可任选其一完成安装：');
  console.warn('');
  console.warn('  1. 将 npm 全局目录加入 PATH 后重试：');
  console.warn('     export PATH="$PATH:$APPDATA/npm"   # Git Bash');
  console.warn('     node scripts/install-plugin.mjs --claude');
  console.warn('');
  console.warn('  2. 使用完整路径注册（示例）：');
  console.warn(
    '     "$APPDATA/npm/claude.cmd" plugin marketplace add "$USERPROFILE/.ai-pet/marketplace/ai-pet-marketplace"'
  );
  console.warn(
    `     "$APPDATA/npm/claude.cmd" plugin install ${PLUGIN_SELECTOR}`
  );
  console.warn(
    `     "$APPDATA/npm/claude.cmd" plugin enable ${PLUGIN_SELECTOR}`
  );
  console.warn('');
  console.warn('  3. 临时加载（无需 marketplace 注册）：');
  console.warn(`     claude --plugin-dir "${sourceRoot}"`);
  console.warn('');
};

/**
 * Register the local marketplace and install `ai-pet-helper@ai-pet-marketplace` for one host.
 * @param {'claude' | 'codex'} target
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<void>}
 * @throws {Error} When the required CLI (`claude` or `codex`) is not on PATH.
 */
export const installForTarget = async (target, options = {}) => {
  const sourceRoot = path.resolve(options.source ?? PACKAGE_ROOT);

  if (target === 'claude') {
    const claudeCmd = await findCommand('claude');
    if (!claudeCmd) {
      printClaudeCliMissingHelp(sourceRoot);
      return;
    }

    await runCommandLenient(
      claudeCmd,
      ['plugin', 'marketplace', 'add', USER_MARKETPLACE_DIR],
      options
    );

    const installResult = await runCommandCapture(
      claudeCmd,
      ['plugin', 'install', PLUGIN_SELECTOR],
      options
    );
    if (
      !installResult.ok &&
      !isBenignClaudePluginMessage(installResult.output)
    ) {
      printClaudePluginInstallEpermHelp(sourceRoot);
    }

    await runCommandLenient(
      claudeCmd,
      ['plugin', 'enable', PLUGIN_SELECTOR],
      options
    );
    return;
  }

  const codexCmd = await findCommand('codex');
  if (!codexCmd) {
    console.warn('');
    console.warn(
      '未在 PATH 中找到 `codex` 命令，已跳过 Codex 注册。请安装 Codex CLI 后重试。'
    );
    console.warn('');
    return;
  }
  await runCommandLenient(
    codexCmd,
    ['plugin', 'marketplace', 'add', USER_MARKETPLACE_DIR],
    options
  );
  await runCommandLenient(
    codexCmd,
    ['plugin', 'add', PLUGIN_SELECTOR],
    options
  );
};

/**
 * Remove plugin and marketplace entries for one host (best-effort if CLI missing).
 * @param {'claude' | 'codex'} target
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<void>}
 */
export const uninstallForTarget = async (target, options = {}) => {
  if (target === 'claude') {
    const claudeCmd = await findCommand('claude');
    if (!claudeCmd) {
      console.warn('未找到 `claude` CLI，已跳过 Claude 插件卸载。');
      return;
    }
    await runCommandLenient(
      claudeCmd,
      ['plugin', 'uninstall', PLUGIN_SELECTOR],
      options
    );
    await runCommandLenient(
      claudeCmd,
      ['plugin', 'marketplace', 'remove', MARKETPLACE_NAME],
      options
    );
    return;
  }

  const codexCmd = await findCommand('codex');
  if (!codexCmd) {
    console.warn('未找到 `codex` CLI，已跳过 Codex 插件卸载。');
    return;
  }
  await runCommandLenient(
    codexCmd,
    ['plugin', 'remove', PLUGIN_SELECTOR],
    options
  );
  await runCommandLenient(
    codexCmd,
    ['plugin', 'marketplace', 'remove', MARKETPLACE_NAME],
    options
  );
};

/**
 * Remove directory links under `~/.ai-pet` and unregister from Claude Code / Codex CLI.
 * @param {object} [options]
 * @param {'claude' | 'codex' | 'all'} [options.target] Host(s) to uninstall; default `all`.
 * @param {boolean} [options.dryRun] Print planned steps only.
 * @param {boolean} [options.linksOnly] Only remove `~/.ai-pet` links; skip CLI uninstall.
 * @returns {Promise<void>}
 */
export const removePlugin = async (options = {}) => {
  const target = options.target ?? 'all';
  const dryRun = options.dryRun ?? false;
  const linksOnly = options.linksOnly ?? false;
  const targets =
    target === 'all' ? ['claude', 'codex'] : [/** @type {const} */ (target)];

  const linkPaths = [getPluginInstallDir(), USER_MARKETPLACE_DIR];

  if (dryRun) {
    if (!linksOnly) {
      for (const item of targets) {
        if (item === 'claude') {
          console.log(`[dry-run] claude plugin uninstall ${PLUGIN_SELECTOR}`);
          console.log(
            `[dry-run] claude plugin marketplace remove ${MARKETPLACE_NAME}`
          );
        } else {
          console.log(`[dry-run] codex plugin remove ${PLUGIN_SELECTOR}`);
          console.log(
            `[dry-run] codex plugin marketplace remove ${MARKETPLACE_NAME}`
          );
        }
      }
    } else {
      console.log('已跳过 CLI 卸载（--links-only）。');
    }
    for (const linkPath of linkPaths) {
      console.log(`[dry-run] rm ${linkPath}`);
    }
    return;
  }

  if (!linksOnly) {
    for (const item of targets) {
      await uninstallForTarget(item, { dryRun });
    }
  }

  for (const linkPath of linkPaths) {
    await rm(linkPath, { recursive: true, force: true });
  }

  console.log('');
  console.log('ai-pet-helper 已卸载：');
  console.log(`  已移除联接: ${getPluginInstallDir()}`);
  console.log(`  已移除市场: ${USER_MARKETPLACE_DIR}`);
  if (!linksOnly) {
    if (targets.includes('claude')) {
      console.log('  Claude Code: 重启 CLI 或新开会话后生效。');
    }
    if (targets.includes('codex')) {
      console.log('  Codex: 请重启应用使 hooks 失效。');
    }
  }
};

/**
 * Symlink ai-pet-helper into `~/.ai-pet` and install via Claude Code / Codex CLI.
 * @param {object} [options]
 * @param {'claude' | 'codex' | 'all'} [options.target] Host(s) to configure; default `all`.
 * @param {string} [options.source] Absolute path to ai-pet-helper package root.
 * @param {boolean} [options.uninstall] Remove symlinks and uninstall from CLIs.
 * @param {boolean} [options.dryRun] Print planned symlinks and commands only.
 * @param {boolean} [options.linkOnly] Only create `~/.ai-pet` directory links; skip CLI registration.
 * @returns {Promise<void>}
 */
export const installPlugin = async (options = {}) => {
  const target = options.target ?? 'all';
  const sourceRoot = path.resolve(options.source ?? PACKAGE_ROOT);
  const dryRun = options.dryRun ?? false;
  const linkOnly = options.linkOnly ?? false;

  if (options.uninstall) {
    await removePlugin({ target, dryRun, linksOnly: linkOnly });
    return;
  }

  await mkdir(getAiPetHome(), { recursive: true });
  if (!dryRun) {
    await ensureSymlink(getPluginInstallDir(), sourceRoot);
    await ensureSymlink(USER_MARKETPLACE_DIR, MARKETPLACE_DIR);
  } else {
    console.log(`[dry-run] symlink ${getPluginInstallDir()} -> ${sourceRoot}`);
    console.log(
      `[dry-run] symlink ${USER_MARKETPLACE_DIR} -> ${MARKETPLACE_DIR}`
    );
  }

  const targets =
    target === 'all' ? ['claude', 'codex'] : [/** @type {const} */ (target)];

  if (!linkOnly) {
    for (const item of targets) {
      await installForTarget(item, { dryRun, source: sourceRoot });
    }
  } else {
    console.log('已跳过 CLI 注册（--link-only）。');
  }

  console.log('');
  console.log('ai-pet-helper 已配置：');
  console.log(`  插件目录: ${getPluginInstallDir()}`);
  console.log(`  市场目录: ${USER_MARKETPLACE_DIR}`);
  console.log(`  插件 ID:  ${PLUGIN_SELECTOR}`);
  if (targets.includes('codex')) {
    console.log('  Codex: 请重启 Codex 使 hooks 生效。');
  }
  if (targets.includes('claude')) {
    console.log('  Claude Code: 新开一次会话或重启 CLI 使 hooks 生效。');
    console.log(
      '  若 plugin install 报 EPERM：先 `pnpm build` 后重试，或 `claude --plugin-dir` 临时加载。'
    );
  }
};

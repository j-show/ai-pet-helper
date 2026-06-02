#!/usr/bin/env node
/**
 * CLI: symlink ai-pet-helper into `~/.ai-pet` and register with Claude Code / Codex.
 * @module scripts/plugin
 */
import { installPlugin } from '../libs/install-plugin.mjs';

/** @returns {void} */
const printUsage = () => {
  console.error(`Usage: node scripts/plugin.mjs [options]

在未上架官方市场时，将 ai-pet-helper 注册为本地插件并安装到 Claude Code / Codex。

Options:
  --claude          仅安装到 Claude Code
  --codex           仅安装到 Codex
  --all             安装到两者（默认）
  --source <path>   ai-pet-helper 源码目录（默认：本包根目录）
  --uninstall       卸载（等同 pnpm remove-plugin）
  --dry-run         只打印将执行的步骤
  --link-only       仅创建 ~/.ai-pet 目录联接，不调用 claude/codex CLI
  -h, --help        显示帮助

示例:
  node scripts/plugin.mjs
  node scripts/plugin.mjs --codex
  node scripts/plugin.mjs --source "$(pwd)" --dry-run
  node scripts/plugin.mjs --uninstall
`);
};

/**
 * @param {string[]} argv
 * @returns {{ target: 'claude' | 'codex' | 'all'; source?: string; uninstall: boolean; dryRun: boolean; linkOnly: boolean }}
 */
const parseArgs = argv => {
  /** @type {'claude' | 'codex' | 'all'} */
  let target = 'all';
  let source;
  let uninstall = false;
  let dryRun = false;
  let linkOnly = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--claude') {
      target = 'claude';
      continue;
    }
    if (arg === '--codex') {
      target = 'codex';
      continue;
    }
    if (arg === '--all') {
      target = 'all';
      continue;
    }
    if (arg === '--uninstall') {
      uninstall = true;
      continue;
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--link-only') {
      linkOnly = true;
      continue;
    }
    if (arg === '--source') {
      source = argv[i + 1];
      if (!source) {
        throw new Error('--source 需要路径参数');
      }
      i += 1;
      continue;
    }
    throw new Error(`未知参数: ${arg}`);
  }

  return { target, source, uninstall, dryRun, linkOnly };
};

try {
  const options = parseArgs(process.argv.slice(2));
  await installPlugin(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

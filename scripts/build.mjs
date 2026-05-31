/**
 * 构建脚本：以仓库根目录的 `package.json` 为单一事实来源，将名称、版本、描述、作者等元数据
 * 同步写入各 IDE/助手的插件清单（Claude、Codex、Cursor），避免多处手改不一致。
 *
 * 运行方式：`npm run build`（由 `package.json` 的 `scripts.build` 调用）。
 *
 * 入口在文件末尾：先 `getPkg()` 规范化根 `package.json`，再依次更新各 harness 清单；各 `update*` 彼此独立，
 * 单文件失败时仅 `console.error`，不中断其它清单写入。
 *
 * @module scripts/build
 */

import fs from 'fs';
import path from 'path';

/** 仓库根目录（当前工作目录的绝对路径）。构建假定在仓库根执行 `npm run build`。 */
const rootDir = path.resolve(process.cwd());

/**
 * 读取并解析 JSON 文件。
 *
 * @param {string} fn 文件系统路径
 * @returns {unknown} 解析后的 JSON 值
 * @throws {Error} 文件不存在、非 UTF-8 或 JSON 语法错误时由 `fs` / `JSON.parse` 抛出
 */
const readJson = fn => {
  const raw = fs.readFileSync(fn, 'utf-8');
  return JSON.parse(raw);
};

/**
 * 将数据以固定缩进（2 空格）写回 JSON 文件，便于 diff 稳定、与仓库内其它 JSON 风格一致。
 *
 * @param {string} fn 目标文件路径
 * @param {unknown} data 可 `JSON.stringify` 的值
 * @throws {Error} 写入失败时由 `fs` 抛出
 */
const saveJson = (fn, data) => {
  const value = JSON.stringify(data, null, 2);
  fs.writeFileSync(fn, value, 'utf-8');
};

/**
 * 读取根目录 `package.json`（不在构建时写回，避免无意义 diff）。
 *
 * @returns {Record<string, unknown>} 解析后的 `package.json` 对象
 */
const getPkg = () => {
  const fn = path.join(rootDir, 'package.json');
  return readJson(fn);
};

/**
 * 将 `package.json` 中的核心元数据写入 `.claude-plugin/plugin.json`。
 *
 * @param {Record<string, unknown>} pkg 根目录 `package.json` 解析结果；需含 `name`、`description`、`version`、`author`、`homepage`、`repository`、`license`
 * @returns {void}
 * @remarks 读/写或 JSON 结构异常时捕获并 `console.error`，不向调用方抛出，以便继续更新其它清单。
 */
const updateClaudePlugin = pkg => {
  const fn = path.join(rootDir, '.claude-plugin', 'plugin.json');
  try {
    const json = readJson(fn);

    json.name = pkg.name;
    json.description = pkg.description;
    json.version = pkg.version;
    json.author = {
      name: pkg.author.name,
      email: pkg.author.email
    };
    json.homepage = pkg.homepage;
    json.repository = pkg.repository.url;
    json.license = pkg.license;

    saveJson(fn, json);

    console.log(`Updated: ${fn}`);
  } catch (e) {
    console.error(`Failed to update ${fn}:`, e);
  }
};

/**
 * 更新 `.claude-plugin/marketplace.json`：顶层 `name` 固定为 `ai-pet-marketplace`，描述带「开发市场」前缀；
 * 具体插件条目取 `plugins[0]`（约定仓库内仅注册一个插件）。
 *
 * @param {Record<string, unknown>} pkg 根目录 `package.json` 解析结果
 * @returns {void}
 * @remarks 与 `updateClaudePlugin` 相同：失败仅记录日志，不抛出。
 */
const updateClaudeMarketplace = pkg => {
  const fn = path.join(rootDir, '.claude-plugin', 'marketplace.json');
  try {
    const json = readJson(fn);

    json.name = `ai-pet-marketplace`;
    json.description = `Development marketplace for ${pkg.description}`;
    json.owner = {
      name: pkg.author.name,
      email: pkg.author.email
    };

    // 与当前仓库结构一致：仅维护 marketplace 中第一个（且唯一）插件条目
    const plugin = json.plugins[0];

    plugin.name = pkg.name;
    plugin.description = pkg.description;
    plugin.version = pkg.version;
    plugin.author = {
      name: pkg.author.name,
      email: pkg.author.email
    };

    saveJson(fn, json);

    console.log(`Updated: ${fn}`);
  } catch (e) {
    console.error(`Failed to update ${fn}:`, e);
  }
};

/**
 * 将元数据与 Codex 插件 `interface` 展示字段同步到 `.codex-plugin/plugin.json`。
 * `skills`、`interface` 中未映射的字段（如图标路径、条款链接等）保留磁盘原值。
 *
 * @param {Record<string, unknown>} pkg 根目录 `package.json`；需含 `displayName`、`shortDescription` 等
 * @returns {void}
 * @remarks 失败仅 `console.error`，不抛出。
 */
const updateCodexPlugin = pkg => {
  const fn = path.join(rootDir, '.codex-plugin', 'plugin.json');
  try {
    const json = readJson(fn);

    json.name = pkg.name;
    json.version = pkg.version;
    json.description = pkg.description;
    json.author = {
      name: pkg.author.name,
      email: pkg.author.email
    };
    json.homepage = pkg.homepage;
    json.repository = pkg.repository.url;
    json.license = pkg.license;

    json.interface.displayName = pkg.displayName;
    json.interface.shortDescription = pkg.shortDescription;
    json.interface.longDescription = pkg.description;
    json.interface.developerName = pkg.author.name;
    json.interface.websiteURL = pkg.homepage;

    saveJson(fn, json);

    console.log(`Updated: ${fn}`);
  } catch (e) {
    console.error(`Failed to update ${fn}:`, e);
  }
};

/**
 * 将元数据同步到 `.cursor-plugin/plugin.json`（Cursor 插件清单）。
 *
 * @param {Record<string, unknown>} pkg 根目录 `package.json` 解析结果
 * @returns {void}
 * @remarks 失败仅 `console.error`，不抛出。
 */
const updateCursorPlugin = pkg => {
  const fn = path.join(rootDir, '.cursor-plugin', 'plugin.json');
  try {
    const json = readJson(fn);

    json.name = pkg.name;
    json.displayName = pkg.displayName;
    json.description = pkg.description;
    json.version = pkg.version;
    json.author = {
      name: pkg.author.name,
      email: pkg.author.email
    };
    json.homepage = pkg.homepage;
    json.repository = pkg.repository.url;
    json.license = pkg.license;

    saveJson(fn, json);

    console.log(`Updated: ${fn}`);
  } catch (e) {
    console.error(`Failed to update ${fn}:`, e);
  }
};

// 单一入口：先规范化 package.json，再同步各 harness；顺序无硬依赖，仅便于日志阅读。
const pkg = getPkg();

updateClaudePlugin(pkg);
updateClaudeMarketplace(pkg);
updateCodexPlugin(pkg);
updateCursorPlugin(pkg);

console.log();
console.log('Build done');

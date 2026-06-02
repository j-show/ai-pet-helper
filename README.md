# ai-pet-helper

将 **AI Pet** 桌面宠物与 **Claude Code** / **Codex** / **Cursor** 的 agent 生命周期同步，通过 `aipet://` 协议自动切换动画。

## 前置条件

1. 已安装并运行 [AI Pet](https://github.com/j-show/ai-pet)（在 ai-pet 仓库内 `pnpm pet:dev`，或使用构建后的应用）
2. Node.js **≥ 22**（见 `package.json` 的 `engines`；hook 由 `node` 执行）

## 动画映射

| 阶段        | 触发时机                                  | 协议                                                                                |
| ----------- | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| 用户提问    | `UserPromptSubmit`                        | 顺序：`aipet://running?default=true` → `aipet://waving?count=1` → `aipet://waiting` |
| 等待响应    | 同上（waving 后自动）                     | `aipet://waiting`                                                                   |
| AI 开始工作 | 首次 `PreToolUse`（waiting 阶段）         | `aipet://jumping?count=1`                                                           |
| 代码审查    | `SubagentStart`（code-reviewer / review） | `aipet://review`                                                                    |
| 失败        | `StopFailure` / `PostToolUseFailure`      | `aipet://failed?count=3`                                                            |
| 任务结束    | `Stop` / `SessionEnd` / `TaskCompleted`   | `aipet://text?tl={SESSION_TITLE}&txt={SUMMARY}&sid={SESSION_ID}`（本次回复摘要，最多 50 字），随后 `aipet://base` |

`text` 协议会在两类时机触发：输出过程中由 `on-agent-response.mjs` 按增量更新（Cursor `afterAgentResponse` / Claude `MessageDisplay`）；任务结束时由 `on-base.mjs` 发送最终摘要并恢复 `base`（先 `text` 后 `base`）。`tl` 取自用户首次提问（`on-user-prompt.mjs` 写入 `sessionTitle`），`sid` 为会话 `sessionId`，`txt` 为助手回复动态摘要（最多 50 字符，中文按 1 字计）。回复文本按 hook 字段 → 状态缓存 → transcript 解析；`sessionId` / `transcriptPath` / `sessionTitle` 持久化在 `~/.ai-pet/plugin-state.json`。

### Cursor 事件对应（`hooks/hooks-cursor.json`）

| Claude / Codex | Cursor | 脚本 |
| --- | --- | --- |
| `UserPromptSubmit` | `beforeSubmitPrompt` | `utils/on-user-prompt.mjs` |
| `SessionStart` | — | `utils/on-session-start.mjs` |
| `PreToolUse` | `preToolUse` | `utils/on-state-switch.mjs` |
| `SubagentStart`（review） | `subagentStart` | `utils/on-review.mjs` |
| `PostToolUseFailure` | `postToolUseFailure` | `utils/on-failed.mjs` |
| `MessageDisplay` | — | `utils/on-agent-response.mjs` |
| — | `afterAgentResponse` | `utils/on-agent-response.mjs` |
| `Stop` / `TaskCompleted` | `stop` | `utils/on-base.mjs` |
| `SessionEnd` | `sessionEnd` | `utils/on-base.mjs` |

Cursor 无 `StopFailure` 独立事件；工具失败由 `postToolUseFailure` 触发 `on-failed.mjs`。命令路径相对插件根目录。

## 安装（未上架市场，需手动安装）

在本仓库根目录：

```bash
node scripts/install-plugin.mjs              # Claude Code + Codex（默认）
node scripts/install-plugin.mjs --claude     # 仅 Claude Code
node scripts/install-plugin.mjs --codex      # 仅 Codex
pnpm install-plugin                          # 同上（package.json script）
```

**Windows**：若出现 `EPERM` 无法创建符号链接，安装脚本会自动尝试目录联接（`junction` / `mklink /J`）。仍失败时可开启系统「开发人员模式」，或以管理员运行终端。

`claude plugin install` 若因 `EPERM` 失败，多为 Claude 在缓存里复制了带 `node_modules` 的完整仓库。可重启 Claude 使用（若已 `enabled`），或开发时用 `claude --plugin-dir /path/to/ai-pet-helper` 临时加载。

`install-plugin` 会：

1. 将本包链接到 `~/.ai-pet/plugins/ai-pet-helper`（Unix 为符号链接，Windows 为联接）
2. 注册本地市场 `ai-pet-marketplace`（`~/.ai-pet/marketplace/ai-pet-marketplace` → 本包根目录，含 `.claude-plugin/marketplace.json`）
3. 调用 `claude` / `codex` CLI 安装并启用 `ai-pet-helper@ai-pet-marketplace`

预览步骤、卸载：

```bash
node scripts/install-plugin.mjs --dry-run
node scripts/install-plugin.mjs --uninstall    # 卸载（install 的逆操作）
node scripts/install-plugin.mjs --uninstall --claude
pnpm remove-plugin                             # 同上（转发至 install-plugin --uninstall）
```

构建（同步各 IDE 插件清单字段）：

```bash
pnpm build
```

单元测试：

```bash
pnpm test
```

**前置条件**：目标 CLI（`claude` 或 `codex`）在 `PATH` 中。Codex 安装后需重启；Claude Code 建议新开会话。

### 临时加载（不写入配置）

```bash
claude --plugin-dir ~/.ai-pet/plugins/ai-pet-helper
```

需先执行 `install-plugin` 或手动 `ln -sf` 到 `~/.ai-pet/plugins/ai-pet-helper`。插件需包含 `.claude-plugin/plugin.json`、`hooks/hooks.json`（Codex 使用根目录 `hooks.json`）。

## 手动测试

```bash
node utils/on-user-prompt.mjs
node utils/on-state-switch.mjs
node utils/on-review.mjs
node utils/on-failed.mjs
node utils/on-agent-response.mjs
node utils/on-base.mjs
```

## 配置目录

与 [AI Pet](https://github.com/j-show/ai-pet) 共用 `~/.ai-pet/`：

| 路径 | 说明 |
| --- | --- |
| `~/.ai-pet/plugin-state.json` | hook 阶段状态 |
| `~/.ai-pet/plugins/ai-pet-helper/` | 推荐插件安装位置（符号链接） |
| `~/.ai-pet/marketplace/ai-pet-marketplace/` | 本地 Claude/Codex 市场（符号链接） |
| `~/.ai-pet/.env` | ai-pet 环境变量（含 `AI_PET_DEBUG_PROTOCOL`） |
| `~/.ai-pet/logs/<session-id>.log` | 协议调试日志（`AI_PET_DEBUG_PROTOCOL=true` 或 `1` 时；文件名为 Claude `session_id` 或 transcript 的 UUID 基名） |
| `~/.ai-pet/pets/` | 用户宠物包 |

## 目录结构

```
ai-pet-helper/
├── .claude-plugin/          # Claude 插件与市场清单
├── .codex-plugin/
├── .cursor-plugin/
├── hooks/hooks.json           # Claude Code
├── hooks/hooks-cursor.json    # Cursor
├── hooks.json                 # Codex
├── libs/                      # 协议、状态、安装逻辑
├── utils/                     # 各生命周期 hook 入口
├── scripts/                   # build、install-plugin、run-tests
└── test/                      # 单元测试（`pnpm test` → run-tests.mjs）
```

## 协议说明

### 调试日志

在 `~/.ai-pet/.env` 中设置：

```env
AI_PET_DEBUG_PROTOCOL=true
```

取值为 `true` 或 `1`（大小写不敏感）时，每次触发 `aipet://` 协议会在 `~/.ai-pet/logs/<session-id>.log` 追加一行，字段为 ISO 时间、`hook` 名称、`protocol` URL。`on-base` 未取到助手文本时还会写入 `diagnostic` 行。

- **`default=true`**：该动画临时取代 `aipet://base`，**始终循环播放**，直至手动 `aipet://base`
- `running?default=true`：用户提问时使用的临时 base
- `waving?count=1`：挥手一次
- `failed?count=3`：failed 播 3 轮后回待机（有 default 时回 default 动画）
- `base`：取消 default 覆盖，恢复 idle 自动播放

详见 [AI Pet 文档](https://github.com/j-show/ai-pet/blob/main/README.md)。

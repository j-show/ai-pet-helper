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
| 任务结束    | `Stop` / `SessionEnd` / `TaskCompleted`   | `aipet://base`，随后 `aipet://text?tl={TITLE}&txt={TEXT}&sid={SESSION_ID}` |

`text` 协议由 `on-base.mjs` 在任务结束时触发：Claude/Codex 从 Stop 事件的 `last_assistant_message` 读取；Cursor 由 `afterAgentResponse` 缓存回复后，在 `stop` / `sessionEnd` 时消费。

### Cursor 事件对应（`hooks/hooks-cursor.json`）

| Claude / Codex | Cursor | 脚本 |
| --- | --- | --- |
| `UserPromptSubmit` | `beforeSubmitPrompt` | `utils/on-user-prompt.mjs` |
| `PreToolUse` | `preToolUse` | `utils/on-state-switch.mjs` |
| `SubagentStart`（review） | `subagentStart` | `utils/on-review.mjs` |
| `PostToolUseFailure` | `postToolUseFailure` | `utils/on-failed.mjs` |
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

`install-plugin` 会：

1. 将本包符号链接到 `~/.ai-pet/plugins/ai-pet-helper`
2. 注册本地市场 `ai-pet-marketplace`（`~/.ai-pet/marketplace/ai-pet-marketplace` → 本包根目录，含 `.claude-plugin/marketplace.json`）
3. 调用 `claude` / `codex` CLI 安装并启用 `ai-pet-helper@ai-pet-marketplace`

预览步骤、卸载：

```bash
node scripts/install-plugin.mjs --dry-run
node scripts/install-plugin.mjs --uninstall
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
| `~/.ai-pet/.env` | ai-pet 环境变量 |
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
├── scripts/                   # build、install-plugin
└── test/
```

## 协议说明

- **`default=true`**：该动画临时取代 `aipet://base`，**始终循环播放**，直至手动 `aipet://base`
- `running?default=true`：用户提问时使用的临时 base
- `waving?count=1`：挥手一次
- `failed?count=3`：failed 播 3 轮后回待机（有 default 时回 default 动画）
- `base`：取消 default 覆盖，恢复 idle 自动播放

详见 [AI Pet 文档](https://github.com/j-show/ai-pet/blob/main/README.md)。

# dsh-input-plus：Claude Code 与 Codex 快捷键研究

> 研究日期：2026-08-14  
> 研究对象：Claude Code CLI、Claude Code Desktop、Codex CLI TUI、Codex Desktop  
> 研究目的：为 DSH WebUI 输入区确定可以直接复用的键盘状态机和必须排除的桌面/终端级快捷键。  
> 证据原则：优先采用官方文档和官方开源仓库源码；没有公开精确值的地方明确标记为待原型验证。

## 结论

“完全参考”应理解为完全参考输入区的交互语义，而不是把 CLI 和 Desktop 的全部快捷键复制进一个 WebUI 插件。

DSH v0.1 建议固定以下输入行为：

1. `@` 触发官方候选层；候选层打开时优先处理上下键、Enter 和 Escape。
2. 候选层关闭后，`ArrowUp`/`ArrowDown` 在光标没有到达多行输入的首/尾视觉行时，先移动光标；到达边界后才浏览输入历史。
3. `Ctrl+P` 与 `Ctrl+N` 分别作为上一条/下一条历史的键盘别名，和 Codex/Claude 的终端编辑习惯一致。
4. `Enter` 提交，`Shift+Enter` 换行；不在 v0.1 引入 Codex 的“运行中按 Tab 排队”语义，因为 DSH 当前产品边界没有排队输入功能。
5. 非空草稿在时间窗内连续两次按 `Escape` 时清空，并把清空前的草稿加入可召回历史；这样行为与 Claude Code 的明确文档一致。
6. 单次 Escape 的优先级必须是候选层关闭、IME 组合取消、正在运行的 DSH 操作中断或本插件的双次 Escape armed 状态，不能一律清空。
7. 空草稿的 Claude rewind 和 Codex transcript backtrack 不纳入 v0.1，避免把“输入增强”扩展成会话分支/回滚功能。

## Claude Code CLI：输入区行为

Claude Code 官方 Interactive Mode 文档给出了最接近本插件目标的明确语义：

| 操作 | Claude Code CLI 行为 | 对 DSH 的采用方式 |
| --- | --- | --- |
| `@` | 文件路径自动补全 | 直接采用，但使用 DSH 官方 input-trigger 管线 |
| 上/下键 | 多行/换行输入时，先在草稿内部移动；到达首尾视觉行后才浏览历史 | 直接采用 |
| `Ctrl+P/N` | 上/下历史导航的终端别名 | 直接采用为 WebUI 聚焦输入框内的别名 |
| `Enter` | 交互提交 | 直接采用 |
| `Shift+Enter` | 多行输入换行 | 直接采用 |
| 单次 `Esc` | 中断当前响应/工具调用；弹窗打开时关闭弹窗 | 采用“按当前焦点状态处理”，不能覆盖候选层和 IME |
| 双次 `Esc` | 非空输入清空，并保存到历史以便上键召回；空输入进入 rewind | 只采用非空草稿清空，空输入 rewind 延后 |
| `Ctrl+R` | 反向搜索历史 | 作为后续增强，不进入 v0.1 三项功能范围 |
| `Ctrl+S` | 暂存草稿；空输入再次恢复 | 作为后续增强，不进入 v0.1 |
| `Ctrl+G` | 在外部编辑器编辑草稿 | 不进入插件范围 |

官方还明确列出了 `Ctrl+C` 的中断/清空双态、`Ctrl+L` 的重绘/双次清屏、`Shift+Tab` 的权限模式循环等行为。这些是 CLI 进程或 Agent 控制能力，不能作为 DSH 输入插件的默认快捷键。

来源：[Claude Code Interactive Mode 官方文档](https://code.claude.com/docs/en/interactive-mode)

### Claude 的历史语义对本项目的影响

Claude Code 的历史按工作目录保存，可从过去会话召回；连续提交相同 prompt 时只保留一条；反向搜索还支持在当前会话、项目和全部项目之间切换。

这说明“清空草稿后能否召回”是输入历史的重要体验，而不只是删除动作。由于 DSH WebUI 的 Session 隔离和隐私边界已经确定，`dsh-input-plus` 只采用“清空草稿加入当前 Session 内存历史”这一行为，不复制 Claude 的跨项目持久化。

## Codex CLI TUI：输入区与按键分层

Codex 官方开源仓库的 `chat_composer.rs` 直接描述了输入状态机：

- composer 自己负责文本编辑、弹窗路由、Enter 提交/换行、粘贴和历史；
- 弹窗可处理 slash、文件搜索和 mentions；
- 历史合并当前会话和持久历史，召回后光标放到行尾；
- `Ctrl+R` 进入反向增量搜索，Enter 接受，Escape 恢复搜索开始前的草稿；
- Enter 提交，任务运行时 Tab 排队；无任务时 Tab 也提交，避免输入丢失。

Codex 的处理顺序尤其值得参考：先把弹窗和输入上下文分层，再决定历史、提交或普通文本编辑；不是给所有按键注册一个全局 listener。

来源：[Codex 官方 chat composer 源码](https://raw.githubusercontent.com/openai/codex/main/codex-rs/tui/src/bottom_pane/chat_composer.rs)

### Codex 的默认编辑键

Codex 官方 `keymap.rs` 的默认 editor keymap 包含：

- `Up` / `Ctrl+P`：向上移动或在边界进入历史；
- `Down` / `Ctrl+N`：向下移动或在边界进入历史；
- `Ctrl+A` / `Home`、`Ctrl+E` / `End`：行首/行尾；
- `Ctrl+W`、`Alt+Backspace`、`Ctrl+Backspace`：删除前一个词；
- `Ctrl+U`：删除到行首；
- `Ctrl+K`：删除到行尾；
- `Ctrl+Y`：粘回 kill buffer。

本插件 v0.1 只吸收与既定三项功能直接相关的上下键和边界语义。完整的 kill/yank、外部编辑器、Vim 模式和可配置 keymap 暂不复制，以免超出“功能保持克制”的范围。

来源：[Codex 官方 keymap 源码](https://raw.githubusercontent.com/openai/codex/main/codex-rs/tui/src/keymap.rs)

### Codex 的空输入 Escape 与 Claude 不同

Codex 的 `app_backtrack.rs` 明确描述了一个两阶段回退流程：

1. 主界面空 composer 的第一次 Escape armed backtrack，并记录当前 thread；
2. 第二次 Escape 打开 transcript overlay 并高亮用户消息；
3. Enter 确认后，在选中 prompt 之前 fork，再把 prompt 放回 composer 编辑。

这不是“删除输入框内容”，而是会话分支和历史回退。因此 DSH v0.1 不照搬空输入的第二次 Escape；否则插件职责会从输入增强越界到会话回滚。未来若要加入，必须单独建票据。

来源：[Codex 官方 backtrack 源码](https://raw.githubusercontent.com/openai/codex/main/codex-rs/tui/src/app_backtrack.rs)

Codex 官方 TUI 提示还确认：空 composer 按 Escape 可回退编辑上一条消息，Enter 确认；`/` 打开命令菜单，Tab 自动补全，任务运行时 Tab 排队，`Ctrl+O` 复制最新回复；TUI keymap 支持配置。这些都属于 CLI shell 或会话控制层，不应整体移植到 DSH 输入插件。

来源：[Codex 官方 TUI 提示文本](https://raw.githubusercontent.com/openai/codex/main/codex-rs/tui/tooltips.txt)

## Claude Code Desktop：桌面端快捷键

Claude Code Desktop 的官方快捷键是 Code tab 的应用级快捷键，不等于 CLI 输入区：

| 快捷键 | 作用 |
| --- | --- |
| `Cmd/Ctrl+/` | 显示快捷键帮助 |
| `Cmd/Ctrl+N` | 新建 Session |
| `Cmd/Ctrl+W` | 关闭 Session |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | 切换前/后一个 Session |
| `Esc` | 停止 Claude 响应 |
| `Cmd/Ctrl+Shift+D` | 切换 diff 面板 |
| `Cmd/Ctrl+Shift+B` | 切换 Browser 面板 |
| `Ctrl+`\`` | 切换终端面板 |
| `Cmd/Ctrl+\\` | 关闭当前聚焦面板 |
| `Cmd/Ctrl+;` | 打开 side chat |
| `Ctrl+O` | 循环 Transcript 显示模式 |
| `Cmd/Ctrl+Shift+M` | 权限模式菜单 |
| `Cmd/Ctrl+Shift+I` | 模型菜单 |
| `Cmd/Ctrl+Shift+E` | effort 菜单 |
| `1`–`9` | 选择打开菜单中的项目 |

官方特别说明，CLI 的 `Shift+Tab` 模式循环不适用于 Desktop。这证明不能把 CLI 和 Desktop 的快捷键表简单合并；每个平台必须有自己的作用域和冲突处理。

来源：[Claude Code Desktop 官方文档](https://code.claude.com/docs/en/desktop)

## Codex Desktop：桌面端快捷键

Codex Desktop 官方命令页给出的快捷键主要是应用导航、聊天检索和面板控制：

| 快捷键 | 作用 |
| --- | --- |
| `Cmd/Ctrl+Shift+P` 或 `Cmd/Ctrl+K` | 命令菜单 |
| `Cmd/Ctrl+,` | 设置 |
| `Cmd/Ctrl+Shift+/` | 快捷键设置 |
| `Cmd/Ctrl+O` | 打开文件夹 |
| `Cmd/Ctrl+[` / `]` | 前进/后退 |
| `Cmd/Ctrl+B` | 侧边栏 |
| `Cmd/Ctrl+J` | 底部面板 |
| `Ctrl+`\`` | 终端 |
| `Ctrl+L` | 清空终端 |
| `Cmd+Option+N` / `Ctrl+Alt+N` | Quick chat |
| `Cmd/Ctrl+N` 或 `Cmd/Ctrl+Shift+O` | 新建聊天 |
| `Cmd/Ctrl+G` | 搜索聊天 |
| `Cmd/Ctrl+F` | 当前聊天内查找 |
| `Cmd/Ctrl+Shift+[` / `]` | 上一个/下一个聊天 |
| `Ctrl+Shift+D` | 听写 |

Codex Desktop 还允许在 Settings → Keyboard Shortcuts 中搜索、修改和恢复快捷键。这个“按命令搜索快捷键”的发现性设计值得 DSH 以后参考，但不应在 v0.1 为三个功能加入一整套可配置 keymap。

来源：[Codex Desktop 官方命令与快捷键文档](https://developers.openai.com/codex/app/commands)

## DSH v0.1 的最终参考矩阵

| 输入状态 | 第一优先级 | 第二优先级 | 插件动作 |
| --- | --- | --- | --- |
| IME composition 中 | 浏览器/IME | 无 | 不触发历史、清空或中断 |
| `@` 候选层打开 | 候选层上下键、Enter、Escape | 不进入历史 | 选择、关闭或回写 `@relative` |
| 普通多行草稿，光标不在首/尾视觉行 | textarea 光标移动 | 不进入历史 | 只移动光标 |
| 普通草稿，光标在首/尾视觉行 | 历史导航 | 普通编辑 | Up/Down 或 Ctrl+P/N 浏览历史 |
| 普通非空草稿 | 单次 Escape armed | 第二次 Escape 在时间窗内确认 | 清空并把草稿存入当前 Session 历史 |
| 空草稿 | DSH 当前中断/弹窗语义 | 不做 rewind/backtrack | v0.1 不处理 Codex/Claude 的空输入回退 |
| 普通输入 | Enter 提交 | Shift+Enter 换行 | 复用 Harness 原生提交动作 |

## 关键实现约束

### 不注册全局抢键监听

必须先判断输入焦点、IME、候选层、对话框和当前 Session，再进入插件键盘状态机。官方 Codex 的源码也把 app、chat、composer、editor、list、pager、approval 分成不同 keymap context，并做唯一性校验；DSH 应采用同样的“上下文优先”思想。

### 双次 Escape 只对非空草稿生效

推荐状态：`idle → armed → cleared`。

- 第一次 Escape：只记录时间和当前草稿快照，不删内容；
- 非 Escape 的可编辑输入：取消 armed；
- 候选层打开：第一次 Escape 只关闭候选层，不进入 armed；
- IME composition 中：交给 IME，不进入 armed；
- 第二次 Escape 在时间窗内且草稿仍然非空：清空草稿、记录历史、退出历史浏览；
- 第二次 Escape 超过时间窗：把它视为新的第一次 Escape；
- 清空后按 Up：召回被清空草稿；
- 空草稿不触发清空，也不触发 v0.1 的 rewind/backtrack。

官方资料没有公开 Claude 双次 Escape 的具体毫秒值，因此原型比较 400/600/800ms，并验证中文输入法、键盘重复事件、触控板误触和屏幕阅读器场景后再固定。

### 反馈必须像成熟 CLI 一样可发现

v0.1 不做完整可配置 keymap，但至少要在输入框辅助文案或设置页显示当前有效快捷键：

- `↑/↓` 浏览历史；
- `Ctrl+P/N` 历史别名；
- `Enter` 发送；`Shift+Enter` 换行；
- `Esc Esc` 清空并可恢复；
- `@` 引用文件。

候选层打开时显示候选层自己的上下键/Enter/Escape 提示，避免把全局提示与局部状态混在一起。

## 明确不复制的能力

- Claude Desktop/Codex Desktop 的新建 Session、切换 Session、面板、终端、模型、权限和 effort 快捷键；
- Claude CLI 的空输入 rewind；
- Codex CLI 的空输入 transcript backtrack/fork；
- Codex CLI 的运行中 Tab 排队；
- `Ctrl+R` 反向历史搜索、`Ctrl+S` stash/restore、kill/yank buffer、Vim 模式和完整可配置 keymap。

这些能力要么依赖宿主应用级路由，要么会显著扩大插件状态面。它们不属于当前已确定的三项 v0.1 功能。

## 原型验收矩阵

下一步原型至少覆盖：

1. `@ma` 候选层打开时，按 Up/Down/Enter/Escape 不触发历史或清空；
2. 中文 IME composition 中按 Escape 不清空，composition 结束后仍能正常提交；
3. 两行、自动换行、多行草稿在光标未到边界时 Up/Down 只移动光标；
4. 光标到边界后 Up/Down 与 Ctrl+P/N 能按 Codex/Claude 语义浏览历史；
5. 首次历史导航保存当前草稿，向下到末端后恢复原草稿；
6. 非空草稿双次 Escape 在候选时间窗内清空，随后 Up 能召回；
7. 单次 Escape、超时第二次 Escape、第三次 Escape、输入法 Escape 和键盘重复事件不会误清空；
8. Session A 的历史、armed 状态和文件候选不会出现在 Session B；
9. Agent 正在运行时，Esc 的中断语义与 DSH 原生行为不冲突；
10. 无法使用某个官方 input seam 时，插件只关闭依赖该 seam 的能力。

## 主要来源

- [Claude Code Interactive Mode](https://code.claude.com/docs/en/interactive-mode)
- [Claude Code Desktop](https://code.claude.com/docs/en/desktop)
- [Claude Code keybindings](https://code.claude.com/docs/en/keybindings)
- [Codex 官方仓库](https://github.com/openai/codex)
- [Codex chat composer 源码](https://raw.githubusercontent.com/openai/codex/main/codex-rs/tui/src/bottom_pane/chat_composer.rs)
- [Codex keymap 源码](https://raw.githubusercontent.com/openai/codex/main/codex-rs/tui/src/keymap.rs)
- [Codex backtrack 源码](https://raw.githubusercontent.com/openai/codex/main/codex-rs/tui/src/app_backtrack.rs)
- [Codex TUI tooltips](https://raw.githubusercontent.com/openai/codex/main/codex-rs/tui/tooltips.txt)
- [Codex Desktop commands and shortcuts](https://developers.openai.com/codex/app/commands)

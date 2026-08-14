# dsh-input-plus：Harness 组合方式与兼容策略研究

> 研究日期：2026-08-14  
> 研究目的：在进入实现前确定 `dsh-input-plus` 应使用的 DSH WebUI 扩展面、Host/Client 边界、Developer Preview 兼容策略和失败降级规则。  
> 证据原则：官方 Harness 文档和源码作为事实依据；涉及本插件的行为是基于这些事实作出的设计建议。

## 结论摘要

`dsh-input-plus` 应当是一个“组合型插件”，而不是对输入框 DOM 的替换层：

1. `@` 文件引用复用 DSH 的 `ui-input-trigger`，注册一个 `@` source，让官方候选层负责检测、键盘导航、取消和选中回写。
2. 输入历史和双次 Escape 属于输入状态与键盘仲裁能力，应在 Client 侧围绕官方 InputHub/输入动作组合；不把草稿或历史发送到 Host。
3. 文件索引、路径校验、文件读取和 pre-step 上下文注入属于 Host；浏览器只拿相对路径候选和最小元数据，不拿绝对路径或文件内容。
4. UI 扩展使用 `conversation.input.dock`、`conversation.input.overlay`、设置 Slot、locale 和 settings scope；不创建第二个候选菜单，不用 CSS/DOM 选择器寻找 textarea。
5. DSH 仍是 Developer Preview，v0.1 不宣称兼容所有版本。源码 checkout 首发时锁定一个经过完整检查的 Harness commit；npm/npx 宿主记录经过验证的 DSH 包版本和完整性信息。运行时做能力探测，按功能降级，不能工作的能力必须明确显示或记录原因。

## 已验证的官方扩展面

### `ui-input-trigger`：唯一的 `/` 和 `@` 候选管线

官方输入触发器已经负责以下事情：

- 在 caret 位置识别 `/`、`@` 以及边界规则；
- 按 Session 提供 `InputTriggerController`；
- 调用已注册 source 的候选查询，并用 `AbortSignal` 取消上一轮查询；
- 通过同一个候选菜单完成键盘仲裁、指针选中和输入文本回写；
- 将菜单渲染到 `conversation.input.overlay`，且焦点继续留在 textarea。

因此 `dsh-input-plus` 的 `@` 功能只需要实现 `InputTriggerSource` 及其 Host 查询适配。source 负责本地过滤、排序和生成普通的 `@relative/path` 文本；菜单、焦点、候选层生命周期和取消机制交给官方管线。

官方还明确说明，输入触发器是 command-agnostic 的，space/enter 的 adjudication 按 source 注册顺序处理。因此本插件不能通过一个全局 `keydown` 监听器抢走 Enter；键盘优先级要在下一张原型票据中基于实际输入状态验证。

来源：[官方 ui-input-trigger README](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/ui-input-trigger/README.md)

### `ui-slots`：声明式注册与 Session 注入

官方 Slot 注册 API 将组件、子 Slot、store seat 和 inject business face 放在一次注册中。Session 级 Slot 的 inject factory 可以拿到 `sessionId`，注册 disposer 会连同子 Slot、贡献和 store 一起回收。

对本插件的直接约束是：

- 文件 dock 必须通过 `ctx.slots.register` 注册到 `conversation.input.dock`；
- 如果需要候选菜单补充展示，只能注册到官方声明的 overlay Slot；
- 所有 Session 相关映射都以 Slot 注入的 `sessionId` 为键，不能使用模块级“当前 Session”变量；
- 插件卸载、Session 销毁和重连时必须依赖 disposer 清理缓存和监听器。

来源：[官方 ui-slots README](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/ui-slots/README.md)

### `ui-conversation`：输入区宿主与 InputHub

官方 Conversation 包拥有 composer、input dock 和输入区的组合骨架。文档显示 InputHub 负责草稿状态机，并将草稿镜像到 Session store；输入区公开了 `useInput`/`inputActions`，同时提供 `conversation.input.overlay`、`conversation.input.dock`、left、right 等扩展 Slot。

这意味着：

- 输入历史应以官方输入动作和草稿状态为边界，不复制第二个 textarea 状态机；
- 文件 dock 可以展示当前草稿中的 `@` token 和已解析候选，但不能自己维护一份发送草稿；
- 双次 Escape 应先验证是否存在可组合的输入动作/键盘入口，再决定是注册输入区事件还是使用更靠近输入状态机的扩展点；
- 官方 plus 按钮已经通过 `InputTriggerController` 打开 command source，插件不得再做一个平行菜单或平行 launcher。

来源：[官方 ui-conversation README](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/ui-conversation/README.md)

### Client Module 装配面

官方 Client Modules 文档将 Client 包定义为插件依赖和浏览器 bundle 的装配单元：插件通过 `dsh.client` 声明 Client 平台、注入的 Client package，并导出 `./client` 作为浏览器入口。这个模型适合 `dsh-input-plus` 将 Host ESM 和单文件 Client bundle 分开构建。

来源：[官方 Client Modules 文档](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/docs/subsystems/client-modules.md)、[官方 Client package 概览](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/README.md)

## Host / Client 职责边界

| 能力 | Client | Host |
| --- | --- | --- |
| `@` 触发 | 注册官方 input source；按候选结果做本地过滤和排序；回写 `@relative` | 提供当前 agent/workspace 的候选索引；最终校验用户手写 token |
| 文件内容 | 不直接读取本机文件；不接受绝对路径 | 解析、realpath、边界校验、限制读取大小，并在 pre-step 生成模型上下文 |
| 输入历史 | 当前 Session 内存状态、草稿恢复和上下键游标 | 不参与，不写 Host 日志、设置或数据库 |
| 双次 Escape | 维护时间窗和输入动作调用 | 不参与 |
| 设置 | 通过 settings scope 读取和写入开关、限制值 | 注册设置 schema，并作为最终配置来源 |
| 重连 | 监听连接 reset，清除候选缓存和路径映射 | 重建 workspace/agent 索引；所有请求重新校验 |
| UI | Slot、locale、样式和可访问性 | 无 UI DOM 操作 |

该边界延续了 `dsh-at-file` 已验证的分层，但把跨端身份改成 `sessionId + relative`，并把安全校验提升为 Host 的唯一最终裁决。

参考：[dsh-at-file 仓库](https://github.com/omdsh-dev/dsh-at-file)

## 推荐的插件装配形态

### 包结构

实现时采用以下结构，具体包版本以实现时的 DSH checkout 为准：

- `src/index.ts`：Host plugin entry；注册 settings、Host service、Typert manifest 和 pre-step hook。
- `src/client/index.ts`：Client plugin entry；注入官方 runtime、input-trigger、ui-slots、ui-conversation、locale、settings 等包。
- `src/contract.ts`：Host 与 Client 共享的最小 descriptor、候选项和错误码类型。
- `src/client/input-source.ts`：只实现 `@` source，不实现菜单和 textarea。
- `src/client/history.ts`：Session 内输入历史纯状态模块，独立于文件引用。
- `src/client/keyboard.ts`：双次 Escape 和键盘仲裁适配；只依赖经过原型验证的官方输入动作。
- `src/host/files.ts`、`src/host/mention.ts`：索引、读取、安全边界和 pre-step 注入。
- `src/host/typert.ts`：显式 Host manifest；不要让 wire contract 只依赖装饰器副作用。
- `lib/index.js`、`lib/client.js`：发布物中携带的 Host ESM 和单文件 Client bundle，避免 profile 安装时依赖现场构建。

### 运行时适配层

所有 Harness 依赖集中在一个 adapter 中，业务模块不直接到处调用 `ctx.get` 或访问未公开对象：

- `detectCapabilities(ctx)`：检查 `inputTriggers`、Session 身份、slots、settings scope、connection/remote 等必需能力；
- `mountAtFileRemote(ctx)`：挂载并拿到 Host 查询 face；
- `registerInputSource(ctx, source)`：负责 source 的生命周期和设置开关；
- `registerInputDock(ctx, component)`：负责 dock 的 Slot 注册与 disposer；
- `resetSessionState(sessionId)` / `resetConnectionState()`：负责历史、查询取消和候选映射清理。

这样 DSH API 发生变化时只需要修改适配层和契约测试，不把兼容分支散落到历史、文件引用和 UI 组件中。

## 兼容策略

### 版本下限：锁定测试基线，不虚构稳定 semver

官方仓库明确提示 DSH 处于 Developer Preview，可能发生兼容性破坏。当前没有足够稳定的公开版本契约可以让插件宣称“兼容所有 `*`”。因此 v0.1 采用以下规则：

1. 首发实现时，源码 checkout 记录一个完整通过检查的 Harness git commit；npm/npx 宿主记录完整通过检查的 DSH 包版本和完整性信息，作为 `dsh-input-plus v0.1` 的兼容基线。
2. README 和 Release 页面同时写明：测试基线 commit、依赖的官方 Client package contract、已验证的 profile 装配方式。
3. `package.json` 的 peer dependency 不使用“看起来宽松但未经测试”的全量 wildcard 作为兼容承诺；开发依赖和 lockfile 锁定实际测试版本。
4. 每次 Harness 升级必须先跑类型检查、Host contract 测试、Client mount smoke test、输入触发器交互测试和手动 WebUI 验证，验证通过后才扩大支持窗口。

这里的“版本下限”不是一个猜测出来的数字，而是“首个通过完整契约测试的 DSH commit”。等 DSH 形成稳定版本规则后，再把 commit 基线转换成正式版本范围。

### 能力探测与按功能降级

插件启动时不通过 DOM 结构、CSS class 或应用版本字符串猜测兼容性，而是探测真正需要的官方能力：

| 缺失能力 | 降级行为 | 仍保留的能力 |
| --- | --- | --- |
| input trigger contract | 关闭 `@` 候选和文件 dock，并显示一次兼容性诊断 | 输入历史、双次 Escape（若输入动作仍可用） |
| Session identity / session-scoped Slot | 关闭所有 Session 级增强，避免状态串会话 | 不保留无 Session 的全局历史 |
| remote/connection | 关闭 Host 候选查询和文件引用；不展示假候选 | 输入历史、双次 Escape |
| settings scope | 使用代码内安全默认值，但不提供可持久化开关；记录诊断 | 核心输入增强继续工作 |
| conversation dock/overlay | 不渲染附加 UI，不创建替代菜单 | 官方 input trigger 的文本回写仍可保留 |
| required Host manifest / pre-step face | Host 插件加载失败并给出可行动错误 | Client 不发送未经验证的文件内容 |

降级必须是“按能力关闭”，不能是半初始化后继续发送错误请求。每个降级只输出一次简洁诊断，包含插件版本、缺失能力和建议的 Harness 基线；不打印文件内容、绝对路径或用户草稿。

### Host wire contract

文件引用的跨端 contract 只暴露：

- `sessionId`；
- `relative`、`kind`、必要的大小/显示元数据；
- 候选查询的分页或上限参数；
- 结构化错误码和用户可执行的说明。

不暴露 Host absolute path、不从 Client 传入可直接读取的 absolute path、不把文件内容放在候选查询响应中。Host 对候选结果和用户手写 `@relative` 都重新做 `resolve → realpath → relative boundary` 检查，默认拒绝越界和符号链接逃逸。

### 升级与发布检查

每次插件发布前至少要有以下检查：

- `pnpm typecheck`：Host、Client、共享 contract 均无 TypeScript 错误；
- `pnpm test`：Session 隔离、候选取消、历史边界、双次 Escape、路径安全和重复注入；
- `pnpm build`：Host ESM 和单文件 Client bundle 均可产出；
- profile 安装检查：确认包的 `package.json` 中 `dsh.bundle`、`dsh.client`、`exports["./client"]` 与 `cordis.patch.yml` 一致，并确认 Profile 的 `package.json` 由官方 CLI 维护 `dsh.profile`；不要创建未经官方文档定义的 `dsh.plugin.json`；
- WebUI smoke test：确认官方候选层、dock、设置和重连后的清理；
- README 兼容表：更新测试基线 commit、已知限制、升级风险和回滚方式。

若某个新 Harness 版本只破坏了可选的 `@` 面，不能让输入历史和清空手势一起失效；若破坏了输入状态宿主，则应整体关闭依赖输入状态的功能并明确提示，而不是尝试 DOM 级补丁。

## 已决定的实现约束

- 不修改 Harness 核心，不复制官方候选菜单。
- 不使用 textarea DOM 查询、React 私有对象或 CSS 选择器作为主扩展机制。
- Client 只传 `sessionId + relative` 和最小元数据；Host 负责最终安全校验与内容注入。
- 所有 Harness API 依赖集中在 adapter；业务模块不散落兼容判断。
- v0.1 以一个已验证的 DSH commit 为兼容基线，采用能力探测和按功能降级。
- `@`、输入历史、双次 Escape 三块能力相互隔离；一个可选能力失败不能污染另外两块。

## 仍需原型验证的问题

本研究不替代键盘原型。下一步需要在实际 WebUI 中验证：

- `ArrowUp`/`ArrowDown` 在候选层打开、草稿非空、光标不在首尾等情况下的优先级；
- Enter、Shift+Enter 与官方 input trigger adjudication 的先后关系；
- 双次 Escape 时间窗、候选层关闭和输入清空之间的精确顺序；
- InputHub 是否提供足够稳定的 draft read/write/action 面来实现历史恢复，而不触碰 DOM。

对应票据：[Define keyboard arbitration and the clear gesture](../wayfinder/tickets/03-keyboard-arbitration-and-clear-gesture.md)

## 主要来源

- [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness)
- [官方 Client Modules 文档](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/docs/subsystems/client-modules.md)
- [官方 Client package 概览](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/README.md)
- [官方 ui-input-trigger README](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/ui-input-trigger/README.md)
- [官方 ui-slots README](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/ui-slots/README.md)
- [官方 ui-conversation README](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/ui-conversation/README.md)
- [dsh-at-file 参考仓库](https://github.com/omdsh-dev/dsh-at-file)

# dsh-input-plus 文件引用研究

日期：2026-08-14

## 研究问题

`dsh-input-plus` 如何参考 `dsh-at-file` 实现 `@` 文件/目录引用，同时修复其安全、Session 隔离和工程鲁棒性问题？

## 结论

采用 `dsh-at-file` 的总体分层，但不复制其协议和路径实现：

```text
Client：@ 触发、候选菜单、本地排序、纯文本引用、已引用展示
Host：工作区索引、路径校验、文件读取、目录序列化、发送前注入
```

文件内容不经过浏览器 Remote 传输；浏览器只接收候选所需的工作区相对路径和类型。真正的读取在 Host 的发送前边界完成。

## 官方 Harness 约束

1. 官方 `ui-input-trigger` 已提供 `/` 和 `@` 检测、候选分组、候选选择、按 Session 创建的 `InputTriggerController`、AbortSignal 取消和现成的 `conversation.input.overlay` 菜单。插件应注册 Source，不能另造候选菜单。[官方 ui-input-trigger README](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/ui-input-trigger/README.md)

2. 官方 `ui-slots` 的 Session 级 Slot 注入工厂会提供 `sessionId`；输入区扩展应使用该身份做状态和路径映射隔离。[官方 ui-slots README](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/ui-slots/README.md)

3. 官方 `ui-conversation` 已由 InputHub 管理草稿，并提供 `useInput`、`inputActions` 和输入 Dock/Overlay 等扩展座位。插件不应复制一套 textarea 状态机。[官方 ui-conversation README](https://raw.githubusercontent.com/deepseek-ai/deepseek-harness/master/packages/client/ui-conversation/README.md)

4. DSH 目前是快速变化的 Developer Preview，官方明确提示存在兼容性破坏。因此协议契约应尽量小，Host/Client 边界应集中在一个共享 contract 中。[官方 Harness README](https://github.com/deepseek-ai/deepseek-harness)

## `dsh-at-file` 可保留的设计

| 设计 | 结论 | 来源 |
|---|---|---|
| 单一 `atFile/search` 工作区索引接口 | 保留，避免把文件内容暴露到浏览器 | [`src/contract.ts`](<C:/Users/admin/AppData/Local/Temp/dsh-4z6Oik/dsh-at-file/src/contract.ts>) |
| `@` Source 使用纯文本 `@相对路径` | 保留，草稿、撤销和复制都简单 | [`src/client/source.ts`](<C:/Users/admin/AppData/Local/Temp/dsh-4z6Oik/dsh-at-file/src/client/source.ts>) |
| 浏览器缓存索引并本地排序 | 保留，减少每个字符的 Host 请求 | [`src/client/source.ts:78`](<C:/Users/admin/AppData/Local/Temp/dsh-4z6Oik/dsh-at-file/src/client/source.ts:78>) |
| Host 在 `agent/pre-step` 注入 user message | 保留，文件读取权限在 Host | [`src/index.ts:81`](<C:/Users/admin/AppData/Local/Temp/dsh-4z6Oik/dsh-at-file/src/index.ts:81>)、[`src/mention.ts:291`](<C:/Users/admin/AppData/Local/Temp/dsh-4z6Oik/dsh-at-file/src/mention.ts:291>) |
| 目录默认 manifest、文本读取有上限 | 保留，控制上下文膨胀 | [`src/files.ts:248`](<C:/Users/admin/AppData/Local/Temp/dsh-4z6Oik/dsh-at-file/src/files.ts:248>) |

## 必须重写或优化的部分

### 1. Remote 不再返回绝对路径

现有 `FileEntry` 把 Host 绝对路径发送到浏览器，既泄露本机目录结构，也让 Client 持有不必要的文件权限信息。[`src/contract.ts:11`](<C:/Users/admin/AppData/Local/Temp/dsh-4z6Oik/dsh-at-file/src/contract.ts:11>)

新契约只返回：

```ts
type FileCandidate = {
  relative: string
  kind: 'file' | 'dir'
}
```

点击“打开”或发送引用时只传 `sessionId + relative`，由 Host 再次解析和校验。

### 2. 路径解析必须做最终边界校验

现有实现只检查 token 是否以 `/` 或 `..` 开头；`foo/../../secret` 仍可能通过 `join()` 越出工作区。[`src/mention.ts:66`](<C:/Users/admin/AppData/Local/Temp/dsh-4z6Oik/dsh-at-file/src/mention.ts:66>)

新实现应在 Host 端统一执行：拒绝绝对路径和空路径；解析后对根和目标做 `realpath`；使用 `relative(root, target)` 判断目标是否仍在根目录内；默认拒绝符号链接；读取和打开动作使用同一套校验函数。

不能只依赖 Client 候选列表，因为用户可以手写 `@路径`。

### 3. 所有 Client 映射必须按 Session 隔离

现有 `entryByRel` 是全局 `Map<relative, FileEntry>`，不同工作区出现相同相对路径时可能互相覆盖。[`src/client/index.ts:71`](<C:/Users/admin/AppData/Local/Temp/dsh-4z6Oik/dsh-at-file/src/client/index.ts:71>)

新实现使用 `Map<SessionId, Map<relative, FileCandidate>>`，并从官方 Session Slot 注入的 `sessionId` 获取当前会话，不从全局变量猜测。

### 4. 文件读取要避免 stat/read 竞态

现有实现先 `stat` 再 `readFile`，文件在两次操作之间变大时可能超过配置上限。[`src/files.ts:193`](<C:/Users/admin/AppData/Local/Temp/dsh-4z6Oik/dsh-at-file/src/files.ts:193>)

新实现应使用文件描述符进行受限读取，并在读取过程中再次确认字节预算。目录 bounded 模式要以“单文件上限 + 总序列化上限”双重限制为准。

### 5. 引用去重和缓存取消要在边界层统一

现有 `scanMentions()` 在每个文本块内去重，但多个文本块之间仍可能重复注入；已有缓存请求在被其他调用复用时也不能完全响应新调用者的取消。[`src/mention.ts:232`](<C:/Users/admin/AppData/Local/Temp/dsh-4z6Oik/dsh-at-file/src/mention.ts:232>)、[`src/client/source.ts:78`](<C:/Users/admin/AppData/Local/Temp/dsh-4z6Oik/dsh-at-file/src/client/source.ts:78>)

新实现应在一次发送展开过程中全局去重，并让每个候选调用者响应自己的 AbortSignal；共享索引请求可以继续完成，但不能阻塞已经失效的菜单请求。

## v0.1 文件引用契约

### 支持

- 工作区内文本文件；
- 工作区内目录；
- 目录 manifest 默认模式；
- bounded 目录模式作为显式配置；
- 手写 `@相对路径` 和候选选择两种方式；
- `.git`、`node_modules` 等目录默认忽略；
- 文件大小、目录总大小和索引条目数限制。

### 不支持

- 工作区外路径；
- 符号链接目标；
- PDF、图片、压缩包等二进制解析；
- 把绝对路径发给浏览器；
- Client 直接读取本机文件；
- 未经用户草稿触发的自动文件注入。

### 失败策略

- 未找到的手写路径保持普通文本，不读取任何文件；
- 直接文件读取失败时返回明确、可操作的用户错误；
- 目录中的单个后代文件失败时保留目录结果，并报告跳过原因；
- 取消操作立即终止本次展开，不把取消伪装成普通文件失败。

## 最小测试矩阵

- `foo/../../outside`、平台绝对路径和空路径；
- 工作区内外符号链接文件和目录；
- 两个 Session 使用相同相对路径；
- 文件在 stat 与读取之间增长或被替换；
- 多文本块、多次重复 `@` 引用；
- 候选请求快速取消和连接重置；
- 大文件、二进制、非法 UTF-8、PDF 和目录总预算；
- 断开重连后缓存、路径映射和候选菜单恢复。

## 研究决策

`dsh-input-plus` 复用 `dsh-at-file` 的分层和用户体验，不复用其绝对路径协议、路径解析、全局路径映射和不完整的竞态处理。文件跨端唯一身份是 `sessionId + relative`，Host 对候选选择和手写 token 统一做最终工作区校验。


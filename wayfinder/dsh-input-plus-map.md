# Wayfinder Map: dsh-input-plus

## Destination

形成 `dsh-input-plus` v0.1 的可执行产品规格和实现路线：为 DeepSeek Harness WebUI 提供清晰、可靠、键盘优先的输入区增强，首批覆盖文件引用、输入历史和清空手势，并明确安全边界、Session 隔离、兼容性和发布标准。地图完成时，所有开始编码前必须决定的问题都已关闭。

## Notes

这是一个 DeepSeek Harness WebUI 社区插件规划，默认使用本地 Markdown 作为 issue tracker。DSH 目前处于快速迭代的 Developer Preview，兼容性会变化；实现应优先依赖官方 Client Module、输入触发器和 UI Slot 扩展面，不修改 Harness 核心。每次推进继续使用 `grilling`、`domain-modeling`；需要外部事实时使用 `research`，需要验证交互时使用 `prototype`。

本地图只做决策规划，不直接交付实现代码。开放票据位于 [tickets](./tickets/)；票据文件的 frontmatter 记录类型、状态和阻塞关系。

## Decisions so far

- [dsh-input-plus repository identity](./tickets/00-repository-identity.md) — 仓库和插件 ID 采用 `dsh-input-plus`，展示名为 `DSH Input+`，中文副标题为“DSH 输入框强化”。
- [Define dsh-input-plus v0.1 product boundary](./tickets/01-v01-product-boundary.md) — v0.1 只交付文件引用、Session 内输入历史和双次 Escape 清空，并配套必要的键盘优先级、安全、设置、测试和文档。
- [Decide input history semantics and privacy defaults](./tickets/02-input-history-semantics.md) — 历史只记录当前 Session 的用户提交草稿，最多 50 条；上下键可往返浏览并恢复原草稿，默认不持久化。
- [Define the file reference contract and security boundary](./tickets/04-file-reference-contract-and-security.md) — 参考 `dsh-at-file` 的分层和体验，但以 `sessionId + relative` 为跨端身份，并重写路径安全、符号链接、竞态和多 Session 映射。
- [Establish Harness composition and compatibility strategy](./tickets/05-harness-composition-and-compatibility.md) — 复用官方 input trigger、Conversation Slot 和 InputHub；Host/Client 分层；以经过完整检查的 Harness commit 为 v0.1 基线，并按能力探测降级。
- [Define keyboard arbitration and the clear gesture](./tickets/03-keyboard-arbitration-and-clear-gesture.md) — 候选层和 IME 优先；上下键按多行边界进入历史；支持 `Ctrl+P/N`；双次 Escape 采用 600ms 默认窗口并把清空草稿写入当前 Session 历史。
- [Define the release surface and discoverability package](./tickets/06-release-surface-and-discoverability.md) — 完全遵循官方 bundle/profile 发布路径；首屏只承诺三项核心能力；使用 `dsh-plugin` Topic、真实 WebUI GIF、精确 DSH commit 兼容基线和干净 profile 安装验收。

## Not yet specified

- 无。实现阶段仍需在真实 DSH checkout 上验证并记录兼容基线，这是执行条件而不是新的产品决策。

## Out of scope

- 本地图不规划 DSH Native/Desktop 客户端。
- 本地图不规划模型能力、Agent loop 或 Harness 核心协议的改造。
- 本地图不规划通用 Prompt 管理平台、知识库或团队协作后台。
- 本地图不承诺一次性实现所有未来输入法、附件和编辑器能力。

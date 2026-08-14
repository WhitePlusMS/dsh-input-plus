---
title: Define keyboard arbitration and the clear gesture
type: prototype
status: closed
assignee: codex
parent: ../dsh-input-plus-map.md
blocked_by: []
---

## Question

当候选层、输入历史、IME 组合态和普通草稿输入同时存在时，ArrowUp、ArrowDown、Enter、Shift+Enter、Escape 的优先级是什么？双次 Escape 的时间窗口、取消条件、恢复方式和设置开关是什么？需要通过低成本交互原型验证哪些状态？

## Reference evidence

已完成 Claude Code CLI、Claude Code Desktop、Codex CLI TUI 和 Codex Desktop 的官方资料核对，详细对照见 [`research/dsh-input-plus-shortcuts.md`](../../research/dsh-input-plus-shortcuts.md)。

本票据采用“完全参考输入区状态机，克制移植桌面级能力”的原则：

- 复用候选层优先、历史边界导航、`Ctrl+P/N` 别名、`Enter` 提交、`Shift+Enter` 换行、非空草稿双次 `Esc` 清空并可由历史召回。
- `@` 候选层打开时，`ArrowUp`/`ArrowDown`/`Enter`/`Escape` 归候选层处理，不能误触发历史或清空。
- 输入法 composition 期间所有相关按键先交给浏览器/IME；不能把中文输入法的 `Escape` 当成清空或中断。
- 空草稿的 Claude rewind、Codex transcript backtrack、桌面端会话切换、模型/权限/面板快捷键不放入 v0.1；它们属于产品级或会话级能力，不是本插件的克制输入增强。
- 双次 `Escape` 的精确时间窗没有被官方文档公开，原型需要比较 400/600/800ms 等候选值后再定；不能把某个猜测值写成兼容承诺。

## Prototype

逻辑原型位于 [`prototype/dsh-input-plus-keyboard.html`](../../prototype/dsh-input-plus-keyboard.html)。它是单文件、内存态、可双击运行的 throwaway demo，覆盖候选层优先、历史边界、双次 Escape 可恢复、IME 防误触和超时不清空五个场景。

## Resolution

基于 Claude Code/Codex 输入区行为研究和原型确认，v0.1 键盘规则冻结如下：

- 候选层打开时，`ArrowUp`/`ArrowDown`/`Enter`/`Escape` 只由候选层处理，不触发历史或清空。
- IME composition 期间不触发插件历史、清空或中断动作。
- 候选层关闭后，多行草稿光标未到首/尾视觉行时，上下键只移动光标；到达边界后才浏览历史。
- `ArrowUp`/`ArrowDown` 与 `Ctrl+P`/`Ctrl+N` 分别执行上一条/下一条历史浏览。
- `Enter` 提交，`Shift+Enter` 换行；不引入 Codex 的运行中 Tab 排队。
- 非空草稿第一次 `Escape` 进入 armed 状态；600ms 内第二次 `Escape` 清空草稿并写入当前 Session 内存历史，随后可用 `ArrowUp` 召回。
- 超过 600ms 的第二次 `Escape` 视为新的一次 armed，不清空；空草稿不触发 v0.1 的 rewind/backtrack。
- 清空手势没有独立持久化开关，随输入历史和插件总开关生效；不写日志、不发送 Host。

600ms 是经原型采用的产品默认值，不声称是 Claude Code 或 Codex 的官方毫秒参数；后续只有真实 WebUI/IME 验证发现误触问题时才调整。

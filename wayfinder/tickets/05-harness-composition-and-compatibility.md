---
title: Establish Harness composition and compatibility strategy
type: research
status: closed
assignee: codex
parent: ../dsh-input-plus-map.md
blocked_by: []
---

## Question

当前 DSH WebUI 的输入区、输入触发器、Conversation Slot、Session 状态和设置系统分别提供哪些稳定扩展面？`dsh-input-plus` 的 Host/Client 边界、版本下限、失败降级和升级检测应该如何设计，才能承受 Developer Preview 的破坏性变化？

## Resolution

研究结论已记录在 [`research/dsh-input-plus-compatibility.md`](../../research/dsh-input-plus-compatibility.md)。

- `@` 复用官方 `ui-input-trigger`，不复制候选菜单；输入区 UI 通过 `ui-slots` 和 `ui-conversation` 的公开 Slot 组合。
- Host 负责文件索引、路径安全、读取和 pre-step 注入；Client 只处理候选交互、Session 草稿状态和最小的 `sessionId + relative` contract。
- v0.1 对源码 checkout 以首个完整通过契约测试的 Harness git commit 作为兼容基线；对 npm/npx 宿主记录 DSH 包版本和完整性信息，不虚构不存在的 Git commit 或稳定 semver；运行时做能力探测并按功能降级。
- 兼容依赖集中到 adapter，禁止使用 DOM 选择器、React 私有对象或第二套输入菜单作为主方案。

下一张可推进票据是解除阻塞后的键盘原型票据。

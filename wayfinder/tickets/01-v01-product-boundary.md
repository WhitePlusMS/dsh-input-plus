---
title: Define dsh-input-plus v0.1 product boundary
type: grilling
status: closed
assignee: codex
parent: ../dsh-input-plus-map.md
blocked_by: []
---

## Question

`dsh-input-plus` v0.1 必须包含哪些能力，哪些能力明确延后，才能形成一个完整但可发布的输入区增强产品，而不是松散的快捷键集合？

## Resolution

v0.1 保持克制，只交付三项用户能力：

- `@` 文件和目录引用；
- 当前 Session 内的输入历史，上下键恢复已发送输入；
- 双次 Escape 清空当前草稿。

为保证这三项能力可用，v0.1 同时包含候选层与历史的键盘优先级、Session 隔离、设置开关、文件安全边界、大小限制、失败提示、基础测试和首发文档。Slash 命令、Skill 引用、Prompt 模板、跨重启草稿、云端历史、图片/PDF/二进制解析、拖拽文件、多窗口同步和 Native 客户端全部后置。

`@` 文件引用参考 `dsh-at-file` 的 Client/Host 分层和 `agent/pre-step` 注入模型，但不得直接复制。新实现必须修复并优化其已发现的路径越界、符号链接、绝对路径泄露、多 Session 路径映射、重复注入和取消竞态问题。

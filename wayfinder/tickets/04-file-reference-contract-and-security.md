---
title: Define the file reference contract and security boundary
type: research
status: closed
assignee: codex
parent: ../dsh-input-plus-map.md
blocked_by: []
---

## Question

文件引用应该支持哪些路径类型和目录模式？如何保证手写 `@路径`、符号链接、路径穿越、绝对路径、二进制文件、超大文件和多 Session 场景都不会越过工作区安全边界？需要参考现有 `dsh-at-file` 的哪些架构，哪些实现必须重写或优化，才能做到“兼容思路但不照抄代码”？

## Resolution

研究结论已记录于 [`research/dsh-input-plus-file-reference.md`](../../research/dsh-input-plus-file-reference.md)。v0.1 保留 `dsh-at-file` 的 Client/Host 分层、纯文本 `@相对路径`、单一索引接口、Host 发送前注入和目录 manifest 默认模式；必须重写绝对路径协议、路径边界校验、符号链接处理、Session 路径映射、stat/read 竞态、跨文本块去重和候选取消。

文件跨端唯一身份是 `sessionId + relative`，浏览器不接收绝对路径，Host 对候选和手写 token 统一做最终工作区校验。

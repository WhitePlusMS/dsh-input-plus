---
title: Decide input history semantics and privacy defaults
type: grilling
status: closed
assignee: codex
parent: ../dsh-input-plus-map.md
blocked_by: []
---

## Question

上下键恢复的“以前输入”具体指哪些提交记录？第一次按上键如何保存当前草稿，按下键如何恢复草稿，历史是否跨刷新或跨会话保存，默认保存数量和隐私策略是什么？

## Resolution

输入历史采用克制的当前 Session 语义：

- 只记录用户主动提交的非空草稿；提交动作成立即记录，不要求模型执行成功；
- 保留完整原文，包括 `@文件` 标记；不记录模型、系统或插件注入消息；
- 首次 `ArrowUp` 保存当前草稿并载入最近一条历史；继续向上载入更早记录，到最早记录后保持不变；
- `ArrowDown` 向较新的记录移动，到达最新记录后再次按下恢复首次保存的草稿并退出历史浏览；
- 历史记录本身不可被修改，用户编辑历史内容只修改当前草稿；
- 历史按 DSH Session 隔离，只保存在当前页面运行期间，不跨刷新、跨 Session、跨设备或云端保存；
- 最多保留最近 50 条；连续提交完全相同的文本只保留一条，非连续重复允许再次记录；
- 不写日志、不发送到 Host，默认不使用 LocalStorage，降低敏感 Prompt、密钥和内部代码残留风险。

## Amendment 2026-08-14

根据 Claude Code 官方 Interactive Mode 对双次 Escape 的定义，历史范围补充一类“用户主动清空但希望可恢复的非空草稿”：

- 非空草稿通过双次 Escape 清空时，清空前的完整文本同步写入当前 Session 的内存历史；随后按 `ArrowUp` 可以召回；
- 这类记录不代表已经提交给模型，仍然不记录模型、系统或插件注入消息；
- 继续遵守最多 50 条、连续完全重复去重、不跨刷新或跨 Session 持久化的隐私边界。
- 历史恢复时光标统一放到草稿末尾，保持 Codex CLI 的 shell-like recall 体验；用户后续编辑只修改当前草稿。

本补充只改变“清空手势是否可恢复”的历史写入点，不扩大 v0.1 的历史持久化范围。

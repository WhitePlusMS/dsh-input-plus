---
title: Define the release surface and discoverability package
type: grilling
status: closed
parent: ../dsh-input-plus-map.md
blocked_by: []
---

## Question

首发仓库如何让用户在几秒内理解并安装：README 首屏文案、GIF/截图、功能列表、安装命令、配置说明、兼容性声明、GitHub Topic、测试承诺和后续路线应采用什么最小组合？

## Resolution

首发统一遵循 DeepSeek Harness 官方插件发布路径，不自定义安装器、不绕过官方 profile/bundle 机制，也不把尚未验证的运行方式写进 README。

### Repository and package identity

- GitHub repository: `dsh-input-plus`。
- Display name: `DSH Input+`。
- npm bundle name: `dsh-input-plus`，前提是发布前完成包名占用检查并确认可发布。
- GitHub Topics: `dsh-plugin`、`dsh`、`deepseek-harness`、`web-ui`、`input-enhancement`、`keyboard-shortcuts`、`file-reference`。
- `dsh-plugin` 是官方 README 明确建议用于插件发现的 Topic；不添加过宽的 `ai`、`productivity` 等泛 Topic 作为首发主标签。

### README first screen

首屏只回答“这是什么”和“为什么安装”：

```md
# DSH Input+

让 DeepSeek Harness 的 Web UI 输入框更好用。

@ 引用文件/目录 · ↑↓ 召回输入历史 · 双次 Escape 清空草稿
```

同时保留一行英文搜索描述：

```md
A focused input enhancement plugin for the DeepSeek Harness Web UI.
```

功能列表只承诺 v0.1 的三项用户能力：文件/目录引用、当前 Session 输入历史、双次 Escape 清空。README 必须明确“不上传文件、不跨会话保存历史、不修改 Harness 核心”，并列出 Slash、Skill、Prompt 模板、跨重启草稿、拖拽附件等后置项，防止产品被理解为全能输入框平台。

### Official package and install path

发布包采用官方 bundle 结构：

- `package.json` 声明 `dsh.bundle` manifest，并在其中配置 `"patch": "./cordis.patch.yml"`；
- Web Client 同一份 `package.json` 声明 `dsh.client`（`platform: web`），并通过 `exports["./client"]` 指向已构建的浏览器 bundle；
- `cordis.patch.yml` 负责把插件模块插入组合；
- 包内携带可直接加载的构建产物，不能依赖用户本地存在源码 monorepo；
- npm 发布前必须完成构建并把构建产物纳入发布文件。

普通用户的 README 安装命令采用官方形式：

```bash
dsh plugin --profile <profile> add dsh-input-plus
```

安装后使用官方 profile 启动方式验证组合。GitHub 直装只作为开发或审阅源码路径，并明确官方文档所述的 git 依赖构建脚本和 `allowBuilds` 授权风险；不把它作为普通用户首选安装方式。

在真实实现和 npm 包发布前，不在 README 中声称已经可安装，也不创建虚假的版本号、下载链接或一键脚本。

### Demo and discoverability

首发只准备一段基于真实 WebUI 的 8—12 秒 GIF，顺序固定为：

```text
输入 @ → 选择 src/main.ts → 提交
→ ArrowUp 召回上一条输入
→ 双次 Escape 清空草稿
```

不使用与实际版本不一致的伪截图，不制作复杂宣传视频。GIF 只证明三项核心能力，不展示后置功能。

### Compatibility and quality contract

README 使用以下兼容性表述：

> DSH Input+ 面向 DeepSeek Harness Developer Preview。DSH 仍在快速迭代，可能发生兼容性破坏；源码 checkout 记录经过验证的 DSH git commit，npm/npx 宿主记录经过验证的 DSH 包版本和完整性信息。某个官方扩展面不可用时，插件按功能降级，不静默破坏其他功能。

首发验收必须包含：

- TypeScript 类型检查通过；
- 文件路径、符号链接、大小限制、重复注入和取消竞态测试通过；
- 输入历史、候选层仲裁、IME 保护、边界上下键和双次 Escape 测试通过；
- 真实 WebUI 手动验证通过；
- README 对源码 checkout 记录 DSH 兼容基线 commit；对 npm/npx 宿主记录 DSH 包版本/完整性信息，并记录 Node/包管理器前置条件和已知限制；
- 发布前用 `pnpm pack` 产物或已发布 npm 包，通过 `dsh plugin --profile <profile> add dsh-input-plus` 完成一次干净 profile 安装验证。

### Version and roadmap

- 首个可安装版本目标为 `v0.1.0`，只有实现、构建、干净 profile 安装和真实 WebUI 验收全部通过后才创建 tag 和 npm release。
- CHANGELOG 只记录已发布行为，不提前承诺具体后续日期。
- 后续路线只保留 GitHub Issues，不把 Slash、Skill、模板、跨会话持久化、拖拽附件和 Native 客户端放进 v0.1 发布承诺。

### Official references

- [DeepSeek Harness README](https://github.com/deepseek-ai/deepseek-harness)：Developer Preview 声明、`dsh-plugin` Topic 和基础启动方式。
- [Use the Web UI](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/index.md)：Web UI、workspace 和 session 使用前提。
- [Your first plugin](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/index.md)：本地插件与 `--patch` 加载方式。
- [Package and install a plugin](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)：`dsh.bundle`、`cordis.patch.yml`、profile 安装、npm/GitHub 发布和构建授权规则。

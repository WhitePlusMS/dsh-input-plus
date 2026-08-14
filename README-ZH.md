# dsh-input-plus

[English README](README.md)

DSH Web UI 的输入框增强插件。它在 Host 侧建立当前工作区的文件索引，
在浏览器侧接入 DSH 官方的 `@` 输入触发器，让你可以在组合框中搜索并插入
文件或目录路径。

本项目是独立的 DSH bundle plugin，由两部分组成：

- Host half：运行在 DSH Node 进程中，负责工作区解析、候选索引、路径安全和
  HTTP 接口。
- Web Client half：运行在浏览器中，负责 `@` 候选菜单、文件图标、输入历史和
  组合框状态提示。

插件不复制、修改或替换 DSH Harness，也不把文件内容读取后自动塞进用户消息。

![文件引用候选菜单](docs/image1.png)

## 当前功能

### `@` 文件和目录路径选择

在 DSH 组合框中输入 `@`，继续输入文件名、目录名或路径片段，候选菜单会列出
当前 Session 工作区内的文件和目录。选中后，输入框中保留普通文本引用，例如：

```text
@src/contract.ts
```

引用只保留路径，不会在发送时读取文件正文、展开目录或生成目录清单。模型需要查看
目标时，使用当前 Session 原生提供的工作区工具按需读取。

选中目录后可以继续输入操作：

```text
@src 查找负责候选排序的代码
```

官方输入触发器负责候选菜单、光标和写回行为；本插件不会替换官方 textarea、发送
按钮或候选菜单，也不会接管原生方向键行为。

### `/h` 和 `/history` 输入历史

在组合框中输入 `/h` 或 `/history`，会通过 DSH 官方的 `/` 输入触发器打开历史
候选菜单。可以继续输入关键词筛选，例如：

```text
/h Windows
```

候选项只显示当前 Session 中已经成功提交过的用户问题，按最近使用顺序排列。每项
左侧是历史符号，右侧显示较长的问题摘要，最多展示两行；历史菜单会使用和当前
组合框相同的可用宽度。点击候选项或按 Enter 后，完整问题会替换 `/h` 或
`/history`，不会自动发送，用户可以继续修改。

历史记录按当前 Session 隔离，最多 50 条，连续重复提交只保留一条。打开当前
Session 时，会先使用该 Session 已加载的用户消息初始化；之后的新问题只有在
`Session.prompt()` 被主机接受后才进入历史。助手回复、系统消息、插件内容和未发送
草稿不会进入历史。此功能不安装全局键盘监听，原生方向键仍由 DSH 处理。

如果控制台显示 `/h and /history input history source registered`，但菜单中没有
“输入历史”分组，说明入口已经加载，只是当前 Session 暂时没有可用历史。发送一条
普通问题并确认成功后，再输入 `/h` 即可看到；切换或重新加载到一个已有历史的
Session 时，已加载的用户问题会自动出现在列表中。发送失败的问题不会显示。

### 候选搜索和排序

- 不带 `/` 的普通查询按候选名称匹配：名称精确匹配、名称前缀匹配和名称包含匹配
  优先于父路径匹配。
- 包含 `/` 的查询按路径段顺序匹配。例如 `src/view` 可以匹配
  `src/client/view.ts`，`src/` 可以继续筛选 `src` 目录下的内容。
- 当前 Session 最近选中的路径优先展示。
- Git 工作区中已修改的路径在匹配等级相同时优先展示；非 Git 工作区不影响候选
  使用。
- 同一匹配等级下，浅层路径、普通名称和字典序优先。

每行候选显示“文件名 + 父目录路径”，并使用 DSH 已加载的 SVG 图标区分目录、
代码、数据、压缩包和普通文件。图标不使用 Emoji。

### 内置文件过滤

索引默认跳过常见的版本控制目录、依赖目录、构建输出、缓存和 IDE 元数据目录，
例如：`.git`、`.svn`、`.hg`、`.dsh`、`node_modules`、`.pnpm`、`dist`、
`build`、`coverage`、`.cache`、`.idea` 和 `.vscode`。

Windows 和 macOS 常见的系统元数据文件也会按文件名忽略，且不区分大小写：

- `desktop.ini`
- `Thumbs.db`
- `.DS_Store`

当前实现使用内置过滤集合，不提供 `ignoreDirs` 或可配置文件黑名单；这能保证
候选索引行为简单、稳定并避免系统文件污染菜单。

### 原生组合框状态提示

插件通过 DSH 官方的 `conversation.composer.dock` 附加座增加一行只读状态提示。
只有存在有用状态时才显示，例如：

- 当前草稿中的 `@` 引用数量；
- 图片附件数量；
- 排队消息数量；
- 运行中或输入处理中；
- 当前 Session 已关闭。

它不会显示冗余的工作区名称或草稿字数，也不会改变官方输入框的交互。

## 使用方式

1. 在组合框输入 `@`。
2. 输入文件名、目录名或路径片段，选择候选项。
3. 继续输入具体指令；选中路径后插件会保留一个空格作为后续文字的衔接。
4. 发送消息。

需要复用以前的问题时，在组合框输入 `/h` 或 `/history`，可继续输入关键词筛选，
再选择一条历史问题填回草稿。

发送的内容仍是用户输入的普通文本。插件不注入 `<file>`、目录清单或文件正文，
PDF、图片、二进制文件和普通文本文件在路径选择阶段没有区别，模型是否能读取它们
取决于当前 DSH Session 提供的原生工具。

## 路径和安全边界

- 默认以 `agent.session.header.cwd` 作为当前 Session 的工作区；也可以通过
  `referenceRoot` 指定绝对路径覆盖它。
- 浏览器只接收工作区相对路径、文件/目录类型和最小展示信息，不接收 Host 绝对
  路径或文件内容。
- 索引有目录深度和候选数量上限，避免一次扫描整个工作区。
- 绝对路径、空路径、包含 NUL 字符的路径以及逃出工作区的路径会被拒绝。
- 指向工作区外部的符号链接不会进入候选索引；路径解析会再次检查真实路径是否仍
  在工作区内。
- Host 提供同源的候选接口和路径解析接口，接口返回 JSON，不暴露文件正文。

## 安装

需要 DSH `0.1.0-rc.6` 或兼容的 DSH Web profile。通过 DSH 官方 profile 插件
流程安装：

```bash
dsh plugin --profile web add dsh-input-plus
```

如果使用其他 profile，将 `web` 替换为对应 profile 名称。安装或更新后重启 DSH
Web profile，使 Host bundle 和浏览器 Client bundle 一起重新加载。

插件是一个 bundle plugin，不需要把源码复制到 DSH Harness 目录，也不需要手写
额外的 Web Client 注入脚本。发布包通过 `cordis.patch.yml` 挂载 Host half，
`package.json` 中的 `dsh.client` 声明 Web Client half。

## 配置

插件注册的设置命名空间为 `input-plus`。当前实际参与工作区索引和路径解析的配置
如下：

| 配置项 | 默认值 | 范围 | 说明 |
|---|---:|---:|---|
| `maxIndexDepth` | `3` | `0–10` | 工作区索引的最大目录深度 |
| `maxIndexEntries` | `200` | `1–2000` | 每次候选索引最多保留的条目数 |
| `referenceRoot` | `''` | 绝对路径或空字符串 | 覆盖当前 Session 工作区；为空时使用 Session workspace |

这些限制只作用于候选路径索引。由于目录引用不会展开、文件不会在发送时读取，
当前版本没有 `maxFileBytes`、`maxTotalBytes` 或目录内容注入模式。

## 兼容性

当前兼容基线是 DSH `0.1.0-rc.6`。插件使用的官方扩展面包括：

- `ctx.inputTriggers`：注册 `@` 文件候选源；
- `ctx.inputTriggers`：注册 `/` 输入历史候选源；
- `ctx.settings`：注册 `input-plus` 设置；
- `ctx.webServer`：提供候选和路径解析接口；
- `conversation.input` 和 `sessions`：观察当前 Session 的官方提交状态；
- `conversation.composer.dock`：增加只读状态行。

官方输入框、发送按钮、候选菜单和键盘仲裁仍由 DSH 自己负责。插件不安装全局
键盘监听，也不占用 `conversation.composer.bar` 的单席位。

## 开发

环境要求：Node.js 18+、pnpm。

```bash
pnpm install

# TypeScript 类型检查
pnpm run typecheck

# 运行进程内测试
pnpm test

# 构建 Host 和浏览器 bundle
pnpm run build

# 检查 lib/client.js 是否与源码同步
pnpm run check:client
```

构建包括两部分：

- `tsc -p tsconfig.build.json` 生成 Host 代码和声明文件；
- `scripts/build-client.mjs` 使用 TypeScript Compiler API 在进程内生成
  `lib/client.js`，避免 esbuild 原生服务进程在受限环境中启动失败。

## 目录结构

```text
src/
  index.ts            Host 插件入口、设置和 HTTP 路由
  contract.ts         Host/Client 共享的最小通信契约
  host/
    files.ts          工作区索引、匹配和路径安全
    git.ts            Git 修改状态读取
    settings.ts       设置 schema 和默认值
    workspace.ts      Session 工作区解析
  client/
    index.ts          浏览器插件入口
    input-source.ts   @ 候选源和路径写回
    history-source.ts /h、/history 候选源和两行菜单样式
    history-recorder.ts 当前 Session 提交记录
    find.ts           Client 候选匹配和排序
    file-icons.ts     候选图标
    input-status.ts   composer status dock
scripts/
  build-client.mjs    浏览器 bundle 构建器
  test-runner.ts      进程内测试入口
```

## 许可证

MIT

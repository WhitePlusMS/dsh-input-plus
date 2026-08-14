# dsh-input-plus 当前上下文

## 当前状态（2026-08-14，实现完成）

- 已完成独立发布仓库的实现骨架与全部源码：Host half（`src/index.ts` + `src/host/*`）、Web Client half（`src/client/*`）、共享契约（`src/contract.ts`）、测试（`src/**/*.test.ts`）与构建脚本（`scripts/`）。
- 已初始化 Git 仓库（`git init -b main`），尚未生成提交与远程仓库。
- 单元测试全部通过（52/52）；Host 与 Client 均可构建（`lib/` 输出；Client 为进程内 bundler 生成的 `lib/client.js`）。
- 仍**未完成**：真实 profile 打包安装 + 真实 DSH WebUI 加载验证（08/09 集成与发布门禁）。键盘类能力（历史/双 Escape）在 rc.6 基线仅为已测纯逻辑，未接实时键盘缝。
- DSH 不属于本仓库；DSH 只作为外部宿主和兼容性验证环境。
- 不复制、软链接或修改 Harness 源码，不把插件目录放入 Harness checkout 内作为发布依赖。

## 产品边界

v0.1 只交付以下三项能力：

1. `@` 文本文件和目录引用；
2. 当前 Session 内存输入历史；
3. 非空草稿双次 Escape 清空，并可通过历史召回。

历史不跨刷新、Session、设备或云端保存；文件内容只由 Host 在发送前完成校验、读取和上下文注入。

## 官方接入契约

- 发布包的 `package.json` 声明 `dsh.bundle.patch`，并携带 `cordis.patch.yml`。
- Web Client 包的 `package.json` 同时声明 `dsh.client`，平台为 `web`，并通过 `exports["./client"]` 指向已构建的浏览器 bundle。
- Profile 由 `dsh plugin --profile <profile> add <package>` 创建和维护，Profile 自己的 `package.json` 声明 `dsh.profile`；不手写 Profile manifest。
- 验证层配置使用 `dsh --profile <profile> --dump-config`，启动使用同一 profile。
- 发布验收必须覆盖 npm/打包产物安装，不以本地源码目录可运行替代发布包验证。

## 兼容基线

- DSH 源码 checkout：记录 Harness Git commit、Node.js 版本、pnpm 版本和操作系统。
- DSH npm/npx：记录 DSH 包名、解析后的版本/锁定信息、Node.js 版本和操作系统；npm 安装不存在 Git commit 时，不虚构 commit 基线。
- 每个插件版本只承诺实际通过测试的 DSH 基线；官方扩展面缺失时按能力关闭并输出一次可行动诊断。

## 票据依赖

```text
01 → 02 → 03 → (04 → 05, 06 → 07) → 08 → 09
```

04/05 与 06/07 在 03 完成后可以并行；08 等待两条分支汇合。

## 参考文件

- `.scratch/dsh-input-plus/issues/`：实现票据；
- `research/`：官方扩展面和安全边界研究；
- `wayfinder/`：产品决策和发布边界；
- `prototype/dsh-input-plus-keyboard.html`：键盘交互原型。


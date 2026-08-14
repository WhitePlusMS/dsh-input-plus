# 更新说明

## 2026-08-14：完成发布仓库实现骨架（源码+测试+构建）

### 修改文件

- 新增 `src/contract.ts`：SessionId、RefKind、FileCandidate、契约信封、上限常量、路由常量等共享契约。
- 新增 `src/host/files.ts`（路径安全/索引/解析）、`src/host/mention.ts`（扫描/注入/清单）、`src/host/settings.ts`（schema）、`src/host/workspace.ts`（参考根解析）。
- 新增 `src/index.ts`：Host half（settings 注册、webServer 路由、`agent/pre-step` 注入）。
- 新增 `src/client/*`：`index.ts`（浏览器入口）、`bridge.ts`、`input-source.ts`（`@` 源）、`find.ts`（排序）、`keyboard.ts`/`history.ts`（纯状态机）。
- 新增测试 `src/**/*.test.ts` 与 `src/test/harness.ts`、`scripts/test-runner.ts`（进程内测试，规避 node:test 子进程 spawn EPERM）。
- 新增 `scripts/build-client.mjs`：进程内 TS 编译器 API 打包 Web Client，规避 esbuild 子进程 IPC 被沙箱拦截。
- 新增根发布文档 `README.md`、`CHANGELOG.md`、`LICENSE`（MIT）。
- 更新 `package.json`：`dsh.bundle.patch`/`dsh.client`、`exports`（`.`/`./client`/`./cordis.patch.yml`/`./package.json`）、脚本（typecheck/test/build/prepack）；依赖收敛为 `@deepseek-ai/schemastery` 运行时 + DSH peer/dev。
- 更新 `CONTEXT.md`：当前状态改为实现完成且测试/构建通过，明确发布验证待做。

### 修改原因

- 把规划与契约落实为可发布、可测试、可构建的独立仓库。
- 沙箱禁子进程（spawn EPERM）与 esbuild worker IPC，因此测试改为进程内 harness、Client 打包改为进程内 bundler。

### 修改影响

- 52/52 单测通过，`typecheck`/`build` 均可运行。
- 键盘类能力在 rc.6 基线仅交付已测纯逻辑（未接实时键盘缝），README 如实标注能力降级与基线缺口。
- 真实 profile 安装 + WebUI 加载验证仍是 08/09 的待办。

## 2026-08-14：补充独立仓库与官方 Bundle/Profile 规划

### 修改文件

- 新增 `CONTEXT.md`：记录当前真实工作区状态、产品边界、官方接入契约、兼容基线和票据依赖关系。
- 新增 `UPDATE_LOG.md`：建立项目代码与规划变更记录。
- 更新 `.scratch/dsh-input-plus/issues/01-dsh-compatibility-baseline.md`：区分 DSH 源码 checkout 与 npm/npx 运行时的兼容基线，明确验证使用外部 profile。
- 更新 `.scratch/dsh-input-plus/issues/02-official-bundle-bootstrap.md`：补充 `package.json`、`dsh.client`、`exports["./client"]` 和发布产物验收。
- 更新 `.scratch/dsh-input-plus/issues/08-integration-and-compatibility-gate.md`：补充 npm 打包产物安装和文件/目录引用端到端验收。
- 更新 `.scratch/dsh-input-plus/issues/09-official-release.md`：补充 Web Client manifest、打包内容和发布包验证要求。
- 更新 `research/dsh-input-plus-compatibility.md`：删除未被官方文档支持的 `dsh.plugin.json` 表述，统一为 `package.json`、`dsh.bundle`、`dsh.client`、`exports["./client"]` 和 Profile manifest。
- 更新 `wayfinder/tickets/05-harness-composition-and-compatibility.md`：区分源码 checkout 与 npm/npx 宿主的兼容基线。
- 更新 `wayfinder/tickets/06-release-surface-and-discoverability.md`：补充 Web Client manifest、npm/npx 兼容声明和打包产物安装验收。

### 修改原因

- 当前工作区尚未初始化 Git 仓库，不能把规划状态误写成已完成的独立仓库状态。
- 官方 Bundle、Profile 和 Web Client 是不同层次的 manifest，必须使用准确名称，避免实现阶段生成错误文件。
- npm 安装和源码 checkout 的可追溯信息不同，需要避免要求 npm 包提供不存在的 Git commit。
- 只有源码目录可运行不能证明发布包可安装，必须验证实际打包产物和真实 WebUI。

### 修改影响

- 规划阶段的真实状态和后续实现前提明确可核验。
- 票据会要求同时交付 Host bundle 和浏览器 Client bundle，避免安装成功但 WebUI 不加载。
- 兼容性声明可以分别覆盖源码运行和 npm/npx 运行，减少虚假版本承诺。
- 本次仅修改 Markdown 文档，没有初始化 Git、创建远程仓库、创建源码、修改依赖或修改 Harness。

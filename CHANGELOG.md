# Changelog — dsh-csv-sidebar

## 0.2.0 — 2026-09-22

标准格式重写。0.1.0 的客户端半边不符合 DSH 客户端模块契约，装进 profile 后**不会被加载**（无报错、无条目），本版按 plugin-framework 标准重做集成层。

### Fixed（集成层，全部是「不显示」的根因）

- 客户端产物改为 `window.__ModuleLoader__.load({ id, factory })` 的 CJS 闭包，工厂导出 `apply` + `inject`（此前是 ES module + `activate()`，模块表直接丢弃）。
- 注册接缝从 `ctx.sessionProjections` 改为 `ctx.betterSidebar.registerFileViewer / registerTab`（前者是宿主侧投影注册表，不是侧栏 UI 接缝）。
- 新增声明式 `inject = ['betterSidebar', 'locale']`：cordis 等两个服务就绪后才 apply，注册顺序不再影响结果。
- 所有安装项改走 `ctx.effect(fn, label)`，HMR / 禁用时由 disposer 回收（样式标签、字典、两个描述符）。
- 补齐元数据：`package.json#dsh.bundle.patch` + `dsh.client.platform/inject`、`exports` / `files` 清单、`screenshots.json`、`assets/`、`tsconfig*.json`。
- peer 上限统一为 `<0.2.0-0`，避开 semver 预发布比较陷阱；`dsh-better-sidebar` / `react` 标 optional。

### Added

- **文件预览器接缝**：`.csv/.tsv/.psv`（priority 50、`fetchStrategy: 'fsRead'`）纳入 GUI 的「文件预览」清单，可在 Side 卡设置里开关；宿主负责读取，路径围栏留在宿主侧。
- **构建期加载门禁**：用 `node:vm` + 桩 `window.__ModuleLoader__` 真加载产物，断言 `id`、`factory()` 的 `apply`/`inject`，并拒绝 Node 内置模块请求。
- **12 项核心断言**（`npm test`，退出码 0/1）：RFC 4180 引用与转义、分隔符嗅探、四维熔断、宿主截断标记、空行与空文档。
- 自有 i18n 命名空间 `dsh-csv-sidebar`（zh/en），`locale` 缺席时回退内置英文字典。
- `--dsw-alias-*` 语义 token 样式（不再依赖不存在的 `--border-color` 等变量）。

### Changed

- **零运行时依赖**：移除 PapaParse，改用本地引用感知扫描器（RFC 4180，支持跨行字段）；bundle 只 externals React（43 KB）。
- 构建从 Vite 换成 esbuild 双入口（`lib/index.mjs` + `lib/client.js`），并补 tsc 类型声明。
- 熔断语义收紧：`previewRows` 预算耗尽时**显式升级为 `rows` 警告**（不再静默只显示前 200 行）；`finalize()` 的双 `OK` 分支合并。
- 源码按标准结构移入 `src/client/`；宿主半独立为 `src/index.ts`。

### Removed

- `vite.config.ts`、`papaparse` 依赖、旧扁平 `src/*.tsx` 组件、指向 `./lib/client.js` 的错误 `main` 字段写法。

## 0.1.0 — 2026-09-22

首个原型：`npm run dev` 的 `demo.html` 验证了表格交互与四维熔断的观感，随后包装为插件。**该版本的插件封装不会在 DSH 中加载**（见 0.2.0 Fixed）。

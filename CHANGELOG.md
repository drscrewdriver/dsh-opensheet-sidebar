# Changelog — dsh-csv-sidebar

## 0.3.0 — 2026-09-22

xlsx 支持（含**工作表切换**）。零依赖：zip 解压走浏览器原生 `DecompressionStream('deflate-raw')`，XML 用针对性扫描而非通用解析器。

### Added

- **工作簿预览器**：`.xlsx` / `.xlsm` 以表格打开，顶部一排 sheet 标签可切换；隐藏工作表（`state="hidden"`）在标签上弱化，默认自动打开第一个可见表。
- **xlsx 读取器**（`src/client/xlsx.ts`）：zip 中央目录解析（正确处理 data-descriptor 场合，尺寸只信中央目录）→ `xl/workbook.xml` 表清单 → `_rels` rId→part → `sharedStrings.xml`（富文本 run 拼接）→ `styles.xml`（`cellXfs` → numFmtId → 日期识别）→ 按需解压单个 `worksheets/sheetN.xml`。
- **单元格处理**：共享字符串 / 内联字符串 / 公式缓存值（`t="str"`）/ 布尔 / 错误值 / 数字；按 `r="C3"` 还原**列空洞**（缺列不会把后一列左移）；日期序列号按 1900/1904 纪元转成可读日期。
- **两道容器闸门**（此前的大小闸门对 zip 等于没有防护）：
  - **声明的解压体积**先于任何解压动作核对（zip 头可伪造，所以这是确定性前置拒绝）；
  - **流式解压字节预算**兜底，边解压边计数，越界即 `cancel()`。
  一个工作表单独超限只挡这个表，兄弟表照常可读。
- 新增警告文案 `inflated-bytes` / `sheet-bytes` / `container-error`（zh/en）。
- **测试**：`tests/xlsx.test.mjs` 现场构造真实 zip 夹具（含 CRC32 与正确的中央目录）——表清单与隐藏标记、共享字符串、日期单元格、列空洞、跨表切换、伪造体积的 zip 炸弹、非 zip 输入；11 项断言，退出码 0/1。

### Fixed

- **警告占位符不再裸露**：预览预算耗尽（第 201 行）时警告在 `found` 未知的情况下生成，界面直接显示 `共至少 {found} 行`。现在 `finalize()` 回填实际统计行数。
- 新增**占位符完整性门禁**（两个测试套件各一份）：遍历各维度真实产生的警告，断言 zh/en 模板里每个 `{name}` 都能在 detail 中找到，否则红灯。这类 bug 不会再靠肉眼发现。

### Changed

- 熔断配置新增两个阈值：`maxInflatedBytes`（默认 64 MB）、`maxSheetBytes`（默认 32 MB）。
- 状态栏：工作簿显示工作表名标签，不再误显示「分隔符」。
- xlsx 查看器走 `fetchStrategy: 'custom'` + 宿主 `/sidebar/file` 路由取原始字节（`fsRead` 对二进制只回 `head`，无法用于解析）；工作区路径围栏仍在宿主侧。

### Not supported (yet)

- `.xls`（Excel 97-2003 BIFF8）与 WPS 旧格式 `.et` / `.wps` / `.dps`：同属 OLE2 复合文档，零依赖实现成本高（需自建 CFB + BIFF 解析）。要覆盖就得引入 SheetJS（~1 MB，且 npm 上版本停更），与零依赖准则冲突 —— 待单独评估。

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

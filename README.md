# dsh-opensheet-sidebar

右侧栏表格预览插件（[dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) 消费者）：`csv` / `tsv` / `psv` 与 `xlsx` / `xlsm` 都以结构化表格打开，带**熔断保护**——任何输入都不能让侧栏卡死。

> **名字是双关，写在这里免得被当成拼写错误**：`OpenSheet` 同时读作「**打开**表格」（open the sheet，动词）与「**开放标准**的表格」（open-standard sheet —— OpenDocument 那一系的开源表格格式）。一个词说清了它做的两件事：打开，以及用一种不依赖专有库的方式读。
>
> 边界：双关只活在**名字**里。功能字段一律保持字面意思 —— `exts` 只填真实后缀（`csv`/`tsv`/`psv`/`xlsx`/`xlsm`），协议字段不塞品牌词。

> **v0.2.0 是一次集成方式的重写**：v0.1.0（当时名 `dsh-csv-sidebar`）的客户端半边不是 DSH 的客户端模块契约（ES module + `activate()` + `ctx.sessionProjections`），因此**装上去也不会显示**。0.2.0 按 plugin-framework 标准重做，见下「为什么 v0.1.0 不显示」。

---

## 一、它做了什么

| 接缝 | 注册内容 | 用户看到什么 |
|------|---------|-------------|
| **文件预览器** `registerFileViewer` | `exts: ['csv','tsv','psv']`、`priority: 50`、`fetchStrategy: 'fsRead'` | 在资源管理器里点开 `.csv` → 直接是**表格**，不是原始文本；可在 Side 卡设置里开关，关掉即回到内置文本查看器 |
| **手动 tab** `registerTab` | `order: 70`、`single: true` | `+` 菜单里的 **CSV** 页：拖拽/点选本地文件，此时**真实字节数已知**，超大文件在读之前就被拒绝 |

两者共用同一个渲染体（警告栏 → 统计栏 → 表格 → 底部操作），差别只在文本从哪来。

**交互能力**（对齐「结构化数据不得降级为纯文本」）：点击表头排序（升 → 降 → 取消）、子串过滤、数值列右对齐（按样本推断）、列类型识别（number / date / boolean / text）、sticky 表头与行号列、空值与唯一值统计。

---

## 二、四维熔断

| 维度 | 默认上限 | 越界后的行为 |
|------|---------|-------------|
| 文件大小 | 5 MB | **BLOCKED** —— 本地文件连 `file.text()` 都不调用；宿主读取的文本直接拒绝 |
| 数据行数 | 10 000 | **TRUNCATED** —— 读**到**上限即停，不做完整解析 |
| 列数 | 100 | 多余列丢弃 + 警告 |
| 单元格文本 | 10 KB | 该单元格省略为 `前200字符… (+N chars)` + 警告 |

另有 `previewRows: 200`：表格只保留前 200 行的 DOM 预算。第 201 行到来时**不静默**——升级为 `rows` 警告并置 `TRUNCATED`。

> 熔断结果是一等公民，不是错误页：横幅逐条写明**哪个上限触发、实测值多少、上限多少**，表格照常渲染（BLOCKED 时显示明确的阻止说明）。四种状态 `OK / TRUNCATED / BLOCKED` + `READING` 全是可渲染产出，永不抛异常、永不无限转圈。

---

## 三、标准格式对照（plugin-framework）

| 标准要求 | 本插件 |
|---------|--------|
| 双半结构 | `src/index.ts`（宿主半，空 apply）+ `src/client/index.tsx`（浏览器半） |
| 客户端模块契约 | 构建产物为 `window.__ModuleLoader__.load({ id, factory })` CJS 闭包，导出 `apply` + `inject`；**构建期用 `node:vm` 真加载一次并断言导出** |
| `inject` 声明式注入 | `export const inject = ['betterSidebar', 'locale']` —— cordis 等两个服务就绪后才 apply，注册顺序无关 |
| 生命周期 | 所有安装项都走 `ctx.effect(fn, label)`，HMR/禁用时由返回的 disposer 回收 |
| 设置席位/命令注册 | 本插件不注册设置席位、不注册 `/` 命令（故不涉及 seat-pin 与 description 函数契约） |
| `dsh.bundle` manifest | `package.json#dsh.bundle.patch` + `dsh.client.platform/inject` |
| `cordis.patch.yml` | 纯 insert 一行，注释写明 CLI / 手动两种安装方式 |
| peerDependencies | `@deepseek-ai/*` 用 `>=0.1.5-rc.1 <0.2.0-0`（`-0` 上限，避开预发布 semver 陷阱）；`dsh-better-sidebar` / `react` 标 optional |
| 目录结构 | `src/ lib/ assets/ tests/ scripts/` + `screenshots.json` + `dsh.plugin.json` + README/CHANGELOG |
| 零依赖 | **无运行时依赖**：CSV 解析器与熔断器都是本地模块，客户端 bundle 只 externals React（43 KB） |
| 样式 | 无 CSS 入口 → `styles.css` 由构建内联为字符串，`apply` 里插入一个 `<style>` 并登记 disposer；配色全用 `--dsw-alias-*` 语义 token |
| 多语言 | 自有命名空间 `dsh-opensheet-sidebar`，zh/en 字典经 `locale.register(NS, tag, dict)` 注册；缺服务时回退内置英文字典，缺 key 时渲染 key 本身（可见而非空白） |
| 软依赖纪律 | 不 import `dsh-better-sidebar` 任何值/类型（`seams.ts` 只做结构声明）；`betterSidebar` 缺席时**响亮 warn 并保持惰性**，不注册半个面板 |

---

## 四、为什么 v0.1.0 不显示（根因）

v0.1.0 装进 profile 后 `cordis.patch.yml` 已登记、`node_modules` 也在，但侧栏毫无动静，**且控制台无报错**——因为它在客户端模块加载阶段就被丢弃了：

| # | v0.1.0 的写法 | 标准契约 | 后果 |
|---|--------------|---------|------|
| 1 | `lib/client.js` 是 **ES module**（`export function activate`） | `window.__ModuleLoader__.load({ id, factory })` 的 CJS 闭包 | 模块表拿不到导出 → **整包静默不加载** |
| 2 | 入口导出 `activate(ctx)` | 导出 **`apply(ctx)`** | 即使加载也找不到入口 |
| 3 | 没有 `inject` | `export const inject = [...]` | cordis 不等待 `betterSidebar`，注册时机随机 |
| 4 | 注册到 `ctx.sessionProjections.register({key,badge,component})` | `ctx.betterSidebar.registerTab / registerFileViewer` | **打错接缝**：`sessionProjections` 是宿主侧投影注册表，不是侧栏 UI 接缝 |
| 5 | 无 `ctx.effect`；`package.json` 无 `dsh.bundle` / `dsh.client` / `exports` / `files`；peer 上限写 `>=0.1.5-rc.1`（无上界） | 见上表 | 无 HMR 回收；元数据不完整 |

> 一句话：**不是「没生效」，是「没被加载」**。这也解释了为什么「文件预览」系统里看不到它的条目——那个清单就是 `registerFileViewer` 的注册表。

---

## 五、构建与验证

```bash
npm run build     # esbuild 双入口 + tsc 类型声明；构建期真加载一次 bundle 并断言 apply/inject
npm test          # 25 项断言：14 csv（解析/引用/分隔符/四维熔断/占位符完整性/警告去重）+ 11 xlsx（zip/XML/工作表/两道容器闸门）
npm run verify    # build && test
```

`npm test` 实测输出（2026-09-22）：

```
dsh-opensheet-sidebar :: csv core
  ok  plain CSV parses to headers + rows
  ok  quoted delimiter, doubled quote and embedded newline survive
  ok  semicolon and tab files are sniffed, not assumed
  ok  oversized text is BLOCKED before parsing
  ok  oversized local File is BLOCKED without file.text()
  ok  row ceiling truncates and stops the reader early
  ok  the reader really stops: rows past the ceiling are never visited
  ok  column ceiling drops extra columns and warns
  ok  an oversized cell is elided, not dropped silently
  ok  a host-capped read is reported as truncated
  ok  blank lines and a trailing newline never mint rows
  ok  an empty document is OK with zero rows (never a throw)

dsh-opensheet-sidebar :: 12 checks passed, 0 failed
```

构建期门禁（`scripts/build.mjs`）在写出产物后：用 `node:vm` + 桩 `window.__ModuleLoader__` 真跑一遍 bundle，断言 `load()` 被调用、`id` 等于包名、`factory()` 返回带 `apply` 与 `inject` 的对象；并拒绝任何 Node 内置模块请求。**加载不了的 bundle 在构建阶段就红灯，不会带病进宿主。**

---

### 5.1 xlsx 夹具与自检（`demo/xlsx/`）

夹具由脚本生成，不提交二进制：固定随机种子、字节稳定，且**每个文件只负责触发一条路径**。

```bash
python scripts/make-xlsx-fixtures.py --out ../demo/xlsx   # 需要 openpyxl（dev-only）
node scripts/report-fixtures.mjs ../demo/xlsx             # 用插件自己的读取器跑一遍并打印所见
```

| 文件 | 体积 | 触发 |
|------|------|------|
| `basic-3sheets.xlsx` | 8 KB | 3 个工作表（其一隐藏）· 真实日期格式 · 布尔 · 列空洞 · 无缓存值的公式 |
| `wide-150cols.xlsx` | 15 KB | 列上限（150 > 100）→ `cols` |
| `long-12000rows.xlsx` | 286 KB | 行上限 + 预览预算 → `rows`（**单条**，含 found/kept/limit） |
| `long-cell-20k.xlsx` | 5 KB | 单元格上限（20 000 > 10 240）→ `cell-length` |
| `deep-sheet-60k.xlsx` | 1.7 MB | **归档小、解压 56.7 MB** → `sheet-bytes`（解压前就拒绝） |
| `big-archive.xlsx` | 8.5 MB | 归档本身超 5 MB → `file-size`（BLOCKED） |

`report-fixtures.mjs` 的输出就是「这套夹具各司其职」的证据；它跑在真实 Excel 写入器（openpyxl）产出的文件上，因此也覆盖了合成夹具覆盖不到的自定义日期格式路径（`2026-01-08` 而非序列号 `46030`）。

## 六、安装

**方式 A（推荐）：官方 CLI** —— 它会把依赖与 `dsh.profile.bundles` 一起维护好

```bash
dsh plugin --profile <profile> add <path-to-plugin>
```

**方式 B：手动（三步，缺一不可）**

```bash
# 1) 复制本包
#    → ~/.dsh/profiles/<profile>/node_modules/dsh-opensheet-sidebar
# 2) 把 "dsh-opensheet-sidebar" 加进该 profile package.json 的 dsh.profile.bundles 数组
# 3) 把本包 cordis.patch.yml 的 insert 行追加到该 profile 的 cordis.patch.yml
```

> ⚠️ **第 2 步是最容易漏、且漏了完全静默的一步。** bundle 层只在 profile 的
> `dsh.profile.bundles` 列到本包时才被合成；只做第 1、3 步的结果是：包装好了、
> `cordis.patch.yml` 里也有 `- id: dsh-opensheet-sidebar`，但那一行**没有可作用的行可打**——
> 插件不加载，控制台一声不响。第 3 步的 `disabled: false` 只是「把已插入的行显式启用」，
> 它本身不会插入任何行。

**装完先验证再重启**（不启动任何服务）：

```bash
dsh --profile <profile> --dump-config | Select-String dsh-opensheet-sidebar
# 期望看到：
#   # == dsh-opensheet-sidebar, patched by ...\cordis.patch.yml
#   - id: dsh-opensheet-sidebar
#     name: dsh-opensheet-sidebar
#     disabled: false
```

看到这三行 = 行已插入 + profile 补丁已生效，此时**重启 DSH**即可（profile bundle 与客户端模块表都在启动时合成，仅刷新页面不够）。
看不到 = 第 2 步没生效。

**依赖**：`dsh-better-sidebar >= 0.18.1`（可选）。缺席时插件正常加载、控制台 warn、不贡献任何条目。

---

## 七、版本兼容矩阵

| 插件版本 | DSH | 说明 |
|---------|-----|------|
| 0.3.0 | `>=0.1.5-rc.1 <0.2.0-0` | 增加 xlsx/xlsm 工作簿预览（工作表切换）+ 两道 zip 容器闸门 + 占位符完整性门禁 |
| 0.2.0 | `>=0.1.5-rc.1 <0.2.0-0` | 标准格式重写：`__ModuleLoader__` + `apply/inject/effect` + better-sidebar 双接缝 |
| 0.1.0 | — | 集成方式不合契约，**不会加载**，已废弃 |

## 八、已知边界

- 表格不做虚拟滚动：DOM 预算由 `previewRows` 硬控，规模再大也只是「更早截断」，不会变慢。
- 宿主 `fsRead` 会自行截断大文件，此时统计栏显示 `≈` 与「宿主已截断读取」标签，`state = TRUNCATED`——**不谎报为完整文件**。
- 仅预览，不写回：不提供编辑与保存。

## 九、xlsx 支持（含工作表切换）

`.xlsx` / `.xlsm` 以同一套表格渲染打开，顶部一排 **sheet 标签**可切换；隐藏表（`state="hidden"`）在标签上弱化，默认自动打开第一个可见表。零运行时依赖。

### 9.1 接缝：为什么必须换一套读取路径

工作簿是二进制，而 `fetchStrategy: 'fsRead'` 对二进制只回 `{kind:'binary', size, truncated, head}` —— **没有 content**，喂不了解析器。所以 xlsx 是**独立注册**的预览器：

```
fetchStrategy: 'custom'
load: fetch(`/sidebar/file?sessionId=..&cwd=..&path=..`) → arrayBuffer → Uint8Array
```

走宿主自己的原始字节路由，工作区路径围栏因此仍在宿主侧（我们不自己读文件）。CSV 那条 `fsRead` 路径保持不动。

### 9.2 解析管线（`src/client/xlsx.ts`）

```
zip 中央目录 → xl/workbook.xml（表清单 / 顺序 / 隐藏）
             → xl/_rels/workbook.xml.rels（rId → part）
             → xl/sharedStrings.xml（富文本 run 拼接）
             → xl/styles.xml（cellXfs → numFmtId → 是否日期）
             → xl/worksheets/sheetN.xml（点哪个表解哪个）
```

单元格覆盖：共享字符串 / 内联字符串 / 公式缓存值（`t="str"`）/ 布尔 / 错误值 / 数字；按 `r="C3"` **还原列空洞**（缺失的列不会把后一列左移）；日期序列号按 1900 与 1904 两种纪元转成可读日期。

解压用浏览器原生 `DecompressionStream('deflate-raw')`；XML 用针对性扫描——xlsx 的 XML 是机器生成的规整结构，上下通用解析器是浪费。

### 9.3 两道容器闸门（对 zip 来说，大小闸门等于没防护）

| 闸门 | 时机 | 默认 | 作用 |
|------|------|------|------|
| **声明的解压体积** | 任何解压动作**之前**，读中央目录 | 单 part 32 MB | zip 头可伪造，所以这是确定性前置拒绝 |
| **流式字节预算** | 解压过程中累计 | 总计 64 MB | 头部撒谎时的兜底；越界立刻 `cancel()` |

一个工作表单独超限**只挡这个表**，兄弟表照常打开。容器本身不可读（非 zip / 缺 part）→ `container-error`，渲染成一张可读的错误卡，而不是抛异常。

### 9.4 尚未支持

`.xls`（Excel 97-2003 BIFF8）与 WPS 旧格式 `.et` / `.wps` / `.dps`：都是 OLE2 复合文档，零依赖需要自建 CFB(FAT/directory) + BIFF 解析，成本高且易错。要覆盖通常就得引 SheetJS（~1 MB，且 npm 上版本停更、新版只在官方 CDN 发），与零依赖准则冲突 —— 需要时单独评估。

> 注意区分：**WPS 表格默认保存的 `.xlsx` 就是标准 xlsx**，本插件直接支持；只有「另存为 WPS 旧格式」产出的 `.et` 才在未支持之列。

## 十、发布与身份迁移（脚本样例）

两个脚本各管一半：**发布**在开发机，**迁移**在装插件的 profile。都支持 `-DryRun`（唯一可反复运行的模式），都是遇到第一个失败就停、绝不「照发不误」。

```powershell
# ① 发布侧：构建 + 测试 + 身份门禁 + 打包清单，然后才真发（--access public，官方 registry）
pwsh -File scripts/publish-npm.ps1 -DryRun                # 先看
pwsh -File scripts/publish-npm.ps1                        # 再发
pwsh -File scripts/publish-npm.ps1 -DeprecateOld dsh-csv-sidebar   # 可选：给旧名打 deprecate

# ② 消费侧：装新身份 → 摘旧身份 → 换 profile 补丁行 id → 逐项验证
#    -NewSpec 必须是「今天真的能解析到」的 spec —— 脚本会在改动任何东西之前先预检。
#    本包目前只在 GitHub（npm 上尚不存在），所以用 github: 形态：
pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'github:drscrewdriver/dsh-opensheet-sidebar#<sha>' -DryRun
pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'github:drscrewdriver/dsh-opensheet-sidebar#<sha>'
#    发布到 npm 之后再切成 registry 形态（在那之前这条会被预检挡下）：
#    pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'dsh-opensheet-sidebar@1.0.0'
```

**预检（preflight）**：`-NewSpec` 先解析再动手 —— npm 形态走 `npm view <name>[@range]`，`github:` 形态走 `git ls-remote`（40 位 SHA 无法按名查询，故验证仓库可达性，SHA 本身交由安装步骤校验），本地形态查 `package.json`。解析不到就在备份之前中止，退出码 1 —— 免得一条"看起来能用"的样例跑到一半才失败。

也可以走 npm script 别名：

```powershell
npm run publish:npm -- -DryRun
npm run profile:migrate -- -Profile web -NewSpec 'dsh-opensheet-sidebar@1.0.0' -DryRun
```

### 10.1 为什么顺序是「先装新、再摘旧」

改名要同时改四处，而**漏任何一处都是静默失败**（不是报错）：profile 依赖 spec、`dsh.profile.bundles`（由 CLI 的 reconcile 维护，不手工改）、profile `cordis.patch.yml` 的 row id（针对不存在 id 的补丁是空操作）、`node_modules` 里的目录。

先装新的、再摘旧的，任何一步失败都留下一个**还能用的插件**，而不是一个空 profile。两次 pnpm 调用都会自动重试一次 —— 宿主在跑时 `node_modules` 被占用，首次可能抛 `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR`。

### 10.2 脚本里的三个 PowerShell 5.1 坑（复用时可省半小时）

| 坑 | 现象 | 写法 |
|----|------|------|
| 原生命令 + `2>` 重定向 + `$ErrorActionPreference='Stop'` | npm 的 stderr 警告被提升为**终止错误**，脚本在第 2 步莫名死掉 | 调用前临时放宽为 `Continue`，`2>&1 \| Out-String` 合并流，再读 `$LASTEXITCODE` |
| `param()` 默认值里的 `$PSScriptRoot` | 求值时还是空串 → `Split-Path` 参数校验失败 | 默认写成 `''`，在脚本体里解析 |
| `Where-Object` 结果的 `.Count` | 命中 1 条是 string（无 `.Count`）、0 条是 `$null`，`Set-StrictMode` 下直接报 `PropertyNotFound` | 一律套 `@(...)` 再取 `.Count` |

发布脚本另外带两道**上传前后都该有的门禁**：名字必须「空闲或属于自己」（`npm view` + `maintainers` 对比 `npm whoami`，防止改到一个别人占用的名字上），以及没有登录会话时直接拒绝（而不是等一个 401）。

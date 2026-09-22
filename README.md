# dsh-csv-sidebar

右侧栏 CSV 结构化预览插件（[dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) 消费者），带**四维熔断保护**：任何输入都不能让侧栏卡死。

> **v0.2.0 是一次集成方式的重写**：v0.1.0 的客户端半边不是 DSH 的客户端模块契约（ES module + `activate()` + `ctx.sessionProjections`），因此**装上去也不会显示**。0.2.0 按 plugin-framework 标准重做，见下「为什么 v0.1.0 不显示」。

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
| 多语言 | 自有命名空间 `dsh-csv-sidebar`，zh/en 字典经 `locale.register(NS, tag, dict)` 注册；缺服务时回退内置英文字典，缺 key 时渲染 key 本身（可见而非空白） |
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
npm test          # 12 项核心断言（解析 / 引用 / 分隔符 / 四维熔断 / 宿主截断 / 空文件）
npm run verify    # build && test
```

`npm test` 实测输出（2026-09-22）：

```
dsh-csv-sidebar :: csv core
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

dsh-csv-sidebar :: 12 checks passed, 0 failed
```

构建期门禁（`scripts/build.mjs`）在写出产物后：用 `node:vm` + 桩 `window.__ModuleLoader__` 真跑一遍 bundle，断言 `load()` 被调用、`id` 等于包名、`factory()` 返回带 `apply` 与 `inject` 的对象；并拒绝任何 Node 内置模块请求。**加载不了的 bundle 在构建阶段就红灯，不会带病进宿主。**

---

## 六、安装

**方式 A（推荐）：官方 CLI** —— 它会把依赖与 `dsh.profile.bundles` 一起维护好

```bash
dsh plugin --profile <profile> add <path-to-plugin>
```

**方式 B：手动（三步，缺一不可）**

```bash
# 1) 复制本包
#    → ~/.dsh/profiles/<profile>/node_modules/dsh-csv-sidebar
# 2) 把 "dsh-csv-sidebar" 加进该 profile package.json 的 dsh.profile.bundles 数组
# 3) 把本包 cordis.patch.yml 的 insert 行追加到该 profile 的 cordis.patch.yml
```

> ⚠️ **第 2 步是最容易漏、且漏了完全静默的一步。** bundle 层只在 profile 的
> `dsh.profile.bundles` 列到本包时才被合成；只做第 1、3 步的结果是：包装好了、
> `cordis.patch.yml` 里也有 `- id: dsh-csv-sidebar`，但那一行**没有可作用的行可打**——
> 插件不加载，控制台一声不响。第 3 步的 `disabled: false` 只是「把已插入的行显式启用」，
> 它本身不会插入任何行。

**装完先验证再重启**（不启动任何服务）：

```bash
dsh --profile <profile> --dump-config | Select-String dsh-csv-sidebar
# 期望看到：
#   # == dsh-csv-sidebar, patched by ...\cordis.patch.yml
#   - id: dsh-csv-sidebar
#     name: dsh-csv-sidebar
#     disabled: false
```

看到这三行 = 行已插入 + profile 补丁已生效，此时**重启 DSH**即可（profile bundle 与客户端模块表都在启动时合成，仅刷新页面不够）。
看不到 = 第 2 步没生效。

**依赖**：`dsh-better-sidebar >= 0.18.1`（可选）。缺席时插件正常加载、控制台 warn、不贡献任何条目。

---

## 七、版本兼容矩阵

| 插件版本 | DSH | 说明 |
|---------|-----|------|
| 0.2.0 | `>=0.1.5-rc.1 <0.2.0-0` | 标准格式重写：`__ModuleLoader__` + `apply/inject/effect` + better-sidebar 双接缝 |
| 0.1.0 | — | 集成方式不合契约，**不会加载**，已废弃 |

## 八、已知边界

- 表格不做虚拟滚动：DOM 预算由 `previewRows` 硬控，规模再大也只是「更早截断」，不会变慢。
- 宿主 `fsRead` 会自行截断大文件，此时统计栏显示 `≈` 与「宿主已截断读取」标签，`state = TRUNCATED`——**不谎报为完整文件**。
- 仅预览，不写回：不提供编辑与保存。

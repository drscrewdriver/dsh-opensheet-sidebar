/**
 * Plugin-owned dictionaries, registered through the DSH locale service under
 * our own namespace (`locale.register(NS, tag, dict)`). Consumer plugins must
 * not reach into another plugin's namespace, so every string this plugin
 * renders is ours.
 *
 * `en` is the fallback dictionary; a missing key renders the key itself, never
 * a blank, so a translation gap is visible instead of silent.
 */

/** Namespace for every key below. */
export const NS = 'dsh-csv-sidebar'

/** The two built-in languages this plugin ships. */
export const dictionaries: Record<string, Record<string, string>> = {
  en: {
    'tab.title': 'CSV',
    'tab.desc': 'Open a CSV/TSV/PSV or xlsx file from disk and inspect it as a table',
    'viewer.title': 'CSV table',
    'viewer.xlsx.title': 'Spreadsheet table',
    'sheet.list': 'Worksheets',
    'sheet.hidden': 'This sheet is hidden in the workbook',

    'picker.title': 'Drop a CSV file here',
    'picker.active': 'Release to load',
    'picker.hint': 'or click to choose · .csv / .tsv / .psv',
    'picker.invalid': 'That is not a .csv / .tsv / .psv file',

    'state.loading': 'Parsing…',
    'state.error': 'Could not parse this file',
    'action.retry': 'Retry',
    'action.openAnother': 'Open another file',

    'stats.rows': 'rows',
    'stats.cols': 'cols',
    'stats.previewOf': '{shown} of {total} previewed',
    'stats.delimiter': 'delimiter',
    'stats.sheet': 'sheet',
    'stats.tab': 'TAB',
    'stats.truncatedSource': 'host-capped read',

    'warning.blockedTitle': 'Too large to load — blocked before reading',
    'warning.truncatedTitle': 'Data truncated to keep the tab responsive',
    'warning.file-size': 'File is {found} — the ceiling is {limit}',
    'warning.rows': '{kept} of at least {found} rows previewed (row ceiling {limit})',
    'warning.cols': '{found} columns found — only the first {limit} are shown',
    'warning.cell-length': 'A cell held {found} characters — elided at {limit}',
    'warning.source-truncated': 'The host capped this read, so the table is a head of the file',
    'warning.parse-error': 'The document is malformed: {message}',
    'warning.inflated-bytes': 'This workbook unpacks to {found} — past the {limit} budget, so it was refused',
    'warning.sheet-bytes': 'One worksheet unpacks to {found} — past its {limit} ceiling',
    'warning.container-error': 'This workbook cannot be read: {message}',

    'table.filter': 'Filter rows…',
    'table.filtered': '{shown} / {total}',
    'table.empty': 'Nothing to show',
    'table.emptyHint': 'The file has no data rows',
    'table.blocked': 'Blocked by the circuit breaker',
    'table.blockedHint': 'This file exceeds the size ceiling. Narrow it down first (head / split / export).',
    'table.rows': '{n} rows',
    'table.clearSort': 'Clear sort',
    'table.index': '#',
    'table.sortHint': 'Click to sort',
    'table.column': 'column {n}',
  },
  zh: {
    'tab.title': 'CSV',
    'tab.desc': '打开磁盘上的 CSV/TSV/PSV 或 xlsx 文件，以表格形式查看',
    'viewer.title': 'CSV 表格',
    'viewer.xlsx.title': '表格 (xlsx)',
    'sheet.list': '工作表',
    'sheet.hidden': '该工作表在工作簿中被隐藏',

    'picker.title': '把 CSV 文件拖到这里',
    'picker.active': '释放以加载',
    'picker.hint': '或点击选择 · .csv / .tsv / .psv',
    'picker.invalid': '这不是 .csv / .tsv / .psv 文件',

    'state.loading': '正在解析…',
    'state.error': '解析失败',
    'action.retry': '重试',
    'action.openAnother': '打开其他文件',

    'stats.rows': '行',
    'stats.cols': '列',
    'stats.previewOf': '预览 {shown} / {total}',
    'stats.delimiter': '分隔符',
    'stats.sheet': '工作表',
    'stats.tab': 'TAB',
    'stats.truncatedSource': '宿主已截断读取',

    'warning.blockedTitle': '文件过大，已在读取前阻止',
    'warning.truncatedTitle': '数据已截断，以保证侧栏不卡死',
    'warning.file-size': '文件 {found}，上限 {limit}',
    'warning.rows': '共至少 {found} 行，已预览前 {kept} 行（行数上限 {limit}）',
    'warning.cols': '检测到 {found} 列，仅显示前 {limit} 列',
    'warning.cell-length': '某单元格有 {found} 字符，已在 {limit} 处省略',
    'warning.source-truncated': '宿主已截断本次读取，表格只是文件的开头部分',
    'warning.parse-error': '文档格式异常：{message}',
    'warning.inflated-bytes': '该工作簿解压后达 {found}，超过 {limit} 的解压预算，已拒绝加载',
    'warning.sheet-bytes': '某个工作表解压后达 {found}，超过 {limit} 上限',
    'warning.container-error': '无法读取该工作簿：{message}',

    'table.filter': '过滤行…',
    'table.filtered': '{shown} / {total}',
    'table.empty': '没有可显示的数据',
    'table.emptyHint': '该文件没有数据行',
    'table.blocked': '已被熔断器阻止',
    'table.blockedHint': '文件超过大小上限，请先切分或导出子集。',
    'table.rows': '{n} 行',
    'table.clearSort': '清除排序',
    'table.index': '#',
    'table.sortHint': '点击排序',
    'table.column': '第 {n} 列',
  },
}

/** Values substituted into a `{placeholder}` template. */
export type TVars = Record<string, string | number>

/** A translate function bound to the plugin namespace. */
export type T = (key: string, vars?: TVars) => string

/** Substitute `{name}` placeholders; unknown placeholders stay literal. */
export function interpolate(template: string, vars?: TVars): string {
  if (vars === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name]
    return value === undefined ? match : String(value)
  })
}

/** Build a `T` from a raw dictionary — used when no locale service exists. */
export function translatorFrom(dict: Record<string, string>): T {
  return (key, vars) => interpolate(dict[key] ?? key, vars)
}

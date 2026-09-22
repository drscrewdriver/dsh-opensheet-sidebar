/**
 * Zero-dependency xlsx reader, with sheet support.
 *
 * An `.xlsx` is a zip of XML parts. Nothing here needs a spreadsheet library:
 * the browser (and Node) inflate `deflate-raw` natively via
 * `DecompressionStream`, and the parts we care about are machine-generated XML
 * with a regular shape, so a targeted scan beats a general XML parser.
 *
 * Parts read, in order:
 *
 * | part                              | why                                    |
 * |-----------------------------------|----------------------------------------|
 * | `xl/workbook.xml`                 | the sheet list, in document order       |
 * | `xl/_rels/workbook.xml.rels`      | rId → worksheet path                    |
 * | `xl/sharedStrings.xml`            | the string table cells index into        |
 * | `xl/styles.xml`                   | `cellXfs` → number formats → dates       |
 * | `xl/worksheets/sheetN.xml`        | one sheet at a time, on demand           |
 *
 * **The breaker dimension a spreadsheet actually needs is not file size.** A
 * workbook is a zip: 1 MB on disk can inflate to hundreds of MB, so a size
 * check on the archive defends nothing. Two gates run instead —
 *
 * 1. a **declared-size** gate from the zip central directory, before any
 *    inflation work (deterministic front-loading: refuse before spending CPU);
 * 2. a **streaming byte budget** while inflating, because those declared sizes
 *    are attacker-controlled and may simply lie.
 *
 * Rejecting the whole workbook is a normal rendered outcome, never a throw.
 */
import { DEFAULT_CONFIG, createBreaker, formatFileSize } from './circuit-breaker'
import type {
  BreakerResult,
  BreakerWarning,
  CircuitBreakerConfig,
  SheetInfo,
  WorkbookResult,
} from './types'

// ── zip ─────────────────────────────────────────────────────────────────────

/** One central-directory entry. Sizes come from the directory, never the local header. */
export interface ZipEntry {
  name: string
  /** 0 = stored, 8 = deflate. Anything else we refuse. */
  method: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

const EOCD_SIG = 0x06054b50
const CEN_SIG = 0x02014b50
const LOC_SIG = 0x04034b50

/** Read a little-endian u32. */
function u32(bytes: Uint8Array, at: number): number {
  return (
    (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0
  )
}

/** Read a little-endian u16. */
function u16(bytes: Uint8Array, at: number): number {
  return bytes[at] | (bytes[at + 1] << 8)
}

/**
 * Parse the central directory. The end-of-central-directory record sits at the
 * tail (a comment may follow it), so scan backwards for its signature.
 */
export function listZipEntries(bytes: Uint8Array): ZipEntry[] {
  const floor = Math.max(0, bytes.length - 66_000)
  let eocd = -1
  for (let i = bytes.length - 22; i >= floor; i--) {
    if (u32(bytes, i) === EOCD_SIG) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('not a zip container (no end-of-central-directory record)')

  const count = u16(bytes, eocd + 10)
  let at = u32(bytes, eocd + 16)
  const entries: ZipEntry[] = []

  for (let i = 0; i < count; i++) {
    if (u32(bytes, at) !== CEN_SIG) throw new Error(`corrupt central directory at entry ${i}`)
    const method = u16(bytes, at + 10)
    const compressedSize = u32(bytes, at + 20)
    const uncompressedSize = u32(bytes, at + 24)
    const nameLength = u16(bytes, at + 28)
    const extraLength = u16(bytes, at + 30)
    const commentLength = u16(bytes, at + 32)
    const localHeaderOffset = u32(bytes, at + 42)
    const name = new TextDecoder('utf-8').decode(bytes.subarray(at + 46, at + 46 + nameLength))
    entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset })
    at += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

/** Raised when inflation crosses the byte budget. */
class BudgetExceeded extends Error {
  constructor(
    readonly bytes: number,
    readonly limit: number,
  ) {
    super(`inflated ${bytes} bytes, budget ${limit}`)
  }
}

/** Concatenate inflate chunks into one buffer. */
function join(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.byteLength
  }
  return out
}

/**
 * Inflate one entry, aborting as soon as `limit` is crossed.
 *
 * The limit is enforced on the *decoded* stream, so a lying header cannot buy
 * an attacker unbounded memory.
 */
async function inflateEntry(bytes: Uint8Array, entry: ZipEntry, limit: number): Promise<Uint8Array> {
  // Local header: 30 fixed bytes + name + extra, then the payload. Its sizes can
  // be zero when a data descriptor is used, so only the offsets come from here.
  const at = entry.localHeaderOffset
  if (u32(bytes, at) !== LOC_SIG) throw new Error(`corrupt local header for ${entry.name}`)
  const payloadAt = at + 30 + u16(bytes, at + 26) + u16(bytes, at + 28)
  const payload = bytes.subarray(payloadAt, payloadAt + entry.compressedSize)

  if (entry.method === 0) {
    if (payload.byteLength > limit) throw new BudgetExceeded(payload.byteLength, limit)
    return payload.slice()
  }
  if (entry.method !== 8) throw new Error(`unsupported zip compression method ${entry.method} in ${entry.name}`)
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream is unavailable in this runtime')
  }

  const stream = new Blob([payload as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value === undefined) continue
    total += value.byteLength
    if (total > limit) {
      await reader.cancel()
      throw new BudgetExceeded(total, limit)
    }
    chunks.push(value)
  }
  return join(chunks, total)
}

// ── XML scanning ────────────────────────────────────────────────────────────

/** Resolve the five XML entities plus numeric escapes. */
export function decodeXml(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (match, body: string) => {
    switch (body) {
      case 'amp':
        return '&'
      case 'lt':
        return '<'
      case 'gt':
        return '>'
      case 'quot':
        return '"'
      case 'apos':
        return "'"
      default: {
        const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : match
      }
    }
  })
}

/** One attribute of an element's start tag, or undefined. */
export function attributeOf(tag: string, name: string): string | undefined {
  const pattern = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`)
  const found = pattern.exec(tag)
  if (found === null) return undefined
  return decodeXml(found[2] ?? found[3] ?? '')
}

/** Every `<tag …>` start tag of one element name. */
function startTags(xml: string, name: string): string[] {
  const pattern = new RegExp(`<${name}(\\s[^>]*)?/?>`, 'g')
  const tags: string[] = []
  for (let found = pattern.exec(xml); found !== null; found = pattern.exec(xml)) tags.push(found[0])
  return tags
}

/** Text of every `<t>` inside a fragment, concatenated (rich-text runs included). */
function textRuns(fragment: string): string {
  let text = ''
  const pattern = /<t(\s[^>]*)?>([\s\S]*?)<\/t>/g
  for (let found = pattern.exec(fragment); found !== null; found = pattern.exec(fragment)) {
    text += decodeXml(found[2] ?? '')
  }
  return text
}

/** The shared string table, indexed by the `t="s"` cell values. */
export function parseSharedStrings(xml: string): string[] {
  const out: string[] = []
  const pattern = /<si(\s[^>]*)?>([\s\S]*?)<\/si>/g
  for (let found = pattern.exec(xml); found !== null; found = pattern.exec(xml)) {
    out.push(textRuns(found[2] ?? ''))
  }
  return out
}

/** The sheet list, in workbook order. */
export function parseWorkbookSheets(xml: string): { name: string; rId: string; hidden: boolean }[] {
  return startTags(xml, 'sheet').map(tag => {
    const state = attributeOf(tag, 'state')
    return {
      name: attributeOf(tag, 'name') ?? '',
      rId: attributeOf(tag, 'r:id') ?? attributeOf(tag, 'id') ?? '',
      hidden: state === 'hidden' || state === 'veryHidden',
    }
  })
}

/** `rId → target` from a relationship part. */
export function parseRelationships(xml: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const tag of startTags(xml, 'Relationship')) {
    const id = attributeOf(tag, 'Id')
    const target = attributeOf(tag, 'Target')
    if (id !== undefined && target !== undefined) map.set(id, target)
  }
  return map
}

/** Which number formats are dates, keyed by `numFmtId`. */
export function parseStyles(xml: string): { cellXfs: number[]; dateFormats: Set<number>; date1904: boolean } {
  const dateFormats = new Set<number>([
    // Built-in date/time formats per ECMA-376 §18.8.30.
    14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55,
    56, 57, 58,
  ])

  // Custom formats: the code string decides, ignoring quoted literals.
  const custom = /<numFmt(\s[^>]*)?\/?>/g
  for (let found = custom.exec(xml); found !== null; found = custom.exec(xml)) {
    const id = Number(attributeOf(found[0], 'numFmtId'))
    const code = (attributeOf(found[0], 'formatCode') ?? '').replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '')
    if (!Number.isFinite(id)) continue
    if (/[ymdhs]/i.test(code)) dateFormats.add(id)
    else dateFormats.delete(id)
  }

  const cellXfs: number[] = []
  const block = /<cellXfs(\s[^>]*)?>([\s\S]*?)<\/cellXfs>/.exec(xml)
  if (block !== null) {
    const xf = /<xf(\s[^>]*)?\/?>/g
    for (let found = xf.exec(block[2] ?? ''); found !== null; found = xf.exec(block[2] ?? '')) {
      cellXfs.push(Number(attributeOf(found[0], 'numFmtId') ?? '0'))
    }
  }

  return { cellXfs, dateFormats, date1904: /date1904\s*=\s*"(1|true)"/.test(xml) }
}

/** Column index from an A1-style reference (`B7` → 1). */
export function columnOfReference(reference: string): number {
  let value = 0
  for (let i = 0; i < reference.length; i++) {
    const code = reference.charCodeAt(i)
    if (code < 65 || code > 90) break
    value = value * 26 + (code - 64)
  }
  return value - 1
}

/** Excel's 1900 serial date → a display string. */
export function serialToDateString(serial: number, date1904: boolean): string {
  // 1900 system keeps Lotus' phantom 1900-02-29, hence the 1899-12-30 epoch.
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30)
  const ms = epoch + Math.round(serial * 86_400_000)
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return String(serial)
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  const fraction = serial - Math.floor(serial)
  if (fraction <= 0) return day
  const seconds = Math.round(fraction * 86_400)
  return `${day} ${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
}

// ── the workbook ────────────────────────────────────────────────────────────

/** An opened workbook: sheet list, string table and styles, ready to be read sheet by sheet. */
export interface WorkbookHandle {
  fileName: string
  fileSize: number
  sheets: SheetInfo[]
  /** Container-level warnings; a blocked container leaves `sheets` empty. */
  warnings: BreakerWarning[]
  /** Materialise one sheet. Async: a real worksheet part is deflate-compressed. */
  read(sheetName: string): Promise<WorkbookResult>
}

/** What the caller hands over. */
export interface XlsxInput {
  fileName: string
  bytes: Uint8Array
  config?: Partial<CircuitBreakerConfig>
}

/** Normalise a relationship target (`/xl/worksheets/sheet1.xml`, `worksheets/sheet1.xml`). */
function resolvePart(target: string): string {
  const trimmed = target.startsWith('/') ? target.slice(1) : `xl/${target}`
  return trimmed.replace(/^xl\/\.\.\//, '')
}

/** A blocked container still returns a handle, so the view has one shape to render. */
function blockedHandle(
  input: XlsxInput,
  config: CircuitBreakerConfig,
  reason: 'file-size' | 'inflated-bytes' | 'sheet-bytes' | 'container-error',
  detail: Record<string, number | string>,
): WorkbookHandle {
  const warnings: BreakerWarning[] = [{ reason, detail }]
  return {
    fileName: input.fileName,
    fileSize: input.bytes.byteLength,
    sheets: [],
    warnings,
    read: async sheetName => ({
      sheets: [],
      activeSheet: sheetName,
      sheet: blockedSheet(input, config, sheetName, reason, detail),
    }),
  }
}

/**
 * Open a workbook: read the directory and the small parts, expose the sheet
 * list, and hand back a `read()` that materialises one sheet at a time.
 *
 * Never throws — an unreadable container comes back as a blocked handle.
 */
export async function openWorkbook(input: XlsxInput): Promise<WorkbookHandle> {
  const config: CircuitBreakerConfig = { ...DEFAULT_CONFIG, ...(input.config ?? {}) }
  const bytes = input.bytes

  // Gate 1 — the archive itself.
  if (bytes.byteLength > config.maxFileSize) {
    return blockedHandle(input, config, 'file-size', {
      found: formatFileSize(bytes.byteLength),
      limit: formatFileSize(config.maxFileSize),
    })
  }

  let entries: ZipEntry[]
  try {
    entries = listZipEntries(bytes)
  } catch (error) {
    return blockedHandle(input, config, 'container-error', {
      message: error instanceof Error ? error.message : String(error),
    })
  }

  const byName = new Map(entries.map(entry => [entry.name, entry]))

  /** Read one part, enforcing both the declared-size and streaming gates. */
  const readPart = async (name: string): Promise<string | undefined> => {
    const entry = byName.get(name)
    if (entry === undefined) return undefined
    if (entry.uncompressedSize > config.maxSheetBytes) throw new BudgetExceeded(entry.uncompressedSize, config.maxSheetBytes)
    const raw = await inflateEntry(bytes, entry, config.maxSheetBytes)
    return new TextDecoder('utf-8').decode(raw)
  }

  try {
    const workbookXml = await readPart('xl/workbook.xml')
    if (workbookXml === undefined) {
      return blockedHandle(input, config, 'container-error', {
        message: 'xl/workbook.xml is missing (not an xlsx container?)',
      })
    }

    const relsXml = await readPart('xl/_rels/workbook.xml.rels')
    const relationships = relsXml === undefined ? new Map<string, string>() : parseRelationships(relsXml)

    const sheets: SheetInfo[] = parseWorkbookSheets(workbookXml).map((sheet, index) => {
      const target = relationships.get(sheet.rId)
      return {
        name: sheet.name === '' ? `Sheet${index + 1}` : sheet.name,
        path: target === undefined ? `xl/worksheets/sheet${index + 1}.xml` : resolvePart(target),
        hidden: sheet.hidden,
      }
    })

    const sharedXml = await readPart('xl/sharedStrings.xml')
    const sharedStrings = sharedXml === undefined ? [] : parseSharedStrings(sharedXml)

    const stylesXml = await readPart('xl/styles.xml')
    const styles =
      stylesXml === undefined
        ? { cellXfs: [] as number[], dateFormats: new Set<number>(), date1904: false }
        : parseStyles(stylesXml)

    const warnings: BreakerWarning[] = []
    if (sheets.length === 0) warnings.push({ reason: 'parse-error', detail: { message: 'the workbook declares no sheets' } })

    return {
      fileName: input.fileName,
      fileSize: bytes.byteLength,
      sheets,
      warnings,
      read: async sheetName => {
        const sheet =
          sheets.find(candidate => candidate.name === sheetName) ??
          sheets.find(candidate => !candidate.hidden) ??
          sheets[0]

        if (sheet === undefined) {
          return {
            sheets,
            activeSheet: sheetName,
            sheet: blockedSheet(input, config, sheetName, 'container-error', { message: 'no sheet to read' }),
          }
        }

        try {
          // Every part goes through the same gated reader — a worksheet is a
          // deflate-compressed sibling of the parts already read above.
          const xml = await readPart(sheet.path)
          if (xml === undefined) {
            return {
              sheets,
              activeSheet: sheet.name,
              sheet: blockedSheet(input, config, sheet.name, 'container-error', {
                message: `${sheet.path} is missing from the archive`,
              }),
            }
          }
          return {
            sheets,
            activeSheet: sheet.name,
            sheet: parseSheetXml(xml, input.fileName, sheet.name, bytes.byteLength, { sharedStrings, styles, config }),
          }
        } catch (error) {
          const [reason, detail] =
            error instanceof BudgetExceeded
              ? ([
                  'sheet-bytes',
                  { found: formatFileSize(error.bytes), limit: formatFileSize(error.limit) },
                ] as const)
              : (['parse-error', { message: error instanceof Error ? error.message : String(error) }] as const)
          return { sheets, activeSheet: sheet.name, sheet: blockedSheet(input, config, sheet.name, reason, detail) }
        }
      },
    }
  } catch (error) {
    if (error instanceof BudgetExceeded) {
      return blockedHandle(input, config, 'inflated-bytes', {
        found: formatFileSize(error.bytes),
        limit: formatFileSize(error.limit),
      })
    }
    return blockedHandle(input, config, 'container-error', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

/** A BLOCKED result attributed to one sheet, so the view has a single shape to render. */
function blockedSheet(
  input: XlsxInput,
  config: CircuitBreakerConfig,
  sheetName: string,
  reason: 'file-size' | 'inflated-bytes' | 'sheet-bytes' | 'parse-error' | 'container-error',
  detail: Record<string, number | string>,
): BreakerResult {
  const breaker = createBreaker(config)
  breaker.startReading({ fileName: input.fileName, fileSize: input.bytes.byteLength, sheetName })
  breaker.block(reason, detail)
  const result = breaker.finalize()
  result.meta.sheetName = sheetName
  return result
}

/** Scan one already-inflated worksheet XML into a breaker result. */
function parseSheetXml(
  xml: string,
  fileName: string,
  sheetName: string,
  fileSize: number,
  context: {
    sharedStrings: string[]
    styles: { cellXfs: number[]; dateFormats: Set<number>; date1904: boolean }
    config: CircuitBreakerConfig
  },
): BreakerResult {
  const breaker = createBreaker(context.config)
  breaker.startReading({ fileName, fileSize, sheetName })
  scanSheet(xml, context, breaker)
  const result = breaker.finalize()
  result.meta.sheetName = sheetName
  return result
}

/** Walk one worksheet's rows into the breaker. */
function scanSheet(
  xml: string,
  context: {
    sharedStrings: string[]
    styles: { cellXfs: number[]; dateFormats: Set<number>; date1904: boolean }
    config: CircuitBreakerConfig
  },
  breaker: ReturnType<typeof createBreaker>,
): void {
  const { sharedStrings, styles } = context
  let headerSeen = false
  const rowPattern = /<row(\s[^>]*)?>([\s\S]*?)<\/row>/g

  for (let found = rowPattern.exec(xml); found !== null; found = rowPattern.exec(xml)) {
    const cells = new Map<number, string>()
    let width = 0
    const cellPattern = /<c(\s[^>]*)?(\/>|>([\s\S]*?)<\/c>)/g
    const body = found[2] ?? ''

    for (let cell = cellPattern.exec(body); cell !== null; cell = cellPattern.exec(body)) {
      const tag = cell[0].slice(0, cell[0].indexOf('>') + 1)
      const reference = attributeOf(tag, 'r')
      const column = reference === undefined ? width : columnOfReference(reference)
      const type = attributeOf(tag, 't') ?? 'n'
      const inner = cell[3] ?? ''
      width = Math.max(width, column + 1)
      cells.set(column, cellText(inner, type, attributeOf(tag, 's'), sharedStrings, styles))
    }

    const row = Array.from({ length: width }, (_, index) => cells.get(index) ?? '')

    if (!headerSeen) {
      headerSeen = true
      // A header row that is entirely empty is not a header; synthesise names.
      const named = row.map((value, index) => (value === '' ? `Column ${index + 1}` : value))
      breaker.setHeaders(named)
      continue
    }
    if (!breaker.tick(row)) return
  }

  if (!headerSeen) breaker.setHeaders([])
}

/** One cell's display text: shared string, inline string, boolean, date or number. */
function cellText(
  inner: string,
  type: string,
  styleIndex: string | undefined,
  sharedStrings: string[],
  styles: { cellXfs: number[]; dateFormats: Set<number>; date1904: boolean },
): string {
  if (type === 'inlineStr') return textRuns(inner)

  const valueMatch = /<v(\s[^>]*)?>([\s\S]*?)<\/v>/.exec(inner)
  const raw = valueMatch === null ? '' : decodeXml(valueMatch[2] ?? '')

  if (type === 's') {
    const index = Number(raw)
    return Number.isInteger(index) ? (sharedStrings[index] ?? '') : ''
  }
  if (type === 'b') return raw === '1' ? 'TRUE' : 'FALSE'
  if (type === 'str') return raw
  if (type === 'e') return raw
  if (raw === '') return ''

  // Numeric: a date format on this cell's style turns the serial into a date.
  const numFmtId = styleIndex === undefined ? undefined : styles.cellXfs[Number(styleIndex)]
  if (numFmtId !== undefined && styles.dateFormats.has(numFmtId)) {
    const serial = Number(raw)
    if (Number.isFinite(serial)) return serialToDateString(serial, styles.date1904)
  }
  return raw
}

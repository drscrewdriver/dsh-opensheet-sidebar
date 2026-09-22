/**
 * The CSV reader: a quote-aware RFC 4180 scanner wired straight into the
 * circuit breaker.
 *
 * Two entry points, one parser:
 *
 * - `readCsvFile(file)` — a local `File` from drag-and-drop or the picker.
 *   Its real byte size is known up front, so an oversized file is refused
 *   *before* a single byte is read: that is what keeps the tab responsive.
 * - `parseCsvText(text, input)` — text the host already read for us through
 *   better-sidebar's `/sidebar/api/fs.read`. There the size is a character
 *   count plus the host's own `truncated` flag, and both are reported as such
 *   rather than dressed up as exact numbers.
 *
 * Zero dependencies on purpose: no PapaParse, no Node builtins. The scanner
 * emits one row at a time and honours the breaker's "stop now" answer, so an
 * oversized file costs one pass over the head, not a full parse.
 */
import { DEFAULT_CONFIG, createBreaker } from './circuit-breaker'
import type { BreakerResult, CircuitBreakerConfig } from './types'

/** Delimiters the sniffer will consider, most likely first. */
const DELIMITERS = [',', '\t', ';', '|'] as const

/** Extensions this plugin claims. */
export const CSV_EXTS = ['csv', 'tsv', 'psv'] as const

/** What the caller knows about the text it is handing over. */
export interface ParseInput {
  /** Display name — the basename or the viewer path. */
  fileName: string
  /** Byte size when the caller has it; otherwise the character count is used. */
  fileSize?: number
  /** True when `fileSize` is a character count, not bytes. */
  sizeIsApproximate?: boolean
  /** The host's own truncation flag (it caps what it returns). */
  truncated?: boolean
  config?: Partial<CircuitBreakerConfig>
}

/** Row consumer. Returning false stops the scan immediately. */
type RowSink = (row: string[]) => boolean

/**
 * Guess the delimiter from the head of the document by counting candidates
 * outside quotes on the first few non-empty lines. Falls back to a comma.
 */
export function sniffDelimiter(sample: string): string {
  const head = sample.slice(0, 8192)
  let best = ','
  let bestScore = -1

  for (const delimiter of DELIMITERS) {
    let inQuotes = false
    let score = 0
    let lines = 0
    for (let i = 0; i < head.length && lines < 5; i++) {
      const ch = head[i]
      if (ch === '"') inQuotes = !inQuotes
      else if (!inQuotes && ch === delimiter) score++
      else if (!inQuotes && ch === '\n') lines++
    }
    // Normalise per line so a long single-line file cannot win by volume.
    const normalised = score / Math.max(1, Math.min(lines + 1, 5))
    if (score > 0 && normalised > bestScore) {
      bestScore = normalised
      best = delimiter
    }
  }
  return best
}

/** Delimiter implied by an extension, when the sniffer has nothing to chew on. */
export function delimiterForName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'tsv') return '\t'
  if (ext === 'psv') return '|'
  return ','
}

/**
 * Scan RFC 4180 text, handing every row to `sink`. Quoted fields may contain
 * the delimiter, CR/LF, and doubled quotes; trailing newlines never mint a
 * phantom row.
 */
export function scanRows(text: string, delimiter: string, sink: RowSink): void {
  let field = ''
  let row: string[] = []
  let inQuotes = false
  let i = 0
  const n = text.length

  while (i < n) {
    const ch = text[i] as string

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }

    if (ch === '"' && field === '') {
      inQuotes = true
      i++
      continue
    }
    // An unquoted line break always ends the record, whatever the delimiter is
    // (RFC 4180); this is checked before the delimiter so a caller that hands
    // us a newline as the separator still gets one row per line.
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      const current = row
      row = []
      i++
      if (!sink(current)) return
      continue
    }
    if (ch === delimiter) {
      row.push(field)
      field = ''
      i++
      continue
    }
    field += ch
    i++
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    sink(row)
  }
}

/** True for a line that carries no fields at all (a blank line). */
function isBlankRow(row: string[]): boolean {
  return row.length === 0 || (row.length === 1 && (row[0] ?? '') === '')
}

/**
 * Parse already-read CSV text under the breaker. Never throws: a malformed
 * document comes back as a TRUNCATED result carrying a `parse-error` warning.
 */
export function parseCsvText(text: string, input: ParseInput): BreakerResult {
  const config: CircuitBreakerConfig = { ...DEFAULT_CONFIG, ...(input.config ?? {}) }
  const breaker = createBreaker(config)

  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const fileSize = input.fileSize ?? body.length
  const sizeIsApproximate = input.sizeIsApproximate ?? input.fileSize === undefined
  const delimiter = sniffDelimiter(body) || delimiterForName(input.fileName)

  breaker.startReading({
    fileName: input.fileName,
    fileSize,
    sizeIsApproximate,
    delimiter,
    sourceTruncated: input.truncated === true,
  })

  // Dimension 1 — size. Refuse before spending any parse time.
  if (fileSize > config.maxFileSize) {
    breaker.block('file-size', { found: fileSize, limit: config.maxFileSize })
    return breaker.finalize()
  }

  // The host capped what it returned: the table is a head by definition.
  if (input.truncated === true) breaker.warn('source-truncated', {})

  let headerSeen = false
  try {
    scanRows(body, delimiter, row => {
      if (isBlankRow(row)) return true
      if (!headerSeen) {
        headerSeen = true
        breaker.setHeaders(row)
        return true
      }
      return breaker.tick(row)
    })
  } catch (error) {
    breaker.warn('parse-error', { message: error instanceof Error ? error.message : String(error) })
  }

  if (!headerSeen) breaker.setHeaders([])
  return breaker.finalize()
}

/**
 * Read a local file under the breaker.
 *
 * The size gate runs first and is the whole point: a 400 MB export is answered
 * instantly with a BLOCKED card, and `file.text()` is never called.
 */
export async function readCsvFile(
  file: File,
  config: Partial<CircuitBreakerConfig> = {},
): Promise<BreakerResult> {
  const cfg: CircuitBreakerConfig = { ...DEFAULT_CONFIG, ...config }

  if (file.size > cfg.maxFileSize) {
    const breaker = createBreaker(cfg)
    breaker.startReading({
      fileName: file.name,
      fileSize: file.size,
      sizeIsApproximate: false,
      delimiter: delimiterForName(file.name),
    })
    breaker.block('file-size', { found: file.size, limit: cfg.maxFileSize })
    return breaker.finalize()
  }

  const text = await file.text()
  return parseCsvText(text, {
    fileName: file.name,
    fileSize: file.size,
    sizeIsApproximate: false,
    config: cfg,
  })
}

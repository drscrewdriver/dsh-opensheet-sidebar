/**
 * The circuit breaker.
 *
 * Four independent dimensions, each with a hard ceiling, each able to stop the
 * reader early rather than after the damage is done:
 *
 * | dimension    | default | over it                                        |
 * |--------------|---------|------------------------------------------------|
 * | file size    | 5 MB    | BLOCKED — the bytes are never even read         |
 * | data rows    | 10 000  | TRUNCATED — the reader stops mid-stream         |
 * | columns      | 100     | extra columns dropped, warned                   |
 * | one cell     | 10 KB   | that cell's text elided, warned                 |
 *
 * The point is not to render big files: it is that *no* input can make the tab
 * freeze. A blocked or truncated result is a normal, fully rendered outcome —
 * never an exception and never a spinner that never resolves.
 *
 * Pure module: no DOM, no React, no imports beyond local types.
 */
import type {
  BreakerReason,
  BreakerResult,
  BreakerState,
  BreakerWarning,
  CircuitBreakerConfig,
  CsvMeta,
} from './types'

/** Thresholds: the four text dimensions, the preview budget, and the two workbook gates. */
export const DEFAULT_CONFIG: CircuitBreakerConfig = {
  maxFileSize: 5 * 1024 * 1024, // 5 MB
  maxRows: 10_000,
  maxCols: 100,
  maxCellLength: 10_240, // 10 KB
  previewRows: 200,
  // A workbook is a zip: these two are what actually defend the tab, because a
  // small archive can inflate to hundreds of megabytes.
  maxInflatedBytes: 64 * 1024 * 1024,
  maxSheetBytes: 32 * 1024 * 1024,
}

/** Elided-cell marker budget: keep the head of an oversized cell readable. */
const CELL_KEEP = 200

/** Human-readable byte size. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** The breaker's mutable face. */
export interface Breaker {
  /** Enter READING and seed the metadata the view will show. */
  startReading(meta: Partial<CsvMeta>): void
  /** Adopt the header row (first parsed row); caps the column count. */
  setHeaders(headers: string[]): void
  /** Feed one data row. Returns false when the reader must stop. */
  tick(row: string[]): boolean
  /** Mark the run BLOCKED (nothing usable will be produced). */
  block(reason: BreakerReason, detail: BreakerWarning['detail']): void
  /** Mark the run TRUNCATED without stopping the reader. */
  warn(reason: BreakerReason, detail: BreakerWarning['detail']): void
  /** Close the run and hand back the renderable result. */
  finalize(): BreakerResult
  /** Live state, for the reader's own short-circuits. */
  state(): BreakerState
}

/** Build one breaker run. */
export function createBreaker(config: Partial<CircuitBreakerConfig> = {}): Breaker {
  const cfg: CircuitBreakerConfig = { ...DEFAULT_CONFIG, ...config }
  let state: BreakerState = 'IDLE'
  let rowCount = 0
  let colCount = 0
  let cellWarned = false
  let previewExhausted = false
  const warnings: BreakerWarning[] = []
  const rows: string[][] = []
  let headers: string[] = []
  const meta: CsvMeta = {
    fileName: '',
    fileSize: 0,
    sizeIsApproximate: false,
    rowCount: 0,
    totalRows: 0,
    colCount: 0,
    visibleCols: 0,
    delimiter: ',',
    sourceTruncated: false,
  }

  return {
    startReading(seed) {
      state = 'READING'
      Object.assign(meta, seed)
    },

    setHeaders(raw) {
      colCount = raw.length
      if (raw.length > cfg.maxCols) {
        headers = raw.slice(0, cfg.maxCols)
        warnings.push({ reason: 'cols', detail: { found: raw.length, limit: cfg.maxCols } })
      } else {
        headers = raw.slice()
      }
      meta.visibleCols = headers.length
    },

    tick(row) {
      rowCount++

      if (rowCount > cfg.maxRows) {
        // The row ceiling: stop the reader here instead of after 10 000 more.
        state = 'TRUNCATED'
        warnings.push({ reason: 'rows', detail: { found: rowCount, limit: cfg.maxRows, kept: cfg.previewRows } })
        return false
      }

      const width = headers.length === 0 ? Math.min(row.length, cfg.maxCols) : headers.length
      const cells: string[] = new Array(width)
      for (let i = 0; i < width; i++) {
        const cell = row[i]
        if (cell === undefined || cell === '') {
          cells[i] = ''
        } else if (cell.length > cfg.maxCellLength) {
          cells[i] = `${cell.slice(0, CELL_KEEP)}… (+${cell.length - CELL_KEEP} chars)`
          if (!cellWarned) {
            cellWarned = true
            warnings.push({ reason: 'cell-length', detail: { found: cell.length, limit: cfg.maxCellLength } })
          }
        } else {
          cells[i] = cell
        }
      }

      // Keep only the preview budget in memory: the table never needs more.
      // The 201st row is where a silent head becomes a loud truncation.
      if (rows.length < cfg.previewRows) {
        rows.push(cells)
      } else if (!previewExhausted) {
        previewExhausted = true
        warnings.push({ reason: 'rows', detail: { kept: cfg.previewRows, limit: cfg.maxRows } })
        if (state !== 'BLOCKED') state = 'TRUNCATED'
      }
      return true
    },

    block(reason, detail) {
      state = 'BLOCKED'
      warnings.push({ reason, detail })
    },

    warn(reason, detail) {
      warnings.push({ reason, detail })
      if (state !== 'BLOCKED') state = 'TRUNCATED'
    },

    finalize() {
      if (state !== 'BLOCKED' && state !== 'TRUNCATED') {
        state = warnings.length > 0 ? 'TRUNCATED' : 'OK'
      }
      // The preview-budget path trips before the row ceiling is known, so its
      // warning carries no `found`. Back-fill it with the rows actually counted
      // — otherwise the rendered line keeps a literal `{found}`.
      for (const warning of warnings) {
        if (warning.reason === 'rows') warning.detail = { ...warning.detail, found: rowCount }
      }
      meta.rowCount = rows.length
      meta.totalRows = rowCount
      meta.colCount = colCount
      meta.visibleCols = headers.length
      return {
        state,
        meta: { ...meta },
        headers: headers.slice(),
        rows,
        warnings: warnings.slice(),
      }
    },

    state: () => state,
  }
}

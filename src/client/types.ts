/**
 * Shared vocabulary for the CSV half. Pure types + the breaker contract;
 * no DOM, no React, so the core is testable under plain Node.
 */

/** Parsed-file metadata, as shown in the stats bar. */
export interface CsvMeta {
  /** Display name: the file's basename, or the viewer path. */
  fileName: string
  /** Byte size when known (local file); character count for host-read text. */
  fileSize: number
  /** True when `fileSize` is a character count rather than real bytes. */
  sizeIsApproximate: boolean
  /** Rows handed to the table (after truncation). */
  rowCount: number
  /** Rows the source actually held, when the reader got far enough to know. */
  totalRows: number
  /** Columns in the header row. */
  colCount: number
  /** Columns actually carried into the table (after truncation). */
  visibleCols: number
  /** Delimiter the sniffer settled on. */
  delimiter: string
  /** Worksheet name, when the payload came from a workbook rather than text. */
  sheetName?: string
  /** True when the host's own read was already truncated before we saw it. */
  sourceTruncated: boolean
}

/** Circuit-breaker state machine. */
export type BreakerState = 'IDLE' | 'READING' | 'PARSING' | 'OK' | 'TRUNCATED' | 'BLOCKED'

/** Why the breaker tripped; one entry per dimension that fired. */
export type BreakerReason =
  | 'file-size'
  | 'rows'
  | 'cols'
  | 'cell-length'
  | 'source-truncated'
  | 'parse-error'
  /** A zip container (xlsx) inflated past the total byte budget — a zip bomb. */
  | 'inflated-bytes'
  /** One worksheet's inflated XML alone exceeded its own ceiling. */
  | 'sheet-bytes'
  /** The container could not be read at all (not a zip, missing part, corrupt). */
  | 'container-error'

/** One tripped dimension. */
export interface BreakerWarning {
  reason: BreakerReason
  /** Already-localised-by-key detail payload; the view formats it. */
  detail: Record<string, number | string>
}

/** The breaker's output: everything a view needs, nothing it does not. */
export interface BreakerResult {
  state: BreakerState
  meta: CsvMeta
  headers: string[]
  rows: string[][]
  warnings: BreakerWarning[]
}

/** Tunable thresholds. The CSV dimensions plus the workbook ones. */
export interface CircuitBreakerConfig {
  /** Hard ceiling on file size in bytes (local files) — over it: BLOCKED. */
  maxFileSize: number
  /** Hard ceiling on data rows — over it: TRUNCATED, parsing stops early. */
  maxRows: number
  /** Hard ceiling on columns — over it: extra columns are dropped. */
  maxCols: number
  /** Hard ceiling on one cell's text length — over it: the cell is elided. */
  maxCellLength: number
  /** How many rows the table keeps once truncated. */
  previewRows: number
  /**
   * Total bytes a zip container (xlsx) may inflate to across every entry we
   * read. This is the dimension a spreadsheet actually needs: the archive is
   * small by construction, so a size check on the file itself defends nothing
   * against a zip bomb.
   */
  maxInflatedBytes: number
  /** Ceiling on a single worksheet's inflated XML — one legal sheet, bounded. */
  maxSheetBytes: number
}

/** One worksheet of a workbook, in document order. */
export interface SheetInfo {
  /** Display name from `xl/workbook.xml`. */
  name: string
  /** Zip path of the worksheet part (e.g. `xl/worksheets/sheet1.xml`). */
  path: string
  /** `state="hidden"` / `"veryHidden"` sheets are listed but not auto-opened. */
  hidden: boolean
}

/** A parsed workbook: the sheet list plus whichever sheet was materialised. */
export interface WorkbookResult {
  /** Every sheet, in workbook order. */
  sheets: SheetInfo[]
  /** Name of the sheet the result below holds. */
  activeSheet: string
  /** The active sheet as a normal breaker result, so the table renders it. */
  sheet: BreakerResult
}

/** Sort state of the data table. */
export interface SortState {
  columnIndex: number
  direction: 'asc' | 'desc'
}

/** Column type inferred from a sample of its values. */
export type ColumnType = 'number' | 'date' | 'boolean' | 'text'

/** Per-column statistics used for alignment and the header tooltip. */
export interface ColumnStats {
  name: string
  index: number
  type: ColumnType
  /** Values that were empty. */
  emptyCount: number
  /** Distinct non-empty values. */
  uniqueCount: number
}

/** The host's own truncation flag, as better-sidebar reports it. */
export interface SourceRead {
  content: string
  truncated?: boolean
}

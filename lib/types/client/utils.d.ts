/**
 * Presentation-side helpers: formatting, sorting, and column inference.
 * Pure functions only — no DOM, no React, so the table's behaviour is testable
 * under plain Node.
 */
import type { ColumnStats, ColumnType, SortState } from './types';
export { formatFileSize as formatSize } from './circuit-breaker';
/** Group-separated integer. */
export declare function formatNumber(n: number): string;
/** Basename of a path, tolerating both separators. */
export declare function basename(path: string): string;
/** True when the plugin claims this path's extension. */
export declare function isCsvPath(path: string): boolean;
/** True when a value parses as a finite number and is not blank. */
export declare function isNumeric(value: string): boolean;
/**
 * Sort rows by one column. Numeric columns compare numerically, everything
 * else compares with `localeCompare`; blanks always sink to the bottom so a
 * mostly-empty column stays readable in both directions.
 */
export declare function sortRows(rows: string[][], sort: SortState | null): string[][];
/** Right-align a column when most of its sampled values are numeric. */
export declare function getColumnAlign(rows: string[][], colIndex: number): 'left' | 'right';
/** Column type from a sample: number / date / boolean, else text. */
export declare function inferColumnType(values: string[]): ColumnType;
/** Per-column stats for the header tooltip; one pass over the previewed rows. */
export declare function analyzeColumns(headers: string[], rows: string[][]): ColumnStats[];

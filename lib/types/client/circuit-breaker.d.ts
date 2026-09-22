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
import type { BreakerReason, BreakerResult, BreakerState, BreakerWarning, CircuitBreakerConfig, CsvMeta } from './types';
/** Thresholds. The four ceilings plus the preview row budget. */
export declare const DEFAULT_CONFIG: CircuitBreakerConfig;
/** Human-readable byte size. */
export declare function formatFileSize(bytes: number): string;
/** The breaker's mutable face. */
export interface Breaker {
    /** Enter READING and seed the metadata the view will show. */
    startReading(meta: Partial<CsvMeta>): void;
    /** Adopt the header row (first parsed row); caps the column count. */
    setHeaders(headers: string[]): void;
    /** Feed one data row. Returns false when the reader must stop. */
    tick(row: string[]): boolean;
    /** Mark the run BLOCKED (nothing usable will be produced). */
    block(reason: BreakerReason, detail: BreakerWarning['detail']): void;
    /** Mark the run TRUNCATED without stopping the reader. */
    warn(reason: BreakerReason, detail: BreakerWarning['detail']): void;
    /** Close the run and hand back the renderable result. */
    finalize(): BreakerResult;
    /** Live state, for the reader's own short-circuits. */
    state(): BreakerState;
}
/** Build one breaker run. */
export declare function createBreaker(config?: Partial<CircuitBreakerConfig>): Breaker;

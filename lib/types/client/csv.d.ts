import type { BreakerResult, CircuitBreakerConfig } from './types';
/** Extensions this plugin claims. */
export declare const CSV_EXTS: readonly ["csv", "tsv", "psv"];
/** What the caller knows about the text it is handing over. */
export interface ParseInput {
    /** Display name — the basename or the viewer path. */
    fileName: string;
    /** Byte size when the caller has it; otherwise the character count is used. */
    fileSize?: number;
    /** True when `fileSize` is a character count, not bytes. */
    sizeIsApproximate?: boolean;
    /** The host's own truncation flag (it caps what it returns). */
    truncated?: boolean;
    config?: Partial<CircuitBreakerConfig>;
}
/** Row consumer. Returning false stops the scan immediately. */
type RowSink = (row: string[]) => boolean;
/**
 * Guess the delimiter from the head of the document by counting candidates
 * outside quotes on the first few non-empty lines. Falls back to a comma.
 */
export declare function sniffDelimiter(sample: string): string;
/** Delimiter implied by an extension, when the sniffer has nothing to chew on. */
export declare function delimiterForName(fileName: string): string;
/**
 * Scan RFC 4180 text, handing every row to `sink`. Quoted fields may contain
 * the delimiter, CR/LF, and doubled quotes; trailing newlines never mint a
 * phantom row.
 */
export declare function scanRows(text: string, delimiter: string, sink: RowSink): void;
/**
 * Parse already-read CSV text under the breaker. Never throws: a malformed
 * document comes back as a TRUNCATED result carrying a `parse-error` warning.
 */
export declare function parseCsvText(text: string, input: ParseInput): BreakerResult;
/**
 * Read a local file under the breaker.
 *
 * The size gate runs first and is the whole point: a 400 MB export is answered
 * instantly with a BLOCKED card, and `file.text()` is never called.
 */
export declare function readCsvFile(file: File, config?: Partial<CircuitBreakerConfig>): Promise<BreakerResult>;
export {};

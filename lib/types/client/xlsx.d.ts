import type { BreakerWarning, CircuitBreakerConfig, SheetInfo, WorkbookResult } from './types';
/** One central-directory entry. Sizes come from the directory, never the local header. */
export interface ZipEntry {
    name: string;
    /** 0 = stored, 8 = deflate. Anything else we refuse. */
    method: number;
    compressedSize: number;
    uncompressedSize: number;
    localHeaderOffset: number;
}
/**
 * Parse the central directory. The end-of-central-directory record sits at the
 * tail (a comment may follow it), so scan backwards for its signature.
 */
export declare function listZipEntries(bytes: Uint8Array): ZipEntry[];
/** Resolve the five XML entities plus numeric escapes. */
export declare function decodeXml(text: string): string;
/** One attribute of an element's start tag, or undefined. */
export declare function attributeOf(tag: string, name: string): string | undefined;
/** The shared string table, indexed by the `t="s"` cell values. */
export declare function parseSharedStrings(xml: string): string[];
/** The sheet list, in workbook order. */
export declare function parseWorkbookSheets(xml: string): {
    name: string;
    rId: string;
    hidden: boolean;
}[];
/** `rId → target` from a relationship part. */
export declare function parseRelationships(xml: string): Map<string, string>;
/** Which number formats are dates, keyed by `numFmtId`. */
export declare function parseStyles(xml: string): {
    cellXfs: number[];
    dateFormats: Set<number>;
    date1904: boolean;
};
/** Column index from an A1-style reference (`B7` → 1). */
export declare function columnOfReference(reference: string): number;
/** Excel's 1900 serial date → a display string. */
export declare function serialToDateString(serial: number, date1904: boolean): string;
/** An opened workbook: sheet list, string table and styles, ready to be read sheet by sheet. */
export interface WorkbookHandle {
    fileName: string;
    fileSize: number;
    sheets: SheetInfo[];
    /** Container-level warnings; a blocked container leaves `sheets` empty. */
    warnings: BreakerWarning[];
    /** Materialise one sheet. Async: a real worksheet part is deflate-compressed. */
    read(sheetName: string): Promise<WorkbookResult>;
}
/** What the caller hands over. */
export interface XlsxInput {
    fileName: string;
    bytes: Uint8Array;
    config?: Partial<CircuitBreakerConfig>;
}
/**
 * Open a workbook: read the directory and the small parts, expose the sheet
 * list, and hand back a `read()` that materialises one sheet at a time.
 *
 * Never throws — an unreadable container comes back as a blocked handle.
 */
export declare function openWorkbook(input: XlsxInput): Promise<WorkbookHandle>;

/** Tab type id — package-prefixed so it cannot collide with a built-in type. */
export declare const TAB_ID = "dsh-csv-sidebar:tab";
/** File-viewer id, as it appears in the Side card's preview inventory. */
export declare const VIEWER_ID = "dsh-csv-sidebar:viewer";
/** Services that must be published before `apply` runs. */
export declare const inject: readonly ["betterSidebar", "locale"];
/**
 * Browser-face apply.
 *
 * @param rawCtx - the client root context, narrowed structurally in `seams.ts`.
 */
export declare function apply(rawCtx: unknown): void;

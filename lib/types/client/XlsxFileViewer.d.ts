import type { T } from './locales';
interface XlsxFileViewerProps {
    path: string;
    title?: string;
    /** Raw archive bytes, from the registered `custom` loader. */
    customData?: unknown;
    t: T;
}
export declare function XlsxFileViewer({ path, title, customData, t }: XlsxFileViewerProps): import("react").JSX.Element;
export {};

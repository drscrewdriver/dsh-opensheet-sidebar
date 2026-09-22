import type { T } from './locales';
interface CsvFileViewerProps {
    path: string;
    title?: string;
    content?: string;
    truncated?: boolean;
    t: T;
}
export declare function CsvFileViewer({ path, title, content, truncated, t }: CsvFileViewerProps): import("react").JSX.Element;
export {};

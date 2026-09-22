/**
 * The shared body both surfaces render: the manual tab and the file viewer
 * differ only in how they obtain the text, never in what they show.
 */
import type { ReactNode } from 'react';
import type { T } from './locales';
import type { BreakerResult } from './types';
interface CsvViewProps {
    result: BreakerResult;
    t: T;
    /** Optional footer controls (the tab's "open another file"). */
    actions?: ReactNode;
}
export declare function CsvView({ result, t, actions }: CsvViewProps): import("react").JSX.Element;
export {};

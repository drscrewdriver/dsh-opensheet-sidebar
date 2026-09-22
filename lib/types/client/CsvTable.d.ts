import type { T } from './locales';
import type { BreakerResult } from './types';
interface CsvTableProps {
    result: BreakerResult;
    t: T;
}
export declare function CsvTable({ result, t }: CsvTableProps): import("react").JSX.Element;
export {};

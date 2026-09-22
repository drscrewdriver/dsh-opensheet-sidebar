import type { T } from './locales';
import type { BreakerResult } from './types';
interface CsvStatsProps {
    result: BreakerResult;
    t: T;
}
export declare function CsvStats({ result, t }: CsvStatsProps): import("react").JSX.Element;
export {};

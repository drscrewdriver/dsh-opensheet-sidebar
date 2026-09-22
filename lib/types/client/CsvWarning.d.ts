import type { T } from './locales';
import type { BreakerResult } from './types';
interface CsvWarningProps {
    result: BreakerResult;
    t: T;
}
export declare function CsvWarning({ result, t }: CsvWarningProps): import("react").JSX.Element | null;
export {};

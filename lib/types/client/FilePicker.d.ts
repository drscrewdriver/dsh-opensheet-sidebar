import type { T } from './locales';
interface FilePickerProps {
    onFileSelect: (file: File) => void;
    t: T;
    disabled?: boolean;
}
/** True when the picker claims this filename. */
export declare function isCsvName(name: string): boolean;
export declare function FilePicker({ onFileSelect, t, disabled }: FilePickerProps): import("react").JSX.Element;
export {};

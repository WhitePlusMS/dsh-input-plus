/**
 * File candidate icons for the official rc.6 input-trigger menu.
 *
 * The menu contract types `icon` as a string, while rc.6's MenuView forwards
 * that value as a React child. We use that existing render seam to provide
 * the same DSH vector icons used by the official UI; no Emoji or DOM menu
 * replacement is involved.
 */
/**
 * Return the icon child accepted by the rc.6 menu. The fallback is a plain
 * text square only for non-browser probes where DSH's icon module is absent.
 */
export declare function createFileCandidateIcon(relative: string, isDirectory: boolean): string;
/** Install only the color rules; the icon geometry comes from DSH primitives. */
export declare function installFileIconStyles(): () => void;

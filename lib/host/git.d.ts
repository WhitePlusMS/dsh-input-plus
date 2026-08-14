/**
 * Small, best-effort Git status reader for the browser candidate menu.
 *
 * Only workspace-relative names cross the Host/Client boundary. A directory
 * that is not a Git checkout, or a checkout whose Git command is unavailable,
 * simply has no modified-file decoration.
 */
/** Parse Git's NUL-delimited porcelain-v1 status output. */
export declare function parseGitStatus(stdout: string): ReadonlySet<string>;
export declare function readGitChangedFiles(root: string): Promise<ReadonlySet<string>>;

/**
 * Small, best-effort Git status reader for the browser candidate menu.
 *
 * Only workspace-relative names cross the Host/Client boundary. A directory
 * that is not a Git checkout, or a checkout whose Git command is unavailable,
 * simply has no modified-file decoration.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { normalizeRelative } from './files.js';
const execFileAsync = promisify(execFile);
const MAX_STATUS_BYTES = 512 * 1024;
/** Parse Git's NUL-delimited porcelain-v1 status output. */
export function parseGitStatus(stdout) {
    const changed = new Set();
    for (const entry of stdout.split('\0')) {
        // Porcelain v1 uses two status columns, one separator space, then the
        // relative path. The -z form keeps spaces and Unicode names intact.
        if (entry.length < 4)
            continue;
        const relative = normalizeRelative(entry.slice(3));
        if (relative !== null)
            changed.add(relative);
    }
    return changed;
}
export async function readGitChangedFiles(root) {
    try {
        const result = await execFileAsync('git', ['-C', root, 'status', '--porcelain=v1', '-z', '--untracked-files=all', '--', '.'], { encoding: 'utf8', maxBuffer: MAX_STATUS_BYTES, windowsHide: true });
        const stdout = String(result.stdout);
        return parseGitStatus(stdout);
    }
    catch {
        return new Set();
    }
}

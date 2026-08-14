/**
 * Host-side workspace index and path safety.
 *
 * Security model (research/dsh-input-plus-file-reference.md):
 * - The Client only ever receives `relative` paths + kind; it never sees
 *   absolute paths or file contents.
 * - Path resolution is re-validated by the Host at EVERY use (candidate
 *   selection AND hand-typed `@relative` tokens): resolve -> realpath ->
 *   relative-boundary check.
 * - Absolute paths, `..` escape out of the workspace, and symlink targets
 *   outside the workspace are rejected by default.
 * - Candidate indexing is bounded by the entry and depth caps.
 *
 * Zero DSH dependencies: this module takes the workspace root as a plain
 * string and uses only Node fs, so it is fully unit-testable in isolation.
 */
import type { FileCandidate, RefErrorCode } from '../contract.js';
export declare const DEFAULT_IGNORED: Set<string>;
/** OS/editor metadata files ignored by basename, case-insensitively. */
export declare const DEFAULT_IGNORED_FILES: Set<string>;
export interface WorkspaceIndexOptions {
    /** Absolute workspace root. */
    readonly root: string;
    /** Max index entries served as candidates per query. */
    readonly maxIndexEntries: number;
    /** Directory scan depth limit. */
    readonly maxDepth: number;
    /** Directories to skip entirely (basenames). */
    readonly ignored?: ReadonlySet<string>;
    /** Files to skip by basename; values are compared case-insensitively. */
    readonly ignoredFiles?: ReadonlySet<string>;
    /** Optional override for testing path semantics. */
    readonly sepOverride?: string;
}
/** One resolved, validated reference pointing inside the workspace. */
export interface SafeReference {
    readonly absolute: string;
    readonly relative: string;
    readonly kind: 'file' | 'dir';
}
export declare class UnsupportedReferenceError extends Error {
    readonly code: RefErrorCode;
    constructor(code: RefErrorCode, message: string);
}
/** The workspace root under which every reference must resolve. */
export declare function normalizeRoot(root: string): string;
/**
 * Resolve and validate a workspace-relative path.
 *
 * Applies: absolute/empty rejection -> resolve -> realpath -> verify the
 * real target still lives under `root`. When `allowSymlink` is false (default
 * for files) the final absolute target of any symlink must also sit inside
 * the workspace (a symlink whose target leaves the workspace is rejected).
 *
 * Returns a {@link SafeReference} or throws {@link UnsupportedReferenceError}.
 */
export declare function resolveReference(root: string, rel: string, opts?: Pick<WorkspaceIndexOptions, 'sepOverride'>): Promise<SafeReference>;
/** Normalize `..`/`.`/duplicate separators to a forward-slash relative path, or null if unsafe. */
export declare function normalizeRelative(rel: string, sepCh?: string): string | null;
/** Is `candidate` equal to or inside `root` (path-component aware)? */
export declare function isWithin(root: string, candidate: string): boolean;
/**
 * Build a snapshot candidate index of the workspace.
 *
 * Skips ignored directories and metadata files, enforces depth and entry caps,
 * resolves symlinks to verify containment (a symlink leaving the workspace is
 * dropped rather than served), and returns distinguishable `file` / `dir`
 * candidates.
 */
export declare function indexWorkspace(opts: WorkspaceIndexOptions): Promise<FileCandidate[]>;
/**
 * Score a candidate `relative` path against a `@query`, or return `null` when
 * it does not match. Lower is better.
 *
 * Semantics (aligned with the community `dsh-at-file` improvements):
 * - Empty query: matches everything (`0`), so ordering is purely the caller's tiebreak.
 * - Plain query (no `/`): **filename-centric** — prefer the last path segment
 *   prefix, then filename substring, then any-segment prefix, then a whole-path
 *   substring as a low fallback. Matching the *filename* (not scattered path
 *   characters) is what prevents unrelated hits like `src/draw/…` for `ra`.
 * - Path query (contains `/`): the `/`-separated query segments must match
 *   path segments **in order, as a prefix block**; a block at the path start
 *   scores better than one deeper. A trailing slash (`src/`) matches the `src`
 *   directory itself and everything under it.
 */
export declare function matchScore(rel: string, query: string): number | null;
/** Filter + rank candidates for a `@query` (prefix/substring match, exact first). */
export declare function searchCandidates(index: readonly FileCandidate[], query: string, limit: number): FileCandidate[];

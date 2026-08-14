/**
 * Pure client-side candidate matching/ranking for `@` references.
 *
 * Extracted so the exact match semantics (prefer exact-prefix, then substring,
 * then per-segment prefix) are unit-testable without a browser or host.
 */
import type { FileCandidate } from '../contract.js';
/** Rank candidates for a `@query`; recent and Git-changed files win ties. */
export declare function rankFileCandidates(candidates: readonly FileCandidate[], query: string, limit?: number, recent?: ReadonlySet<string>): readonly FileCandidate[];

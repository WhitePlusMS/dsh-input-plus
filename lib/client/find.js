/**
 * Pure client-side candidate matching/ranking for `@` references.
 *
 * Extracted so the exact match semantics (prefer exact-prefix, then substring,
 * then per-segment prefix) are unit-testable without a browser or host.
 */
/** Rank candidates for a `@query`; recent and Git-changed files win ties. */
export function rankFileCandidates(candidates, query, limit = 50, recent = new Set()) {
    const q = query.toLowerCase();
    return candidates
        .map((c) => {
        const lower = c.relative.toLowerCase();
        const score = candidateMatchScore(lower, q);
        if (score < 0)
            return null;
        return { c, score };
    })
        .filter((x) => x !== null)
        .sort((a, b) => {
        if (a.score !== b.score)
            return a.score - b.score;
        const aRecent = recent.has(a.c.relative);
        const bRecent = recent.has(b.c.relative);
        if (aRecent !== bRecent)
            return aRecent ? -1 : 1;
        const aModified = a.c.modified === true;
        const bModified = b.c.modified === true;
        if (aModified !== bModified)
            return aModified ? -1 : 1;
        const aRel = a.c.relative;
        const bRel = b.c.relative;
        const aDot = aRel.startsWith('.');
        const bDot = bRel.startsWith('.');
        if (aDot !== bDot)
            return aDot ? 1 : -1;
        const aDepth = aRel.split('/').length;
        const bDepth = bRel.split('/').length;
        if (aDepth !== bDepth)
            return aDepth - bDepth;
        return aRel.localeCompare(bRel);
    })
        .map((x) => x.c)
        .slice(0, limit);
}
/** Match the visible candidate name before considering its parent path. */
function candidateMatchScore(relative, query) {
    if (query === '')
        return 0;
    const segments = relative.split('/');
    const name = segments[segments.length - 1] ?? relative;
    if (!query.includes('/')) {
        if (name === query)
            return 0;
        if (name.startsWith(query))
            return 1;
        if (name.includes(query))
            return 2;
        if (segments.some((segment) => segment.startsWith(query)))
            return 3;
        if (relative.includes(query))
            return 4;
        return -1;
    }
    const querySegments = query.split('/').filter((segment) => segment !== '');
    for (let start = 0; start + querySegments.length <= segments.length; start += 1) {
        let matches = true;
        for (let offset = 0; offset < querySegments.length; offset += 1) {
            const segment = segments[start + offset];
            const querySegment = querySegments[offset];
            if (segment === undefined || querySegment === undefined || !segment.startsWith(querySegment)) {
                matches = false;
                break;
            }
        }
        if (matches)
            return start === 0 ? 1 : 2;
    }
    return -1;
}

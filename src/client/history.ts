/**
 * Session-scoped input history (pure, platform-agnostic).
 *
 * Frozen semantics (wayfinder/tickets/02-input-history-semantics.md):
 * - Only user-submitted non-empty drafts are recorded; never model/system/
 *   plugin-injected messages.
 * - At most HISTORY_LIMIT (50) entries; an immediately repeated identical
 *   submission collapses to one; a later repeat is recorded again.
 * - History lives only in the current page run: never persisted.
 *
 * This module only tracks the ring of entries and the navigation cursor. The
 * "saved draft" captured when navigation starts lives in the caller's State
 * (see client/keyboard.ts) because it is the live draft, not part of history.
 */

import { HISTORY_LIMIT } from '../contract.js'

export type HistoryEntry = string

export interface HistoryState {
  readonly entries: readonly HistoryEntry[]
  /** Index into `entries` while browsing; null = not browsing. */
  readonly index: number | null
}

export function emptyHistory(): HistoryState {
  return { entries: [], index: null }
}

/** Record a completed, non-empty draft. Exits any navigation session. */
export function record(state: HistoryState, text: string): HistoryState {
  if (typeof text !== 'string' || text.trim() === '') return state
  const last = state.entries[state.entries.length - 1]
  const entries = last === text ? state.entries : [...state.entries, text]
  return { entries: entries.slice(-HISTORY_LIMIT), index: null }
}

/**
 * Move one step into/within history.
 *
 * `down: false` (ArrowUp / Ctrl+P): first move jumps to the newest entry;
 * further moves go older, clamped at the oldest.
 * `down: true` (ArrowDown / Ctrl+N): moves newer; past the newest returns
 * `index` back to `null` (the caller restores the saved draft).
 */
export function navigate(state: HistoryState, down: boolean): HistoryState {
  if (state.entries.length === 0) return state
  if (!down) {
    const index = state.index === null ? state.entries.length - 1 : Math.max(0, state.index - 1)
    return { entries: state.entries, index }
  }
  if (state.index === null) return state
  if (state.index < state.entries.length - 1) {
    return { entries: state.entries, index: state.index + 1 }
  }
  return { entries: state.entries, index: null }
}

/** The entry at the cursor, or null when not browsing. */
export function entryAt(state: HistoryState): HistoryEntry | null {
  return state.index === null ? null : (state.entries[state.index] as string | undefined) ?? null
}

/** True right after navigation left the ring (`index` flipped to null while browsing). */
export function justExited(previous: HistoryState, next: HistoryState): boolean {
  return previous.index !== null && next.index === null
}

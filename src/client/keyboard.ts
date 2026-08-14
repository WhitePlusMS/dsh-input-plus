/**
 * Pure keyboard/gesture reducer for the input area.
 *
 * Frozen rules (wayfinder/tickets/03-keyboard-arbitration-and-clear-gesture.md
 * and research/dsh-input-plus-shortcuts.md):
 * - IME composition always wins: the plugin never consumes keys mid-composition,
 *   and an Escape during composition must not count toward a clear window.
 * - While the @ candidate menu is open, Up/Down/Enter/Escape belong to the menu
 *   (the official input-trigger pipeline arbitrates them) — this reducer does
 *   not double-handle them.
 * - Vertical keys move the caret within the multi-line draft until it reaches
 *   a visual boundary, then browse history (ArrowUp/ArrowDown and Ctrl+P/N are
 *   aliases).
 * - Enter submission is owned by the host; the reducer only records the draft
 *   into history once the host confirms the submit.
 * - Double-Escape clears a non-empty draft within a 600 ms window and records
 *   the cleared draft into history; an out-of-window second Escape just arms
 *   again; an empty draft never clears and never rewinds.
 *
 * Zero DOM/Cordis dependencies — inputs are plain values so the whole machine
 * is unit-testable in Node and reusable by the browser adapter.
 */

import { DOUBLE_ESCAPE_WINDOW_MS } from '../contract.js'
import { type HistoryState, entryAt, justExited, navigate, record } from './history.js'

export type VerticalDir = -1 | 1

export interface KeyboardInput {
  readonly draft: string
  readonly caret: number
  /** Whether the official @ candidate menu is currently open. */
  readonly menuOpen: boolean
  /** Whether an IME composition is in progress. */
  readonly composing: boolean
  /** Milliseconds since a fixed epoch; only deltas matter. */
  readonly now: number
}

export interface KeyboardState {
  readonly draft: string
  readonly caret: number
  readonly history: HistoryState
  /** Live draft captured when history navigation began; null = not navigating. */
  readonly savedDraft: string | null
  /** Timestamp of the first Escape of the window; null = not armed. */
  readonly escArmedAt: number | null
  /** True right after double-Escape cleared a draft (adapter may show a hint). */
  readonly justCleared: boolean
}

export type Gesture =
  | { type: 'set-draft'; draft: string; caret: number }
  | { type: 'vertical'; dir: VerticalDir }
  | { type: 'escape' }
  | { type: 'ime'; composing: boolean }
  /** The host confirmed the current draft was submitted as a user message. */
  | { type: 'submitted' }
  /** Reset all transient state (session switch / reconnect). */
  | { type: 'reset' }

export function initialKeyboardState(seed: Partial<KeyboardState> = {}): KeyboardState {
  return {
    draft: seed.draft ?? '',
    caret: seed.caret ?? 0,
    history: seed.history ?? { entries: [], index: null },
    savedDraft: seed.savedDraft ?? null,
    escArmedAt: seed.escArmedAt ?? null,
    justCleared: seed.justCleared ?? false,
  }
}

function lineInfo(text: string, caret: number): { line: number; column: number } {
  const before = text.slice(0, caret)
  const line = before.split('\n').length - 1
  const column = before.length - (before.lastIndexOf('\n') + 1)
  return { line, column }
}

/** Move the caret one visual line; null when already at that boundary. */
function moveCaretLine(text: string, caret: number, dir: VerticalDir): number | null {
  const lines = text.split('\n')
  const info = lineInfo(text, caret)
  const nextLine = info.line + dir
  if (nextLine < 0 || nextLine >= lines.length) return null
  let offset = 0
  for (let i = 0; i < nextLine; i += 1) offset += (lines[i] as string).length + 1
  return offset + Math.min(info.column, (lines[nextLine] as string).length)
}

/** True when a vertical key should fall through to history navigation. */
export function isAtBoundary(text: string, caret: number, dir: VerticalDir): boolean {
  return moveCaretLine(text, caret, dir) === null
}

export function reduce(state: KeyboardState, gesture: Gesture, input: KeyboardInput): KeyboardState {
  switch (gesture.type) {
    case 'reset':
      return initialKeyboardState()

    case 'set-draft':
      return {
        ...state,
        draft: gesture.draft,
        caret: clampCaret(gesture.draft, gesture.caret),
        history: { ...state.history, index: null },
        savedDraft: null,
        escArmedAt: null,
        justCleared: false,
      }

    case 'ime':
      // Starting composition discards any armed window so a mid-composition
      // Escape cannot complete a clear; ending composition leaves state alone.
      return gesture.composing ? { ...state, escArmedAt: null } : state

    case 'vertical': {
      // IME and the open candidate menu both own vertical keys.
      if (input.composing || input.menuOpen) return state
      const boundary = isAtBoundary(input.draft, input.caret, gesture.dir)
      if (!boundary) {
        const caret = moveCaretLine(input.draft, input.caret, gesture.dir) as number
        return { ...state, caret, escArmedAt: null, justCleared: false }
      }
      return historyStep(state, input, gesture.dir === -1)
    }

    case 'escape':
      return handleEscape(state, input)

    case 'submitted': {
      if (input.draft.trim() === '') return state
      return {
        ...state,
        history: record(state.history, input.draft),
        savedDraft: null,
        escArmedAt: null,
        justCleared: false,
      }
    }

    default:
      return state
  }
}

/**
 * Handle a boundary vertical key.
 *
 * ArrowUp (up=true) entering navigation captures the live draft the first time
 * and moves older; ArrowDown (up=false) moves newer and, past the newest,
 * restores the captured draft and exits navigation.
 */
function historyStep(state: KeyboardState, input: KeyboardInput, up: boolean): KeyboardState {
  const capturing = up && state.history.index === null
  const liveDraft = capturing ? input.draft : state.savedDraft
  const previous = state.history
  const next = navigate(previous, !up)
  const entry = entryAt(next)
  if (entry !== null) {
    return {
      ...state,
      draft: entry,
      caret: entry.length,
      history: next,
      savedDraft: liveDraft,
      escArmedAt: null,
      justCleared: false,
    }
  }
  // Exited navigation below the newest entry: restore the captured draft.
  if (justExited(previous, next)) {
    const restored = state.savedDraft ?? ''
    return {
      ...state,
      draft: restored,
      caret: restored.length,
      history: next,
      savedDraft: null,
      escArmedAt: null,
      justCleared: false,
    }
  }
  return state
}

function handleEscape(state: KeyboardState, input: KeyboardInput): KeyboardState {
  // Empty draft: nothing to clear; v0.1 never rewinds/backtracks.
  if (input.draft.trim() === '') {
    return { ...state, escArmedAt: null, justCleared: false }
  }
  const withinWindow =
    state.escArmedAt !== null && (input.now - state.escArmedAt) <= DOUBLE_ESCAPE_WINDOW_MS
  if (withinWindow) {
    return {
      ...state,
      history: record(state.history, input.draft),
      draft: '',
      caret: 0,
      savedDraft: null,
      escArmedAt: null,
      justCleared: true,
    }
  }
  // First Escape, or an out-of-window second Escape: arm the window.
  return { ...state, escArmedAt: input.now, justCleared: false }
}

function clampCaret(draft: string, caret: number): number {
  const n = draft.length
  if (!Number.isFinite(caret)) return n
  return Math.max(0, Math.min(caret, n))
}

export { lineInfo }

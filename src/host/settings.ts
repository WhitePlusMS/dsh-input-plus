/**
 * Host settings schema + defaults for dsh-input-plus.
 *
 * The schemastery schema is the single source for the *user-facing* knobs;
 * defaults live in DEFAULTS and are the only default literals (single source,
 * mirroring whale-girl's config practice).
 */

import z from '@deepseek-ai/schemastery'

export const SETTINGS_NAMESPACE = 'input-plus'

export const DEFAULTS = Object.freeze({
  /** Master switch: when off, no input-enhancement behavior registers. */
  enabled: true,
  /** Max workspace depth scanned for directory candidates. */
  maxIndexDepth: 3,
  /** Max candidate rows served per search. */
  maxIndexEntries: 200,
  /** Optional absolute reference-root override; empty = session workspace. */
  referenceRoot: '',
})

export interface InputPlusSettings {
  enabled: boolean
  maxIndexDepth: number
  maxIndexEntries: number
  referenceRoot: string
}

export function buildSchema(): z<InputPlusSettings> {
  return z.object({
    enabled: z.boolean().default(DEFAULTS.enabled),
    maxIndexDepth: z.number().min(0).max(10).default(DEFAULTS.maxIndexDepth),
    maxIndexEntries: z.number().min(1).max(2000).default(DEFAULTS.maxIndexEntries),
    referenceRoot: z.string().default(DEFAULTS.referenceRoot),
  }) as unknown as z<InputPlusSettings>
}

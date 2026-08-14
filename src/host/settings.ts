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
  /** Max bytes for one referenced text file. */
  maxFileBytes: 512 * 1024,
  /** Max total bytes for a directory manifest. */
  maxDirBytes: 128 * 1024,
  /** Directory manifest depth cap (negative = unlimited). */
  maxManifestDepth: 3,
  /** Max candidate rows served per search. */
  maxIndexEntries: 200,
  /** Optional absolute reference-root override; empty = session workspace. */
  referenceRoot: '',
})

export interface InputPlusSettings {
  enabled: boolean
  maxFileBytes: number
  maxDirBytes: number
  maxManifestDepth: number
  maxIndexEntries: number
  referenceRoot: string
}

export function buildSchema(): z<InputPlusSettings> {
  return z.object({
    enabled: z.boolean().default(DEFAULTS.enabled),
    maxFileBytes: z.number().min(1).max(16 * 1024 * 1024).default(DEFAULTS.maxFileBytes),
    maxDirBytes: z.number().min(1).max(4 * 1024 * 1024).default(DEFAULTS.maxDirBytes),
    maxManifestDepth: z.number().min(0).max(10).default(DEFAULTS.maxManifestDepth),
    maxIndexEntries: z.number().min(1).max(2000).default(DEFAULTS.maxIndexEntries),
    referenceRoot: z.string().default(DEFAULTS.referenceRoot),
  }) as unknown as z<InputPlusSettings>
}

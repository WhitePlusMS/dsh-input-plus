/**
 * The `@` file/directory reference input-trigger source.
 *
 * Registers with the official `ctx.inputTriggers.registerSource` pipeline. The
 * official candidate menu handles caret/token detection, keyboard arbitration,
 * and the final text write-back; this source only supplies candidates and the
 * picked plain-text reference path (the frozen "plain-text reference path"
 * decision — no placeholder/occurrence, see the input-trigger contract).
 *
 * The Host is the final authority: it re-validates every token and injects
 * file contents at `agent/pre-step`; the browser never requests or receives
 * file contents or absolute paths.
 */

import type {
  ClientSessionContext,
  InputTriggerCandidate,
  InputTriggerSource,
  PickOutcome,
} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { FileCandidate } from '../contract.js'
import type { FileIndexReader } from './bridge.js'
import { rankFileCandidates } from './find.js'

export { rankFileCandidates } from './find.js'

export interface InputSourceDeps {
  readonly reader: FileIndexReader
  /** Optional local filter/ranker override (defaults to rankFileCandidates). */
  readonly filter?: (candidates: readonly FileCandidate[], query: string) => readonly FileCandidate[]
  /** True once the Host index is unreachable — candidates degrade to a clear message. */
  readonly isReady?: () => boolean
}

export function toMenuCandidate(c: FileCandidate): InputTriggerCandidate {
  return {
    name: c.relative,
    description: c.kind === 'dir' ? 'directory' : 'file',
    hint: c.label,
  }
}

export function createFileInputSource(deps: InputSourceDeps): InputTriggerSource {
  return {
    trigger: '@',
    name: 'File reference',
    order: 10,
    async candidates(session: ClientSessionContext, req) {
      const raw = await deps.reader.candidates(session.sessionId, req.query, req.signal)
      const filter = deps.filter ?? rankFileCandidates
      return filter(raw, req.query).map(toMenuCandidate)
    },
    onPick(pick): PickOutcome {
      // Plain-text reference path: the pipeline replaces the token span with
      // this literal text. The Host re-validates at pre-step.
      const rel = pick.candidate.name
      return { text: `@${rel} ` }
    },
  }
}

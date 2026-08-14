/**
 * dsh-input-plus browser half.
 *
 * The plugin stays on rc.6's additive extension surfaces: the official `@`
 * input-trigger source and the composer status dock. It does not replace the
 * textarea and does not install a document-level keyboard listener.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ClientContext, ISessions, SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import type { IConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { InputTriggerServiceContract } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { httpFileIndexReader } from './bridge.js'
import { installFileIconStyles } from './file-icons.js'
import {
  createHistoryInputSource,
  createHistoryStore,
  installHistoryMenuStyles,
} from './history-source.js'
import { wireHistoryRecorder } from './history-recorder.js'
import { createFileInputSource } from './input-source.js'
import { InputStatus } from './input-status.js'

export const name = 'dsh-input-plus'

export const inject = [
  'inputTriggers',
  'slots',
  'conversation',
  'sessions',
]

export interface CapabilityProbe {
  /** `ctx.inputTriggers` present → the `@` reference source can register. */
  readonly atSource: boolean
  /** The additive composer dock is present. */
  readonly inputStatus: boolean
  /** Public SessionInput and Session list are present for slash history. */
  readonly history: boolean
}

export function probeCapabilities(ctx: Context): CapabilityProbe {
  const inputTriggers = ctx.get('inputTriggers') as InputTriggerServiceContract | undefined
  const slots = ctx.get('slots') as unknown as SlotRegistry | undefined
  const conversation = ctx.get('conversation') as IConversation | undefined
  const sessions = ctx.get('sessions') as unknown as ISessions | undefined
  const inputStatus = Boolean(slots)
  const history = conversation !== undefined && sessions !== undefined
  return { atSource: Boolean(inputTriggers), inputStatus, history }
}

export function apply(ctx: Context): void {
  const probe = probeCapabilities(ctx)

  if (probe.atSource) {
    const inputTriggers = ctx.get('inputTriggers') as InputTriggerServiceContract
    const source = createFileInputSource({ reader: httpFileIndexReader() })
    ctx.effect(() => inputTriggers.registerSource(source))
    ctx.effect(installFileIconStyles)
    console.info('[dsh-input-plus] @ file source registered with recent/Git ranking.')

    if (probe.history) {
      const conversation = ctx.get('conversation') as IConversation
      const sessions = ctx.get('sessions') as unknown as ISessions
      const history = createHistoryStore()
      const historySource = createHistoryInputSource(history)
      ctx.effect(() => inputTriggers.registerSource(historySource))
      ctx.effect(installHistoryMenuStyles)
      ctx.effect(() => wireHistoryRecorder({ conversation, sessions, history }))
      console.info('[dsh-input-plus] /h and /history input history source registered.')
    } else {
      console.warn('[dsh-input-plus] capability degraded: /h history source unavailable.')
    }
  } else {
    console.warn('[dsh-input-plus] capability degraded: @ file source unavailable.')
  }

  if (probe.inputStatus) {
    wireInputStatus(ctx)
  } else {
    console.warn('[dsh-input-plus] capability degraded: composer status dock unavailable.')
  }
}

function wireInputStatus(ctx: Context): void {
  const slots = ctx.get('slots') as SlotRegistry

  slots.inject('conversation.composer.dock', () => slots.register(
    {
      name: 'conversation.composer.dock',
      registrant: name,
      id: 'input-status',
      order: 10,
    },
    InputStatus,
  ))
  console.info('[dsh-input-plus] composer status dock registered.')
}

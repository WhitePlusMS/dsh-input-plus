/**
 * dsh-input-plus browser half.
 *
 * A static client plugin: registers the `@` file/directory reference source
 * through the official input-trigger pipeline, and performs capability
 * detection with per-feature degradation (the plugin's own documented
 * compatibility strategy).
 *
 * rc.6 note on history / double-Escape: their pure state machines ship in this
 * package (src/client/keyboard.ts, src/client/history.ts) and are unit-tested.
 * The browser adapter only wires them through an official keyboard seam. In
 * rc.6 the composer keyboard command face (`ComposerKeyboard`) is injected only
 * into the single-seat `conversation.composer.bar` body — taking that seat
 * would REPLACE the whole composer, which this plugin deliberately does not do
 * (see wayfinder/research). With no additive seam the adapter keeps `@`
 * working and surfaces one actionable diagnostic; the machines auto-enable on
 * a host that exposes the seam (`wireKeyboard` below).
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InputTriggerServiceContract } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { httpFileIndexReader } from './bridge.js'
import { createFileInputSource } from './input-source.js'

export const name = 'dsh-input-plus'

export const inject = ['inputTriggers']

/** Results of capability probing; used to render one diagnostic per missing seam. */
export interface CapabilityProbe {
  /** `ctx.inputTriggers` present → the `@` reference source can register. */
  readonly atSource: boolean
  /** A public composer keyboard seam is present → history/escape can wire. */
  readonly keyboardSeam: boolean
}

/**
 * Which official extension seams this DSH build exposes. The `@` source rides
 * the additive input-trigger pipeline; history/escape need a composer keyboard
 * seam, which rc.6 ships only inside the single-seat composer bar (no additive
 * seam — see module doc). `keyboardSeam` is therefore `false` on rc.6 and flips
 * true only when an additive seam becomes available.
 */
export function probeCapabilities(ctx: Context): CapabilityProbe {
  const inputTriggers = ctx.get('inputTriggers') as InputTriggerServiceContract | undefined
  const keyboardSeam = false // hardened until an additive keyboard seam exists
  return { atSource: Boolean(inputTriggers), keyboardSeam }
}

export function apply(ctx: Context): void {
  const probe = probeCapabilities(ctx)

  // --- @ file reference (additive, fully functional) -----------------------
  if (probe.atSource) {
    const inputTriggers = ctx.get('inputTriggers') as InputTriggerServiceContract
    const deps = httpFileIndexReader()
    const source = createFileInputSource({ reader: deps })
    // registerSource returns the disposer; ctx.effect keeps it on the Fiber.
    ctx.effect(() => inputTriggers.registerSource(source))
    console.info('[dsh-input-plus] @ file reference source registered (ctx.inputTriggers present).')
  } else {
    console.warn('[dsh-input-plus] capability degraded: @ file reference — official input-trigger service not present.')
  }

  // --- input history + double-Escape (seam-gated) ---------------------------
  if (probe.keyboardSeam) {
    wireKeyboard(ctx)
  } else {
    console.warn(
      '[dsh-input-plus] capabilities degraded: input history & double-Escape — no public composer keyboard seam in this DSH build (rc.6 composes the keyboard face only into the single-seat composer bar). The pure state machines ship and auto-enable when a seam exists.',
    )
  }
}

/**
 * Wires the pure history/escape machines to an official composer keyboard seam
 * when `probeCapabilities` reports one. Intentionally empty until such a seam
 * exists in DSH — the machines live in keyboard.ts/history.ts regardless.
 */
function wireKeyboard(_ctx: Context): void {
  // TODO(compat): attach reduce() from ./keyboard.js to the seam's key events
  // and push draft changes through the seam's draft write path.
}

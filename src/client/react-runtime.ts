/**
 * Minimal React runtime adapter for the static client bundle.
 *
 * DSH already loads React for its official conversation package. The client
 * bundle's outer ModuleLoader supplies that package resolver to this factory,
 * so the plugin can render additive slot entries without bundling React again.
 */

import type { ConversationSlotProps } from '@deepseek-ai/dsh-client-ui-conversation/client'

/** The host's own ReactNode type, recovered through the public slot contract. */
export type RenderNode = ReturnType<ConversationSlotProps['renderSlot']>

interface ReactRuntime {
  createElement(type: string, props: Record<string, unknown> | null, ...children: unknown[]): RenderNode
}

function loadReact(): ReactRuntime | undefined {
  try {
    if (typeof require === 'function') return require('react') as ReactRuntime
  } catch {
    // Unit tests and non-React host probes can load the pure modules safely.
  }
  return undefined
}

const react = loadReact()

export function element(
  type: string,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): RenderNode {
  return react?.createElement(type, props, ...children) ?? null
}

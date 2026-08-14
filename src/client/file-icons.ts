/**
 * File candidate icons for the official rc.6 input-trigger menu.
 *
 * The menu contract types `icon` as a string, while rc.6's MenuView forwards
 * that value as a React child. We use that existing render seam to provide
 * the same DSH vector icons used by the official UI; no Emoji or DOM menu
 * replacement is involved.
 */

interface IconProps {
  readonly size?: number
  readonly className?: string
}

interface PrimitiveIconModule {
  readonly IconArchiveOutline20?: (props: IconProps) => unknown
  readonly IconBrowseOutline16?: (props: IconProps) => unknown
  readonly IconCodeOutline16?: (props: IconProps) => unknown
  readonly IconDataOutline16?: (props: IconProps) => unknown
  readonly IconFolderOpen16?: (props: IconProps) => unknown
}

type FileIconKind = 'archive' | 'code' | 'data' | 'file' | 'folder'

const STYLE_ID = 'dsh-input-plus-file-icons'
const ICON_STYLE = `
  .dsh-input-plus-icon-folder { color: #f2a51a; }
  .dsh-input-plus-icon-code { color: #55aaf5; }
  .dsh-input-plus-icon-data { color: #a181f7; }
  .dsh-input-plus-icon-file { color: #8db5d9; }
  .dsh-input-plus-icon-archive { color: #d39a62; }
`

let primitiveIcons: PrimitiveIconModule | null | undefined

function loadPrimitiveIcons(): PrimitiveIconModule | undefined {
  if (primitiveIcons !== undefined) return primitiveIcons ?? undefined
  try {
    if (typeof require !== 'function') {
      primitiveIcons = null
      return undefined
    }
    primitiveIcons = require('@deepseek-ai/dsh-client-ui-primitives') as PrimitiveIconModule
    return primitiveIcons
  } catch {
    // Pure unit-test/runtime probes do not provide the browser's outer loader.
    primitiveIcons = null
    return undefined
  }
}

function iconKind(relative: string, isDirectory: boolean): FileIconKind {
  if (isDirectory) return 'folder'
  const dot = relative.lastIndexOf('.')
  const extension = dot < 0 ? '' : relative.slice(dot + 1).toLowerCase()
  if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar'].includes(extension)) return 'archive'
  if (['json', 'jsonl', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'csv', 'tsv', 'xml'].includes(extension)) return 'data'
  if ([
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'java', 'kt', 'kts', 'go', 'rs',
    'py', 'rb', 'php', 'c', 'cc', 'cpp', 'h', 'hpp', 'cs', 'swift', 'vue',
    'svelte', 'css', 'scss', 'less', 'sql', 'sh', 'bash', 'zsh', 'ps1',
  ].includes(extension)) return 'code'
  return 'file'
}

function iconRenderer(kind: FileIconKind): ((props: IconProps) => unknown) | undefined {
  const icons = loadPrimitiveIcons()
  if (icons === undefined) return undefined
  switch (kind) {
    case 'folder': return icons.IconFolderOpen16
    case 'code': return icons.IconCodeOutline16
    case 'data': return icons.IconDataOutline16
    case 'archive': return icons.IconArchiveOutline20
    case 'file': return icons.IconBrowseOutline16
  }
}

/**
 * Return the icon child accepted by the rc.6 menu. The fallback is a plain
 * text square only for non-browser probes where DSH's icon module is absent.
 */
export function createFileCandidateIcon(relative: string, isDirectory: boolean): string {
  const kind = iconKind(relative, isDirectory)
  const render = iconRenderer(kind)
  if (render === undefined) return '□'
  try {
    const node = render({
      size: 18,
      className: `dsh-input-plus-icon-${kind}`,
    })
    return (node ?? '□') as unknown as string
  } catch {
    return '□'
  }
}

/** Install only the color rules; the icon geometry comes from DSH primitives. */
export function installFileIconStyles(): () => void {
  if (typeof document === 'undefined') return () => undefined
  if (document.getElementById(STYLE_ID) !== null) return () => undefined
  const target = document.head ?? document.documentElement
  if (target === null) return () => undefined

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = ICON_STYLE
  target.append(style)
  return () => style.remove()
}

import { clsx } from 'clsx'
import {
  Check,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  Download,
  FileImage,
  Library,
  Share2,
  VectorSquare,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  PNG_EXPORT_FILENAME,
  SVG_EXPORT_FILENAME,
  downloadGraphPng,
  downloadGraphSvg,
  findGraphCanvas,
} from '../../core/exportCanvas'
import { buildGraphShareUrl, serializeGraphForStorage } from '../../core/share'
import type { GraphStateData } from '../../core/types'
import { useGraphStore } from '../../store/useGraphStore'
import { BacGalleryModal } from '../modals/BacGalleryModal'
import { HelpShortcutsModal } from '../modals/HelpShortcutsModal'

export function GraphHeaderActions() {
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'err' } | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.isComposing) {
        return
      }
      if (isTypingTarget(event.target)) return
      const overlay = document.querySelector('[data-graphflow-overlay]')
      const owner = overlay?.getAttribute('data-graphflow-overlay') ?? ''
      if (overlay && owner !== 'help') return
      event.preventDefault()
      setHelpOpen((open) => !open)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  function showToast(message: string, tone: 'ok' | 'err' = 'ok') {
    setToast({ message, tone })
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => {
      setToast(null)
      toastTimer.current = null
    }, 4500)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setGalleryOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-cyan-300/40 bg-cyan-400/15 px-3 text-xs font-semibold text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.2)] transition hover:bg-cyan-400/25"
        >
          <Library size={14} />
          Galerie BAC (10 Exemple)
        </button>
        <button
          type="button"
          onClick={() => {
            void shareCurrentGraph(showToast)
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
        >
          <Share2 size={14} />
          Distribuie Link
        </button>
        <ExportMenu suspended={galleryOpen || helpOpen} onToast={showToast} />
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-keyshortcuts="?"
          title="Ajutor & Scurtături (?)"
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-cyan-50"
        >
          <CircleHelp size={14} />
          Ajutor & Scurtături
          <kbd className="rounded bg-white/5 px-1 font-mono text-[10px] text-slate-400">?</kbd>
        </button>
      </div>

      <BacGalleryModal open={galleryOpen} onClose={() => setGalleryOpen(false)} />
      <HelpShortcutsModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      {toast && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="status"
              aria-live="polite"
              className={clsx(
                'fixed bottom-6 left-1/2 z-[90] flex max-w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-2 rounded-2xl border bg-[#0c1220]/95 px-4 py-2.5 text-xs font-medium shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl',
                toast.tone === 'ok'
                  ? 'border-emerald-300/30 text-emerald-50'
                  : 'border-amber-300/30 text-amber-50',
              )}
            >
              {toast.tone === 'ok' ? (
                <Check size={14} className="shrink-0 text-emerald-300" />
              ) : (
                <CircleAlert size={14} className="shrink-0 text-amber-300" />
              )}
              {toast.message}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function ExportMenu({
  suspended,
  onToast,
}: {
  suspended: boolean
  onToast: (message: string, tone?: 'ok' | 'err') => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (suspended) setOpen(false)
  }, [suspended])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function exportPng() {
    const svg = findGraphCanvas()
    if (!svg) {
      onToast('Canvasul nu este pregătit pentru export.', 'err')
      setOpen(false)
      return
    }
    setBusy(true)
    try {
      await downloadGraphPng(svg)
      onToast(`Imaginea ${PNG_EXPORT_FILENAME} a fost descărcată.`)
      setOpen(false)
    } catch {
      onToast('Exportul PNG a eșuat.', 'err')
    } finally {
      setBusy(false)
    }
  }

  function exportSvg() {
    const svg = findGraphCanvas()
    if (!svg) {
      onToast('Canvasul nu este pregătit pentru export.', 'err')
      setOpen(false)
      return
    }
    try {
      downloadGraphSvg(svg)
      onToast(`Fișierul ${SVG_EXPORT_FILENAME} a fost descărcat.`)
      setOpen(false)
    } catch {
      onToast('Exportul SVG a eșuat.', 'err')
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
      >
        <Download size={14} />
        Exportă
        <ChevronDown size={13} className={clsx('transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <div
          role="menu"
          data-graphflow-overlay=""
          className="absolute top-[calc(100%+6px)] left-0 z-40 w-80 rounded-2xl border border-white/10 bg-[#0c1220]/95 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <MenuItem
            icon={<FileImage size={14} />}
            label={`Descarcă Imagine PNG (${PNG_EXPORT_FILENAME})`}
            disabled={busy}
            onClick={() => {
              void exportPng()
            }}
          />
          <MenuItem
            icon={<VectorSquare size={14} />}
            label={`Descarcă Vector SVG (${SVG_EXPORT_FILENAME})`}
            disabled={busy}
            onClick={exportSvg}
          />
        </div>
      ) : null}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: ReactNode
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left text-[11px] leading-snug font-medium text-slate-200 transition hover:bg-cyan-400/10 hover:text-cyan-50 disabled:opacity-40"
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

async function shareCurrentGraph(showToast: (message: string, tone?: 'ok' | 'err') => void): Promise<void> {
  const graph = currentGraph()
  const signature = serializeGraphForStorage(graph)
  const url = buildGraphShareUrl(graph, window.location.href)
  publishShareHash(url, signature)
  const copied = await copyText(url)
  publishShareHash(url, signature)
  showToast(
    copied ? 'Link-ul grafului a fost copiat!' : 'Nu am putut copia link-ul. Îl găsești în bara de adresă.',
    copied ? 'ok' : 'err',
  )
}

function publishShareHash(url: string, signature: string): void {
  if (serializeGraphForStorage(currentGraph()) !== signature) return
  try {
    const parsed = new URL(url)
    const next = `${parsed.pathname}${parsed.search}${parsed.hash}`
    window.history.replaceState(window.history.state, '', next)
  } catch {
    // The copied text still holds the share link when the address bar cannot change.
  }
}

function currentGraph(): GraphStateData {
  const state = useGraphStore.getState()
  return {
    nodes: state.nodes,
    edges: state.edges,
    isDirected: state.isDirected,
    isWeighted: state.isWeighted,
  }
}

async function copyText(text: string): Promise<boolean> {
  if (copyWithTextarea(text)) return true
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    return false
  }
  return false
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

function copyWithTextarea(text: string): boolean {
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '0'
    area.style.left = '0'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.focus()
    area.select()
    area.setSelectionRange(0, area.value.length)
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  } catch {
    return false
  }
}

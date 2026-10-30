import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { PanelRightOpen } from 'lucide-react'
import { GraphCanvas } from './components/canvas/GraphCanvas'
import { GraphHeaderActions } from './components/header/GraphHeaderActions'
import { AlgorithmPlayer } from './components/player/AlgorithmPlayer'
import { BacRepresentationsPanel } from './components/panels/BacRepresentationsPanel'
import { useAlgorithmStore } from './store/useAlgorithmStore'
import { useGraphStore, type InteractionMode } from './store/useGraphStore'

const MODE_LABELS: Record<InteractionMode, string> = {
  select: 'Selectare',
  addNode: 'Adăugare nod',
  addEdge: 'Adăugare muchie',
  delete: 'Ștergere',
}

function App() {
  const nodes = useGraphStore((state) => state.nodes)
  const edges = useGraphStore((state) => state.edges)
  const isDirected = useGraphStore((state) => state.isDirected)
  const isWeighted = useGraphStore((state) => state.isWeighted)
  const interactionMode = useGraphStore((state) => state.interactionMode)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelWidth, setPanelWidth] = useState(38)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const algorithmSteps = useAlgorithmStore((state) => state.steps)
  const seenAlgorithmSteps = useRef<typeof algorithmSteps | null>(null)

  useEffect(() => {
    if (seenAlgorithmSteps.current === algorithmSteps) return
    const started = algorithmSteps.length > 0 && seenAlgorithmSteps.current !== algorithmSteps
    seenAlgorithmSteps.current = algorithmSteps
    if (started) setPanelOpen(true)
  }, [algorithmSteps])

  function onDividerPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    dragRef.current = { startX: event.clientX, startWidth: panelWidth }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onDividerPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    const delta = ((drag.startX - event.clientX) / window.innerWidth) * 100
    setPanelWidth(Math.min(46, Math.max(32, drag.startWidth + delta)))
  }

  function stopDividerDrag() {
    dragRef.current = null
    setDragging(false)
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#090d16] text-slate-100">
      <header className="z-20 flex shrink-0 flex-col border-b border-white/10 bg-white/[0.03] backdrop-blur-md">
        <div className="relative z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-xs font-semibold tracking-wide text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.22)]">
            GF
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-wide text-slate-50">GraphFlow BAC</h1>
            <p className="truncate text-[11px] text-slate-400">Vizualizator de grafuri pentru bacalaureat</p>
          </div>
        </div>

        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          <GraphHeaderActions />
          <span className="mx-0.5 hidden h-6 w-px bg-white/10 lg:block" aria-hidden="true" />
          <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
            Noduri (n): {nodes.length}
          </span>
          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100">
            Muchii (m): {edges.length}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-200">
            Tip: {isDirected ? 'Orientat' : 'Neorientat'}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300">
            {isWeighted ? 'Ponderat' : 'Neponderat'}
          </span>
        </div>
        </div>
        <div className="border-t border-white/10 px-3 py-2">
          <AlgorithmPlayer />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <GraphCanvas />
        </main>

        {panelOpen ? (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionează panoul BAC"
              title="Trage pentru a redimensiona"
              onPointerDown={onDividerPointerDown}
              onPointerMove={onDividerPointerMove}
              onPointerUp={stopDividerDrag}
              onPointerCancel={stopDividerDrag}
              className={`relative z-20 w-1.5 shrink-0 cursor-col-resize touch-none ${
                dragging ? 'bg-cyan-300/50' : 'bg-white/5 hover:bg-cyan-300/30'
              }`}
            >
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10" />
            </div>
            <aside
              className="h-full min-h-0 shrink-0 border-l border-white/10"
              style={{ width: `${panelWidth}%` }}
            >
              <BacRepresentationsPanel onCollapse={() => setPanelOpen(false)} />
            </aside>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="flex w-11 shrink-0 flex-col items-center justify-center gap-3 border-l border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-cyan-400/10 hover:text-cyan-100"
            aria-label="Arată panoul de reprezentări BAC"
          >
            <PanelRightOpen size={16} />
            <span className="text-[10px] font-medium tracking-[0.16em] [writing-mode:vertical-rl]">BAC</span>
          </button>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-black/30 px-4 py-1.5">
        <p className="min-w-0 text-[11px] leading-relaxed text-slate-400">
          Dublu-click pe ecran = Adaugă nod | Shift + Drag între noduri = Adaugă muchie | Click pe a[i][j] în matrice =
          Comută muchia | ? = Ajutor
        </p>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-500">
          {MODE_LABELS[interactionMode]}
        </span>
      </footer>
    </div>
  )
}

export default App

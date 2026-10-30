import { clsx } from 'clsx'
import { FolderInput, Play, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { AlgorithmId } from '../../core/algorithms/types'
import {
  BAC_SCENARIO_CATEGORIES,
  BAC_SCENARIOS,
  type BacScenario,
  type BacScenarioCategory,
  type BacScenarioDifficulty,
} from '../../core/presets'
import { useAlgorithmStore } from '../../store/useAlgorithmStore'
import { useGraphStore } from '../../store/useGraphStore'

type GalleryFilter = 'all' | BacScenarioCategory

const ALGORITHM_LABELS: Record<AlgorithmId, string> = {
  bfs: 'BFS (Lățime)',
  dfs: 'DFS (Adâncime)',
  connected_components: 'Componente Conexe',
  cycle_detection: 'Detecție Cicluri',
  bipartite: 'Graf Bipartit',
  dijkstra: 'Dijkstra (Drum Minim)',
  roy_floyd: 'Roy-Floyd (Matrice Costuri)',
  kruskal: 'Kruskal (APM)',
  prim: 'Prim (APM)',
  rooted_tree: 'Arbore cu Rădăcină (BAC)',
  eulerian: 'Ciclu Eulerian',
  hamiltonian: 'Ciclu Hamiltonian',
}

const CATEGORY_CLASS: Record<BacScenarioCategory, string> = {
  'Parcurgeri & Conexitate': 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100',
  'Arbori & Vector de Tați': 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
  'Cost Minim & APM': 'border-amber-300/30 bg-amber-400/10 text-amber-100',
  'Eulerian & Hamiltonian': 'border-indigo-300/30 bg-indigo-400/10 text-indigo-100',
}

interface BacGalleryModalProps {
  open: boolean
  onClose: () => void
}

export function BacGalleryModal({ open, onClose }: BacGalleryModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [filter, setFilter] = useState<GalleryFilter>('all')
  const visible = filter === 'all' ? BAC_SCENARIOS : BAC_SCENARIOS.filter((scenario) => scenario.category === filter)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#090d16]/75 p-3 backdrop-blur-sm sm:p-6"
      data-graphflow-overlay=""
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bac-gallery-title"
        tabIndex={-1}
        className="flex max-h-[min(880px,calc(100vh-1.5rem))] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c1220]/95 text-slate-100 shadow-[0_30px_80px_rgba(0,0,0,0.55)] outline-none"
      >
        <header className="flex shrink-0 flex-col gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="bac-gallery-title" className="text-base font-semibold tracking-wide text-slate-50">
                Galerie BAC
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                10 scenarii clasice, cu coordonate gata așezate. Încărcarea înlocuiește desenul curent, iar Undo revine
                la graful anterior.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  useGraphStore.getState().resetToInitial()
                  onClose()
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-medium text-slate-200 transition hover:border-emerald-300/30 hover:bg-emerald-400/10 hover:text-emerald-50"
              >
                <RotateCcw size={13} />
                Resetează la Inițial
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Închide galeria"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrează după categorie">
            <FilterChip active={filter === 'all'} count={BAC_SCENARIOS.length} onClick={() => setFilter('all')}>
              Toate
            </FilterChip>
            {BAC_SCENARIO_CATEGORIES.map((category) => (
              <FilterChip
                key={category}
                active={filter === category}
                count={BAC_SCENARIOS.filter((scenario) => scenario.category === category).length}
                onClick={() => setFilter(category)}
              >
                {category}
              </FilterChip>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-400">
              Niciun scenariu în categoria aleasă.
            </p>
          ) : (
            <div className="grid items-stretch gap-3 md:grid-cols-2">
              {visible.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onLoad={() => {
                    applyScenario(scenario, false)
                    onClose()
                  }}
                  onRun={() => {
                    applyScenario(scenario, true)
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ScenarioCard({
  scenario,
  onLoad,
  onRun,
}: {
  scenario: BacScenario
  onLoad: () => void
  onRun: () => void
}) {
  const graph = scenario.graph
  const algorithm = algorithmLabel(scenario)
  const startWord = scenario.recommendedAlgorithm === 'rooted_tree' ? 'rădăcină' : 'start'
  const target = scenario.recommendedTargetNode

  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap gap-1.5">
        <Badge className={CATEGORY_CLASS[scenario.category]}>{scenario.category}</Badge>
        <Badge className={difficultyClass(scenario.difficulty)}>{scenario.difficulty}</Badge>
        <Badge className="border-white/10 bg-white/[0.04] text-slate-200">
          {graph.isDirected ? 'Orientat' : 'Neorientat'}
        </Badge>
        <Badge
          className={
            graph.isWeighted
              ? 'border-violet-300/30 bg-violet-400/10 text-violet-100'
              : 'border-white/10 bg-white/[0.04] text-slate-300'
          }
        >
          {graph.isWeighted ? 'Ponderat' : 'Neponderat'}
        </Badge>
        <Badge className="border-emerald-300/20 bg-emerald-400/10 text-emerald-100">n = {graph.nodes.length}</Badge>
        <Badge className="border-cyan-300/20 bg-cyan-400/10 text-cyan-100">m = {graph.edges.length}</Badge>
      </div>

      <h3 className="mt-3 text-sm font-semibold leading-snug text-slate-50">{scenario.title}</h3>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-400">{scenario.description}</p>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Algoritm recomandat: <span className="font-medium text-slate-300">{algorithm}</span>
        {' · '}
        {startWord} {scenario.recommendedStartNode}
        {typeof target === 'number' ? ` · destinație ${target}` : ''}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onLoad}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-medium text-slate-100 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-cyan-50"
        >
          <FolderInput size={13} />
          Încarcă Graful
        </button>
        <button
          type="button"
          onClick={onRun}
          title={`Încarcă și pornește ${algorithm} din nodul ${scenario.recommendedStartNode}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-300/40 bg-emerald-400/15 px-2.5 text-[11px] font-semibold text-emerald-50 shadow-[0_0_16px_rgba(52,211,153,0.18)] transition hover:bg-emerald-400/25"
        >
          <Play size={13} />
          Încarcă & Rulează Algoritmul
        </button>
      </div>
    </article>
  )
}

function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition',
        active
          ? 'border-cyan-300/40 bg-cyan-400/15 text-cyan-50'
          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-100',
      )}
    >
      {children}
      <span className={clsx('tabular-nums', active ? 'text-cyan-200/80' : 'text-slate-500')}>{count}</span>
    </button>
  )
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', className)}>
      {children}
    </span>
  )
}

function difficultyClass(difficulty: BacScenarioDifficulty): string {
  if (difficulty === 'Subiectul I') return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
  if (difficulty === 'Subiectul II') return 'border-amber-300/30 bg-amber-400/10 text-amber-100'
  return 'border-rose-300/30 bg-rose-400/10 text-rose-100'
}

function algorithmLabel(scenario: BacScenario): string {
  if (scenario.recommendedAlgorithm === 'connected_components' && scenario.graph.isDirected) {
    return 'Componente tare conexe'
  }
  return ALGORITHM_LABELS[scenario.recommendedAlgorithm]
}

function applyScenario(scenario: BacScenario, run: boolean): void {
  useGraphStore.getState().loadGraph(scenario.graph)
  if (!run) return
  const algorithm = useAlgorithmStore.getState()
  algorithm.setAlgorithm(scenario.recommendedAlgorithm)
  algorithm.setStartNode(scenario.recommendedStartNode)
  algorithm.setTargetNode(scenario.recommendedTargetNode ?? null)
  algorithm.generateAndStart()
}

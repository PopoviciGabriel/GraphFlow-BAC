import { clsx } from 'clsx'
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import type { AlgorithmId } from '../../core/algorithms/types'
import { useGraphStore } from '../../store/useGraphStore'
import {
  PLAYBACK_SPEEDS_MS,
  useAlgorithmStore,
  type PlaybackSpeedMs,
} from '../../store/useAlgorithmStore'

const ALGORITHM_GROUPS: {
  id: 'structure' | 'cost' | 'cycles'
  label: string
  items: { id: AlgorithmId; label: string }[]
}[] = [
  {
    id: 'structure',
    label: 'Parcurgeri & Structură',
    items: [
      { id: 'bfs', label: 'BFS (Lățime)' },
      { id: 'dfs', label: 'DFS (Adâncime)' },
      { id: 'connected_components', label: 'Componente Conexe' },
      { id: 'cycle_detection', label: 'Detecție Cicluri' },
      { id: 'bipartite', label: 'Graf Bipartit' },
    ],
  },
  {
    id: 'cost',
    label: 'Cost Minim & Arbori',
    items: [
      { id: 'dijkstra', label: 'Dijkstra (Drum Minim)' },
      { id: 'roy_floyd', label: 'Roy-Floyd (Matrice Costuri)' },
      { id: 'kruskal', label: 'Kruskal (APM)' },
      { id: 'prim', label: 'Prim (APM)' },
      { id: 'rooted_tree', label: 'Arbore cu Rădăcină (BAC)' },
    ],
  },
  {
    id: 'cycles',
    label: 'Euler & Hamilton',
    items: [
      { id: 'eulerian', label: 'Ciclu Eulerian' },
      { id: 'hamiltonian', label: 'Ciclu Hamiltonian' },
    ],
  },
]

const START_ALGORITHMS: ReadonlySet<AlgorithmId> = new Set([
  'bfs',
  'dfs',
  'dijkstra',
  'prim',
  'rooted_tree',
  'eulerian',
  'hamiltonian',
])

const COST_ALGORITHMS: ReadonlySet<AlgorithmId> = new Set(['dijkstra', 'roy_floyd', 'kruskal', 'prim'])

const SPEED_LABELS: Record<PlaybackSpeedMs, string> = {
  1400: '0.5x',
  700: '1x',
  350: '2x',
  150: '4x',
}

export function AlgorithmPlayer() {
  const nodeCount = useGraphStore((state) => state.nodes.length)
  const isWeighted = useGraphStore((state) => state.isWeighted)
  const activateWeightedCosts = useGraphStore((state) => state.activateWeightedCosts)
  const selectedAlgorithm = useAlgorithmStore((state) => state.selectedAlgorithm)
  const startNode = useAlgorithmStore((state) => state.startNode)
  const targetNode = useAlgorithmStore((state) => state.targetNode)
  const steps = useAlgorithmStore((state) => state.steps)
  const currentStepIndex = useAlgorithmStore((state) => state.currentStepIndex)
  const isPlaying = useAlgorithmStore((state) => state.isPlaying)
  const speedMs = useAlgorithmStore((state) => state.speedMs)
  const setAlgorithm = useAlgorithmStore((state) => state.setAlgorithm)
  const setStartNode = useAlgorithmStore((state) => state.setStartNode)
  const setTargetNode = useAlgorithmStore((state) => state.setTargetNode)
  const play = useAlgorithmStore((state) => state.play)
  const pause = useAlgorithmStore((state) => state.pause)
  const stepForward = useAlgorithmStore((state) => state.stepForward)
  const stepBackward = useAlgorithmStore((state) => state.stepBackward)
  const jumpToStep = useAlgorithmStore((state) => state.jumpToStep)
  const setSpeed = useAlgorithmStore((state) => state.setSpeed)
  const resetExecution = useAlgorithmStore((state) => state.resetExecution)

  const stepCount = steps.length
  const needsStart = START_ALGORITHMS.has(selectedAlgorithm)
  const needsTarget = selectedAlgorithm === 'dijkstra'
  const showWeightHelper = COST_ALGORITHMS.has(selectedAlgorithm) && !isWeighted
  const startLabel = selectedAlgorithm === 'rooted_tree' ? 'Rădăcină' : 'Nod start'
  const shownStep = currentStepIndex < 0 ? 0 : currentStepIndex + 1
  const sliderValue = currentStepIndex < 0 ? 0 : currentStepIndex
  const idle = !isPlaying && currentStepIndex < 0

  useEffect(() => {
    if (!isPlaying) return
    if (stepCount === 0 || currentStepIndex >= stepCount - 1) {
      useAlgorithmStore.getState().pause()
      return
    }
    const timer = window.setInterval(() => {
      const latest = useAlgorithmStore.getState()
      if (!latest.isPlaying || latest.steps.length === 0) return
      if (latest.currentStepIndex >= latest.steps.length - 1) {
        latest.pause()
        return
      }
      latest.stepForward()
    }, speedMs)
    return () => window.clearInterval(timer)
  }, [isPlaying, speedMs, currentStepIndex, stepCount])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('[data-graphflow-overlay]')) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        useAlgorithmStore.getState().stepForward()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        useAlgorithmStore.getState().stepBackward()
        return
      }
      if (event.key === 'Escape') {
        useAlgorithmStore.getState().resetExecution()
        return
      }
      if (event.key !== ' ' && event.code !== 'Space') return
      if (event.repeat || event.target instanceof HTMLButtonElement) return
      event.preventDefault()
      const state = useAlgorithmStore.getState()
      if (state.isPlaying) state.pause()
      else state.play()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5" aria-label="Algoritm">
        {ALGORITHM_GROUPS.map((group) => (
          <div key={group.id} className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
              {group.label}
            </span>
            {group.items.map((item) => {
              const active = selectedAlgorithm === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAlgorithm(item.id)}
                  className={clsx(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                    active
                      ? group.id === 'cost'
                        ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-50 shadow-[0_0_16px_rgba(52,211,153,0.22)]'
                        : group.id === 'cycles'
                          ? 'border-indigo-300/40 bg-indigo-400/15 text-indigo-50 shadow-[0_0_16px_rgba(129,140,248,0.22)]'
                          : 'border-cyan-300/40 bg-cyan-400/15 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.18)]'
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-slate-100',
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {needsStart || needsTarget || showWeightHelper ? (
      <div className="flex flex-wrap items-center gap-2">
        {needsStart ? (
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
            {startLabel}:
            <select
              aria-label={startLabel}
              value={nodeCount === 0 ? 1 : Math.min(startNode, nodeCount)}
              disabled={nodeCount === 0}
              onChange={(event) => setStartNode(Number(event.target.value))}
              className="h-7 rounded-lg border border-white/10 bg-[#090d16] px-2 text-xs font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-cyan-300/40 disabled:opacity-40"
            >
              {nodeCount === 0 ? (
                <option value={1}>—</option>
              ) : (
                Array.from({ length: nodeCount }, (_, index) => index + 1).map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))
              )}
            </select>
          </label>
        ) : null}

        {needsTarget ? (
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
            Destinație:
            <select
              aria-label="Destinație"
              value={targetNode === null ? 'all' : String(targetNode)}
              disabled={nodeCount === 0}
              onChange={(event) => {
                const value = event.target.value
                setTargetNode(value === 'all' ? null : Number(value))
              }}
              className="h-7 rounded-lg border border-white/10 bg-[#090d16] px-2 text-xs font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-cyan-300/40 disabled:opacity-40"
            >
              <option value="all">Toate</option>
              {Array.from({ length: nodeCount }, (_, index) => index + 1).map((id) => (
                <option key={id} value={String(id)}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {showWeightHelper ? (
          <button
            type="button"
            onClick={activateWeightedCosts}
            className="rounded-full border border-amber-300/55 bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.5)] transition hover:bg-amber-400/25"
          >
            Activează Ponderat (Costuri)
          </button>
        ) : null}
      </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <TransportButton
            label="Pas înapoi"
            title="Pas înapoi (←)"
            disabled={currentStepIndex <= 0}
            onClick={stepBackward}
          >
            <SkipBack size={14} />
            <span className="hidden sm:inline">Pas înapoi</span>
          </TransportButton>

          <button
            type="button"
            title={isPlaying ? 'Pauză (Space)' : 'Rulează (Space)'}
            aria-label={isPlaying ? 'Pauză' : 'Rulează'}
            aria-pressed={isPlaying}
            onClick={() => (isPlaying ? pause() : play())}
            className={clsx(
              'flex h-8 items-center gap-1.5 rounded-xl px-3 text-[11px] font-semibold transition',
              isPlaying
                ? 'bg-emerald-400/20 text-emerald-50 shadow-[0_0_22px_rgba(52,211,153,0.45)] ring-1 ring-emerald-300/40'
                : 'bg-cyan-400/15 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.38)] ring-1 ring-cyan-300/40',
            )}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-200" /> : null}
            {isPlaying ? 'Pauză' : 'Rulează'}
          </button>

          <TransportButton
            label="Pas înainte"
            title="Pas înainte (→)"
            disabled={stepCount === 0 || currentStepIndex >= stepCount - 1}
            onClick={stepForward}
          >
            <SkipForward size={14} />
            <span className="hidden sm:inline">Pas înainte</span>
          </TransportButton>

          <TransportButton label="Reset" title="Reset (Esc)" disabled={idle} onClick={resetExecution}>
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset</span>
          </TransportButton>
        </div>

        <label className="flex min-w-48 flex-1 items-center gap-2">
          <span className="shrink-0 text-[11px] font-medium text-slate-300 tabular-nums">
            Pasul {shownStep} / {stepCount}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(stepCount - 1, 0)}
            step={1}
            value={sliderValue}
            disabled={stepCount === 0}
            aria-label="Poziția în execuție"
            aria-valuetext={`Pasul ${shownStep} din ${stepCount}`}
            onChange={(event) => jumpToStep(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer accent-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          />
        </label>

        <div className="flex items-center gap-1" aria-label="Viteză">
          {PLAYBACK_SPEEDS_MS.map((ms) => {
            const active = speedMs === ms
            return (
              <button
                key={ms}
                type="button"
                aria-pressed={active}
                title={`Viteză ${SPEED_LABELS[ms]}`}
                onClick={() => setSpeed(ms)}
                className={clsx(
                  'rounded-full border px-2 py-1 text-[10px] font-semibold tabular-nums transition',
                  active
                    ? 'border-indigo-300/40 bg-indigo-400/20 text-indigo-100'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-100',
                )}
              >
                {SPEED_LABELS[ms]}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TransportButton({
  label,
  title,
  disabled,
  onClick,
  children,
}: {
  label: string
  title: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-[11px] font-medium text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/10 disabled:hover:bg-white/[0.04] disabled:hover:text-slate-200"
    >
      {children}
    </button>
  )
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

import { clsx } from 'clsx'
import { useMemo, type ReactNode } from 'react'
import type {
  AlgorithmId,
  AlgorithmQueue,
  AlgorithmStep,
  KruskalEdgeRow,
  RootedTreeInfo,
  RoyFloydState,
} from '../../core/algorithms/types'
import { graphSize } from '../../core/representations'
import { useAlgorithmStore } from '../../store/useAlgorithmStore'
import { useGraphStore } from '../../store/useGraphStore'

const ALGORITHM_LABEL: Record<AlgorithmId, string> = {
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

export function AlgorithmTracePanel() {
  const nodeCount = useGraphStore((state) => graphSize(state.nodes))
  const selectedAlgorithm = useAlgorithmStore((state) => state.selectedAlgorithm)
  const steps = useAlgorithmStore((state) => state.steps)
  const currentStepIndex = useAlgorithmStore((state) => state.currentStepIndex)
  const step = currentStepIndex >= 0 ? steps[currentStepIndex] : undefined
  const previous = currentStepIndex > 0 ? steps[currentStepIndex - 1] : undefined

  if (!step) {
    return (
      <div role="tabpanel" id="bac-panel-trace" aria-labelledby="bac-tab-trace" className="space-y-3">
        <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-6">
          <h3 className="text-sm font-semibold text-slate-100">Execuție & Vectori (Live)</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
            Pornește un algoritm din player. Aici apar, pas cu pas, explicația, ieșirea{' '}
            <span className="font-mono text-cyan-100">cout</span>, coada{' '}
            <span className="font-mono text-cyan-100">C</span> cu <span className="font-mono">st</span> și{' '}
            <span className="font-mono">dr</span>, stiva de apeluri și vectorii{' '}
            <span className="font-mono text-cyan-100">viz</span>, <span className="font-mono text-cyan-100">tata</span>,{' '}
            <span className="font-mono text-cyan-100">d</span>.
          </p>
        </section>
      </div>
    )
  }

  const shownStep = currentStepIndex + 1
  const printsNodes = selectedAlgorithm === 'bfs' || selectedAlgorithm === 'dfs'

  return (
    <div role="tabpanel" id="bac-panel-trace" aria-labelledby="bac-tab-trace" className="space-y-3">
      <StepCard
        algorithm={ALGORITHM_LABEL[selectedAlgorithm]}
        shownStep={shownStep}
        total={steps.length}
        step={step}
        showTarget={selectedAlgorithm === 'dijkstra'}
      />
      {step.kruskalEdges ? (
        <KruskalTable
          rows={step.kruskalEdges}
          totalCost={step.totalCost}
          viz={step.viz}
          nodeCount={nodeCount}
          activeEdgeId={step.activeEdgeId}
        />
      ) : null}
      {step.royFloydState ? <RoyFloydMatrix state={step.royFloydState} nodeCount={nodeCount} /> : null}
      {selectedAlgorithm === 'dijkstra' || selectedAlgorithm === 'prim' ? (
        <RelaxationTable step={step} nodeCount={nodeCount} />
      ) : null}
      {selectedAlgorithm === 'dijkstra' ? <ShortestPaths step={step} nodeCount={nodeCount} /> : null}
      {step.treeInfo ? (
        <TreeSheet
          info={step.treeInfo}
          tata={step.tata}
          nodeCount={nodeCount}
          definitive={step.summaryVerdict !== undefined}
        />
      ) : null}
      <ConsoleOutput order={step.outputOrder} enabled={printsNodes} />
      {step.queue ? <QueueBoard queue={step.queue} nodeCount={nodeCount} /> : null}
      {step.stack ? <CallStack frames={step.stack} /> : null}
      {step.royFloydState ? null : <VectorTable step={step} previous={previous} nodeCount={nodeCount} />}
    </div>
  )
}

function StepCard({
  algorithm,
  shownStep,
  total,
  step,
  showTarget,
}: {
  algorithm: string
  shownStep: number
  total: number
  step: AlgorithmStep
  showTarget: boolean
}) {
  const tone = step.summaryVerdict ? verdictTone(step.summaryVerdict) : null
  return (
    <section className="rounded-2xl border border-cyan-300/25 bg-cyan-400/[0.06] p-3 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-cyan-200/80 uppercase">{algorithm}</p>
      <h3 className="mt-1 text-sm font-semibold text-slate-50">
        Pasul {shownStep} din {total}: {step.title}
      </h3>
      {showTarget ? (
        <p className="mt-1 font-mono text-[11px] text-indigo-100">
          Destinație: {step.targetNodeId == null ? 'toate nodurile' : step.targetNodeId}
        </p>
      ) : null}
      {step.totalCost !== undefined ? (
        <p className="mt-1 font-mono text-[12px] text-emerald-100">Cost: {formatLiveCost(step.totalCost)}</p>
      ) : null}
      <p className="mt-2 text-[12px] leading-relaxed break-words text-slate-200">{step.explanation}</p>
      {step.summaryVerdict && tone ? <VerdictBanner tone={tone} text={step.summaryVerdict} /> : null}
    </section>
  )
}

function VerdictBanner({ tone, text }: { tone: 'good' | 'warn' | 'bad'; text: string }) {
  return (
    <p
      className={clsx(
        'mt-3 rounded-xl border px-3 py-2 text-[12px] leading-relaxed font-medium break-words',
        tone === 'good' && 'border-emerald-300/35 bg-emerald-400/15 text-emerald-50',
        tone === 'warn' && 'border-amber-300/40 bg-amber-400/15 text-amber-50',
        tone === 'bad' && 'border-rose-300/40 bg-rose-400/15 text-rose-50',
      )}
    >
      Verdict: {text}
    </p>
  )
}

function ConsoleOutput({ order, enabled }: { order: number[]; enabled: boolean }) {
  const lastIndex = order.length - 1
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-slate-100">Ordinea de afișare</h3>
        <p className="mt-1 font-mono text-[11px] text-indigo-200/90">cout &lt;&lt; x &lt;&lt; &quot; &quot;;</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 font-mono text-[13px]">
        <span className="text-slate-500">Ieșire consolă: </span>
        {order.length === 0 ? (
          <span className="text-slate-500">{enabled ? '(încă nimic)' : '(acest algoritm nu afișează noduri)'}</span>
        ) : (
          order.map((node, index) => (
            <span
              key={`${index}-${node}`}
              className={clsx(
                index === lastIndex
                  ? 'rounded bg-emerald-400/20 px-1 font-semibold text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                  : 'text-slate-100',
              )}
            >
              {node}
              {index === lastIndex ? '' : '  '}
            </span>
          ))
        )}
      </div>
    </section>
  )
}

function QueueBoard({ queue, nodeCount }: { queue: AlgorithmQueue; nodeCount: number }) {
  const indexes = useMemo(() => numberRange(nodeCount), [nodeCount])
  const open = queue.st <= queue.dr
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-slate-100">Simulare live: coada C[1..n]</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          <span className="font-mono text-amber-200">st</span> este primul element,{' '}
          <span className="font-mono text-emerald-200">dr</span> este ultimul. Celulele dinaintea lui st au fost deja
          extrase.
        </p>
      </div>
      <p className="font-mono text-[11px] text-slate-300">
        st = {queue.st}, dr = {queue.dr}. while (st &lt;= dr) este{' '}
        <span className={open ? 'text-emerald-200' : 'text-rose-200'}>{open ? 'adevărat' : 'fals'}</span>.
      </p>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-2">
        <div className="flex w-max gap-1.5">
          {indexes.map((index) => {
            const value = queue.items[index] ?? 0
            const inside = open && index >= queue.st && index <= queue.dr
            const popped = index < queue.st && value !== 0
            const marks: string[] = []
            if (index === queue.st) marks.push('st')
            if (index === queue.dr) marks.push('dr')
            return (
              <div key={index} className="flex w-12 flex-col items-center gap-1">
                <span className="font-mono text-[10px] text-slate-500">C[{index}]</span>
                <span
                  className={clsx(
                    'flex h-9 w-12 items-center justify-center rounded-lg border font-mono text-sm',
                    inside &&
                      'border-cyan-300/80 bg-cyan-400/20 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.5)]',
                    popped && 'border-white/10 bg-white/[0.03] text-slate-500 line-through decoration-slate-500',
                    !inside && !popped && 'border-dashed border-white/15 text-slate-600',
                  )}
                >
                  {value === 0 ? '·' : value}
                </span>
                <span
                  className={clsx(
                    'h-4 font-mono text-[10px] font-semibold',
                    marks.includes('st') && marks.includes('dr')
                      ? 'text-amber-100'
                      : marks.includes('st')
                        ? 'text-amber-200'
                        : 'text-emerald-200',
                  )}
                >
                  {marks.join(' · ')}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function CallStack({ frames }: { frames: number[] }) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-slate-100">Simulare live: stiva de recursivitate</h3>
        <p className="mt-1 text-[11px] text-slate-400">
          Adâncime {frames.length}. Ultimul cadru este apelul activ.
        </p>
      </div>
      {frames.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-slate-400">
          Stiva este goală. Apelurile DFS s-au încheiat.
        </p>
      ) : (
        <ol className="flex flex-wrap items-center gap-1.5">
          {frames.map((node, index) => {
            const active = index === frames.length - 1
            return (
              <li key={`${index}-${node}`} className="flex items-center gap-1.5">
                {index > 0 ? <span className="text-slate-500">→</span> : null}
                <span
                  className={clsx(
                    'rounded-lg border px-2 py-1 font-mono text-[12px]',
                    active
                      ? 'border-amber-300/60 bg-amber-400/15 text-amber-50 shadow-[0_0_14px_rgba(251,191,36,0.28)]'
                      : 'border-white/10 bg-white/[0.04] text-slate-200',
                  )}
                >
                  DFS({node})
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function VectorTable({
  step,
  previous,
  nodeCount,
}: {
  step: AlgorithmStep
  previous: AlgorithmStep | undefined
  nodeCount: number
}) {
  const indexes = useMemo(() => numberRange(nodeCount), [nodeCount])
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-slate-100">Tabelul vectorilor caracteristici</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Indicii sunt 1..n, ca în <span className="font-mono">int viz[101], tata[101], d[101]</span>. ∞ înseamnă
          necalculat.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
        <table className="border-separate border-spacing-1 p-1 text-center font-mono text-[11px]">
          <tbody>
            <VectorRow label="i" indexes={indexes} step={step}>
              {(id) => (
                <Cell active={id === step.activeNodeId} tone="index">
                  {id}
                </Cell>
              )}
            </VectorRow>
            <VectorRow label="viz[i]" indexes={indexes} step={step}>
              {(id) => {
                const value = step.viz[id] ?? 0
                const changed = (previous?.viz[id] ?? 0) !== value
                return (
                  <Cell
                    key={changed ? `${step.stepIndex}-${value}` : `viz-${id}`}
                    active={id === step.activeNodeId}
                    tone={value !== 0 ? 'set' : 'zero'}
                    flash={changed}
                  >
                    {value}
                  </Cell>
                )
              }}
            </VectorRow>
            <VectorRow label="tata[i]" indexes={indexes} step={step}>
              {(id) => {
                const value = step.tata[id] ?? 0
                return (
                  <Cell active={id === step.activeNodeId} tone={value !== 0 ? 'set' : 'zero'}>
                    {value}
                  </Cell>
                )
              }}
            </VectorRow>
            <VectorRow label="d[i]" indexes={indexes} step={step}>
              {(id) => {
                const value = step.dist[id]
                return (
                  <Cell active={id === step.activeNodeId} tone={value === null || value === undefined ? 'zero' : 'set'}>
                    {value === null || value === undefined ? '∞' : value}
                  </Cell>
                )
              }}
            </VectorRow>
          </tbody>
        </table>
      </div>
    </section>
  )
}

function VectorRow({
  label,
  indexes,
  step,
  children,
}: {
  label: string
  indexes: number[]
  step: AlgorithmStep
  children: (id: number) => ReactNode
}) {
  return (
    <tr>
      <th className="sticky left-0 z-10 bg-[#0c1220] px-2 py-1 text-left font-medium whitespace-nowrap text-indigo-200">
        {label}
      </th>
      {indexes.map((id) => (
        <td key={`${step.stepIndex}-${label}-${id}`}>{children(id)}</td>
      ))}
    </tr>
  )
}

function Cell({
  children,
  active,
  tone,
  flash = false,
}: {
  children: ReactNode
  active: boolean
  tone: 'index' | 'set' | 'zero'
  flash?: boolean
}) {
  return (
    <span
      className={clsx(
        'inline-flex h-7 min-w-8 items-center justify-center rounded-md border px-1',
        tone === 'index' && 'border-indigo-300/30 bg-indigo-400/10 text-indigo-100',
        tone === 'set' && 'border-emerald-300/40 bg-emerald-400/15 text-emerald-50',
        tone === 'zero' && 'border-white/10 bg-white/[0.03] text-slate-500',
        active && 'ring-1 ring-amber-300/80',
        flash && 'gf-viz-flash border-cyan-200 text-cyan-50',
      )}
    >
      {children}
    </span>
  )
}

function verdictTone(verdict: string): 'good' | 'warn' | 'bad' {
  if (/Ciclu detectat|NU este bipartit|NU este eulerian|NU este hamiltonian|ciclu de cost negativ|Nu există drum/i.test(verdict)) return 'bad'
  if (/NU este|vid|nu este conex/i.test(verdict)) return 'warn'
  return 'good'
}

function formatLiveCost(value: number): string {
  if (!Number.isFinite(value)) return '∞'
  if (Number.isInteger(value)) return String(value)
  return String(Math.round(value * 1000) / 1000)
}

function formatMatrixCost(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '∞'
  return formatLiveCost(value)
}

const KRUSKAL_STATUS: Record<KruskalEdgeRow['status'], string> = {
  pending: 'în așteptare',
  inspecting: 'se verifică',
  accepted: 'Adăugată în APM ✓',
  rejected: 'Formează ciclu ✗',
}

function KruskalTable({
  rows,
  totalCost,
  viz,
  nodeCount,
  activeEdgeId,
}: {
  rows: KruskalEdgeRow[]
  totalCost: number | undefined
  viz: number[]
  nodeCount: number
  activeEdgeId: string | null
}) {
  const indexes = useMemo(() => numberRange(nodeCount), [nodeCount])
  const focus =
    rows.find((row) => row.status === 'inspecting') ?? rows.find((row) => row.id === activeEdgeId) ?? null
  const left = focus ? (viz[focus.u] ?? 0) : 0
  const right = focus ? (viz[focus.v] ?? 0) : 0
  const different = focus !== null && left !== right
  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 px-3 py-2.5 shadow-[0_0_22px_rgba(52,211,153,0.18)]">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-200/80 uppercase">Cost Total APM</p>
        <p className="mt-1 font-mono text-lg font-semibold text-emerald-50">
          S = {totalCost === undefined ? '—' : formatLiveCost(totalCost)}
        </p>
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-100">
          Tabelul Muchiilor Sortate Crescător{' '}
          <span className="font-mono text-[11px] text-indigo-200">struct muchie {'{ int x, y, c; }'}</span>
        </h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Muchiile sunt deja ordonate după cost. O muchie intră în APM doar dacă{' '}
          <span className="font-mono text-cyan-100">comp[x] != comp[y]</span>.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
        <table className="w-full border-separate border-spacing-0 text-left font-mono text-[11px]">
          <thead>
            <tr className="text-indigo-200">
              <th className="px-2 py-1.5 font-medium">#</th>
              <th className="px-2 py-1.5 font-medium">Muchie (x, y)</th>
              <th className="px-2 py-1.5 font-medium">Cost</th>
              <th className="px-2 py-1.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-2 py-2 text-slate-500">
                  Nu există muchii.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={`${row.id}-${index}`}
                  className={clsx(
                    'border-t border-white/5',
                    row.status === 'inspecting' &&
                      'bg-cyan-400/10 shadow-[inset_3px_0_0_rgba(251,191,36,0.9)]',
                  )}
                >
                  <td className="px-2 py-1.5 text-slate-500">{index + 1}</td>
                  <td
                    className={clsx(
                      'px-2 py-1.5',
                      row.status === 'rejected' ? 'text-rose-200/80 line-through decoration-rose-300/80' : 'text-slate-100',
                      row.status === 'inspecting' && 'font-semibold text-cyan-50',
                    )}
                  >
                    ({row.u}, {row.v})
                  </td>
                  <td className={clsx('px-2 py-1.5', row.status === 'inspecting' ? 'text-amber-100' : 'text-cyan-100')}>
                    {formatLiveCost(row.weight)}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={clsx(
                        'inline-flex rounded-full px-2 py-0.5',
                        row.status === 'accepted' && 'bg-emerald-400/20 font-semibold text-emerald-50',
                        row.status === 'rejected' &&
                          'bg-rose-400/15 font-semibold text-rose-100 line-through decoration-rose-200/90',
                        row.status === 'inspecting' &&
                          'bg-amber-400/20 font-semibold text-amber-50 shadow-[0_0_14px_rgba(251,191,36,0.35)]',
                        row.status === 'pending' && 'text-slate-400',
                      )}
                    >
                      {KRUSKAL_STATUS[row.status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-100">
          Vectorul de componente <span className="font-mono text-cyan-100">comp[1..n]</span>
        </h3>
        <p className="text-[11px] leading-relaxed text-slate-400">
          La bac, <span className="font-mono">comp[i]</span> stă în <span className="font-mono">viz[i]</span>. Muchia
          se acceptă când cele două valori diferă.
        </p>
        {focus ? (
          <p className="font-mono text-[12px] leading-relaxed text-slate-100">
            comp[{focus.u}] = {left}, comp[{focus.v}] = {right}.{' '}
            <span className={different ? 'text-emerald-200' : 'text-rose-200'}>
              {focus.status === 'inspecting'
                ? different
                  ? 'comp[x] != comp[y]: muchia poate intra în APM.'
                  : 'comp[x] == comp[y]: muchia formează ciclu.'
                : focus.status === 'accepted'
                  ? 'Cele două capete sunt acum în aceeași componentă.'
                  : focus.status === 'rejected'
                    ? 'comp[x] == comp[y], deci muchia a fost respinsă.'
                    : 'comp[x] și comp[y] se compară la inspectare.'}
            </span>
          </p>
        ) : (
          <p className="text-[11px] text-slate-400">Nicio muchie nu este inspectată în acest pas.</p>
        )}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-1">
          <div className="flex w-max gap-1.5">
            {indexes.map((id) => {
              const marked = focus !== null && (id === focus.u || id === focus.v)
              return (
                <div key={id} className="flex w-12 flex-col items-center gap-1">
                  <span className="font-mono text-[10px] text-slate-500">comp[{id}]</span>
                  <span
                    className={clsx(
                      'flex h-8 w-12 items-center justify-center rounded-lg border font-mono text-sm',
                      marked
                        ? 'border-amber-300/70 bg-amber-400/15 text-amber-50'
                        : 'border-cyan-300/30 bg-cyan-400/10 text-cyan-50',
                    )}
                  >
                    {viz[id] ?? 0}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function RoyFloydMatrix({ state, nodeCount }: { state: RoyFloydState; nodeCount: number }) {
  const indexes = useMemo(() => numberRange(nodeCount), [nodeCount])
  const pair = state.i > 0 && state.j > 0 && state.k > 0
  const via = pair ? floydVia(state) : null
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-slate-100">
          Matricea Costurilor Minime <span className="font-mono text-cyan-100">D[1..n][1..n]</span>
        </h3>
        <p className="mt-2 inline-flex flex-wrap rounded-full border border-cyan-300/40 bg-cyan-400/10 px-2.5 py-1 font-mono text-[11px] text-cyan-50">
          {state.k > 0
            ? `k = ${state.k} (intermediar) | i = ${state.i || '—'} | j = ${state.j || '—'}`
            : 'Inițializare: încă nu există un intermediar k'}
        </p>
        <p className="mt-2 font-mono text-[12px] text-indigo-100">
          D[i][j] = min(D[i][j], D[i][k] + D[k][j])
        </p>
        {via ? (
          <p className="mt-1 font-mono text-[11px] text-slate-300">
            {state.updated
              ? `D[i][j] devine D[i][k] + D[k][j] = ${via.sum}`
              : `min(D[i][j] = ${via.direct}, D[i][k] + D[k][j] = ${via.sum}) → rămâne ${via.direct}`}
          </p>
        ) : (
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            ∞ înseamnă că perechea nu are drum. Linia și coloana k sunt intermediarul, iar D[i][k] și D[k][j] sunt
            cele două bucăți ale drumului.
          </p>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-1">
        <table className="border-separate border-spacing-1 text-center font-mono text-[11px]">
          <tbody>
            <tr>
              <th className="px-2 py-1 text-indigo-200">D</th>
              {indexes.map((column) => (
                <th
                  key={`h-${column}`}
                  className={clsx(
                    'rounded-md px-2 py-1',
                    column === state.k && state.k > 0 ? 'bg-cyan-400/10 text-cyan-100' : 'text-slate-500',
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
            {indexes.map((row) => (
              <tr key={`r-${row}`}>
                <th
                  className={clsx(
                    'rounded-md px-2 py-1 text-left',
                    row === state.k && state.k > 0 ? 'bg-cyan-400/10 text-cyan-100' : 'text-slate-500',
                  )}
                >
                  {row}
                </th>
                {indexes.map((column) => {
                  const value = state.matrix[row]?.[column]
                  const role = floydCellRole(state, row, column)
                  return (
                    <td key={`${state.k}-${state.i}-${state.j}-${row}-${column}`}>
                      <span
                        className={clsx(
                          'inline-flex h-7 min-w-8 items-center justify-center rounded-md border px-1',
                          role === 'drop' && 'gf-cost-drop border-emerald-200 font-semibold text-emerald-50',
                          role === 'watch' && 'border-amber-200 bg-amber-400/15 text-amber-50',
                          role === 'via' && 'border-indigo-300/60 bg-indigo-400/25 text-indigo-50',
                          role === 'k' && 'border-cyan-300/25 bg-cyan-400/[0.08] text-slate-200',
                          role === 'plain' && 'border-white/10 bg-white/[0.03] text-slate-200',
                        )}
                      >
                        {formatMatrixCost(value)}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function floydVia(state: RoyFloydState): { direct: string; sum: string } {
  const direct = state.matrix[state.i]?.[state.j]
  const left = state.matrix[state.i]?.[state.k]
  const right = state.matrix[state.k]?.[state.j]
  const sum =
    left === null || left === undefined || right === null || right === undefined || !Number.isFinite(left) || !Number.isFinite(right)
      ? '∞'
      : formatLiveCost(left + right)
  return { direct: formatMatrixCost(direct), sum }
}

function floydCellRole(
  state: RoyFloydState,
  row: number,
  column: number,
): 'drop' | 'watch' | 'via' | 'k' | 'plain' {
  const pair = state.k > 0 && state.i > 0 && state.j > 0
  if (pair && row === state.i && column === state.j) return state.updated ? 'drop' : 'watch'
  if (pair && ((row === state.i && column === state.k) || (row === state.k && column === state.j))) return 'via'
  if (state.k > 0 && (row === state.k || column === state.k)) return 'k'
  return 'plain'
}

function RelaxationTable({ step, nodeCount }: { step: AlgorithmStep; nodeCount: number }) {
  const indexes = useMemo(() => numberRange(nodeCount), [nodeCount])
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-slate-100">Tabelul de relaxare</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Indicii sunt 1..n. <span className="font-mono">viz[i] = 1</span> înseamnă că nodul a fost selectat,{' '}
          <span className="font-mono">d[i]</span> este distanța curentă, iar <span className="font-mono">tata[i]</span>{' '}
          este predecesorul.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
        <table className="w-full border-separate border-spacing-0 text-left font-mono text-[11px]">
          <thead>
            <tr className="text-indigo-200">
              <th className="px-2 py-1.5 font-medium">Nod i</th>
              <th className="px-2 py-1.5 font-medium">Selectat (viz[i])</th>
              <th className="px-2 py-1.5 font-medium">Distanță d[i]</th>
              <th className="px-2 py-1.5 font-medium">Tată tata[i]</th>
            </tr>
          </thead>
          <tbody>
            {indexes.map((id) => {
              const selected = (step.viz[id] ?? 0) !== 0
              const distance = step.dist[id]
              const parent = step.tata[id] ?? 0
              const active = id === step.activeNodeId
              return (
                <tr key={id} className={clsx('border-t border-white/5', active && 'bg-cyan-400/10')}>
                  <td className={clsx('px-2 py-1.5', active ? 'font-semibold text-cyan-50' : 'text-slate-100')}>{id}</td>
                  <td className="px-2 py-1.5">
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5',
                        selected ? 'bg-emerald-400/15 text-emerald-50' : 'text-slate-400',
                      )}
                    >
                      {selected ? `Da (${step.viz[id] ?? 1})` : 'Nu (0)'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-cyan-100">
                    {distance === null || distance === undefined ? '∞' : formatLiveCost(distance)}
                  </td>
                  <td className="px-2 py-1.5 text-slate-100">{parent}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ShortestPaths({ step, nodeCount }: { step: AlgorithmStep; nodeCount: number }) {
  const startNode = useAlgorithmStore((state) => state.startNode)
  const start = nodeCount === 0 ? 1 : Math.min(startNode, nodeCount)
  const indexes = useMemo(() => numberRange(nodeCount), [nodeCount])
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-slate-100">Drumuri Minime de la Start</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Pentru fiecare nod <span className="font-mono">v</span>, drumul se reconstituie din{' '}
          <span className="font-mono">tata[]</span> până la startul {start}. Costul este{' '}
          <span className="font-mono">d[v]</span>.
        </p>
      </div>
      <ul className="space-y-1.5">
        {indexes.map((target) => {
          const distance = step.dist[target]
          const finite = distance !== null && distance !== undefined
          const path = finite ? reconstructPath(step.tata, start, target) : null
          const wanted = step.targetNodeId === target
          return (
            <li
              key={target}
              className={clsx(
                'rounded-xl border px-2.5 py-1.5 font-mono text-[11px]',
                wanted
                  ? 'border-amber-300/50 bg-amber-400/10 text-amber-50'
                  : 'border-white/10 bg-white/[0.03] text-slate-100',
              )}
            >
              {finite && path ? (
                <>
                  <span>{path.join(' -> ')}</span>
                  <span className="text-emerald-200"> · d[{target}] = {formatLiveCost(distance)}</span>
                </>
              ) : (
                <span className="text-slate-400">
                  {target}: nu există drum · d[{target}] = ∞
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function reconstructPath(tata: number[], start: number, target: number): number[] | null {
  if (target === start) return [start]
  const path: number[] = []
  const seen = new Set<number>()
  let current = target
  while (current !== 0 && !seen.has(current)) {
    seen.add(current)
    path.push(current)
    if (current === start) {
      path.reverse()
      return path
    }
    current = tata[current] ?? 0
  }
  return null
}

function TreeSheet({
  info,
  tata,
  nodeCount,
  definitive,
}: {
  info: RootedTreeInfo
  tata: number[]
  nodeCount: number
  definitive: boolean
}) {
  const indexes = useMemo(() => numberRange(nodeCount), [nodeCount])
  const leafText = info.leaves.length === 0 ? '{}' : info.leaves.join(', ')
  return (
    <section className="space-y-3 rounded-2xl border border-emerald-300/30 bg-emerald-400/[0.05] p-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-50">Fișa Arborelui cu Rădăcină (Standard BAC)</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Nivelul rădăcinii este 0. Un fiu are nivelul tatălui plus 1. Frunzele sunt nodurile fără fii.
        </p>
      </div>
      <dl className="grid gap-2 sm:grid-cols-3">
        <TreeFact label="Rădăcina (tata[r] == 0)" value={String(info.root)} />
        <TreeFact label="Frunze / Noduri Terminale (fără fii)" value={leafText} />
        <TreeFact label="Înălțimea Arborelui" value={String(info.height)} />
      </dl>
      {definitive ? (
        <p className={clsx('text-[12px] font-medium', info.isValidTree ? 'text-emerald-100' : 'text-amber-100')}>
          {info.isValidTree ? 'Graful este arbore.' : 'Graful nu este arbore.'}
        </p>
      ) : (
        <p className="text-[11px] text-slate-400">Frunzele se stabilesc după ce nodul este extras din coadă.</p>
      )}
      <div>
        <h4 className="text-[12px] font-medium text-slate-100">Tabel pe Niveluri & Descendenți</h4>
        <div className="mt-1.5 overflow-x-auto rounded-xl border border-white/10 bg-black/20">
          <table className="w-full border-separate border-spacing-0 text-left font-mono text-[11px]">
            <thead>
              <tr className="text-indigo-200">
                <th className="px-2 py-1.5 font-medium">Nod i</th>
                <th className="px-2 py-1.5 font-medium">tata[i]</th>
                <th className="px-2 py-1.5 font-medium">Nivel</th>
                <th className="px-2 py-1.5 font-medium">Fii direcți (descendenți)</th>
              </tr>
            </thead>
            <tbody>
              {indexes.map((id) => {
                const level = info.levels[id]
                const reached = level !== undefined
                const children = info.childrenMap[id] ?? []
                const kids = !reached ? '—' : children.length === 0 ? '{}' : children.join(', ')
                const root = id === info.root
                return (
                  <tr key={id} className={clsx('border-t border-white/5', root && 'bg-cyan-400/10')}>
                    <td className={clsx('px-2 py-1.5', root ? 'font-semibold text-cyan-50' : 'text-slate-100')}>{id}</td>
                    <td className="px-2 py-1.5 text-slate-100">{tata[id] ?? 0}</td>
                    <td className="px-2 py-1.5 text-emerald-100">{reached ? level : '—'}</td>
                    <td className="px-2 py-1.5 text-slate-200">{kids}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function TreeFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#090d16]/70 px-2.5 py-2">
      <dt className="text-[10px] leading-snug font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 font-mono text-[13px] font-semibold break-words text-emerald-50">{value}</dd>
    </div>
  )
}

function numberRange(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1)
}

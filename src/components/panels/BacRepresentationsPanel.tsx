import { clsx } from 'clsx'
import { Activity, Check, Code2, Copy, FileCode, GraduationCap, PanelRightClose, Table2, Waypoints } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlgorithmTracePanel } from './AlgorithmTracePanel'
import { BacTheoryInspectorPanel } from './BacTheoryInspectorPanel'
import { CppDebuggerPanel } from './CppDebuggerPanel'
import {
  computeNodeDegrees,
  fromParentArray,
  graphSize,
  parseBacInputFormat,
  serializeToBacFormat,
  toAdjacencyList,
  toAdjacencyMatrix,
  type AdjacencyNeighbor,
} from '../../core/representations'
import type { GraphStateData, NodeDegrees } from '../../core/types'
import { useAlgorithmStore } from '../../store/useAlgorithmStore'
import { useGraphStore } from '../../store/useGraphStore'

type RepresentationTab = 'trace' | 'cpp' | 'theory' | 'matrix' | 'lists' | 'file'

interface BacRepresentationsPanelProps {
  onCollapse: () => void
}

interface BacPreset {
  id: string
  label: string
  isDirected: boolean
  isWeighted: boolean
  text: string
  parentArray?: string
}

const TABS: readonly { id: RepresentationTab; label: string; title: string; icon: typeof Table2 }[] = [
  { id: 'trace', label: 'Execuție', title: 'Execuție & Vectori', icon: Activity },
  { id: 'cpp', label: 'Cod C++', title: 'Cod C++ (Debugger)', icon: Code2 },
  { id: 'theory', label: 'Inspector BAC', title: 'Inspector BAC (Teorie & Grile)', icon: GraduationCap },
  { id: 'matrix', label: 'Matrice', title: 'Matrice de adiacență', icon: Table2 },
  { id: 'lists', label: 'Liste', title: 'Liste de adiacență', icon: Waypoints },
  { id: 'file', label: 'bac.in', title: 'Fișier bac.in', icon: FileCode },
]

const PRESETS: readonly BacPreset[] = [
  {
    id: 'classic',
    label: 'Graf Clasic BAC (6 noduri)',
    isDirected: false,
    isWeighted: false,
    text: `6 9
1 2
2 3
3 4
4 5
5 6
6 1
1 4
2 5
3 6
`,
  },
  {
    id: 'k5',
    label: 'Graf Complet K5',
    isDirected: false,
    isWeighted: false,
    text: `5 10
1 2
1 3
1 4
1 5
2 3
2 4
2 5
3 4
3 5
4 5
`,
  },
  {
    id: 'terminals',
    label: 'Graf cu Noduri Izolate și Terminale',
    isDirected: false,
    isWeighted: false,
    text: `6 3
1 2
2 3
5 6
`,
  },
  {
    id: 'directed-cycles',
    label: 'Graf Orientat cu Cicluri',
    isDirected: true,
    isWeighted: false,
    text: `5 6
1 2
2 3
3 1
3 4
4 5
5 3
`,
  },
  {
    id: 'weighted-apm',
    label: 'Graf Ponderat (Dijkstra / Prim / Kruskal - 6 noduri cu costuri)',
    isDirected: false,
    isWeighted: true,
    text: `6 9
1 2 3
2 3 2
3 4 1
4 5 9
5 6 8
6 1 6
1 4 9
2 5 8
3 6 7
`,
  },
  {
    id: 'rooted-classic',
    label: 'Arbore cu Rădăcină Clasic BAC (tata = [0, 1, 1, 2, 2, 3, 3])',
    isDirected: false,
    isWeighted: false,
    parentArray: '0 1 1 2 2 3 3',
    text: `7 6
1 2
1 3
2 4
2 5
3 6
3 7
`,
  },
]

export function BacRepresentationsPanel({ onCollapse }: BacRepresentationsPanelProps) {
  const [tab, setTab] = useState<RepresentationTab>('matrix')
  const graph = useGraphSnapshot()
  const steps = useAlgorithmStore((state) => state.steps)
  const currentStepIndex = useAlgorithmStore((state) => state.currentStepIndex)
  const seenSteps = useRef<typeof steps | null>(null)
  const tabRef = useRef(tab)
  tabRef.current = tab
  const activeEdgeId = currentStepIndex >= 0 ? (steps[currentStepIndex]?.activeEdgeId ?? null) : null
  const executionLive = currentStepIndex >= 0 && steps.length > 0

  useEffect(() => {
    if (seenSteps.current === steps) return
    const started = steps.length > 0 && seenSteps.current !== steps
    seenSteps.current = steps
    if (started && tabRef.current !== 'cpp' && tabRef.current !== 'theory') setTab('trace')
  }, [steps])

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#090d16]/95 text-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-wide text-slate-50">Reprezentări BAC</h2>
          <p className="truncate text-[11px] text-slate-400">
            {executionLive
              ? `Execuție live · pasul ${currentStepIndex + 1} / ${steps.length}`
              : `Sincronizate cu desenul · n = ${graphSize(graph.nodes)} · m = ${graph.edges.length}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[11px] text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-100"
          aria-label="Ascunde panoul de reprezentări"
        >
          <PanelRightClose size={14} />
          Ascunde
        </button>
      </header>

      <div role="tablist" aria-label="Reprezentări ale grafului" className="flex shrink-0 flex-wrap gap-1 border-b border-white/10 px-2 py-2">
        {TABS.map((item) => {
          const Icon = item.icon
          const selected = tab === item.id
          const selectedClass =
            item.id === 'trace'
              ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-50 shadow-[0_0_18px_rgba(52,211,153,0.18)]'
              : item.id === 'cpp'
                ? 'border-amber-300/40 bg-amber-400/15 text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.16)]'
                : item.id === 'theory'
                  ? 'border-violet-300/40 bg-violet-400/15 text-violet-50 shadow-[0_0_18px_rgba(167,139,250,0.2)]'
                  : 'border-cyan-300/40 bg-cyan-400/15 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.16)]'
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`bac-tab-${item.id}`}
              title={item.title}
              aria-selected={selected}
              aria-controls={`bac-panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={clsx(
                'inline-flex min-h-8 min-w-[5.4rem] flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] leading-tight font-medium transition',
                selected ? selectedClass : 'border-transparent bg-white/[0.03] text-slate-400 hover:border-white/10 hover:text-slate-200',
              )}
            >
              <Icon size={13} />
              <span className="truncate">{item.label}</span>
              {(item.id === 'trace' || item.id === 'cpp') && executionLive ? (
                <span
                  className={clsx(
                    'h-1.5 w-1.5 shrink-0 animate-pulse rounded-full',
                    item.id === 'cpp' ? 'bg-amber-300' : 'bg-emerald-300',
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {tab === 'trace' ? <AlgorithmTracePanel /> : null}
        {tab === 'cpp' ? <CppDebuggerPanel /> : null}
        {tab === 'theory' ? <BacTheoryInspectorPanel graph={graph} /> : null}
        {tab === 'matrix' ? <MatrixTab graph={graph} activeEdgeId={activeEdgeId} /> : null}
        {tab === 'lists' ? <ListsTab graph={graph} /> : null}
        {tab === 'file' ? <BacFileTab graph={graph} /> : null}
      </div>
    </section>
  )
}

function MatrixTab({ graph, activeEdgeId }: { graph: GraphStateData; activeEdgeId: string | null }) {
  const toggleMatrixCell = useGraphStore((state) => state.toggleMatrixCell)
  const matrix = useMemo(() => toAdjacencyMatrix(graph), [graph])
  const inspected = useMemo(() => activeEndpoints(activeEdgeId), [activeEdgeId])
  const n = matrix.length - 1
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'error'>('idle')

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = window.setTimeout(() => setCopyState('idle'), 1600)
    return () => window.clearTimeout(timer)
  }, [copyState])

  async function copyMatrix() {
    try {
      await copyText(formatCppMatrix(matrix))
      setCopyState('done')
    } catch {
      setCopyState('error')
    }
  }

  return (
    <div role="tabpanel" id="bac-panel-matrix" aria-labelledby="bac-tab-matrix" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-slate-100">Matricea de adiacență</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            a[1..{n}][1..{n}]
            {graph.isWeighted
              ? ' · click pe 0 creează muchia, apoi scrie costul. 0 șterge muchia.'
              : ' · click pe a[i][j] comută muchia.'}
            {graph.isDirected ? '' : ' Graful neorientat rămâne simetric.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copyMatrix()}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-2.5 text-[11px] font-medium text-cyan-100 transition hover:bg-cyan-400/20"
        >
          {copyState === 'done' ? <Check size={13} /> : <Copy size={13} />}
          {copyState === 'done' ? 'Copiat' : copyState === 'error' ? 'Eroare clipboard' : 'Copiază Matricea C++'}
        </button>
      </div>

      {n === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-400">
          Graful este gol. Dublu-click pe canvas ca să adaugi nodul 1.
        </p>
      ) : (
        <div className="overflow-auto rounded-xl border border-white/10 bg-black/20">
          <table className="border-separate border-spacing-1 p-1 text-center font-mono text-[11px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-[#0c1220] px-2 py-1 text-slate-500">i \ j</th>
                {indices(n).map((column) => (
                  <th key={column} className="min-w-10 px-1 py-1 font-medium text-indigo-200">
                    {column}
                  </th>
                ))}
                <th className="px-2 py-1 text-left font-medium text-emerald-200" title="Suma liniei">
                  Σ
                </th>
              </tr>
            </thead>
            <tbody>
              {indices(n).map((row) => {
                const sum = rowSum(matrix[row] ?? [])
                return (
                  <tr key={row}>
                    <th className="sticky left-0 z-10 bg-[#0c1220] px-2 py-1 font-medium text-indigo-200">{row}</th>
                    {indices(n).map((column) => {
                      const value = matrix[row]?.[column] ?? 0
                      const hot = cellIsActive(row, column, inspected, graph.isDirected)
                      if (row === column) {
                        return (
                          <td key={column}>
                            <span
                              className={clsx(
                                'inline-flex h-8 w-10 items-center justify-center rounded-md border border-white/5 bg-white/[0.02] text-slate-600',
                                hot && 'gf-matrix-hot',
                              )}
                              title={hot ? `Se verifică a[${row}][${column}]` : 'Diagonala rămâne 0'}
                            >
                              {formatMatrixValue(value)}
                            </span>
                          </td>
                        )
                      }
                      return (
                        <td key={column}>
                          {graph.isWeighted ? (
                            <WeightedCell row={row} column={column} value={value} hot={hot} />
                          ) : (
                            <button
                              type="button"
                              aria-label={`a[${row}][${column}] = ${formatMatrixValue(value)}`}
                              title={hot ? `Se verifică a[${row}][${column}]` : `Comută muchia (${row}, ${column})`}
                              onClick={() => toggleMatrixCell(row, column)}
                              className={clsx(cellClass(value), hot && 'gf-matrix-hot')}
                            >
                              {formatMatrixValue(value)}
                            </button>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-2 text-left">
                      <span className={clsx('font-medium', sum === 0 ? 'text-amber-300' : 'text-emerald-200')}>
                        {formatMatrixValue(sum)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {inspected ? (
        <p className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-50">
          Se verifică{' '}
          <span className="font-mono">
            a[{inspected.source}][{inspected.target}]
            {graph.isDirected ? '' : ` și a[${inspected.target}][${inspected.source}]`}
          </span>{' '}
          în <span className="font-mono">if (a[x][y] == 1 && viz[y] == 0)</span>.
        </p>
      ) : null}

      <p className="text-[11px] leading-relaxed text-slate-500">
        {graph.isWeighted
          ? 'Σ linie este suma costurilor. Gradul nodului este numărul de vecini nenuli și apare în tabelul de grade.'
          : graph.isDirected
            ? 'Σ linie = gradul exterior d⁺(x). Celulele nenule sunt arce.'
            : 'Σ linie = grad. Celulele nenule sunt muchii, iar a[j][i] se actualizează odată cu a[i][j].'}
      </p>
    </div>
  )
}

function WeightedCell({
  row,
  column,
  value,
  hot,
}: {
  row: number
  column: number
  value: number
  hot: boolean
}) {
  const toggleMatrixCell = useGraphStore((state) => state.toggleMatrixCell)
  const setMatrixCell = useGraphStore((state) => state.setMatrixCell)
  const [text, setText] = useState(() => formatMatrixValue(value))
  const [focused, setFocused] = useState(false)
  const textRef = useRef(text)
  const skipCommitRef = useRef(false)
  textRef.current = text

  useEffect(() => {
    if (!focused) setText(formatMatrixValue(value))
  }, [focused, value])

  function commit(nextText: string) {
    const trimmed = nextText.trim().replace(',', '.')
    if (trimmed === '') {
      setMatrixCell(row, column, 0)
      setText('0')
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      setText(formatMatrixValue(value))
      return
    }
    if (parsed === value) return
    setMatrixCell(row, column, parsed)
  }

  return (
    <input
      aria-label={`a[${row}][${column}] = ${formatMatrixValue(value)}`}
      title={value === 0 ? `Creează muchia (${row}, ${column})` : `Costul muchiei (${row}, ${column})`}
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      value={text}
      onMouseDown={(event) => {
        if (event.button !== 0 || value !== 0) return
        toggleMatrixCell(row, column)
        textRef.current = '1'
        setText('1')
      }}
      onFocus={(event) => {
        setFocused(true)
        event.currentTarget.select()
      }}
      onBlur={(event) => {
        setFocused(false)
        if (skipCommitRef.current) {
          skipCommitRef.current = false
          return
        }
        commit(event.currentTarget.value)
      }}
      onChange={(event) => {
        textRef.current = event.target.value
        setText(event.target.value)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          const restored = formatMatrixValue(value)
          skipCommitRef.current = true
          textRef.current = restored
          setText(restored)
          event.currentTarget.blur()
        }
      }}
      className={clsx(cellClass(value), 'cursor-text', hot && 'gf-matrix-hot')}
    />
  )
}

function ListsTab({ graph }: { graph: GraphStateData }) {
  const n = graphSize(graph.nodes)
  const adjacency = useMemo(() => toAdjacencyList(graph), [graph])
  const degrees = useMemo(() => computeNodeDegrees(graph), [graph])

  return (
    <div role="tabpanel" id="bac-panel-lists" aria-labelledby="bac-tab-lists" className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-slate-100">Lista de adiacență</h3>
        {n === 0 ? (
          <EmptyNote>Niciun nod. Lista L este goală.</EmptyNote>
        ) : (
          <ul className="space-y-1.5">
            {indices(n).map((id) => {
              const neighbors = adjacency.get(id) ?? []
              return (
                <li
                  key={id}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-mono text-[12px] text-slate-200"
                >
                  <span className="text-indigo-200">L[{id}]</span>
                  <span className="text-slate-500">: </span>
                  {neighbors.length === 0 ? (
                    <span className="text-amber-300">—</span>
                  ) : (
                    neighbors.map((neighbor) => (
                      <span key={neighbor.target} className="text-cyan-100">
                        {' -> '}
                        {formatNeighbor(neighbor, graph.isWeighted)}
                      </span>
                    ))
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <div>
          <h3 className="text-sm font-medium text-slate-100">Vector de muchii</h3>
          <p className="mt-1 font-mono text-[11px] text-indigo-200/90">struct muchie {'{'} int x, y, c; {'}'};</p>
        </div>
        {graph.edges.length === 0 ? (
          <EmptyNote>Nu există muchii. Vectorul are lungimea 0.</EmptyNote>
        ) : (
          <div className="overflow-auto rounded-xl border border-white/10">
            <table className="w-full border-collapse text-left font-mono text-[12px]">
              <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 py-1.5 font-medium">#</th>
                  <th className="px-2 py-1.5 font-medium">x</th>
                  <th className="px-2 py-1.5 font-medium">y</th>
                  <th className="px-2 py-1.5 font-medium">c</th>
                </tr>
              </thead>
              <tbody>
                {graph.edges.map((edge, index) => (
                  <tr key={edge.id} className="border-t border-white/5 text-slate-200">
                    <td className="px-2 py-1 text-slate-500">{index + 1}</td>
                    <td className="px-2 py-1">{edge.source}</td>
                    <td className="px-2 py-1">{edge.target}</td>
                    <td className="px-2 py-1 text-cyan-100">{formatMatrixValue(edge.weight)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-slate-100">Tabel de grade</h3>
        {n === 0 ? (
          <EmptyNote>Tabelul de grade apare după primul nod.</EmptyNote>
        ) : (
          <div className="overflow-auto rounded-xl border border-white/10">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead className="bg-white/[0.04] text-[11px] text-slate-400">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Nod</th>
                  {graph.isDirected ? (
                    <>
                      <th className="px-2 py-1.5 font-medium">d⁺(x)</th>
                      <th className="px-2 py-1.5 font-medium">d⁻(x)</th>
                    </>
                  ) : (
                    <th className="px-2 py-1.5 font-medium">Grad d(x)</th>
                  )}
                  <th className="px-2 py-1.5 font-medium">Tip nod</th>
                </tr>
              </thead>
              <tbody>
                {indices(n).map((id) => {
                  const degree = degrees[id]
                  if (!degree) return null
                  const kind = nodeKind(degree)
                  return (
                    <tr key={id} className="border-t border-white/5 text-slate-200">
                      <td className="px-2 py-1.5 font-mono text-indigo-100">{id}</td>
                      {graph.isDirected ? (
                        <>
                          <td className="px-2 py-1.5 font-mono">{degree.outDegree}</td>
                          <td className="px-2 py-1.5 font-mono">{degree.inDegree}</td>
                        </>
                      ) : (
                        <td className="px-2 py-1.5 font-mono">{degree.degree}</td>
                      )}
                      <td className="px-2 py-1.5">
                        <span className={kindClass(kind)}>{kind}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function BacFileTab({ graph }: { graph: GraphStateData }) {
  const canonical = useMemo(() => serializeToBacFormat(graph), [graph])
  const [draft, setDraft] = useState(canonical)
  const focusedRef = useRef(false)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const parsedDraft = parseBacInputFormat(draft, graph.isDirected, graph.isWeighted)
  const canvasMatchesDraft =
    parsedDraft.error === null &&
    parsedDraft.graph.nodes.length === graph.nodes.length &&
    parsedDraft.graph.isDirected === graph.isDirected &&
    parsedDraft.graph.isWeighted === graph.isWeighted &&
    edgeSignature(parsedDraft.graph.edges) === edgeSignature(graph.edges)

  useEffect(() => {
    if (focusedRef.current) return
    setDraft(canonical)
  }, [canonical])

  useEffect(() => {
    if (!focusedRef.current) return
    const state = useGraphStore.getState()
    const parsed = parseBacInputFormat(draft, state.isDirected, state.isWeighted)
    if (parsed.error) return
    const timer = window.setTimeout(() => {
      if (!focusedRef.current) return
      applyDraft(draftRef.current, true)
    }, 420)
    return () => window.clearTimeout(timer)
  }, [draft, graph.isDirected, graph.isWeighted])

  function applyDraft(text: string, live: boolean): string | null {
    const state = useGraphStore.getState()
    const parsed = parseBacInputFormat(text, state.isDirected, state.isWeighted)
    if (parsed.error) return parsed.error
    const preserveLayout = live && parsed.graph.nodes.length === state.nodes.length && state.nodes.length > 0
    const message = state.setGraphFromBacText(text, { preserveLayout })
    if (!message) {
      const next = useGraphStore.getState()
      if (!focusedRef.current) {
        setDraft(
          serializeToBacFormat({
            nodes: next.nodes,
            edges: next.edges,
            isDirected: next.isDirected,
            isWeighted: next.isWeighted,
          }),
        )
      }
    }
    return message
  }

  function loadPreset(preset: BacPreset) {
    if (preset.parentArray) {
      const error = useGraphStore.getState().setGraphFromParentArray(preset.parentArray)
      if (error) return
      const built = useGraphStore.getState()
      if (built.isWeighted !== preset.isWeighted) built.setWeighted(preset.isWeighted)
      const parsed = fromParentArray(preset.parentArray)
      if (parsed.rootId > 0) useAlgorithmStore.getState().setStartNode(parsed.rootId)
      publishDraft()
      return
    }
    const message = useGraphStore.getState().setGraphFromBacText(preset.text, {
      preserveLayout: false,
      isDirected: preset.isDirected,
      isWeighted: preset.isWeighted,
    })
    if (message) return
    publishDraft()
  }

  function publishDraft() {
    const next = useGraphStore.getState()
    setDraft(
      serializeToBacFormat({
        nodes: next.nodes,
        edges: next.edges,
        isDirected: next.isDirected,
        isWeighted: next.isWeighted,
      }),
    )
  }

  const validation = parsedDraft.error
    ? describeParseError(parsedDraft.error)
    : canvasMatchesDraft
      ? 'Format valid. Canvasul este sincronizat.'
      : 'Format valid. Canvasul se actualizează.'

  return (
    <div role="tabpanel" id="bac-panel-file" aria-labelledby="bac-tab-file" className="flex min-h-full flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium text-slate-100">Format fișier BAC</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          {graph.isWeighted ? 'N M, apoi x y c pe fiecare linie.' : 'N M, apoi x y pe fiecare linie.'} Desenul
          actualizează textul. Un text valid actualizează desenul.
        </p>
      </div>

      <ParentArrayBuilder />

      <div className="grid grid-cols-1 gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => loadPreset(preset)}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-left text-[11px] text-slate-200 transition hover:border-indigo-300/40 hover:bg-indigo-400/10"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <textarea
        aria-label="Editor bac.in"
        spellCheck={false}
        value={draft}
        onFocus={() => {
          focusedRef.current = true
        }}
        onBlur={() => {
          focusedRef.current = false
          const message = applyDraft(draftRef.current, true)
          if (message) {
            const state = useGraphStore.getState()
            setDraft(
              serializeToBacFormat({
                nodes: state.nodes,
                edges: state.edges,
                isDirected: state.isDirected,
                isWeighted: state.isWeighted,
              }),
            )
          }
        }}
        onChange={(event) => {
          focusedRef.current = true
          setDraft(event.target.value)
        }}
        className="min-h-52 w-full flex-1 resize-none rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[12px] leading-5 text-cyan-50 outline-none focus:border-cyan-300/40"
      />

      <div className="flex items-center justify-between gap-3">
        <p
          role="status"
          className={clsx(
            'min-w-0 text-[11px]',
            parsedDraft.error ? 'text-rose-300' : canvasMatchesDraft ? 'text-emerald-300' : 'text-amber-200',
          )}
        >
          {validation}
        </p>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyDraft(draftRef.current, false)}
          className="inline-flex h-8 shrink-0 items-center rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 text-[11px] font-medium text-cyan-50 transition hover:bg-cyan-400/25"
        >
          Aplică din bac.in
        </button>
      </div>
    </div>
  )
}

function EmptyNote({ children }: { children: string }) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-slate-400">
      {children}
    </p>
  )
}

function useGraphSnapshot(): GraphStateData {
  const nodes = useGraphStore((state) => state.nodes)
  const edges = useGraphStore((state) => state.edges)
  const isDirected = useGraphStore((state) => state.isDirected)
  const isWeighted = useGraphStore((state) => state.isWeighted)
  return useMemo(
    () => ({ nodes, edges, isDirected, isWeighted }),
    [nodes, edges, isDirected, isWeighted],
  )
}

function activeEndpoints(edgeId: string | null): { source: number; target: number } | null {
  if (!edgeId) return null
  const undirected = /^(\d+)--(\d+)$/.exec(edgeId)
  if (undirected?.[1] && undirected[2]) {
    return { source: Number(undirected[1]), target: Number(undirected[2]) }
  }
  const directed = /^(\d+)->(\d+)$/.exec(edgeId)
  if (directed?.[1] && directed[2]) {
    return { source: Number(directed[1]), target: Number(directed[2]) }
  }
  return null
}

function cellIsActive(
  row: number,
  column: number,
  edge: { source: number; target: number } | null,
  isDirected: boolean,
): boolean {
  if (!edge) return false
  if (row === edge.source && column === edge.target) return true
  return !isDirected && row === edge.target && column === edge.source
}

function indices(n: number): number[] {
  return Array.from({ length: n }, (_, index) => index + 1)
}

function rowSum(row: number[]): number {
  let sum = 0
  for (let column = 1; column < row.length; column += 1) sum += row[column] ?? 0
  return sum
}

function formatMatrixValue(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return String(value)
}

function formatNeighbor(neighbor: AdjacencyNeighbor, isWeighted: boolean): string {
  return isWeighted ? `${neighbor.target}(${formatMatrixValue(neighbor.weight)})` : String(neighbor.target)
}

function formatCppMatrix(matrix: number[][]): string {
  const n = matrix.length - 1
  const body = matrix
    .map((row) => `    { ${row.map((value) => formatMatrixValue(value)).join(', ')} }`)
    .join(',\n')
  return `int n = ${n};\nint a[${n + 1}][${n + 1}] = {\n${body}\n};\n`
}

function cellClass(value: number): string {
  return clsx(
    'h-8 w-10 rounded-md border px-0 text-center font-mono text-[11px] outline-none transition',
    value !== 0
      ? 'border-cyan-300/50 bg-cyan-400/15 text-cyan-50 shadow-[inset_0_0_14px_rgba(99,102,241,0.45)]'
      : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-cyan-300/30 hover:text-slate-100',
  )
}

function nodeKind(degree: NodeDegrees): 'Izolat' | 'Terminal' | 'Intern' {
  if (degree.isIsolated) return 'Izolat'
  if (degree.isPendant) return 'Terminal'
  return 'Intern'
}

function kindClass(kind: 'Izolat' | 'Terminal' | 'Intern'): string {
  if (kind === 'Izolat') return 'rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-200'
  if (kind === 'Terminal') {
    return 'rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-200'
  }
  return 'rounded-full border border-indigo-300/30 bg-indigo-400/10 px-2 py-0.5 text-[11px] text-indigo-100'
}

function ParentArrayBuilder() {
  const [text, setText] = useState('0 1 1 2 2 3 3')
  const [message, setMessage] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function build() {
    const error = useGraphStore.getState().setGraphFromParentArray(text)
    if (error) {
      setOk(false)
      setMessage(error)
      return
    }
    const parsed = fromParentArray(text)
    if (parsed.rootId > 0) useAlgorithmStore.getState().setStartNode(parsed.rootId)
    const leaves = directLeaves(parsed.graph.edges, parsed.rootId, parsed.graph.nodes.length)
    setOk(true)
    setMessage(
      parsed.rootId > 0
        ? `Arbore construit. Rădăcină: ${parsed.rootId}. Frunze: ${formatIdList(leaves)}.`
        : 'Arbore construit.',
    )
  }

  return (
    <section className="rounded-2xl border border-cyan-300/30 bg-cyan-400/[0.05] p-3">
      <h4 className="text-[12px] font-semibold text-slate-50">
        Generator Rapid din Vectorul de Tați <span className="font-mono text-cyan-100">tata[1..n]</span> (BAC)
      </h4>
      <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
        Lipește vectorul din grilă, de exemplu <span className="font-mono text-slate-200">0 1 1 2 2 3 3</span>. 0
        marchează rădăcina. Graful devine neorientat și se așază ierarhic, de sus în jos.
      </p>
      <input
        aria-label="Vector tata"
        value={text}
        spellCheck={false}
        onChange={(event) => setText(event.target.value)}
        className="mt-2 h-8 w-full rounded-lg border border-white/10 bg-[#090d16] px-2 font-mono text-xs text-slate-100 outline-none focus:ring-2 focus:ring-cyan-300/40"
      />
      <button
        type="button"
        onClick={build}
        className="mt-2 rounded-full border border-cyan-300/40 bg-cyan-400/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-50 transition hover:bg-cyan-400/25"
      >
        Construiește Arborele
      </button>
      {message ? (
        <p className={ok ? 'mt-1.5 text-[10px] text-emerald-200' : 'mt-1.5 text-[10px] text-rose-200'}>{message}</p>
      ) : null}
    </section>
  )
}

function directLeaves(edges: GraphStateData['edges'], rootId: number, nodeCount: number): number[] {
  const parents = new Set(edges.map((edge) => edge.source))
  const leaves: number[] = []
  for (let id = 1; id <= nodeCount; id += 1) {
    if (id !== rootId && !parents.has(id)) leaves.push(id)
  }
  return leaves
}

function formatIdList(ids: number[]): string {
  return ids.length === 0 ? '{}' : `{${ids.join(', ')}}`
}

function edgeSignature(edges: GraphStateData['edges']): string {
  return edges
    .map((edge) => `${edge.source}\t${edge.target}\t${edge.weight}`)
    .sort()
    .join('\n')
}

function describeParseError(error: string): string {
  if (error === 'Empty input.') return 'Fișierul este gol.'
  if (error === 'The first line must contain N or N M.') return 'Prima linie trebuie să conțină N sau N M.'
  if (error === 'N must be a non-negative integer.') return 'N trebuie să fie un întreg ≥ 0.'
  if (error === 'M must be a non-negative integer.') return 'M trebuie să fie un întreg ≥ 0.'
  const expected = /^Expected (\d+) edges, found (\d+)\.$/.exec(error)
  if (expected) return `Se așteaptă ${expected[1]} muchii, dar sunt doar ${expected[2]}.`
  const lineCost = /^Line (\d+): cost must be a finite number\.$/.exec(error)
  if (lineCost) return `Linia ${lineCost[1]}: costul trebuie să fie un număr finit.`
  const lineShape = /^Line (\d+): expected (.+)\.$/.exec(error)
  if (lineShape) return `Linia ${lineShape[1]}: format așteptat ${lineShape[2]}.`
  const lineRange = /^Line (\d+): nodes must be inside \[1, (\d+)\]\.$/.exec(error)
  if (lineRange) return `Linia ${lineRange[1]}: nodurile trebuie să fie în intervalul [1, ${lineRange[2]}].`
  return error
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Some browsers reject Clipboard API writes when the document is unfocused.
    }
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', 'true')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  document.body.appendChild(area)
  area.select()
  const copied = document.execCommand('copy')
  area.remove()
  if (!copied) throw new Error('copy failed')
}

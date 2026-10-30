/**
 * Pure, deterministic BAC traversals.
 * Neighbors always come from `toAdjacencyList`, so they are visited in increasing order.
 * Each snapshot is a straight-line block. `cppLine` is the line that names that block,
 * and the arrays already include every assignment in the block.
 */
import { edgeKey, graphSize, toAdjacencyList } from '../representations'
import { EULER_DIRECTED_CPP_SOURCE, EULER_UNDIRECTED_CPP_SOURCE, HAMILTON_CPP_SOURCE } from './eulerHamilton'
import {
  DIJKSTRA_CPP_SOURCE,
  KRUSKAL_CPP_SOURCE,
  PRIM_CPP_SOURCE,
  ROOTED_TREE_CPP_SOURCE,
  ROY_FLOYD_CPP_SOURCE,
} from './weighted'
import type { GraphStateData } from '../types'
import type {
  AlgorithmId,
  AlgorithmQueue,
  AlgorithmStep,
  EdgeVisualState,
  NodeVisualState,
} from './types'

const BFS_CPP_LINES = [
  'void BFS(int start)',
  '{',
  '    int st, dr, x, y;',
  '    st = 1;',
  '    dr = 1;',
  '    C[1] = start;',
  '    viz[start] = 1;',
  '    d[start] = 0;',
  '    tata[start] = 0;',
  '    while (st <= dr)',
  '    {',
  '        x = C[st];',
  '        cout << x << " ";',
  '        st++;',
  '        for (y = 1; y <= n; y++)',
  '        {',
  '            if (a[x][y] == 1 && viz[y] == 0)',
  '            {',
  '                dr++;',
  '                C[dr] = y;',
  '                viz[y] = 1;',
  '                tata[y] = x;',
  '                d[y] = d[x] + 1;',
  '            }',
  '        }',
  '    }',
  '}',
] as const

const DFS_CPP_LINES = [
  'void DFS(int x)',
  '{',
  '    int y;',
  '    viz[x] = 1;',
  '    cout << x << " ";',
  '    for (y = 1; y <= n; y++)',
  '    {',
  '        if (a[x][y] == 1)',
  '        {',
  '            if (viz[y] == 0)',
  '            {',
  '                tata[y] = x;',
  '                d[y] = d[x] + 1;',
  '                DFS(y);',
  '            }',
  '        }',
  '    }',
  '}',
  '',
  'void parcurgere(int start)',
  '{',
  '    tata[start] = 0;',
  '    d[start] = 0;',
  '    DFS(start);',
  '}',
] as const

const CC_CPP_LINES = [
  'void DFS(int x)',
  '{',
  '    int y;',
  '    viz[x] = nrc;',
  '    for (y = 1; y <= n; y++)',
  '    {',
  '        if (a[x][y] == 1 && viz[y] == 0)',
  '        {',
  '            tata[y] = x;',
  '            DFS(y);',
  '        }',
  '    }',
  '}',
  '',
  'void componente()',
  '{',
  '    int i;',
  '    nrc = 0;',
  '    for (i = 1; i <= n; i++)',
  '    {',
  '        if (viz[i] == 0)',
  '        {',
  '            nrc++;',
  '            DFS(i);',
  '        }',
  '    }',
  '}',
] as const

const SCC_CPP_LINES = [
  'void DFS_plus(int x)',
  '{',
  '    int y;',
  '    plus[x] = 1;',
  '    for (y = 1; y <= n; y++)',
  '    {',
  '        if (a[x][y] == 1 && plus[y] == 0)',
  '            DFS_plus(y);',
  '    }',
  '}',
  '',
  'void DFS_minus(int x)',
  '{',
  '    int y;',
  '    minus[x] = 1;',
  '    for (y = 1; y <= n; y++)',
  '    {',
  '        if (a[y][x] == 1 && minus[y] == 0)',
  '            DFS_minus(y);',
  '    }',
  '}',
  '',
  'void componente_tare_conexe()',
  '{',
  '    int i, j;',
  '    nrc = 0;',
  '    for (i = 1; i <= n; i++)',
  '    {',
  '        if (viz[i] == 0)',
  '        {',
  '            for (j = 1; j <= n; j++)',
  '            {',
  '                plus[j] = 0;',
  '                minus[j] = 0;',
  '            }',
  '            DFS_plus(i);',
  '            DFS_minus(i);',
  '            nrc++;',
  '            for (j = 1; j <= n; j++)',
  '                if (plus[j] == 1 && minus[j] == 1 && viz[j] == 0)',
  '                    viz[j] = nrc;',
  '        }',
  '    }',
  '}',
] as const

const UCYCLE_CPP_LINES = [
  'int gasit;',
  '',
  'void DFS(int x, int t)',
  '{',
  '    int y;',
  '    viz[x] = 1;',
  '    for (y = 1; y <= n; y++)',
  '    {',
  '        if (a[x][y] != 1 || gasit)',
  '            continue;',
  '        if (viz[y] == 0)',
  '        {',
  '            tata[y] = x;',
  '            d[y] = d[x] + 1;',
  '            DFS(y, x);',
  '        }',
  '        else if (y != t)',
  '        {',
  '            gasit = 1;',
  '        }',
  '    }',
  '}',
  '',
  'int detectie_ciclu()',
  '{',
  '    int i;',
  '    gasit = 0;',
  '    for (i = 1; i <= n; i++)',
  '        if (viz[i] == 0 && gasit == 0)',
  '        {',
  '            tata[i] = 0;',
  '            d[i] = 0;',
  '            DFS(i, 0);',
  '        }',
  '    return gasit;',
  '}',
] as const

const DCYCLE_CPP_LINES = [
  'int gasit, inStack[101];',
  '',
  'void DFS(int x)',
  '{',
  '    int y;',
  '    viz[x] = 1;',
  '    inStack[x] = 1;',
  '    for (y = 1; y <= n; y++)',
  '    {',
  '        if (a[x][y] != 1 || gasit)',
  '            continue;',
  '        if (viz[y] == 0)',
  '        {',
  '            tata[y] = x;',
  '            d[y] = d[x] + 1;',
  '            DFS(y);',
  '        }',
  '        else if (inStack[y] == 1)',
  '        {',
  '            gasit = 1;',
  '        }',
  '    }',
  '    inStack[x] = 0;',
  '}',
  '',
  'int detectie_circuit()',
  '{',
  '    int i;',
  '    gasit = 0;',
  '    for (i = 1; i <= n; i++)',
  '        if (viz[i] == 0 && gasit == 0)',
  '        {',
  '            tata[i] = 0;',
  '            d[i] = 0;',
  '            DFS(i);',
  '        }',
  '    return gasit;',
  '}',
] as const

const BIPARTITE_CPP_LINES = [
  'int bip;',
  '',
  'void BFS_color(int start)',
  '{',
  '    int st, dr, x, y;',
  '    st = 1;',
  '    dr = 1;',
  '    C[1] = start;',
  '    viz[start] = 1;',
  '    d[start] = 0;',
  '    tata[start] = 0;',
  '    while (st <= dr && bip)',
  '    {',
  '        x = C[st];',
  '        st++;',
  '        for (y = 1; y <= n; y++)',
  '        {',
  '            if (a[x][y] != 1)',
  '                continue;',
  '            if (viz[y] == 0)',
  '            {',
  '                viz[y] = 3 - viz[x];',
  '                tata[y] = x;',
  '                d[y] = d[x] + 1;',
  '                dr++;',
  '                C[dr] = y;',
  '            }',
  '            else if (viz[y] == viz[x])',
  '            {',
  '                bip = 0;',
  '            }',
  '        }',
  '    }',
  '}',
  '',
  'int verificare_bipartit()',
  '{',
  '    int i;',
  '    bip = 1;',
  '    for (i = 1; i <= n; i++)',
  '        if (viz[i] == 0 && bip)',
  '            BFS_color(i);',
  '    return bip;',
  '}',
] as const

export const BFS_CPP_SOURCE = BFS_CPP_LINES.join('\n')
export const DFS_CPP_SOURCE = DFS_CPP_LINES.join('\n')
export const CONNECTED_COMPONENTS_CPP_SOURCE = CC_CPP_LINES.join('\n')
export const STRONGLY_CONNECTED_CPP_SOURCE = SCC_CPP_LINES.join('\n')
export const UNDIRECTED_CYCLE_CPP_SOURCE = UCYCLE_CPP_LINES.join('\n')
export const DIRECTED_CYCLE_CPP_SOURCE = DCYCLE_CPP_LINES.join('\n')
export const BIPARTITE_CPP_SOURCE = BIPARTITE_CPP_LINES.join('\n')

function mustFind(lines: readonly string[], trimmed: string): number {
  const index = lines.findIndex((line) => line.trim() === trimmed)
  if (index < 0) throw new Error(`Missing C++ line: ${trimmed}`)
  return index + 1
}

const BFS_LINE = {
  init: mustFind(BFS_CPP_LINES, 'viz[start] = 1;'),
  pop: mustFind(BFS_CPP_LINES, 'st++;'),
  look: mustFind(BFS_CPP_LINES, 'if (a[x][y] == 1 && viz[y] == 0)'),
  enqueue: mustFind(BFS_CPP_LINES, 'C[dr] = y;'),
  done: mustFind(BFS_CPP_LINES, 'while (st <= dr)'),
}

const DFS_LINE = {
  enter: mustFind(DFS_CPP_LINES, 'viz[x] = 1;'),
  look: mustFind(DFS_CPP_LINES, 'if (a[x][y] == 1)'),
  decision: mustFind(DFS_CPP_LINES, 'if (viz[y] == 0)'),
  leaveChild: mustFind(DFS_CPP_LINES, 'DFS(y);'),
  leaveRoot: mustFind(DFS_CPP_LINES, 'DFS(start);'),
}

const CC_LINE = {
  reset: mustFind(CC_CPP_LINES, 'nrc = 0;'),
  next: mustFind(CC_CPP_LINES, 'nrc++;'),
  enter: mustFind(CC_CPP_LINES, 'viz[x] = nrc;'),
  look: mustFind(CC_CPP_LINES, 'if (a[x][y] == 1 && viz[y] == 0)'),
  leaveChild: mustFind(CC_CPP_LINES, 'DFS(y);'),
  leaveRoot: mustFind(CC_CPP_LINES, 'DFS(i);'),
  done: mustFind(CC_CPP_LINES, 'for (i = 1; i <= n; i++)'),
}

const SCC_LINE = {
  resetNrc: mustFind(SCC_CPP_LINES, 'nrc = 0;'),
  unassigned: mustFind(SCC_CPP_LINES, 'if (viz[i] == 0)'),
  clearMarks: mustFind(SCC_CPP_LINES, 'minus[j] = 0;'),
  plusEnter: mustFind(SCC_CPP_LINES, 'plus[x] = 1;'),
  plusIf: mustFind(SCC_CPP_LINES, 'if (a[x][y] == 1 && plus[y] == 0)'),
  plusRec: mustFind(SCC_CPP_LINES, 'DFS_plus(y);'),
  plusCall: mustFind(SCC_CPP_LINES, 'DFS_plus(i);'),
  minusEnter: mustFind(SCC_CPP_LINES, 'minus[x] = 1;'),
  minusIf: mustFind(SCC_CPP_LINES, 'if (a[y][x] == 1 && minus[y] == 0)'),
  minusRec: mustFind(SCC_CPP_LINES, 'DFS_minus(y);'),
  minusCall: mustFind(SCC_CPP_LINES, 'DFS_minus(i);'),
  bump: mustFind(SCC_CPP_LINES, 'nrc++;'),
  assign: mustFind(SCC_CPP_LINES, 'viz[j] = nrc;'),
  done: mustFind(SCC_CPP_LINES, 'for (i = 1; i <= n; i++)'),
}

const UCYCLE_LINE = {
  reset: mustFind(UCYCLE_CPP_LINES, 'gasit = 0;'),
  enter: mustFind(UCYCLE_CPP_LINES, 'viz[x] = 1;'),
  look: mustFind(UCYCLE_CPP_LINES, 'if (a[x][y] != 1 || gasit)'),
  side: mustFind(UCYCLE_CPP_LINES, 'else if (y != t)'),
  found: mustFind(UCYCLE_CPP_LINES, 'gasit = 1;'),
  leaveChild: mustFind(UCYCLE_CPP_LINES, 'DFS(y, x);'),
  leaveRoot: mustFind(UCYCLE_CPP_LINES, 'DFS(i, 0);'),
  done: mustFind(UCYCLE_CPP_LINES, 'return gasit;'),
}

const DCYCLE_LINE = {
  reset: mustFind(DCYCLE_CPP_LINES, 'gasit = 0;'),
  enter: mustFind(DCYCLE_CPP_LINES, 'inStack[x] = 1;'),
  look: mustFind(DCYCLE_CPP_LINES, 'if (a[x][y] != 1 || gasit)'),
  side: mustFind(DCYCLE_CPP_LINES, 'else if (inStack[y] == 1)'),
  found: mustFind(DCYCLE_CPP_LINES, 'gasit = 1;'),
  leave: mustFind(DCYCLE_CPP_LINES, 'inStack[x] = 0;'),
  done: mustFind(DCYCLE_CPP_LINES, 'return gasit;'),
}

const BIPARTITE_LINE = {
  bip: mustFind(BIPARTITE_CPP_LINES, 'bip = 1;'),
  init: mustFind(BIPARTITE_CPP_LINES, 'viz[start] = 1;'),
  pop: mustFind(BIPARTITE_CPP_LINES, 'st++;'),
  look: mustFind(BIPARTITE_CPP_LINES, 'if (viz[y] == 0)'),
  color: mustFind(BIPARTITE_CPP_LINES, 'viz[y] = 3 - viz[x];'),
  same: mustFind(BIPARTITE_CPP_LINES, 'else if (viz[y] == viz[x])'),
  fail: mustFind(BIPARTITE_CPP_LINES, 'bip = 0;'),
  done: mustFind(BIPARTITE_CPP_LINES, 'return bip;'),
}

interface CppLines {
  enter: number
  look: number
  parentOrSkip: number
  back: number
  cross: number
  leaveChild: number
  leaveRoot: number
}

interface WalkConfig {
  neighbors: Map<number, number[]>
  lines: CppLines
  mode: 'dfs' | 'component' | 'reach'
  componentId: number
  mark: number[] | null
  transposed: boolean
  classifyBack: 'undirected' | 'directed' | 'none'
  abortOnBack: boolean
  paint: (current: number | null) => void
  enterTitle: (node: number) => string
  lookTitle: (node: number, neighbor: number) => string
  leaveTitle: (node: number) => string
  enterText: (node: number, parent: number, depth: number) => string
  lookText: (node: number, neighbor: number) => string
  parentText: (node: number, neighbor: number) => string
  backText: (node: number, neighbor: number) => string
  crossText: (node: number, neighbor: number) => string
  leaveText: (node: number, parent: number) => string
  leaveVerdict?: (node: number, parent: number) => string | undefined
  onAbort?: (node: number, neighbor: number, edgeId: string) => void
}

const COMPONENT_PAINT: readonly NodeVisualState[] = [
  'comp_1',
  'comp_2',
  'comp_3',
  'comp_4',
  'comp_5',
]

class Recorder {
  readonly steps: AlgorithmStep[] = []
  readonly graph: GraphStateData
  readonly n: number
  viz: number[]
  tata: number[]
  dist: (number | null)[]
  nodeStates: Record<number, NodeVisualState>
  edgeStates: Record<string, EdgeVisualState>
  queue: AlgorithmQueue | null = null
  stack: number[] | null = null
  outputOrder: number[] = []

  constructor(graph: GraphStateData) {
    this.graph = graph
    this.n = graphSize(graph.nodes)
    this.viz = Array<number>(this.n + 1).fill(0)
    this.tata = Array<number>(this.n + 1).fill(0)
    this.dist = Array<number | null>(this.n + 1).fill(null)
    this.nodeStates = {}
    for (let id = 1; id <= this.n; id += 1) this.nodeStates[id] = 'default'
    this.edgeStates = {}
    for (const edge of graph.edges) this.edgeStates[edge.id] = 'default'
  }

  snap(input: {
    title: string
    explanation: string
    activeNodeId: number | null
    activeEdgeId: string | null
    cppLine: number
    summaryVerdict?: string
  }): void {
    const step: AlgorithmStep = {
      stepIndex: this.steps.length,
      title: input.title,
      explanation: input.explanation,
      activeNodeId: input.activeNodeId,
      activeEdgeId: input.activeEdgeId,
      nodeStates: { ...this.nodeStates },
      edgeStates: { ...this.edgeStates },
      viz: this.viz.slice(),
      tata: this.tata.slice(),
      dist: this.dist.slice(),
      queue: this.queue
        ? { items: this.queue.items.slice(), st: this.queue.st, dr: this.queue.dr }
        : null,
      stack: this.stack ? this.stack.slice() : null,
      outputOrder: this.outputOrder.slice(),
      cppLine: input.cppLine,
    }
    if (input.summaryVerdict !== undefined) step.summaryVerdict = input.summaryVerdict
    this.steps.push(step)
  }

  resetEdges(): void {
    for (const edge of this.graph.edges) this.edgeStates[edge.id] = 'default'
  }
}

function loneStep(title: string, explanation: string, summaryVerdict: string): AlgorithmStep[] {
  return [
    {
      stepIndex: 0,
      title,
      explanation,
      activeNodeId: null,
      activeEdgeId: null,
      nodeStates: {},
      edgeStates: {},
      viz: [0],
      tata: [0],
      dist: [null],
      queue: null,
      stack: null,
      outputOrder: [],
      cppLine: 1,
      summaryVerdict,
    },
  ]
}

function startRun(
  graph: GraphStateData,
  startNode: number,
): { rec: Recorder; start: number } | { done: AlgorithmStep[] } {
  const count = graphSize(graph.nodes)
  if (count === 0) {
    return {
      done: loneStep(
        'Graf vid',
        'Graful nu conține noduri (n = 0), deci algoritmul nu are ce parcurge.',
        'Graful este vid.',
      ),
    }
  }
  if (!Number.isInteger(startNode) || startNode < 1 || startNode > count) {
    const rec = new Recorder(graph)
    rec.snap({
      title: 'Nod de start invalid',
      explanation: `Nodul de start trebuie să fie un întreg din intervalul 1..${count}. Valoarea primită este ${String(startNode)}.`,
      activeNodeId: null,
      activeEdgeId: null,
      cppLine: 1,
      summaryVerdict: 'Alegeți un nod de start între 1 și n.',
    })
    return { done: rec.steps }
  }
  return { rec: new Recorder(graph), start: startNode }
}

function componentState(componentId: number): NodeVisualState {
  if (componentId <= 0) return 'default'
  const index = (componentId - 1) % COMPONENT_PAINT.length
  return COMPONENT_PAINT[index] ?? 'comp_1'
}

function blankQueue(n: number): AlgorithmQueue {
  return { items: Array<number>(n + 1).fill(0), st: 1, dr: 0 }
}

function formatQueue(queue: AlgorithmQueue): string {
  if (queue.st > queue.dr) return `coadă goală (st = ${queue.st}, dr = ${queue.dr})`
  const values: number[] = []
  for (let index = queue.st; index <= queue.dr; index += 1) {
    const value = queue.items[index]
    if (value !== undefined) values.push(value)
  }
  return `C[${queue.st}..${queue.dr}] = (${values.join(', ')}), st = ${queue.st}, dr = ${queue.dr}`
}

function formatOutput(order: readonly number[]): string {
  return order.length === 0 ? '—' : order.join(' ')
}

function formatStack(stack: readonly number[] | null): string {
  if (!stack || stack.length === 0) return 'goală'
  return stack.join(', ')
}

function formatPath(nodes: readonly number[]): string {
  return nodes.join(' -> ')
}

function formatSet(ids: readonly number[]): string {
  if (ids.length === 0) return '∅'
  return `{${ids.join(', ')}}`
}

function startOrderSentence(start: number): string {
  return `Începem cu nodul ales ${start}, apoi continuăm cu nodurile 1..n încă nevizitate.`
}

function colorName(color: number): string {
  if (color === 1) return 'mulțimea A'
  if (color === 2) return 'mulțimea B'
  return 'necolorat'
}

function seedOrder(n: number, startNode: number): number[] {
  const order: number[] = []
  if (startNode >= 1 && startNode <= n) order.push(startNode)
  for (let id = 1; id <= n; id += 1) {
    if (id !== startNode) order.push(id)
  }
  return order
}

function adjacency(graph: GraphStateData): Map<number, number[]> {
  const lists = toAdjacencyList(graph)
  const map = new Map<number, number[]>()
  for (const [id, neighbors] of lists) {
    map.set(
      id,
      neighbors.map((neighbor) => neighbor.target),
    )
  }
  return map
}

function pushUnique(map: Map<number, number[]>, source: number, target: number): void {
  const neighbors = map.get(source)
  if (!neighbors || neighbors.includes(target)) return
  neighbors.push(target)
}

function transposeAdjacency(graph: GraphStateData): Map<number, number[]> {
  const n = graphSize(graph.nodes)
  const map = new Map<number, number[]>()
  for (let id = 1; id <= n; id += 1) map.set(id, [])
  for (const [source, targets] of adjacency(graph)) {
    for (const target of targets) pushUnique(map, target, source)
  }
  for (const neighbors of map.values()) neighbors.sort((left, right) => left - right)
  return map
}

function bipartiteNeighbors(graph: GraphStateData): Map<number, number[]> {
  const forward = adjacency(graph)
  if (!graph.isDirected) return forward
  const n = graphSize(graph.nodes)
  const map = new Map<number, number[]>()
  for (let id = 1; id <= n; id += 1) map.set(id, [])
  for (const [source, targets] of forward) {
    for (const target of targets) {
      pushUnique(map, source, target)
      if (source !== target) pushUnique(map, target, source)
    }
  }
  for (const neighbors of map.values()) neighbors.sort((left, right) => left - right)
  return map
}

function lookupEdge(graph: GraphStateData, from: number, to: number, transposed: boolean): string {
  if (transposed) return edgeKey(to, from, true)
  return edgeKey(from, to, graph.isDirected)
}

function storedEdge(graph: GraphStateData, from: number, to: number): string {
  if (!graph.isDirected) return edgeKey(from, to, false)
  const forward = edgeKey(from, to, true)
  if (graph.edges.some((edge) => edge.id === forward)) return forward
  return edgeKey(to, from, true)
}

function edgeVisual(rec: Recorder, edgeId: string): EdgeVisualState {
  return rec.edgeStates[edgeId] ?? 'default'
}

function setEdge(rec: Recorder, edgeId: string, state: EdgeVisualState): void {
  if (!Object.hasOwn(rec.edgeStates, edgeId)) return
  rec.edgeStates[edgeId] = state
}

function unvisitedIds(rec: Recorder): number[] {
  const missing: number[] = []
  for (let id = 1; id <= rec.n; id += 1) {
    if ((rec.viz[id] ?? 0) === 0) missing.push(id)
  }
  return missing
}

function markedIds(mark: readonly number[], n: number): number[] {
  const ids: number[] = []
  for (let id = 1; id <= n; id += 1) {
    if ((mark[id] ?? 0) !== 0) ids.push(id)
  }
  return ids
}

function reachedVerdict(
  kind: 'BFS' | 'DFS',
  start: number,
  order: readonly number[],
  missing: readonly number[],
  directed: boolean,
): string {
  const sequence = order.length === 0 ? '—' : order.join(' ')
  if (missing.length === 0) {
    const scope = directed ? 'pe arcele grafului' : 'în graf'
    return `Parcurgere ${kind} din nodul ${start}: ${sequence}. Toate nodurile sunt accesibile din ${start} ${scope}.`
  }
  return `Parcurgere ${kind} din nodul ${start}: ${sequence}. Noduri nevizitate: ${missing.join(', ')}.`
}

function connectivityVerdict(count: number, directed: boolean): string {
  if (directed) {
    if (count === 1) return 'Graful este tare conex (1 componentă tare conexă).'
    return `Graful are ${count} componente tare conexe.`
  }
  if (count === 1) return 'Graful este CONEX (1 componentă conexă).'
  return `Graful NU este conex (${count} componente conexe).`
}

function summarizeComponents(
  viz: readonly number[],
  n: number,
  directed: boolean,
): { count: number; details: string } {
  let maxComponent = 0
  for (let id = 1; id <= n; id += 1) {
    const marker = viz[id] ?? 0
    if (marker > maxComponent) maxComponent = marker
  }
  const parts: string[] = []
  for (let component = 1; component <= maxComponent; component += 1) {
    const members: number[] = []
    for (let id = 1; id <= n; id += 1) {
      if ((viz[id] ?? 0) === component) members.push(id)
    }
    if (members.length === 0) continue
    const name = directed ? 'Componenta tare conexă' : 'Componenta'
    parts.push(`${name} ${component}: ${members.join(', ')}`)
  }
  return { count: parts.length, details: parts.join('. ') }
}

function partitionVerdict(viz: readonly number[], n: number, directed: boolean): string {
  const setA: number[] = []
  const setB: number[] = []
  for (let id = 1; id <= n; id += 1) {
    if (viz[id] === 1) setA.push(id)
    else if (viz[id] === 2) setB.push(id)
  }
  const prefix = directed
    ? 'Graful orientat, privit fără orientarea arcelor, ESTE bipartit.'
    : 'Graful ESTE bipartit.'
  const left = setA.length === 0 ? 'niciun nod' : setA.join(', ')
  const right = setB.length === 0 ? 'niciun nod' : setB.join(', ')
  return `${prefix} Mulțimea A (viz = 1): ${left}. Mulțimea B (viz = 2): ${right}.`
}

function paintBfs(rec: Recorder, current: number | null): void {
  const onPath = new Set<number>()
  if (current !== null) {
    const seen = new Set<number>()
    let cursor = rec.tata[current] ?? 0
    while (cursor >= 1 && cursor <= rec.n && !seen.has(cursor)) {
      seen.add(cursor)
      onPath.add(cursor)
      cursor = rec.tata[cursor] ?? 0
    }
  }
  const inQueue = new Set<number>()
  const queue = rec.queue
  if (queue !== null) {
    for (let index = queue.st; index <= queue.dr; index += 1) {
      const value = queue.items[index]
      if (value !== undefined && value > 0) inQueue.add(value)
    }
  }
  for (let id = 1; id <= rec.n; id += 1) {
    if (id === current) rec.nodeStates[id] = 'current'
    else if (inQueue.has(id)) rec.nodeStates[id] = 'frontier'
    else if (onPath.has(id)) rec.nodeStates[id] = 'path'
    else if ((rec.viz[id] ?? 0) !== 0) rec.nodeStates[id] = 'visited'
    else rec.nodeStates[id] = 'default'
  }
}

function paintTraversal(rec: Recorder, current: number | null): void {
  const onStack = new Set(rec.stack ?? [])
  for (let id = 1; id <= rec.n; id += 1) {
    if (id === current) rec.nodeStates[id] = 'current'
    else if (onStack.has(id)) rec.nodeStates[id] = 'path'
    else if ((rec.viz[id] ?? 0) !== 0) rec.nodeStates[id] = 'visited'
    else rec.nodeStates[id] = 'default'
  }
}

function paintAssigned(rec: Recorder, current: number | null): void {
  const onStack = new Set(rec.stack ?? [])
  for (let id = 1; id <= rec.n; id += 1) {
    const marker = rec.viz[id] ?? 0
    if (id === current) rec.nodeStates[id] = 'current'
    else if (onStack.has(id)) rec.nodeStates[id] = 'path'
    else if (marker > 0) rec.nodeStates[id] = componentState(marker)
    else rec.nodeStates[id] = 'default'
  }
}

function paintBipartite(rec: Recorder, current: number | null): void {
  for (let id = 1; id <= rec.n; id += 1) {
    if (id === current) rec.nodeStates[id] = 'current'
    else if (rec.viz[id] === 1) rec.nodeStates[id] = 'set_A'
    else if (rec.viz[id] === 2) rec.nodeStates[id] = 'set_B'
    else rec.nodeStates[id] = 'default'
  }
}

function paintReach(
  rec: Recorder,
  current: number | null,
  plus: readonly number[],
  minus: readonly number[],
  phase: 'plus' | 'minus',
): void {
  const onStack = new Set(rec.stack ?? [])
  for (let id = 1; id <= rec.n; id += 1) {
    const component = rec.viz[id] ?? 0
    const inPlus = (plus[id] ?? 0) === 1
    const inMinus = (minus[id] ?? 0) === 1
    if (id === current) rec.nodeStates[id] = 'current'
    else if (onStack.has(id)) rec.nodeStates[id] = 'path'
    else if (component > 0) rec.nodeStates[id] = componentState(component)
    else if (phase === 'minus' && inPlus && inMinus) rec.nodeStates[id] = 'frontier'
    else if (inPlus || inMinus) rec.nodeStates[id] = 'visited'
    else rec.nodeStates[id] = 'default'
  }
}

function clearSearchTree(rec: Recorder): void {
  rec.tata.fill(0)
  rec.dist.fill(null)
  rec.stack = []
  rec.resetEdges()
}

function pathToRoot(tata: readonly number[], node: number, n: number): number[] {
  const path = [node]
  const seen = new Set<number>([node])
  let cursor = node
  while (seen.size <= n) {
    const parent = tata[cursor] ?? 0
    if (parent < 1 || parent > n || seen.has(parent)) break
    seen.add(parent)
    path.push(parent)
    cursor = parent
  }
  return path
}

function undirectedCycle(tata: readonly number[], x: number, y: number, n: number): number[] {
  if (x === y) return [x, x]
  const chain = [x]
  const seen = new Set<number>([x])
  let cursor = x
  while (cursor !== y) {
    const parent = tata[cursor] ?? 0
    if (parent < 1 || parent > n || seen.has(parent)) return [x, y, x]
    seen.add(parent)
    chain.push(parent)
    cursor = parent
  }
  chain.push(x)
  return chain
}

function directedCycle(stack: readonly number[], neighbor: number): number[] {
  const index = stack.indexOf(neighbor)
  const body = index >= 0 ? stack.slice(index) : [neighbor]
  const first = body[0] ?? neighbor
  return [...body, first]
}

function bipartiteCycle(tata: readonly number[], x: number, y: number, n: number): number[] {
  if (x === y) return [x, x]
  const pathX = pathToRoot(tata, x, n)
  const pathY = pathToRoot(tata, y, n)
  const inY = new Set(pathY)
  let meet = 0
  for (const node of pathX) {
    if (inY.has(node)) {
      meet = node
      break
    }
  }
  if (meet === 0) return [x, y, x]
  const cycle: number[] = []
  for (const node of pathX) {
    cycle.push(node)
    if (node === meet) break
  }
  const downward: number[] = []
  for (const node of pathY) {
    if (node === meet) break
    downward.push(node)
  }
  for (let index = downward.length - 1; index >= 0; index -= 1) {
    const node = downward[index]
    if (node !== undefined) cycle.push(node)
  }
  const first = cycle[0] ?? x
  cycle.push(first)
  return cycle
}

function highlightCycle(
  rec: Recorder,
  cycle: readonly number[],
  resolve: (from: number, to: number) => string,
): void {
  const last = cycle.length - 1
  const closed = last > 0 && cycle[0] === cycle[last]
  const nodeCount = closed ? last : cycle.length
  for (let index = 0; index < nodeCount; index += 1) {
    const node = cycle[index]
    if (node !== undefined) rec.nodeStates[node] = 'conflict'
  }
  for (let index = 0; index < last; index += 1) {
    const from = cycle[index]
    const to = cycle[index + 1]
    if (from === undefined || to === undefined) continue
    setEdge(rec, resolve(from, to), 'cycle')
  }
}

/**
 * Recursive DFS skeleton. Undirected parent links share one edge id with the
 * tree edge, so they are restored instead of being reported as back-edges.
 * Returns true when a back-edge aborts the search.
 */
function walk(rec: Recorder, root: number, config: WalkConfig): boolean {
  let aborted = false
  if (!rec.stack) rec.stack = []

  const isMarked = (id: number): boolean => {
    if (config.mark) return (config.mark[id] ?? 0) !== 0
    return (rec.viz[id] ?? 0) !== 0
  }

  const visit = (node: number, parent: number, via: string | null, depth: number): void => {
    if (aborted) return
    if (config.mark) config.mark[node] = 1
    else if (config.mode === 'component') rec.viz[node] = config.componentId
    else rec.viz[node] = 1

    rec.tata[node] = parent
    rec.dist[node] = depth
    rec.stack?.push(node)
    if (config.mode !== 'reach') rec.outputOrder.push(node)
    if (via) setEdge(rec, via, 'tree')
    config.paint(node)
    rec.snap({
      title: config.enterTitle(node),
      explanation: config.enterText(node, parent, depth),
      activeNodeId: node,
      activeEdgeId: via,
      cppLine: config.lines.enter,
    })

    const adjacent = config.neighbors.get(node) ?? []
    for (const neighbor of adjacent) {
      if (aborted) return
      const edgeId = lookupEdge(rec.graph, node, neighbor, config.transposed)
      const before = edgeVisual(rec, edgeId)
      setEdge(rec, edgeId, 'active')
      config.paint(node)
      rec.snap({
        title: config.lookTitle(node, neighbor),
        explanation: config.lookText(node, neighbor),
        activeNodeId: node,
        activeEdgeId: edgeId,
        cppLine: config.lines.look,
      })

      if (!isMarked(neighbor)) {
        visit(neighbor, node, edgeId, depth + 1)
        if (aborted) return
        continue
      }

      if (!rec.graph.isDirected && neighbor === parent) {
        setEdge(rec, edgeId, 'tree')
        config.paint(node)
        rec.snap({
          title: `Înapoi la tatăl ${neighbor}`,
          explanation: config.parentText(node, neighbor),
          activeNodeId: node,
          activeEdgeId: edgeId,
          cppLine: config.lines.parentOrSkip,
        })
        continue
      }

      const onStack = (rec.stack ?? []).includes(neighbor)
      const isBack =
        config.classifyBack === 'directed' ? onStack : config.classifyBack === 'undirected'

      if (isBack) {
        setEdge(rec, edgeId, 'back_edge')
        config.paint(node)
        rec.snap({
          title: `Muchie de întoarcere (${node}, ${neighbor})`,
          explanation: config.backText(node, neighbor),
          activeNodeId: node,
          activeEdgeId: edgeId,
          cppLine: config.lines.back,
        })
        if (config.abortOnBack) {
          config.onAbort?.(node, neighbor, edgeId)
          aborted = true
          return
        }
        continue
      }

      const preserved = before === 'tree' || before === 'back_edge' || before === 'cycle'
      setEdge(rec, edgeId, preserved ? before : 'discarded')
      config.paint(node)
      rec.snap({
        title: preserved
          ? `Muchie păstrată (${node}, ${neighbor})`
          : `Muchie ignorată (${node}, ${neighbor})`,
        explanation: config.crossText(node, neighbor),
        activeNodeId: node,
        activeEdgeId: edgeId,
        cppLine: config.lines.cross,
      })
    }

    if (aborted) return
    rec.stack?.pop()
    const resume = parent > 0 ? parent : null
    config.paint(resume)
    const verdict = config.leaveVerdict?.(node, parent)
    rec.snap({
      title: config.leaveTitle(node),
      explanation: config.leaveText(node, parent),
      activeNodeId: resume,
      activeEdgeId: null,
      cppLine: parent > 0 ? config.lines.leaveChild : config.lines.leaveRoot,
      ...(verdict ? { summaryVerdict: verdict } : {}),
    })
  }

  visit(root, 0, null, 0)
  return aborted
}

function dfsLines(): CppLines {
  return {
    enter: DFS_LINE.enter,
    look: DFS_LINE.look,
    parentOrSkip: DFS_LINE.decision,
    back: DFS_LINE.decision,
    cross: DFS_LINE.decision,
    leaveChild: DFS_LINE.leaveChild,
    leaveRoot: DFS_LINE.leaveRoot,
  }
}

function componentLines(): CppLines {
  return {
    enter: CC_LINE.enter,
    look: CC_LINE.look,
    parentOrSkip: CC_LINE.look,
    back: CC_LINE.look,
    cross: CC_LINE.look,
    leaveChild: CC_LINE.leaveChild,
    leaveRoot: CC_LINE.leaveRoot,
  }
}

/** Parcurgerea în lățime cu coada de bacalaureat `C`, `st`, `dr`. */
export function runBFS(graph: GraphStateData, startNode: number): AlgorithmStep[] {
  const opened = startRun(graph, startNode)
  if ('done' in opened) return opened.done
  const { rec, start } = opened
  const neighbors = adjacency(graph)
  rec.queue = blankQueue(rec.n)
  const queue = rec.queue

  queue.st = 1
  queue.dr = 1
  queue.items[1] = start
  rec.viz[start] = 1
  rec.dist[start] = 0
  rec.tata[start] = 0
  paintBfs(rec, null)
  rec.snap({
    title: 'Inițializare BFS',
    explanation: `Pornim din nodul ${start}. st = 1, dr = 1, C[1] = ${start}, viz[${start}] = 1, d[${start}] = 0, tata[${start}] = 0. ${formatQueue(queue)}.`,
    activeNodeId: start,
    activeEdgeId: null,
    cppLine: BFS_LINE.init,
  })

  while (queue.st <= queue.dr) {
    const slot = queue.st
    const node = queue.items[slot]
    if (node === undefined || node === 0) break
    queue.st += 1
    rec.outputOrder.push(node)
    paintBfs(rec, node)
    rec.snap({
      title: 'Extragere din coadă',
      explanation: `x = C[${slot}] = ${node}. Afișăm nodul, apoi st++ deci st = ${queue.st}. Afișare: ${formatOutput(rec.outputOrder)}. ${formatQueue(queue)}.`,
      activeNodeId: node,
      activeEdgeId: null,
      cppLine: BFS_LINE.pop,
    })

    const adjacent = neighbors.get(node) ?? []
    for (const neighbor of adjacent) {
      const edgeId = edgeKey(node, neighbor, graph.isDirected)
      const before = edgeVisual(rec, edgeId)
      setEdge(rec, edgeId, 'active')
      paintBfs(rec, node)
      rec.snap({
        title: `Verificare (${node}, ${neighbor})`,
        explanation: `Din nodul ${node} analizăm vecinul y = ${neighbor}, în ordinea crescătoare a listei de adiacență. viz[${neighbor}] = ${String(rec.viz[neighbor] ?? 0)}.`,
        activeNodeId: node,
        activeEdgeId: edgeId,
        cppLine: BFS_LINE.look,
      })

      if ((rec.viz[neighbor] ?? 0) === 0) {
        queue.dr += 1
        queue.items[queue.dr] = neighbor
        rec.viz[neighbor] = 1
        rec.tata[neighbor] = node
        rec.dist[neighbor] = (rec.dist[node] ?? 0) + 1
        setEdge(rec, edgeId, 'tree')
        paintBfs(rec, node)
        rec.snap({
          title: 'Adăugare în coadă',
          explanation: `viz[${neighbor}] == 0, deci dr = ${queue.dr}, C[${queue.dr}] = ${neighbor}, viz[${neighbor}] = 1, tata[${neighbor}] = ${node}, d[${neighbor}] = ${String(rec.dist[neighbor])}. Muchia devine muchie de arbore BFS. ${formatQueue(queue)}.`,
          activeNodeId: node,
          activeEdgeId: edgeId,
          cppLine: BFS_LINE.enqueue,
        })
        continue
      }

      const keepTree = before === 'tree' || before === 'back_edge' || before === 'cycle'
      setEdge(rec, edgeId, keepTree ? before : 'discarded')
      paintBfs(rec, node)
      rec.snap({
        title: keepTree ? `Muchie de arbore (${node}, ${neighbor})` : 'Vecin deja vizitat',
        explanation: keepTree
          ? `y = ${neighbor} este deja vizitat (viz[${neighbor}] = ${String(rec.viz[neighbor] ?? 0)}), iar muchia (${node}, ${neighbor}) face parte din arborele BFS. O păstrăm ca muchie de arbore.`
          : `viz[${neighbor}] = ${String(rec.viz[neighbor] ?? 0)}, deci nodul a fost descoperit deja. Muchia (${node}, ${neighbor}) nu intră în arborele BFS.`,
        activeNodeId: node,
        activeEdgeId: edgeId,
        cppLine: BFS_LINE.look,
      })
    }
  }

  paintBfs(rec, null)
  const verdict = reachedVerdict('BFS', start, rec.outputOrder, unvisitedIds(rec), graph.isDirected)
  rec.snap({
    title: 'BFS încheiat',
    explanation: `st = ${queue.st} și dr = ${queue.dr}, deci condiția st <= dr este falsă și coada este goală. ${verdict}`,
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: BFS_LINE.done,
    summaryVerdict: verdict,
  })
  return rec.steps
}

/** Parcurgerea în adâncime cu stiva de apeluri a funcției recursive `DFS`. */
export function runDFS(graph: GraphStateData, startNode: number): AlgorithmStep[] {
  const opened = startRun(graph, startNode)
  if ('done' in opened) return opened.done
  const { rec, start } = opened
  const directed = graph.isDirected
  rec.stack = []
  walk(rec, start, {
    neighbors: adjacency(graph),
    lines: dfsLines(),
    mode: 'dfs',
    componentId: 0,
    mark: null,
    transposed: false,
    classifyBack: directed ? 'directed' : 'undirected',
    abortOnBack: false,
    paint: (current) => paintTraversal(rec, current),
    enterTitle: (node) => `Vizitare nod ${node}`,
    lookTitle: (node, neighbor) => `Explorăm (${node}, ${neighbor})`,
    leaveTitle: (node) => `Revenire din ${node}`,
    enterText: (node, parent, depth) =>
      `Apel DFS(${node}): tata[${node}] = ${parent}, d[${node}] = ${depth}, viz[${node}] = 1. Afișăm nodul și îl punem pe stiva de apeluri. Afișare: ${formatOutput(rec.outputOrder)}. Stiva: ${formatStack(rec.stack)}.`,
    lookText: (node, neighbor) =>
      `Din nodul ${node} explorăm muchia către ${neighbor}. viz[${neighbor}] = ${String(rec.viz[neighbor] ?? 0)}.`,
    parentText: (node, neighbor) =>
      `y = ${neighbor} este tatăl nodului ${node} (tata[${node}] = ${neighbor}). Muchia este deja în arborele DFS, deci nu o mai folosim.`,
    backText: (node, neighbor) =>
      directed
        ? `viz[${neighbor}] este deja 1 și ${neighbor} se află pe stiva de apeluri. Arcul (${node}, ${neighbor}) este muchie de întoarcere către un strămoș.`
        : `viz[${neighbor}] este deja 1 și ${neighbor} nu este tatăl lui ${node}. Muchia (${node}, ${neighbor}) este muchie de întoarcere către un strămoș.`,
    crossText: (node, neighbor) =>
      directed
        ? `viz[${neighbor}] este deja 1, dar ${neighbor} nu mai este pe stivă. Arcul (${node}, ${neighbor}) este de înaintare sau transversal și nu mai apelăm DFS(${neighbor}).`
        : `Nodul ${neighbor} a fost deja vizitat din ${node}. Nu mai apelăm DFS(${neighbor}).`,
    leaveText: (node, parent) => {
      if (parent === 0) {
        const missing = unvisitedIds(rec)
        const rest =
          missing.length === 0
            ? 'Toate nodurile au fost vizitate.'
            : `Noduri nevizitate: ${missing.join(', ')}.`
        return `Revenire din DFS(${node}). Stiva de apeluri este goală. Afișare: ${formatOutput(rec.outputOrder)}. ${rest}`
      }
      return `Am epuizat vecinii nodului ${node}. Revenim din apelul DFS(${node}) la nodul ${parent}. Stiva: ${formatStack(rec.stack)}.`
    },
    leaveVerdict: (node, parent) => {
      if (parent !== 0) return undefined
      return reachedVerdict('DFS', node, rec.outputOrder, unvisitedIds(rec), directed)
    },
  })
  return rec.steps
}

/** Componente conexe pe graf neorientat, sau componente tare conexe (Plus-Minus) pe graf orientat. */
export function runConnectedComponents(graph: GraphStateData, startNode: number): AlgorithmStep[] {
  const opened = startRun(graph, startNode)
  if ('done' in opened) return opened.done
  if (graph.isDirected) return runStronglyConnected(opened.rec, opened.start)
  return runUndirectedComponents(opened.rec, opened.start)
}

function runUndirectedComponents(rec: Recorder, start: number): AlgorithmStep[] {
  const neighbors = adjacency(rec.graph)
  rec.stack = []
  paintAssigned(rec, null)
  rec.snap({
    title: 'Componente conexe',
    explanation: `Căutăm componentele conexe. nrc = 0 și viz[1..${rec.n}] = 0. ${startOrderSentence(start)} Când viz[i] == 0, creștem nrc și pornim DFS(i), marcând nodurile cu viz = nrc.`,
    activeNodeId: start,
    activeEdgeId: null,
    cppLine: CC_LINE.reset,
  })

  let componentCount = 0
  for (const seed of seedOrder(rec.n, start)) {
    if ((rec.viz[seed] ?? 0) !== 0) continue
    componentCount += 1
    const componentId = componentCount
    paintAssigned(rec, seed)
    rec.snap({
      title: `Componenta ${componentId}`,
      explanation: `viz[${seed}] == 0. Nodul ${seed} deschide o componentă nouă: nrc = ${componentId}. Apelăm DFS(${seed}) și marcăm nodurile ei cu viz = ${componentId}.`,
      activeNodeId: seed,
      activeEdgeId: null,
      cppLine: CC_LINE.next,
    })
    walk(rec, seed, {
      neighbors,
      lines: componentLines(),
      mode: 'component',
      componentId,
      mark: null,
      transposed: false,
      classifyBack: 'undirected',
      abortOnBack: false,
      paint: (current) => paintAssigned(rec, current),
      enterTitle: (node) => `Vizitare nod ${node}`,
      lookTitle: (node, neighbor) => `Explorăm (${node}, ${neighbor})`,
      leaveTitle: (node) => `Revenire din ${node}`,
      enterText: (node, parent, depth) =>
        `DFS(${node}) în componenta ${componentId}: viz[${node}] = ${componentId}, tata[${node}] = ${parent}, d[${node}] = ${depth}. Stiva: ${formatStack(rec.stack)}.`,
      lookText: (node, neighbor) =>
        `Din nodul ${node} privim vecinul ${neighbor}. viz[${neighbor}] = ${String(rec.viz[neighbor] ?? 0)}.`,
      parentText: (node, neighbor) =>
        `${neighbor} este tatăl lui ${node}. Muchia este deja în arborele componentei ${componentId}.`,
      backText: (node, neighbor) =>
        `viz[${neighbor}] este deja nenul și ${neighbor} nu este tatăl lui ${node}. Muchia (${node}, ${neighbor}) stă în aceeași componentă, dar nu prelungește arborele DFS.`,
      crossText: (node, neighbor) =>
        `Nodul ${neighbor} este deja marcat. Din ${node} nu mai pornim un apel nou.`,
      leaveText: (node, parent) =>
        parent === 0
          ? `DFS(${node}) s-a încheiat. Componenta ${componentId} își păstrează marcajul viz = ${componentId}. Stiva: ${formatStack(rec.stack)}.`
          : `Revenim din DFS(${node}) la nodul ${parent}. Stiva: ${formatStack(rec.stack)}.`,
    })
  }

  paintAssigned(rec, null)
  const summary = summarizeComponents(rec.viz, rec.n, false)
  const verdict = connectivityVerdict(summary.count, false)
  rec.snap({
    title: 'Componente încheiate',
    explanation: `Bucla for i = 1..n s-a încheiat. ${summary.details}. ${verdict}`,
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: CC_LINE.done,
    summaryVerdict: verdict,
  })
  return rec.steps
}

function runStronglyConnected(rec: Recorder, start: number): AlgorithmStep[] {
  const forward = adjacency(rec.graph)
  const backward = transposeAdjacency(rec.graph)
  rec.stack = []
  paintAssigned(rec, null)
  rec.snap({
    title: 'Componente tare conexe',
    explanation: `Graful este orientat. Folosim metoda Plus-Minus (varianta de bacalaureat, înrudită cu Kosaraju prin parcurgerea grafului transpus). PLUS(x) = nodurile accesibile din x, MINUS(x) = nodurile din care x este accesibil. Intersecția este componenta tare conexă a lui x. nrc = 0. ${startOrderSentence(start)}`,
    activeNodeId: start,
    activeEdgeId: null,
    cppLine: SCC_LINE.resetNrc,
  })

  let componentCount = 0
  for (const seed of seedOrder(rec.n, start)) {
    if ((rec.viz[seed] ?? 0) !== 0) continue
    const plus = Array<number>(rec.n + 1).fill(0)
    const minus = Array<number>(rec.n + 1).fill(0)
    paintAssigned(rec, seed)
    rec.snap({
      title: `Nod sursă ${seed}`,
      explanation: `viz[${seed}] == 0. Nodul ${seed} nu aparține încă unei componente tare conexe. Construim PLUS(${seed}) pe graful inițial și MINUS(${seed}) pe graful transpus.`,
      activeNodeId: seed,
      activeEdgeId: null,
      cppLine: SCC_LINE.unassigned,
    })

    clearSearchTree(rec)
    paintReach(rec, seed, plus, minus, 'plus')
    rec.snap({
      title: 'Resetare PLUS și MINUS',
      explanation: `Pentru j = 1..${rec.n} punem plus[j] = 0 și minus[j] = 0. Apoi apelăm DFS_plus(${seed}).`,
      activeNodeId: seed,
      activeEdgeId: null,
      cppLine: SCC_LINE.clearMarks,
    })

    const reachLines = (phase: 'plus' | 'minus'): CppLines =>
      phase === 'plus'
        ? {
            enter: SCC_LINE.plusEnter,
            look: SCC_LINE.plusIf,
            parentOrSkip: SCC_LINE.plusIf,
            back: SCC_LINE.plusIf,
            cross: SCC_LINE.plusIf,
            leaveChild: SCC_LINE.plusRec,
            leaveRoot: SCC_LINE.plusCall,
          }
        : {
            enter: SCC_LINE.minusEnter,
            look: SCC_LINE.minusIf,
            parentOrSkip: SCC_LINE.minusIf,
            back: SCC_LINE.minusIf,
            cross: SCC_LINE.minusIf,
            leaveChild: SCC_LINE.minusRec,
            leaveRoot: SCC_LINE.minusCall,
          }

    const paintPhase = (phase: 'plus' | 'minus') => (current: number | null) => {
      paintReach(rec, current, plus, minus, phase)
    }

    walk(rec, seed, {
      neighbors: forward,
      lines: reachLines('plus'),
      mode: 'reach',
      componentId: 0,
      mark: plus,
      transposed: false,
      classifyBack: 'none',
      abortOnBack: false,
      paint: paintPhase('plus'),
      enterTitle: (node) => `PLUS: nod ${node}`,
      lookTitle: (node, neighbor) => `PLUS (${node}, ${neighbor})`,
      leaveTitle: (node) => `Revenire PLUS ${node}`,
      enterText: (node, parent, depth) =>
        `plus[${node}] = 1. Există un drum de la ${seed} la ${node}. tata[${node}] = ${parent}, d[${node}] = ${depth}. Stiva: ${formatStack(rec.stack)}.`,
      lookText: (node, neighbor) =>
        `Din ${node} privim arcul către ${neighbor}. plus[${neighbor}] = ${String(plus[neighbor] ?? 0)}.`,
      parentText: (node, neighbor) =>
        `Arcul către ${neighbor} revine la tatăl lui ${node}. Nu extindem PLUS din nou.`,
      backText: (node, neighbor) =>
        `Nodul ${neighbor} este deja în PLUS, văzut din ${node}.`,
      crossText: (node, neighbor) =>
        `plus[${neighbor}] este deja 1. Din ${node} nu mai apelăm DFS_plus(${neighbor}).`,
      leaveText: (node, parent) =>
        parent === 0
          ? `DFS_plus(${node}) s-a încheiat. PLUS(${seed}) = ${formatSet(markedIds(plus, rec.n))}. Stiva: ${formatStack(rec.stack)}.`
          : `Revenim din DFS_plus(${node}) la ${parent}. Stiva: ${formatStack(rec.stack)}.`,
    })

    clearSearchTree(rec)
    paintReach(rec, seed, plus, minus, 'minus')
    rec.snap({
      title: `Pornim MINUS(${seed})`,
      explanation: `PLUS(${seed}) = ${formatSet(markedIds(plus, rec.n))}. Parcurgem graful transpus din ${seed}: un pas către y pe transpus înseamnă arcul y → ${seed} în graful inițial. Apelăm DFS_minus(${seed}).`,
      activeNodeId: seed,
      activeEdgeId: null,
      cppLine: SCC_LINE.minusCall,
    })

    walk(rec, seed, {
      neighbors: backward,
      lines: reachLines('minus'),
      mode: 'reach',
      componentId: 0,
      mark: minus,
      transposed: true,
      classifyBack: 'none',
      abortOnBack: false,
      paint: paintPhase('minus'),
      enterTitle: (node) => `MINUS: nod ${node}`,
      lookTitle: (node, neighbor) => `MINUS (${node}, ${neighbor})`,
      leaveTitle: (node) => `Revenire MINUS ${node}`,
      enterText: (node, parent, depth) =>
        `minus[${node}] = 1. În graful inițial există un drum de la ${node} la ${seed}. tata[${node}] = ${parent}, d[${node}] = ${depth}. Stiva: ${formatStack(rec.stack)}.`,
      lookText: (node, neighbor) =>
        `Pe transpus, din ${node} privim ${neighbor} (arcul ${neighbor} → ${node} în graful inițial). minus[${neighbor}] = ${String(minus[neighbor] ?? 0)}.`,
      parentText: (node, neighbor) =>
        `Revenim către ${neighbor}, tatăl lui ${node} în parcurgerea transpusă.`,
      backText: (node, neighbor) =>
        `Nodul ${neighbor} este deja în MINUS, văzut din ${node}.`,
      crossText: (node, neighbor) =>
        `minus[${neighbor}] este deja 1. Din ${node} nu mai apelăm DFS_minus(${neighbor}).`,
      leaveText: (node, parent) =>
        parent === 0
          ? `DFS_minus(${node}) s-a încheiat. MINUS(${seed}) = ${formatSet(markedIds(minus, rec.n))}. Stiva: ${formatStack(rec.stack)}.`
          : `Revenim din DFS_minus(${node}) la ${parent}. Stiva: ${formatStack(rec.stack)}.`,
    })

    const members: number[] = []
    for (let id = 1; id <= rec.n; id += 1) {
      if ((plus[id] ?? 0) === 1 && (minus[id] ?? 0) === 1 && (rec.viz[id] ?? 0) === 0) {
        members.push(id)
      }
    }
    componentCount += 1
    const componentId = componentCount
    clearSearchTree(rec)
    paintReach(rec, null, plus, minus, 'minus')
    rec.snap({
      title: `Intersecție ${componentId}`,
      explanation: `nrc = ${componentId}. Nodurile din PLUS ∩ MINUS care nu au fost atribuite încă sunt ${formatSet(members)}. Ele formează componenta tare conexă ${componentId}.`,
      activeNodeId: seed,
      activeEdgeId: null,
      cppLine: SCC_LINE.bump,
    })

    for (const member of members) {
      rec.viz[member] = componentId
      rec.outputOrder.push(member)
      paintReach(rec, member, plus, minus, 'minus')
      rec.snap({
        title: `viz[${member}] = ${componentId}`,
        explanation: `plus[${member}] == 1 și minus[${member}] == 1, iar viz[${member}] era 0. Atribuim viz[${member}] = ${componentId}.`,
        activeNodeId: member,
        activeEdgeId: null,
        cppLine: SCC_LINE.assign,
      })
    }
  }

  clearSearchTree(rec)
  paintAssigned(rec, null)
  const summary = summarizeComponents(rec.viz, rec.n, true)
  const verdict = connectivityVerdict(summary.count, true)
  rec.snap({
    title: 'CTC încheiate',
    explanation: `Bucla for i = 1..n s-a încheiat. ${summary.details}. ${verdict}`,
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: SCC_LINE.done,
    summaryVerdict: verdict,
  })
  return rec.steps
}

/** Primul ciclu (graf neorientat) sau circuit (graf orientat), reconstruit din `tata` sau din stivă. */
export function runCycleDetection(graph: GraphStateData, startNode: number): AlgorithmStep[] {
  const opened = startRun(graph, startNode)
  if ('done' in opened) return opened.done
  const { rec, start } = opened
  const directed = graph.isDirected
  rec.stack = []
  paintTraversal(rec, null)
  rec.snap({
    title: directed ? 'Detectare circuit' : 'Detectare ciclu',
    explanation: directed
      ? `Căutăm un circuit. viz marchează nodurile atinse, iar stiva de apeluri ține locul lui inStack. gasit = 0. ${startOrderSentence(start)}`
      : `Căutăm un ciclu. O muchie către un nod deja vizitat, diferit de tată, închide ciclul. gasit = 0. ${startOrderSentence(start)}`,
    activeNodeId: start,
    activeEdgeId: null,
    cppLine: directed ? DCYCLE_LINE.reset : UCYCLE_LINE.reset,
  })

  const neighbors = adjacency(graph)
  let found = false
  for (const seed of seedOrder(rec.n, start)) {
    if (found) break
    if ((rec.viz[seed] ?? 0) !== 0) continue
    found = walk(rec, seed, cycleConfig(rec, neighbors, directed))
  }
  if (found) return rec.steps

  paintTraversal(rec, null)
  const verdict = directed
    ? 'Graful este aciclic (nu conține circuite).'
    : 'Graful este aciclic (nu conține cicluri).'
  rec.snap({
    title: 'Graf aciclic',
    explanation: directed
      ? `Niciun arc nu lovește un nod cu inStack = 1. return gasit, iar gasit a rămas 0. ${verdict}`
      : `Nu am găsit o muchie de întoarcere către un strămoș. return gasit, iar gasit a rămas 0. ${verdict}`,
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: directed ? DCYCLE_LINE.done : UCYCLE_LINE.done,
    summaryVerdict: verdict,
  })
  return rec.steps
}

function cycleConfig(
  rec: Recorder,
  neighbors: Map<number, number[]>,
  directed: boolean,
): WalkConfig {
  const lines: CppLines = directed
    ? {
        enter: DCYCLE_LINE.enter,
        look: DCYCLE_LINE.look,
        parentOrSkip: DCYCLE_LINE.side,
        back: DCYCLE_LINE.side,
        cross: DCYCLE_LINE.side,
        leaveChild: DCYCLE_LINE.leave,
        leaveRoot: DCYCLE_LINE.leave,
      }
    : {
        enter: UCYCLE_LINE.enter,
        look: UCYCLE_LINE.look,
        parentOrSkip: UCYCLE_LINE.side,
        back: UCYCLE_LINE.side,
        cross: UCYCLE_LINE.side,
        leaveChild: UCYCLE_LINE.leaveChild,
        leaveRoot: UCYCLE_LINE.leaveRoot,
      }
  return {
    neighbors,
    lines,
    mode: 'dfs',
    componentId: 0,
    mark: null,
    transposed: false,
    classifyBack: directed ? 'directed' : 'undirected',
    abortOnBack: true,
    paint: (current) => paintTraversal(rec, current),
    enterTitle: (node) => `Vizitare nod ${node}`,
    lookTitle: (node, neighbor) => `Explorăm (${node}, ${neighbor})`,
    leaveTitle: (node) => `Revenire din ${node}`,
    enterText: (node, parent, depth) =>
      directed
        ? `DFS(${node}): viz[${node}] = 1, inStack[${node}] = 1, tata[${node}] = ${parent}, d[${node}] = ${depth}. Stiva: ${formatStack(rec.stack)}.`
        : `DFS(${node}, ${parent}): viz[${node}] = 1, tata[${node}] = ${parent}, d[${node}] = ${depth}. Stiva: ${formatStack(rec.stack)}.`,
    lookText: (node, neighbor) =>
      `Din nodul ${node} analizăm legătura cu ${neighbor}. viz[${neighbor}] = ${String(rec.viz[neighbor] ?? 0)}.`,
    parentText: (node, neighbor) =>
      `y = ${neighbor} este tatăl t al nodului ${node}. Nu închidem un ciclu pe muchia din care am venit.`,
    backText: (node, neighbor) =>
      directed
        ? `inStack[${neighbor}] == 1. Arcul (${node}, ${neighbor}) se întoarce pe stiva de recursie.`
        : `y = ${neighbor} este vizitat și este diferit de tatăl lui ${node}. Muchia (${node}, ${neighbor}) închide un ciclu.`,
    crossText: (node, neighbor) =>
      directed
        ? `viz[${neighbor}] este 1, dar inStack[${neighbor}] este 0. Arcul (${node}, ${neighbor}) nu închide un circuit.`
        : `Nodul ${neighbor} nu deschide un ciclu nou din ${node}.`,
    leaveText: (node, parent) =>
      directed
        ? parent === 0
          ? `inStack[${node}] = 0. DFS(${node}) se încheie fără circuit. Stiva: ${formatStack(rec.stack)}.`
          : `inStack[${node}] = 0. Revenim din DFS(${node}) la ${parent}. Stiva: ${formatStack(rec.stack)}.`
        : parent === 0
          ? `DFS(${node}, 0) se încheie fără ciclu. Stiva: ${formatStack(rec.stack)}.`
          : `Revenim din DFS(${node}) la tatăl ${parent}. Stiva: ${formatStack(rec.stack)}.`,
    onAbort: (node, neighbor, edgeId) => {
      const cycle = directed
        ? directedCycle(rec.stack ?? [], neighbor)
        : undirectedCycle(rec.tata, node, neighbor, rec.n)
      paintTraversal(rec, node)
      highlightCycle(rec, cycle, (from, to) => edgeKey(from, to, directed))
      const pretty = formatPath(cycle)
      rec.snap({
        title: 'Ciclu detectat',
        explanation: directed
          ? `gasit = 1. Arcul (${node}, ${neighbor}) închide circuitul ${pretty}. Oprim parcurgerea ca să rămână vizibilă stiva: ${formatStack(rec.stack)}.`
          : `gasit = 1. Muchia (${node}, ${neighbor}) închide ciclul ${pretty}, reconstruit cu șirul tata. Stiva: ${formatStack(rec.stack)}.`,
        activeNodeId: node,
        activeEdgeId: edgeId,
        cppLine: directed ? DCYCLE_LINE.found : UCYCLE_LINE.found,
        summaryVerdict: `Ciclu detectat: ${pretty}`,
      })
    },
  }
}

/** 2-colorare BFS. Pe un graf orientat se folosește graful neorientat suport. */
export function runBipartiteCheck(graph: GraphStateData, startNode: number): AlgorithmStep[] {
  const opened = startRun(graph, startNode)
  if ('done' in opened) return opened.done
  const { rec, start } = opened
  const neighbors = bipartiteNeighbors(graph)
  rec.queue = blankQueue(rec.n)
  const queue = rec.queue
  const directedNote = graph.isDirected
    ? ' Graful este orientat: fiecare arc este tratat ca muchie neorientată.'
    : ''
  paintBipartite(rec, null)
  rec.snap({
    title: 'Verificare bipartit',
    explanation: `Colorăm graful cu două culori. viz = 1 înseamnă mulțimea A, viz = 2 înseamnă mulțimea B, iar viz[y] = 3 - viz[x] dă culoarea opusă. bip = 1.${directedNote} ${startOrderSentence(start)}`,
    activeNodeId: start,
    activeEdgeId: null,
    cppLine: BIPARTITE_LINE.bip,
  })

  let ok = true
  for (const seed of seedOrder(rec.n, start)) {
    if (!ok) break
    if ((rec.viz[seed] ?? 0) !== 0) continue
    ok = colorComponent(seed)
  }
  if (!ok) return rec.steps

  paintBipartite(rec, null)
  const verdict = partitionVerdict(rec.viz, rec.n, graph.isDirected)
  rec.snap({
    title: 'Graf bipartit',
    explanation: `Bucla s-a încheiat și bip a rămas 1. return bip. ${verdict}`,
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: BIPARTITE_LINE.done,
    summaryVerdict: verdict,
  })
  return rec.steps

  function colorComponent(seed: number): boolean {
    queue.items.fill(0)
    queue.st = 1
    queue.dr = 1
    queue.items[1] = seed
    rec.viz[seed] = 1
    rec.dist[seed] = 0
    rec.tata[seed] = 0
    rec.outputOrder.push(seed)
    paintBipartite(rec, seed)
    rec.snap({
      title: `Colorare nod ${seed}`,
      explanation: `Pornim BFS_color(${seed}). st = 1, dr = 1, C[1] = ${seed}, viz[${seed}] = 1 (${colorName(1)}), d[${seed}] = 0, tata[${seed}] = 0. ${formatQueue(queue)}.`,
      activeNodeId: seed,
      activeEdgeId: null,
      cppLine: BIPARTITE_LINE.init,
    })

    while (queue.st <= queue.dr) {
      const slot = queue.st
      const node = queue.items[slot]
      if (node === undefined || node === 0) break
      queue.st += 1
      const colorNode = rec.viz[node] ?? 1
      paintBipartite(rec, node)
      rec.snap({
        title: 'Extragere din coadă',
        explanation: `x = C[${slot}] = ${node}, apoi st++ deci st = ${queue.st}. viz[${node}] = ${colorNode} (${colorName(colorNode)}). ${formatQueue(queue)}.`,
        activeNodeId: node,
        activeEdgeId: null,
        cppLine: BIPARTITE_LINE.pop,
      })

      const adjacent = neighbors.get(node) ?? []
      for (const neighbor of adjacent) {
        const edgeId = storedEdge(graph, node, neighbor)
        const before = edgeVisual(rec, edgeId)
        setEdge(rec, edgeId, 'active')
        paintBipartite(rec, node)
        const colorNeighbor = rec.viz[neighbor] ?? 0
        rec.snap({
          title: `Verificare (${node}, ${neighbor})`,
          explanation: `Din nodul ${node} (${colorName(colorNode)}) analizăm vecinul y = ${neighbor}. viz[${neighbor}] = ${colorNeighbor}.`,
          activeNodeId: node,
          activeEdgeId: edgeId,
          cppLine: BIPARTITE_LINE.look,
        })

        if (colorNeighbor === 0) {
          const nextColor = 3 - colorNode
          queue.dr += 1
          queue.items[queue.dr] = neighbor
          rec.viz[neighbor] = nextColor
          rec.tata[neighbor] = node
          rec.dist[neighbor] = (rec.dist[node] ?? 0) + 1
          rec.outputOrder.push(neighbor)
          setEdge(rec, edgeId, 'tree')
          paintBipartite(rec, node)
          rec.snap({
            title: `Colorare nod ${neighbor}`,
            explanation: `viz[${neighbor}] == 0. Culoarea opusă este viz[${neighbor}] = 3 - viz[${node}] = ${nextColor} (${colorName(nextColor)}). tata[${neighbor}] = ${node}, d[${neighbor}] = ${String(rec.dist[neighbor])}, dr = ${queue.dr}, C[${queue.dr}] = ${neighbor}. ${formatQueue(queue)}.`,
            activeNodeId: node,
            activeEdgeId: edgeId,
            cppLine: BIPARTITE_LINE.color,
          })
          continue
        }

        if (colorNeighbor === colorNode) {
          const cycle = bipartiteCycle(rec.tata, node, neighbor, rec.n)
          const length = Math.max(0, cycle.length - 1)
          const pretty = formatPath(cycle)
          paintBipartite(rec, null)
          highlightCycle(rec, cycle, (from, to) => storedEdge(graph, from, to))
          const verdict = `Graful NU este bipartit. Ciclu detectat: ${pretty}`
          const parity = length % 2 === 1 ? 'impară' : 'pară'
          rec.snap({
            title: 'Conflict de culoare',
            explanation: `viz[${neighbor}] = viz[${node}] = ${colorNode} (${colorName(colorNode)}), iar (${node}, ${neighbor}) este muchie. Două noduri vecine au aceeași culoare, deci bip = 0. Ciclul are lungimea ${length} (${parity}): ${pretty}.`,
            activeNodeId: node,
            activeEdgeId: edgeId,
            cppLine: BIPARTITE_LINE.fail,
            summaryVerdict: verdict,
          })
          return false
        }

        const keepTree = before === 'tree' || before === 'back_edge' || before === 'cycle'
        setEdge(rec, edgeId, keepTree ? before : 'discarded')
        paintBipartite(rec, node)
        rec.snap({
          title: keepTree ? `Muchie de arbore (${node}, ${neighbor})` : `Culori corecte (${node}, ${neighbor})`,
          explanation: keepTree
            ? `viz[${neighbor}] = ${colorNeighbor} (${colorName(colorNeighbor)}) este culoarea opusă lui viz[${node}] = ${colorNode}. Muchia face deja parte din arborele de colorare.`
            : `viz[${neighbor}] = ${colorNeighbor} (${colorName(colorNeighbor)}) și viz[${node}] = ${colorNode} (${colorName(colorNode)}) diferă. Condiția viz[y] == viz[x] este falsă, deci muchia respectă bipartiția.`,
          activeNodeId: node,
          activeEdgeId: edgeId,
          cppLine: BIPARTITE_LINE.same,
        })
      }
    }
    return true
  }
}

/** Reference C++ used by `AlgorithmStep.cppLine` for the selected algorithm. */
export function cppSourceFor(algorithm: AlgorithmId, isDirected: boolean): string {
  switch (algorithm) {
    case 'bfs':
      return BFS_CPP_SOURCE
    case 'dfs':
      return DFS_CPP_SOURCE
    case 'connected_components':
      return isDirected ? STRONGLY_CONNECTED_CPP_SOURCE : CONNECTED_COMPONENTS_CPP_SOURCE
    case 'cycle_detection':
      return isDirected ? DIRECTED_CYCLE_CPP_SOURCE : UNDIRECTED_CYCLE_CPP_SOURCE
    case 'bipartite':
      return BIPARTITE_CPP_SOURCE
    case 'dijkstra':
      return DIJKSTRA_CPP_SOURCE
    case 'roy_floyd':
      return ROY_FLOYD_CPP_SOURCE
    case 'kruskal':
      return KRUSKAL_CPP_SOURCE
    case 'prim':
      return PRIM_CPP_SOURCE
    case 'rooted_tree':
      return ROOTED_TREE_CPP_SOURCE
    case 'eulerian':
      return isDirected ? EULER_DIRECTED_CPP_SOURCE : EULER_UNDIRECTED_CPP_SOURCE
    case 'hamiltonian':
      return HAMILTON_CPP_SOURCE
  }
}

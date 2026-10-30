/**
 * Pure BAC generators for weighted paths, minimum spanning trees, and rooted trees.
 * Node numbers are always `1..N`. `null` in a cost array means ∞.
 * Each snapshot already includes the assignments of the C++ line it points at.
 */
import { graphSize } from '../representations'
import type { GraphStateData } from '../types'
import type {
  AlgorithmQueue,
  AlgorithmStep,
  EdgeVisualState,
  KruskalEdgeRow,
  NodeVisualState,
  RootedTreeInfo,
  RoyFloydState,
} from './types'

const DIJKSTRA_CPP_LINES = [
  'void Dijkstra(int start)',
  '{',
  '    int i, j, min, p;',
  '    for (i = 1; i <= n; i++)',
  '    {',
  '        d[i] = INF;',
  '        viz[i] = 0;',
  '        tata[i] = 0;',
  '    }',
  '    d[start] = 0;',
  '    for (i = 1; i <= n; i++)',
  '    {',
  '        min = INF;',
  '        p = 0;',
  '        for (j = 1; j <= n; j++)',
  '            if (viz[j] == 0 && d[j] < min)',
  '            {',
  '                min = d[j];',
  '                p = j;',
  '            }',
  '        if (p == 0)',
  '            break;',
  '        viz[p] = 1;',
  '        for (j = 1; j <= n; j++)',
  '            if (a[p][j] != 0 && d[p] + a[p][j] < d[j])',
  '            {',
  '                d[j] = d[p] + a[p][j];',
  '                tata[j] = p;',
  '            }',
  '    }',
  '}',
  '',
  'void reconstituie(int target)',
  '{',
  '    int k, nod;',
  '    if (target == 0)',
  '        return;',
  '    if (d[target] == INF)',
  '    {',
  '        cout << "Nu exista drum";',
  '        return;',
  '    }',
  '    k = 0;',
  '    nod = target;',
  '    while (nod != 0)',
  '    {',
  '        k++;',
  '        sol[k] = nod;',
  '        nod = tata[nod];',
  '    }',
  '    while (k >= 1)',
  '    {',
  '        cout << sol[k] << " ";',
  '        k--;',
  '    }',
  '}',
] as const

const ROY_FLOYD_CPP_LINES = [
  'void initializare()',
  '{',
  '    int i, j;',
  '    for (i = 1; i <= n; i++)',
  '        for (j = 1; j <= n; j++)',
  '        {',
  '            if (i == j)',
  '                d[i][j] = 0;',
  '            else if (a[i][j] != 0)',
  '                d[i][j] = a[i][j];',
  '            else',
  '                d[i][j] = INF;',
  '        }',
  '}',
  '',
  'void RoyFloyd()',
  '{',
  '    int i, j, k;',
  '    for (k = 1; k <= n; k++)',
  '        for (i = 1; i <= n; i++)',
  '            for (j = 1; j <= n; j++)',
  '                if (d[i][k] != INF && d[k][j] != INF && d[i][k] + d[k][j] < d[i][j])',
  '                    d[i][j] = d[i][k] + d[k][j];',
  '}',
] as const

const KRUSKAL_CPP_LINES = [
  'int cost;',
  '',
  'void sorteaza()',
  '{',
  '    int i, j;',
  '    muchie aux;',
  '    for (i = 1; i < m; i++)',
  '        for (j = i + 1; j <= m; j++)',
  '            if (e[j].c < e[i].c)',
  '            {',
  '                aux = e[i];',
  '                e[i] = e[j];',
  '                e[j] = aux;',
  '            }',
  '}',
  '',
  'void leaga(int u, int v)',
  '{',
  '    int anterior = u;',
  '    int x = v;',
  '    while (x != 0)',
  '    {',
  '        int urm = tata[x];',
  '        tata[x] = anterior;',
  '        anterior = x;',
  '        x = urm;',
  '    }',
  '}',
  '',
  'void Kruskal()',
  '{',
  '    int i, j, c1, c2, alese, respinse;',
  '    cost = 0;',
  '    alese = 0;',
  '    respinse = 0;',
  '    for (i = 1; i <= n; i++)',
  '        comp[i] = i;',
  '    for (i = 1; i <= m; i++)',
  '    {',
  '        c1 = comp[e[i].x];',
  '        c2 = comp[e[i].y];',
  '        if (c1 != c2)',
  '        {',
  '            alese++;',
  '            cost += e[i].c;',
  '            leaga(e[i].x, e[i].y);',
  '            for (j = 1; j <= n; j++)',
  '                if (comp[j] == c2)',
  '                    comp[j] = c1;',
  '        }',
  '        else',
  '            respinse++;',
  '    }',
  '}',
] as const

const PRIM_CPP_LINES = [
  'int cost;',
  '',
  'void Prim(int start)',
  '{',
  '    int i, j, p, min;',
  '    for (i = 1; i <= n; i++)',
  '    {',
  '        d[i] = INF;',
  '        viz[i] = 0;',
  '        tata[i] = 0;',
  '    }',
  '    d[start] = 0;',
  '    cost = 0;',
  '    for (i = 1; i <= n; i++)',
  '    {',
  '        p = 0;',
  '        min = INF;',
  '        for (j = 1; j <= n; j++)',
  '            if (viz[j] == 0 && d[j] < min)',
  '            {',
  '                min = d[j];',
  '                p = j;',
  '            }',
  '        if (p == 0)',
  '            break;',
  '        viz[p] = 1;',
  '        cost += d[p];',
  '        for (j = 1; j <= n; j++)',
  '            if (a[p][j] != 0 && viz[j] == 0 && a[p][j] < d[j])',
  '            {',
  '                d[j] = a[p][j];',
  '                tata[j] = p;',
  '            }',
  '    }',
  '}',
] as const

const ROOTED_TREE_CPP_LINES = [
  'void BFS_arbore(int rad)',
  '{',
  '    int st, dr, x, y, fii;',
  '    st = 1;',
  '    dr = 1;',
  '    C[1] = rad;',
  '    tata[rad] = 0;',
  '    nivel[rad] = 0;',
  '    viz[rad] = 3;',
  '    while (st <= dr)',
  '    {',
  '        x = C[st];',
  '        st++;',
  '        fii = 0;',
  '        for (y = 1; y <= n; y++)',
  '            if (a[x][y] == 1 && y != tata[x])',
  '            {',
  '                if (viz[y] == 0)',
  '                {',
  '                    tata[y] = x;',
  '                    nivel[y] = nivel[x] + 1;',
  '                    viz[y] = 1;',
  '                    dr++;',
  '                    C[dr] = y;',
  '                    fii++;',
  '                }',
  '                else',
  '                    ciclu = 1;',
  '            }',
  '        if (x != rad && fii == 0)',
  '            viz[x] = 2;',
  '    }',
  '}',
  '',
  'int este_arbore()',
  '{',
  '    int i, j, muchii;',
  '    muchii = 0;',
  '    for (i = 1; i <= n; i++)',
  '        for (j = i; j <= n; j++)',
  '            if (a[i][j] == 1)',
  '                muchii++;',
  '    if (muchii != n - 1)',
  '        return 0;',
  '    for (i = 1; i <= n; i++)',
  '        if (viz[i] == 0)',
  '            return 0;',
  '    if (ciclu)',
  '        return 0;',
  '    return 1;',
  '}',
] as const

export const DIJKSTRA_CPP_SOURCE = DIJKSTRA_CPP_LINES.join('\n')
export const ROY_FLOYD_CPP_SOURCE = ROY_FLOYD_CPP_LINES.join('\n')
export const KRUSKAL_CPP_SOURCE = KRUSKAL_CPP_LINES.join('\n')
export const PRIM_CPP_SOURCE = PRIM_CPP_LINES.join('\n')
export const ROOTED_TREE_CPP_SOURCE = ROOTED_TREE_CPP_LINES.join('\n')

function mustFind(lines: readonly string[], trimmed: string): number {
  const index = lines.findIndex((line) => line.trim() === trimmed)
  if (index < 0) throw new Error(`Missing C++ line: ${trimmed}`)
  return index + 1
}

const DIJKSTRA_LINE = {
  init: mustFind(DIJKSTRA_CPP_LINES, 'd[start] = 0;'),
  pick: mustFind(DIJKSTRA_CPP_LINES, 'viz[p] = 1;'),
  relax: mustFind(DIJKSTRA_CPP_LINES, 'if (a[p][j] != 0 && d[p] + a[p][j] < d[j])'),
  update: mustFind(DIJKSTRA_CPP_LINES, 'tata[j] = p;'),
  noPath: mustFind(DIJKSTRA_CPP_LINES, 'cout << "Nu exista drum";'),
  path: mustFind(DIJKSTRA_CPP_LINES, 'sol[k] = nod;'),
  done: mustFind(DIJKSTRA_CPP_LINES, 'if (target == 0)'),
}

const ROY_LINE = {
  init: mustFind(ROY_FLOYD_CPP_LINES, 'd[i][j] = 0;'),
  nextK: mustFind(ROY_FLOYD_CPP_LINES, 'for (k = 1; k <= n; k++)'),
  check: mustFind(
    ROY_FLOYD_CPP_LINES,
    'if (d[i][k] != INF && d[k][j] != INF && d[i][k] + d[k][j] < d[i][j])',
  ),
  update: mustFind(ROY_FLOYD_CPP_LINES, 'd[i][j] = d[i][k] + d[k][j];'),
}

const KRUSKAL_LINE = {
  sort: mustFind(KRUSKAL_CPP_LINES, 'if (e[j].c < e[i].c)'),
  init: mustFind(KRUSKAL_CPP_LINES, 'comp[i] = i;'),
  inspect: mustFind(KRUSKAL_CPP_LINES, 'c1 = comp[e[i].x];'),
  accept: mustFind(KRUSKAL_CPP_LINES, 'cost += e[i].c;'),
  link: mustFind(KRUSKAL_CPP_LINES, 'tata[x] = anterior;'),
  reject: mustFind(KRUSKAL_CPP_LINES, 'respinse++;'),
  done: mustFind(KRUSKAL_CPP_LINES, 'for (i = 1; i <= m; i++)'),
}

const PRIM_LINE = {
  init: mustFind(PRIM_CPP_LINES, 'd[start] = 0;'),
  pick: mustFind(PRIM_CPP_LINES, 'viz[p] = 1;'),
  addCost: mustFind(PRIM_CPP_LINES, 'cost += d[p];'),
  relax: mustFind(PRIM_CPP_LINES, 'if (a[p][j] != 0 && viz[j] == 0 && a[p][j] < d[j])'),
  update: mustFind(PRIM_CPP_LINES, 'tata[j] = p;'),
  done: mustFind(PRIM_CPP_LINES, 'if (p == 0)'),
}

const TREE_LINE = {
  level: mustFind(ROOTED_TREE_CPP_LINES, 'nivel[rad] = 0;'),
  root: mustFind(ROOTED_TREE_CPP_LINES, 'viz[rad] = 3;'),
  pop: mustFind(ROOTED_TREE_CPP_LINES, 'st++;'),
  look: mustFind(ROOTED_TREE_CPP_LINES, 'if (a[x][y] == 1 && y != tata[x])'),
  discover: mustFind(ROOTED_TREE_CPP_LINES, 'nivel[y] = nivel[x] + 1;'),
  enqueue: mustFind(ROOTED_TREE_CPP_LINES, 'C[dr] = y;'),
  cycle: mustFind(ROOTED_TREE_CPP_LINES, 'ciclu = 1;'),
  leaf: mustFind(ROOTED_TREE_CPP_LINES, 'viz[x] = 2;'),
  edges: mustFind(ROOTED_TREE_CPP_LINES, 'if (muchii != n - 1)'),
  missing: mustFind(ROOTED_TREE_CPP_LINES, 'if (viz[i] == 0)'),
  valid: mustFind(ROOTED_TREE_CPP_LINES, 'return 1;'),
  invalid: mustFind(ROOTED_TREE_CPP_LINES, 'return 0;'),
}

const COMPONENT_PAINT: readonly NodeVisualState[] = ['comp_1', 'comp_2', 'comp_3', 'comp_4', 'comp_5']

interface Endpoint {
  target: number
  weight: number
  edgeId: string
}

interface PlainEdge {
  id: string
  u: number
  v: number
  weight: number
}

interface TreeLink {
  next: number
  edge: PlainEdge
}

class Tape {
  readonly steps: AlgorithmStep[] = []
  readonly n: number
  readonly edgeIds: string[]
  viz: number[]
  tata: number[]
  dist: (number | null)[]
  nodeStates: Record<number, NodeVisualState>
  edgeStates: Record<string, EdgeVisualState>
  queue: AlgorithmQueue | null = null
  stack: number[] | null = null
  outputOrder: number[] = []
  includeCost = false
  cost = 0
  targetNodeId: number | null | undefined
  kruskalEdges: KruskalEdgeRow[] | undefined
  royFloydState: RoyFloydState | undefined
  treeInfo: RootedTreeInfo | undefined

  constructor(graph: GraphStateData) {
    this.n = graphSize(graph.nodes)
    this.edgeIds = graph.edges.map((edge) => edge.id)
    this.viz = Array<number>(this.n + 1).fill(0)
    this.tata = Array<number>(this.n + 1).fill(0)
    this.dist = Array<number | null>(this.n + 1).fill(null)
    this.nodeStates = {}
    for (let id = 1; id <= this.n; id += 1) this.nodeStates[id] = 'default'
    this.edgeStates = {}
    for (const edgeId of this.edgeIds) this.edgeStates[edgeId] = 'default'
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
      queue: this.queue ? { items: this.queue.items.slice(), st: this.queue.st, dr: this.queue.dr } : null,
      stack: this.stack ? this.stack.slice() : null,
      outputOrder: this.outputOrder.slice(),
      cppLine: input.cppLine,
    }
    if (this.targetNodeId !== undefined) step.targetNodeId = this.targetNodeId
    if (this.includeCost) step.totalCost = this.cost
    if (this.kruskalEdges) step.kruskalEdges = this.kruskalEdges.map((row) => ({ ...row }))
    if (this.royFloydState) {
      step.royFloydState = {
        k: this.royFloydState.k,
        i: this.royFloydState.i,
        j: this.royFloydState.j,
        updated: this.royFloydState.updated,
        matrix: this.royFloydState.matrix.map((row) => row.slice()),
      }
    }
    if (this.treeInfo) step.treeInfo = cloneTree(this.treeInfo)
    if (input.summaryVerdict !== undefined) step.summaryVerdict = input.summaryVerdict
    this.steps.push(step)
  }
}

function cloneTree(info: RootedTreeInfo): RootedTreeInfo {
  const childrenMap: Record<number, number[]> = {}
  for (const key of Object.keys(info.childrenMap)) {
    const id = Number(key)
    childrenMap[id] = (info.childrenMap[id] ?? []).slice()
  }
  return {
    root: info.root,
    leaves: info.leaves.slice(),
    levels: { ...info.levels },
    childrenMap,
    height: info.height,
    isValidTree: info.isValidTree,
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

function openGraph(graph: GraphStateData): Tape | AlgorithmStep[] {
  if (graphSize(graph.nodes) === 0) {
    return loneStep(
      'Graf vid',
      'Graful nu conține noduri (n = 0), deci algoritmul nu are ce calcula.',
      'Graful este vid.',
    )
  }
  return new Tape(graph)
}

function openStarted(graph: GraphStateData, startNode: number): { tape: Tape; start: number } | AlgorithmStep[] {
  const opened = openGraph(graph)
  if (Array.isArray(opened)) return opened
  const count = opened.n
  if (!Number.isInteger(startNode) || startNode < 1 || startNode > count) {
    opened.snap({
      title: 'Nod de start invalid',
      explanation: `Nodul de start trebuie să fie un întreg din intervalul 1..${count}. Valoarea primită este ${String(startNode)}.`,
      activeNodeId: null,
      activeEdgeId: null,
      cppLine: 1,
      summaryVerdict: 'Alegeți un nod de start între 1 și n.',
    })
    return opened.steps
  }
  return { tape: opened, start: startNode }
}

function normalizeTarget(target: number | null | undefined, count: number): number | null | 'invalid' {
  if (target === null || target === undefined) return null
  if (!Number.isInteger(target) || target < 1 || target > count) return 'invalid'
  return target
}

function inRange(id: number, count: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= count
}

function formatCost(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '∞'
  if (Number.isInteger(value)) return String(value)
  const rounded = Math.round(value * 1000) / 1000
  return String(rounded)
}

function formatPath(nodes: readonly number[]): string {
  return nodes.join(' -> ')
}

function formatBrace(ids: readonly number[]): string {
  if (ids.length === 0) return '{}'
  return `{${ids.join(', ')}}`
}

function formatQueue(queue: AlgorithmQueue): string {
  if (queue.st > queue.dr) return `coadă goală (st = ${queue.st}, dr = ${queue.dr})`
  const values: number[] = []
  for (let index = queue.st; index <= queue.dr; index += 1) {
    const value = queue.items[index]
    if (value !== undefined && value !== 0) values.push(value)
  }
  return `C[${queue.st}..${queue.dr}] = (${values.join(', ')}), st = ${queue.st}, dr = ${queue.dr}`
}

function weightOf(graph: GraphStateData, weight: number): number {
  return graph.isWeighted ? weight : 1
}

function costWord(graph: GraphStateData): string {
  return graph.isWeighted
    ? 'Costul unei muchii este greutatea ei.'
    : 'Graful este neponderat: fiecare muchie are costul 1.'
}

function undirectedNote(graph: GraphStateData): string {
  if (!graph.isDirected) return ''
  return ' Graful este orientat; pentru acest algoritm folosim varianta neorientată (dacă există ambele sensuri, păstrăm costul mai mic).'
}

function adjacencyOf(graph: GraphStateData, forceUndirected: boolean): Map<number, Endpoint[]> {
  const count = graphSize(graph.nodes)
  const buckets = new Map<number, Map<number, Endpoint>>()
  for (let id = 1; id <= count; id += 1) buckets.set(id, new Map())
  const undirected = forceUndirected || !graph.isDirected

  const put = (source: number, target: number, weight: number, edgeId: string) => {
    if (!inRange(source, count) || !inRange(target, count) || !Number.isFinite(weight)) return
    const bucket = buckets.get(source)
    if (!bucket) return
    const existing = bucket.get(target)
    if (!existing || weight < existing.weight) bucket.set(target, { target, weight, edgeId })
  }

  for (const edge of graph.edges) {
    const weight = weightOf(graph, edge.weight)
    put(edge.source, edge.target, weight, edge.id)
    if (undirected && edge.source !== edge.target) put(edge.target, edge.source, weight, edge.id)
  }

  const result = new Map<number, Endpoint[]>()
  for (let id = 1; id <= count; id += 1) {
    const list = [...(buckets.get(id)?.values() ?? [])]
    list.sort((left, right) => left.target - right.target || left.weight - right.weight || left.edgeId.localeCompare(right.edgeId))
    result.set(id, list)
  }
  return result
}

function undirectedEdges(graph: GraphStateData): PlainEdge[] {
  const count = graphSize(graph.nodes)
  const byPair = new Map<string, PlainEdge>()
  for (const edge of graph.edges) {
    if (!inRange(edge.source, count) || !inRange(edge.target, count)) continue
    const weight = weightOf(graph, edge.weight)
    if (!Number.isFinite(weight)) continue
    const u = Math.min(edge.source, edge.target)
    const v = Math.max(edge.source, edge.target)
    const key = `${u}--${v}`
    const existing = byPair.get(key)
    if (!existing || weight < existing.weight) byPair.set(key, { id: edge.id, u, v, weight })
  }
  return [...byPair.values()].sort(
    (left, right) => left.weight - right.weight || left.u - right.u || left.v - right.v || left.id.localeCompare(right.id),
  )
}

function linkBetween(adj: Map<number, Endpoint[]>, from: number, to: number): Endpoint | undefined {
  return adj.get(from)?.find((item) => item.target === to)
}

/** Colors every stored arc that represents the same undirected pair. */
function paintPair(tape: Tape, graph: GraphStateData, u: number, v: number, state: EdgeVisualState): void {
  const low = Math.min(u, v)
  const high = Math.max(u, v)
  for (const edge of graph.edges) {
    if (!inRange(edge.source, tape.n) || !inRange(edge.target, tape.n)) continue
    const left = Math.min(edge.source, edge.target)
    const right = Math.max(edge.source, edge.target)
    if (left === low && right === high) tape.edgeStates[edge.id] = state
  }
}

function hasNegative(adj: Map<number, Endpoint[]>): boolean {
  for (const list of adj.values()) {
    for (const link of list) {
      if (link.weight < 0) return true
    }
  }
  return false
}

function componentPaint(componentId: number): NodeVisualState {
  if (componentId <= 0) return 'default'
  return COMPONENT_PAINT[(componentId - 1) % COMPONENT_PAINT.length] ?? 'comp_1'
}

function paintSettled(
  tape: Tape,
  current: number | null,
  tentative: 'frontier' | 'visited',
): void {
  for (let id = 1; id <= tape.n; id += 1) {
    if (id === current) tape.nodeStates[id] = 'current'
    else if ((tape.viz[id] ?? 0) !== 0) tape.nodeStates[id] = 'visited'
    else if (tape.dist[id] !== null && tape.dist[id] !== undefined) tape.nodeStates[id] = tentative
    else tape.nodeStates[id] = 'default'
  }
}

function paintComponents(tape: Tape, focusA: number | null, focusB: number | null): void {
  for (let id = 1; id <= tape.n; id += 1) {
    if (id === focusA) tape.nodeStates[id] = 'current'
    else if (id === focusB) tape.nodeStates[id] = 'frontier'
    else tape.nodeStates[id] = componentPaint(tape.viz[id] ?? 0)
  }
}

function selectMinimum(tape: Tape): number | null {
  let chosen = 0
  let best: number | null = null
  for (let id = 1; id <= tape.n; id += 1) {
    if ((tape.viz[id] ?? 0) !== 0) continue
    const value = tape.dist[id]
    if (value === null || value === undefined) continue
    if (chosen === 0 || best === null || value < best) {
      chosen = id
      best = value
    }
  }
  return chosen === 0 ? null : chosen
}

function createCostMatrix(count: number): (number | null)[][] {
  return Array.from({ length: count + 1 }, () => Array<number | null>(count + 1).fill(null))
}

function blankQueue(count: number): AlgorithmQueue {
  return { items: Array<number>(count + 1).fill(0), st: 1, dr: 0 }
}

function attachTree(tata: number[], parent: number, child: number, count: number): void {
  let previous = parent
  let cursor = child
  const seen = new Set<number>()
  while (cursor >= 1 && cursor <= count && !seen.has(cursor)) {
    seen.add(cursor)
    const next = tata[cursor] ?? 0
    tata[cursor] = previous
    previous = cursor
    cursor = next
  }
}

function pathFromParent(tata: readonly number[], start: number, target: number, count: number): number[] | null {
  const reversed: number[] = []
  const seen = new Set<number>()
  let cursor = target
  while (cursor !== 0 && !seen.has(cursor)) {
    if (cursor < 1 || cursor > count) return null
    seen.add(cursor)
    reversed.push(cursor)
    if (cursor === start) {
      reversed.reverse()
      return reversed
    }
    cursor = tata[cursor] ?? 0
  }
  return null
}

function unreached(tape: Tape): number[] {
  const missing: number[] = []
  for (let id = 1; id <= tape.n; id += 1) {
    if ((tape.viz[id] ?? 0) === 0) missing.push(id)
  }
  return missing
}

function distanceList(tape: Tape): string {
  const parts: string[] = []
  for (let id = 1; id <= tape.n; id += 1) parts.push(`d[${id}]=${formatCost(tape.dist[id])}`)
  return parts.join(', ')
}

function negativeSuffix(negative: boolean): string {
  if (!negative) return ''
  return ' Atenție: există costuri negative, iar Dijkstra nu mai garantează drumul minim.'
}

function setKruskalStatus(rows: KruskalEdgeRow[], edgeId: string, status: KruskalEdgeRow['status']): void {
  const row = rows.find((item) => item.id === edgeId)
  if (row) row.status = status
}

/** Dijkstra with the BAC arrays `viz`, `d`, and `tata`. `target` null means every node. */
export function runDijkstra(
  graph: GraphStateData,
  startNode: number,
  targetNode?: number | null,
): AlgorithmStep[] {
  const opened = openStarted(graph, startNode)
  if (Array.isArray(opened)) return opened
  const { tape, start } = opened
  const target = normalizeTarget(targetNode, tape.n)
  if (target === 'invalid') {
    tape.snap({
      title: 'Nod destinație invalid',
      explanation: `Destinația trebuie să fie un nod din 1..${tape.n}, sau să lipsească dacă vrem distanțele către toate nodurile. Valoarea primită este ${String(targetNode)}.`,
      activeNodeId: null,
      activeEdgeId: null,
      cppLine: DIJKSTRA_LINE.done,
      summaryVerdict: 'Alegeți o destinație între 1 și n, sau toate nodurile.',
    })
    return tape.steps
  }

  const adj = adjacencyOf(graph, false)
  const negative = hasNegative(adj)
  tape.targetNodeId = target
  for (let id = 1; id <= tape.n; id += 1) {
    tape.viz[id] = 0
    tape.tata[id] = 0
    tape.dist[id] = null
  }
  tape.dist[start] = 0
  tape.tata[start] = 0
  paintSettled(tape, start, 'frontier')
  const destination =
    target === null ? 'Calculăm distanțele către toate nodurile.' : `Destinația cerută este nodul ${target}.`
  tape.snap({
    title: 'Inițializare Dijkstra',
    explanation: `d[1..${tape.n}] = ∞, viz[1..${tape.n}] = 0, tata[1..${tape.n}] = 0. Apoi d[${start}] = 0 și tata[${start}] = 0. ${costWord(graph)} ${destination}`,
    activeNodeId: start,
    activeEdgeId: null,
    cppLine: DIJKSTRA_LINE.init,
  })

  for (let guard = tape.n; guard > 0; guard -= 1) {
    const node = selectMinimum(tape)
    if (node === null) break
    const settled = tape.dist[node]
    tape.viz[node] = 1
    const parent = tape.tata[node] ?? 0
    const parentEdge = parent >= 1 ? linkBetween(adj, parent, node) : undefined
    paintSettled(tape, node, 'frontier')
    tape.snap({
      title: `Selectare nod ${node}`,
      explanation: `Dintre nodurile cu viz = 0 și d finit, minimul este d[${node}] = ${formatCost(settled)} (la egalitate alegem indicele cel mai mic). viz[${node}] = 1, deci distanța până la ${node} este finală.${parent >= 1 ? ` Muchia de arbore vine din tata[${node}] = ${parent}.` : ' Este nodul de start.'}`,
      activeNodeId: node,
      activeEdgeId: parentEdge?.edgeId ?? null,
      cppLine: DIJKSTRA_LINE.pick,
    })

    const neighbors = adj.get(node) ?? []
    for (const link of neighbors) {
      const next = link.target
      const weight = link.weight
      const current = tape.dist[node]
      const previous = tape.dist[next]
      const sum = current === null || current === undefined ? null : current + weight
      const improved = sum !== null && (previous === null || previous === undefined || sum < previous)
      const before = tape.edgeStates[link.edgeId] ?? 'default'
      tape.edgeStates[link.edgeId] = 'active'
      paintSettled(tape, node, 'frontier')
      const comparison =
        sum === null
          ? `d[${node}] este ∞, deci nu putem relaxa.`
          : `Verificăm d[${node}] + w < d[${next}]: ${formatCost(current)} + ${formatCost(weight)} = ${formatCost(sum)} < ${formatCost(previous)}? ${improved ? 'Adevărat.' : 'Fals.'}`
      tape.snap({
        title: `Relaxare (${node}, ${next})`,
        explanation: `Din nodul ${node} analizăm vecinul ${next}, în ordine crescătoare. Muchia are costul w = ${formatCost(weight)}. viz[${next}] = ${String(tape.viz[next] ?? 0)}. ${comparison}`,
        activeNodeId: node,
        activeEdgeId: link.edgeId,
        cppLine: DIJKSTRA_LINE.relax,
      })

      if (!improved || sum === null) {
        tape.edgeStates[link.edgeId] = before
        continue
      }

      const oldParent = tape.tata[next] ?? 0
      if (oldParent >= 1) {
        const oldEdge = linkBetween(adj, oldParent, next)
        if (oldEdge && oldEdge.edgeId !== link.edgeId) tape.edgeStates[oldEdge.edgeId] = 'default'
      }
      tape.dist[next] = sum
      tape.tata[next] = node
      tape.edgeStates[link.edgeId] = 'tree'
      paintSettled(tape, node, 'frontier')
      tape.snap({
        title: `Actualizare d[${next}]`,
        explanation: `Drumul prin ${node} este mai scurt. d[${next}] = ${formatCost(sum)} și tata[${next}] = ${node}. Muchia (${node}, ${next}) devine muchie de arbore de drum minim${oldParent >= 1 ? `, iar muchia veche din ${oldParent} revine la starea inițială.` : '.'}`,
        activeNodeId: node,
        activeEdgeId: link.edgeId,
        cppLine: DIJKSTRA_LINE.update,
      })
    }
  }

  const missing = unreached(tape)
  paintSettled(tape, null, 'frontier')
  if (target === null) {
    const reach =
      missing.length === 0
        ? 'Toate nodurile sunt accesibile.'
        : `Noduri neaccesibile: ${missing.join(', ')}.`
    const verdict = `Distanțe minime din ${start}: ${distanceList(tape)}. ${reach}${negativeSuffix(negative)}`
    tape.snap({
      title: 'Dijkstra încheiat',
      explanation: `Nu a mai rămas niciun nod cu viz = 0 și d finit. ${verdict}`,
      activeNodeId: start,
      activeEdgeId: null,
      cppLine: DIJKSTRA_LINE.done,
      summaryVerdict: verdict,
    })
    return tape.steps
  }

  const path = tape.dist[target] === null || tape.dist[target] === undefined ? null : pathFromParent(tape.tata, start, target, tape.n)
  if (!path) {
    tape.nodeStates[target] = 'conflict'
    const verdict = `Nu există drum de la ${start} la ${target}. ${distanceList(tape)}.${negativeSuffix(negative)}`
    tape.snap({
      title: 'Destinație neaccesibilă',
      explanation: `d[${target}] a rămas ∞, deci reconstituirea se oprește. ${verdict}`,
      activeNodeId: target,
      activeEdgeId: null,
      cppLine: DIJKSTRA_LINE.noPath,
      summaryVerdict: verdict,
    })
    return tape.steps
  }

  const pathSet = new Set(path)
  for (let id = 1; id <= tape.n; id += 1) {
    if (pathSet.has(id)) tape.nodeStates[id] = 'path'
  }
  for (let index = 0; index < path.length - 1; index += 1) {
    const from = path[index]
    const to = path[index + 1]
    if (from === undefined || to === undefined) continue
    const link = linkBetween(adj, from, to)
    if (link) tape.edgeStates[link.edgeId] = 'tree'
  }
  const cost = tape.dist[target] ?? 0
  tape.includeCost = true
  tape.cost = cost
  tape.outputOrder = path.slice()
  const pretty = formatPath(path)
  const verdict = `Drum minim ${pretty}, cost ${formatCost(cost)}.${negativeSuffix(negative)}`
  const lastEdge = path.length >= 2 ? linkBetween(adj, path[path.length - 2] ?? start, target) : undefined
  tape.snap({
    title: 'Reconstituire drum minim',
    explanation: `Plecăm din destinația ${target} și urmăm tata[] până la ${start}, apoi inversăm șirul. Drumul este ${pretty}, iar d[${target}] = ${formatCost(cost)}. Nodurile drumului sunt marcate ca traseu, iar muchiile lui rămân muchii de arbore. ${negative ? 'Există costuri negative, deci acest drum poate să nu fie optim.' : 'Celelalte muchii de arbore descriu distanțele către restul nodurilor.'}`,
    activeNodeId: target,
    activeEdgeId: lastEdge?.edgeId ?? null,
    cppLine: DIJKSTRA_LINE.path,
    summaryVerdict: verdict,
  })
  return tape.steps
}

/** Floyd-Warshall / Roy-Floyd. Steps follow each new `k` and every finite pair `(i, j)`. */
export function runRoyFloyd(graph: GraphStateData): AlgorithmStep[] {
  const opened = openGraph(graph)
  if (Array.isArray(opened)) return opened
  const tape = opened
  const adj = adjacencyOf(graph, false)
  const matrix = createCostMatrix(tape.n)
  for (let id = 1; id <= tape.n; id += 1) {
    const row = matrix[id]
    if (row) row[id] = 0
  }
  for (let source = 1; source <= tape.n; source += 1) {
    for (const link of adj.get(source) ?? []) {
      const row = matrix[source]
      if (!row) continue
      if (link.target === source) {
        const diagonal = row[source] ?? 0
        if (link.weight < diagonal) row[source] = link.weight
        continue
      }
      const current = row[link.target]
      if (current === null || current === undefined || link.weight < current) row[link.target] = link.weight
    }
  }

  const publish = (k: number, i: number, j: number, updated: boolean) => {
    tape.royFloydState = { k, i, j, matrix, updated }
  }
  publish(0, 0, 0, false)
  for (let id = 1; id <= tape.n; id += 1) tape.nodeStates[id] = 'default'
  tape.snap({
    title: 'Inițializare Roy-Floyd',
    explanation: `Construim D[1..${tape.n}][1..${tape.n}]. D[i][i] = 0. Dacă există muchia (i, j), D[i][j] este costul ei; altfel D[i][j] = ∞. ${costWord(graph)} Un ciclu propriu de cost negativ înlocuiește 0 de pe diagonală.`,
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: ROY_LINE.init,
  })

  for (let k = 1; k <= tape.n; k += 1) {
    publish(k, 0, 0, false)
    for (let id = 1; id <= tape.n; id += 1) tape.nodeStates[id] = id === k ? 'current' : 'default'
    tape.snap({
      title: `Intermediar k = ${k}`,
      explanation: `Începem pasul k = ${k}. Pentru fiecare pereche (i, j) cu D[i][${k}] și D[${k}][j] finite verificăm dacă drumul i → ${k} → j îmbunătățește D[i][j].`,
      activeNodeId: k,
      activeEdgeId: null,
      cppLine: ROY_LINE.nextK,
    })

    for (let i = 1; i <= tape.n; i += 1) {
      for (let j = 1; j <= tape.n; j += 1) {
        const left = matrix[i]?.[k]
        const right = matrix[k]?.[j]
        if (left === null || left === undefined || right === null || right === undefined) continue
        const before = matrix[i]?.[j] ?? null
        const sum = left + right
        const improved = before === null || before === undefined || sum < before
        if (improved) {
          const row = matrix[i]
          if (row) row[j] = sum
        }
        publish(k, i, j, improved)
        for (let id = 1; id <= tape.n; id += 1) {
          if (id === k) tape.nodeStates[id] = 'current'
          else if (id === i || id === j) tape.nodeStates[id] = 'frontier'
          else tape.nodeStates[id] = 'default'
        }
        const relation = improved
          ? `D[${i}][${j}] devine ${formatCost(sum)} (era ${formatCost(before)}).`
          : `Nu actualizăm: ${formatCost(sum)} nu este strict mai mic decât D[${i}][${j}] = ${formatCost(before)}.`
        tape.snap({
          title: improved ? `Actualizare D[${i}][${j}]` : `Verificare D[${i}][${j}]`,
          explanation: `k = ${k}, i = ${i}, j = ${j}. D[${i}][${k}] + D[${k}][${j}] = ${formatCost(left)} + ${formatCost(right)} = ${formatCost(sum)}. ${relation}`,
          activeNodeId: k,
          activeEdgeId: null,
          cppLine: improved ? ROY_LINE.update : ROY_LINE.check,
        })
      }
    }
  }

  const negative: number[] = []
  for (let id = 1; id <= tape.n; id += 1) {
    const diagonal = matrix[id]?.[id]
    if (diagonal !== null && diagonal !== undefined && diagonal < 0) negative.push(id)
    tape.nodeStates[id] = diagonal !== null && diagonal !== undefined && diagonal < 0 ? 'conflict' : 'default'
  }
  publish(tape.n, 0, 0, false)
  const verdict =
    negative.length === 0
      ? 'Matricea drumurilor minime este completă (Roy-Floyd).'
      : `Există ciclu de cost negativ. D[i][i] < 0 pentru i ∈ ${formatBrace(negative)}.`
  tape.snap({
    title: 'Roy-Floyd încheiat',
    explanation: `Am parcurs toți intermediarii k = 1..${tape.n}. ${verdict} ∞ rămâne acolo unde nu există drum.`,
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: negative.length === 0 ? ROY_LINE.nextK : ROY_LINE.update,
    summaryVerdict: verdict,
  })
  return tape.steps
}

/** Kruskal MST on the undirected version of the graph. Components live in `viz`. */
export function runKruskal(graph: GraphStateData): AlgorithmStep[] {
  const opened = openGraph(graph)
  if (Array.isArray(opened)) return opened
  const tape = opened
  const edges = undirectedEdges(graph)
  tape.includeCost = true
  tape.cost = 0
  tape.kruskalEdges = edges.map((edge) => ({
    id: edge.id,
    u: edge.u,
    v: edge.v,
    weight: edge.weight,
    status: 'pending',
  }))
  for (let id = 1; id <= tape.n; id += 1) {
    tape.viz[id] = id
    tape.tata[id] = 0
    tape.dist[id] = null
  }
  paintComponents(tape, null, null)
  const listing =
    edges.length === 0
      ? 'Nu există muchii de sortat.'
      : `Ordine: ${edges.map((edge) => `(${edge.u}, ${edge.v}, ${formatCost(edge.weight)})`).join(', ')}.`
  tape.snap({
    title: 'Sortare și inițializare',
    explanation: `Sortăm cele ${edges.length} muchii crescător după cost (la egalitate, după capete). ${listing} comp[i] = i este memorat în viz[i], tata[i] = 0 și costul APM este 0. ${costWord(graph)}${undirectedNote(graph)}`,
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: edges.length > 1 ? KRUSKAL_LINE.sort : KRUSKAL_LINE.init,
  })

  let selected = 0
  for (const edge of edges) {
    const left = tape.viz[edge.u] ?? edge.u
    const right = tape.viz[edge.v] ?? edge.v
    setKruskalStatus(tape.kruskalEdges, edge.id, 'inspecting')
    paintPair(tape, graph, edge.u, edge.v, 'active')
    paintComponents(tape, edge.u, edge.v)
    tape.snap({
      title: `Inspectare (${edge.u}, ${edge.v})`,
      explanation: `Muchia (${edge.u}, ${edge.v}) are costul ${formatCost(edge.weight)}. comp[${edge.u}] = ${left} și comp[${edge.v}] = ${right}. Verificăm dacă cele două capete sunt în componente diferite.`,
      activeNodeId: edge.u,
      activeEdgeId: edge.id,
      cppLine: KRUSKAL_LINE.inspect,
    })

    if (left !== right) {
      selected += 1
      tape.cost += edge.weight
      attachTree(tape.tata, edge.u, edge.v, tape.n)
      for (let id = 1; id <= tape.n; id += 1) {
        if ((tape.viz[id] ?? 0) === right) tape.viz[id] = left
      }
      setKruskalStatus(tape.kruskalEdges, edge.id, 'accepted')
      paintPair(tape, graph, edge.u, edge.v, 'tree')
      paintComponents(tape, edge.u, edge.v)
      tape.snap({
        title: `Acceptare (${edge.u}, ${edge.v})`,
        explanation: `comp[${edge.u}] ≠ comp[${edge.v}]. Acceptăm muchia de cost ${formatCost(edge.weight)}. Cost total APM = ${formatCost(tape.cost)}. Unificăm componenta ${right} în ${left} (viz[]) și orientăm arborele prin tata[${edge.v}] = ${edge.u}, re-rădăcinând componenta lui ${edge.v} ca să păstrăm muchiile deja alese. Muchii alese: ${selected}.`,
        activeNodeId: edge.u,
        activeEdgeId: edge.id,
        cppLine: KRUSKAL_LINE.accept,
      })
      continue
    }

    setKruskalStatus(tape.kruskalEdges, edge.id, 'rejected')
    paintPair(tape, graph, edge.u, edge.v, 'discarded')
    paintComponents(tape, edge.u, edge.v)
    tape.snap({
      title: `Respingere (${edge.u}, ${edge.v})`,
      explanation: `comp[${edge.u}] = comp[${edge.v}] = ${left}. Muchia (${edge.u}, ${edge.v}) ar închide un ciclu, deci o respingem. Costul APM rămâne ${formatCost(tape.cost)}.`,
      activeNodeId: edge.u,
      activeEdgeId: edge.id,
      cppLine: KRUSKAL_LINE.reject,
    })
  }

  paintComponents(tape, null, null)
  const needed = Math.max(0, tape.n - 1)
  const connected = selected === needed
  const verdict = connected
    ? `Cost total APM = ${formatCost(tape.cost)}. Graful este conex: au fost selectate ${selected} muchii (n - 1 = ${needed}).`
    : `Cost total APM = ${formatCost(tape.cost)}. Graful NU este conex: au fost selectate ${selected} muchii din ${needed} necesare pentru un arbore.`
  tape.snap({
    title: 'Kruskal încheiat',
    explanation: `Am parcurs toate muchiile sortate. ${verdict} Muchiile acceptate formează arborele (sau pădurea) parțial de cost minim, iar cele respinse ar fi închis un ciclu.`,
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: KRUSKAL_LINE.done,
    summaryVerdict: verdict,
  })
  return tape.steps
}

/** Prim MST grown from `startNode`. `viz` marks the tree, `d` the cut cost, `tata` the parent. */
export function runPrim(graph: GraphStateData, startNode: number): AlgorithmStep[] {
  const opened = openStarted(graph, startNode)
  if (Array.isArray(opened)) return opened
  const { tape, start } = opened
  const adj = adjacencyOf(graph, true)
  tape.includeCost = true
  tape.cost = 0
  for (let id = 1; id <= tape.n; id += 1) {
    tape.viz[id] = 0
    tape.tata[id] = 0
    tape.dist[id] = null
  }
  tape.dist[start] = 0
  paintSettled(tape, start, 'frontier')
  tape.snap({
    title: 'Inițializare Prim',
    explanation: `Pornim APM din nodul ${start}. d[1..${tape.n}] = ∞, viz = 0, tata = 0, apoi d[${start}] = 0. Cost total APM = 0. d[i] va fi costul minim al unei muchii care leagă i de arbore. ${costWord(graph)}${undirectedNote(graph)}`,
    activeNodeId: start,
    activeEdgeId: null,
    cppLine: PRIM_LINE.init,
  })

  for (let guard = tape.n; guard > 0; guard -= 1) {
    const node = selectMinimum(tape)
    if (node === null) break
    const linkCost = tape.dist[node] ?? 0
    const parent = tape.tata[node] ?? 0
    tape.viz[node] = 1
    tape.cost += linkCost
    const parentEdge = parent >= 1 ? linkBetween(adj, parent, node) : undefined
    if (parent >= 1) paintPair(tape, graph, parent, node, 'tree')
    paintSettled(tape, node, 'frontier')
    tape.snap({
      title: `Adăugare nod ${node}`,
      explanation:
        parent === 0
          ? `Alegem rădăcina ${node}: d[${node}] = 0 este minimul printre nodurile cu viz = 0. viz[${node}] = 1. Cost total APM = ${formatCost(tape.cost)}.`
          : `Alegem nodul ${node} cu d[${node}] = ${formatCost(linkCost)} minim (la egalitate, indicele cel mai mic). viz[${node}] = 1. Muchia (${parent}, ${node}) intră în APM. Cost total APM = ${formatCost(tape.cost)}.`,
      activeNodeId: node,
      activeEdgeId: parentEdge?.edgeId ?? null,
      cppLine: parent === 0 ? PRIM_LINE.pick : PRIM_LINE.addCost,
    })

    for (const link of adj.get(node) ?? []) {
      const next = link.target
      const already = (tape.viz[next] ?? 0) !== 0
      const previous = tape.dist[next]
      const improved = !already && (previous === null || previous === undefined || link.weight < previous)
      if (already) {
        tape.snap({
          title: `Nod ${next} este deja în APM`,
          explanation: `Muchia (${node}, ${next}) are costul ${formatCost(link.weight)}, dar viz[${next}] = 1. Nodul este deja în arbore, deci nu îi mai modificăm d și tata.`,
          activeNodeId: node,
          activeEdgeId: link.edgeId,
          cppLine: PRIM_LINE.relax,
        })
        continue
      }

      if (improved) {
        const oldParent = tape.tata[next] ?? 0
        if (oldParent >= 1 && oldParent !== node) {
          const oldEdge = linkBetween(adj, oldParent, next)
          if (oldEdge && oldEdge.edgeId !== link.edgeId && tape.edgeStates[oldEdge.edgeId] !== 'tree') {
            paintPair(tape, graph, oldParent, next, 'default')
          }
        }
        tape.dist[next] = link.weight
        tape.tata[next] = node
        paintPair(tape, graph, node, next, 'active')
      }
      paintSettled(tape, node, 'frontier')
      tape.snap({
        title: improved ? `Frontieră (${node}, ${next})` : `Fără îmbunătățire (${node}, ${next})`,
        explanation: improved
          ? `viz[${next}] = 0 și w = ${formatCost(link.weight)} < d[${next}] = ${formatCost(previous)}. Actualizăm d[${next}] = ${formatCost(link.weight)} și tata[${next}] = ${node}. Muchia este candidată la frontieră.`
          : `viz[${next}] = 0, dar w = ${formatCost(link.weight)} nu este strict mai mic decât d[${next}] = ${formatCost(previous)}. Păstrăm tatăl curent tata[${next}] = ${String(tape.tata[next] ?? 0)}.`,
        activeNodeId: node,
        activeEdgeId: link.edgeId,
        cppLine: improved ? PRIM_LINE.update : PRIM_LINE.relax,
      })
    }
  }

  const missing = unreached(tape)
  paintSettled(tape, null, 'frontier')
  const connected = missing.length === 0
  const verdict = connected
    ? `Cost total APM = ${formatCost(tape.cost)}. Toate cele ${tape.n} noduri sunt în arbore.`
    : `Cost total APM = ${formatCost(tape.cost)}. Graful NU este conex din ${start}. Noduri neincluse: ${missing.join(', ')}.`
  tape.snap({
    title: 'Prim încheiat',
    explanation: `Nu a mai rămas niciun nod cu viz = 0 și d finit. ${verdict}`,
    activeNodeId: start,
    activeEdgeId: null,
    cppLine: PRIM_LINE.done,
    summaryVerdict: verdict,
  })
  return tape.steps
}

function publishTree(
  tape: Tape,
  root: number,
  processed: ReadonlySet<number>,
  isValidTree: boolean,
): void {
  const childrenMap: Record<number, number[]> = {}
  const buckets: number[][] = Array.from({ length: tape.n + 1 }, () => [])
  for (let id = 1; id <= tape.n; id += 1) {
    const parent = tape.tata[id] ?? 0
    if (parent >= 1 && parent <= tape.n && parent !== id) buckets[parent]?.push(id)
  }
  const leaves: number[] = []
  const levels: Record<number, number> = {}
  let height = 0
  for (let id = 1; id <= tape.n; id += 1) {
    const children = buckets[id] ?? []
    children.sort((left, right) => left - right)
    childrenMap[id] = children
    const level = tape.dist[id]
    if (level === null || level === undefined) continue
    levels[id] = level
    if (level > height) height = level
    if (id !== root && processed.has(id) && children.length === 0) leaves.push(id)
  }
  tape.treeInfo = { root, leaves, levels, childrenMap, height, isValidTree }
}

function paintRooted(tape: Tape, root: number, current: number | null, queue: AlgorithmQueue): void {
  const waiting = new Set<number>()
  if (queue.st <= queue.dr) {
    for (let index = queue.st; index <= queue.dr; index += 1) {
      const value = queue.items[index]
      if (value !== undefined && value > 0) waiting.add(value)
    }
  }
  for (let id = 1; id <= tape.n; id += 1) {
    const role = tape.viz[id] ?? 0
    if (role === 2) tape.nodeStates[id] = 'comp_3'
    else if (id === current) tape.nodeStates[id] = 'current'
    else if (waiting.has(id)) tape.nodeStates[id] = 'frontier'
    else if (id === root || role === 3) tape.nodeStates[id] = 'current'
    else if (role === 1) tape.nodeStates[id] = 'visited'
    else tape.nodeStates[id] = 'default'
  }
}

function treeVerdict(info: RootedTreeInfo, reasons: readonly string[]): string {
  const base = `Rădăcină: ${info.root} | Frunze: ${formatBrace(info.leaves)} | Înălțime: ${info.height}`
  if (info.isValidTree) return `${base} | Arbore valid.`
  const because = reasons.length === 0 ? 'nu îndeplinește condițiile de arbore' : reasons.join('; ')
  return `${base} | Graful NU este arbore: ${because}.`
}

/** BFS levels, parents, leaves, and the BAC tree check, rooted at `rootNode`. */
export function runRootedTreeAnalysis(graph: GraphStateData, rootNode: number): AlgorithmStep[] {
  const opened = openStarted(graph, rootNode)
  if (Array.isArray(opened)) return opened
  const { tape, start } = opened
  const edges = undirectedEdges(graph)
  const neighbors = new Map<number, TreeLink[]>()
  for (let id = 1; id <= tape.n; id += 1) neighbors.set(id, [])
  for (const edge of edges) {
    neighbors.get(edge.u)?.push({ next: edge.v, edge })
    if (edge.u !== edge.v) neighbors.get(edge.v)?.push({ next: edge.u, edge })
  }
  for (const list of neighbors.values()) {
    list.sort(
      (left, right) => left.next - right.next || left.edge.weight - right.edge.weight || left.edge.id.localeCompare(right.edge.id),
    )
  }

  const queue = blankQueue(tape.n)
  tape.queue = queue
  queue.st = 1
  queue.dr = 1
  queue.items[1] = start
  tape.tata[start] = 0
  tape.dist[start] = 0
  tape.viz[start] = 3
  const processed = new Set<number>()
  let cycleFound = false
  publishTree(tape, start, processed, false)
  paintRooted(tape, start, start, queue)
  tape.snap({
    title: 'Rădăcină și nivel 0',
    explanation: `Rădăcina este r = ${start}. tata[${start}] = 0, nivel[${start}] = 0 (adâncimea rădăcinii; un fiu are nivelul tatălui plus 1, valoarea stă în d[]), viz[${start}] = 3. st = 1, dr = 1, C[1] = ${start}. viz = 3 înseamnă rădăcină, viz = 1 nod intern, viz = 2 frunză. ${formatQueue(queue)}.${undirectedNote(graph)}`,
    activeNodeId: start,
    activeEdgeId: null,
    cppLine: TREE_LINE.level,
  })

  while (queue.st <= queue.dr) {
    const slot = queue.st
    const node = queue.items[slot]
    if (node === undefined || node === 0) break
    queue.st += 1
    let children = 0
    paintRooted(tape, start, node, queue)
    publishTree(tape, start, processed, false)
    tape.snap({
      title: `Extragere nod ${node}`,
      explanation: `x = C[${slot}] = ${node}. st++ deci st = ${queue.st}. Nivelul curent este d[${node}] = ${formatCost(tape.dist[node])}, iar tata[${node}] = ${String(tape.tata[node] ?? 0)}. ${formatQueue(queue)}.`,
      activeNodeId: node,
      activeEdgeId: null,
      cppLine: TREE_LINE.pop,
    })

    const adjacent = neighbors.get(node) ?? []
    for (const link of adjacent) {
      const next = link.next
      const edge = link.edge
      if (next === (tape.tata[node] ?? 0)) continue
      if ((tape.viz[next] ?? 0) === 0) {
        children += 1
        queue.dr += 1
        queue.items[queue.dr] = next
        tape.tata[next] = node
        tape.dist[next] = (tape.dist[node] ?? 0) + 1
        tape.viz[next] = 1
        paintPair(tape, graph, node, next, 'tree')
        paintRooted(tape, start, node, queue)
        publishTree(tape, start, processed, false)
        tape.snap({
          title: `Fiu ${next}`,
          explanation: `y = ${next} nu este tatăl lui ${node} și viz[${next}] era 0. tata[${next}] = ${node}, nivel[${next}] = d[${next}] = ${String(tape.dist[next])}, viz[${next}] = 1 (încă nu știm dacă este frunză). dr = ${queue.dr}, C[${queue.dr}] = ${next}. ${formatQueue(queue)}.`,
          activeNodeId: node,
          activeEdgeId: edge.id,
          cppLine: TREE_LINE.discover,
        })
        continue
      }

      cycleFound = true
      paintPair(tape, graph, node, next, 'cycle')
      paintRooted(tape, start, node, queue)
      publishTree(tape, start, processed, false)
      tape.snap({
        title: `Ciclu prin (${node}, ${next})`,
        explanation: `y = ${next} este deja vizitat (viz[${next}] = ${String(tape.viz[next] ?? 0)}) și nu este tatăl lui ${node}. Muchia (${node}, ${next}) închide un ciclu, deci graful nu poate fi arbore.`,
        activeNodeId: node,
        activeEdgeId: edge.id,
        cppLine: TREE_LINE.cycle,
      })
    }

    processed.add(node)
    if (node !== start && children === 0) {
      tape.viz[node] = 2
      paintRooted(tape, start, node, queue)
      publishTree(tape, start, processed, false)
      tape.snap({
        title: `Frunză ${node}`,
        explanation: `${node} nu este rădăcina și nu are fii în arborele parcurgerii. viz[${node}] = 2 (frunză). Nivelul ei este d[${node}] = ${formatCost(tape.dist[node])}.`,
        activeNodeId: node,
        activeEdgeId: null,
        cppLine: TREE_LINE.leaf,
      })
    } else if (node === start) {
      paintRooted(tape, start, null, queue)
      publishTree(tape, start, processed, false)
      tape.snap({
        title: children === 0 ? 'Rădăcina nu are fii' : `Rădăcina are ${children} fii`,
        explanation:
          children === 0
            ? `Am încheiat vecinii rădăcinii. viz[${start}] rămâne 3. Înălțimea de până acum este 0.`
            : `Rădăcina ${start} are ${children} fii direcți. viz[${start}] rămâne 3. Fiii așteaptă în coadă ca să le aflăm propriii descendenți.`,
        activeNodeId: start,
        activeEdgeId: null,
        cppLine: TREE_LINE.root,
      })
    } else {
      paintRooted(tape, start, null, queue)
      publishTree(tape, start, processed, false)
      tape.snap({
        title: `Nod intern ${node}`,
        explanation: `${node} are ${children} fii, deci rămâne nod intern: viz[${node}] = 1. Nivelul lui este d[${node}] = ${formatCost(tape.dist[node])}.`,
        activeNodeId: node,
        activeEdgeId: null,
        cppLine: TREE_LINE.enqueue,
      })
    }
  }

  const missing = unreached(tape)
  const needed = tape.n - 1
  const reasons: string[] = []
  if (edges.length !== needed) reasons.push(`m = ${edges.length}, iar un arbore cu n = ${tape.n} are exact n - 1 = ${needed} muchii`)
  if (missing.length > 0) reasons.push(`nodurile ${missing.join(', ')} nu sunt accesibile din rădăcina ${start}`)
  if (cycleFound) reasons.push('există cel puțin un ciclu')
  const isValidTree = reasons.length === 0
  publishTree(tape, start, processed, isValidTree)
  paintRooted(tape, start, null, queue)
  const info = tape.treeInfo
  const verdict = info
    ? treeVerdict(info, reasons)
    : `Rădăcină: ${start} | Frunze: {} | Înălțime: 0`
  const cppLine = isValidTree ? TREE_LINE.valid : edges.length !== needed ? TREE_LINE.edges : missing.length > 0 ? TREE_LINE.missing : TREE_LINE.invalid
  tape.snap({
    title: isValidTree ? 'Arbore valid' : 'Graful nu este arbore',
    explanation: `Parcurgerea pe niveluri s-a încheiat (st = ${queue.st}, dr = ${queue.dr}). Nivelul rădăcinii este 0, iar înălțimea este nivelul maxim. ${verdict}`,
    activeNodeId: start,
    activeEdgeId: null,
    cppLine,
    summaryVerdict: verdict,
  })
  return tape.steps
}

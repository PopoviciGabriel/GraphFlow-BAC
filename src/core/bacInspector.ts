/**
 * Real-time BAC graph properties.
 * Pure TypeScript: no React. Node ids are `1..N`.
 * Degree rules match `computeNodeDegrees` (an undirected loop contributes 2).
 */
import { computeNodeDegrees, edgeKey, graphSize } from './representations'
import type { GraphStateData } from './types'

/** Non-adjacent pair that fails Ore's hypothesis, with `d(u) + d(v)`. */
export interface OreViolation {
  u: number
  v: number
  degreeSum: number
}

/**
 * Counts of labeled graphs on `n` vertices.
 * These describe every graph with `n` nodes, not the drawing on the canvas.
 */
export interface TotalGraphsWithN {
  /** `2^(n*(n-1)/2) = 2^k = <value>` */
  undirectedGraphs: string
  /** Cayley's formula `n^(n-2)` for labeled trees. */
  labeledTrees: string
  explanation: string
}

/**
 * Structured BAC report.
 * Boolean flags are paired with the Romanian justification a student would write.
 */
export interface BacGraphReport {
  n: number
  m: number
  isDirected: boolean
  maxPossibleEdges: number
  edgesNeededForComplete: number
  isComplete: boolean
  isCompleteExplanation: string
  totalGraphsWithN: TotalGraphsWithN
  /** Non-increasing sequence of `d(x)`. For a digraph, `d(x) = d+(x) + d-(x)`. */
  degreeSequence: number[]
  /** Non-increasing `d+(x)`. `null` on an undirected graph. */
  outDegreeSequence: number[] | null
  /** Non-increasing `d-(x)`. `null` on an undirected graph. */
  inDegreeSequence: number[] | null
  /** 1-based `d(x)`. Index 0 is unused. */
  degreeByNode: number[]
  outDegreeByNode: number[] | null
  inDegreeByNode: number[] | null
  /** Distinct neighbors other than the node itself. Loops are excluded. 1-based. */
  simpleDegreeByNode: number[]
  sumOfDegrees: number
  sumOfDegreesExplanation: string
  isolatedNodes: number[]
  pendantNodes: number[]
  maxDegree: number
  maxDegreeNodes: number[]
  /** Weak components. This is the `nrc` used by `minEdgesToConnect = nrc - 1`. */
  connectedComponentsCount: number
  strongComponentsCount: number
  /** 1-based weak component id. Index 0 is unused. */
  weakComponentOf: number[]
  /** 1-based strong component id. On an undirected graph this matches the weak id. */
  strongComponentOf: number[]
  /**
   * Undirected: the graph is connected.
   * Directed: the graph is strongly connected (tare conex).
   */
  isConnected: boolean
  isWeaklyConnected: boolean
  isStronglyConnected: boolean
  connectivityExplanation: string
  minEdgesToConnect: number
  minEdgesToConnectExplanation: string
  isTree: boolean
  treeExplanation: string
  /** `m - (n - 1)` when the (support) graph is connected. Otherwise `null`. */
  edgesToRemoveForSpanningTree: number | null
  spanningTreeExplanation: string
  isEulerian: boolean
  /** Closed or open trail that uses every edge once. A circuit counts as a trail. */
  hasEulerianTrail: boolean
  eulerianExplanation: string
  /** Nodes that break the degree condition: odd degree, or `d+(x) !== d-(x)`. */
  eulerianViolators: number[]
  /** Closed walk `start -> … -> start`. `null` when there is no Eulerian circuit. */
  eulerianCycle: number[] | null
  eulerianCycleEdgeIds: string[] | null
  /** Open trail. `null` when the Eulerian walk is a circuit, or when no trail exists. */
  eulerianTrail: number[] | null
  eulerianTrailEdgeIds: string[] | null
  diracSatisfied: boolean
  oreSatisfied: boolean
  diracViolators: number[]
  oreViolationCount: number
  oreViolatingPair: OreViolation | null
  diracExplanation: string
  oreExplanation: string
  isHamiltonian: boolean
  /** `false` only when `n` is too large and neither the search nor a theorem decided. */
  hamiltonianDetermined: boolean
  hamiltonianExplanation: string
  hamiltonianCycle: number[] | null
  hamiltonianCycleEdgeIds: string[] | null
  hamiltonianPath: number[] | null
  hamiltonianPathEdgeIds: string[] | null
  hamiltonianPathDetermined: boolean
  isAcyclic: boolean
  acyclicExplanation: string
  isBipartite: boolean
  bipartiteExplanation: string
  partitionA: number[]
  partitionB: number[]
}

interface Link {
  to: number
  id: string
}

interface IndexedGraph {
  n: number
  m: number
  loopCount: number
  supportM: number
  support: number[][]
  outgoing: number[][]
  incoming: number[][]
  tourLinks: Link[][]
  edgeIds: string[]
}

interface Walk {
  nodes: number[]
  edgeIds: string[]
}

interface Frame {
  node: number
  via: string | null
}

type SearchHit = { status: 'found'; nodes: number[] } | { status: 'absent' } | { status: 'budget' }

/** Exact Held-Karp search stays tiny and uses only safe 32-bit masks. */
const EXACT_HAMILTON_LIMIT = 16
/** Above this, only Dirac / Ore are evaluated. Backtracking would freeze the canvas. */
const BACKTRACK_HAMILTON_LIMIT = 28
const BACKTRACK_BUDGET = 80_000

/** Analyze `graph` from scratch. Safe to call on every structural edit. */
export function analyzeGraph(graph: GraphStateData): BacGraphReport {
  const indexed = indexGraph(graph)
  const n = indexed.n
  const directed = graph.isDirected
  const degrees = readDegrees(graph, n)
  const simpleDegreeByNode = Array<number>(n + 1).fill(0)
  for (let node = 1; node <= n; node += 1) simpleDegreeByNode[node] = indexed.support[node]?.length ?? 0

  const weakComponents = collectComponents(n, indexed.support)
  const strongComponents = directed ? stronglyConnectedComponents(indexed) : weakComponents.map((members) => members.slice())
  const weakComponentOf = assignComponents(n, weakComponents)
  const strongComponentOf = assignComponents(n, strongComponents)
  const weakCount = weakComponents.length
  const strongCount = strongComponents.length
  const isWeaklyConnected = n > 0 && weakCount === 1
  const isStronglyConnected = n > 0 && strongCount === 1
  const isConnected = directed ? isStronglyConnected : isWeaklyConnected

  const degreeList = degrees.total.slice(1)
  const sumOfDegrees = degreeList.reduce((sum, value) => sum + value, 0)
  const maxDegree = n === 0 ? 0 : Math.max(...degreeList)
  const isolatedNodes: number[] = []
  const pendantNodes: number[] = []
  const maxDegreeNodes: number[] = []
  for (let node = 1; node <= n; node += 1) {
    const degree = degrees.total[node] ?? 0
    if (degree === 0) isolatedNodes.push(node)
    if (degree === 1) pendantNodes.push(node)
    if (degree === maxDegree) maxDegreeNodes.push(node)
  }

  const maxPossibleEdges = directed ? n * (n - 1) : (n * (n - 1)) / 2
  const simplePairs = countSimplePairs(indexed, directed)
  const edgesNeededForComplete = Math.max(0, maxPossibleEdges - simplePairs)
  const isComplete = n >= 1 && indexed.loopCount === 0 && edgesNeededForComplete === 0

  const supportCyclic = hasUndirectedCycle(n, indexed.support, indexed.loopCount)
  const orientedCyclic = directed ? hasDirectedCycle(n, indexed.outgoing) : supportCyclic
  const isAcyclic = !orientedCyclic
  const isTree = !directed && isWeaklyConnected && indexed.m === n - 1 && !supportCyclic
  const supportIsTree = isWeaklyConnected && indexed.supportM === n - 1 && !supportCyclic
  const minEdgesToConnect = n === 0 ? 0 : Math.max(0, weakCount - 1)

  const oddNodes: number[] = []
  const unbalanced: number[] = []
  let trailStarts = 0
  let trailEnds = 0
  let trailBad = 0
  for (let node = 1; node <= n; node += 1) {
    const degree = degrees.total[node] ?? 0
    if (!directed && degree % 2 === 1) oddNodes.push(node)
    const outDegree = degrees.out[node] ?? 0
    const inDegree = degrees.in[node] ?? 0
    if (directed && outDegree !== inDegree) unbalanced.push(node)
    if (directed) {
      const delta = outDegree - inDegree
      if (delta === 1) trailStarts += 1
      else if (delta === -1) trailEnds += 1
      else if (delta !== 0) trailBad += 1
    }
  }

  const weakCore = coreIsConnected(n, indexed.m, weakComponentOf, degrees.total)
  const strongCore = coreIsConnected(n, indexed.m, strongComponentOf, degrees.total)
  const balanced = directed ? unbalanced.length === 0 : oddNodes.length === 0
  const openTrailDegrees = directed
    ? trailStarts === 1 && trailEnds === 1 && trailBad === 0
    : oddNodes.length === 2
  const trivialEuler = n === 1 && indexed.m === 0
  const isEulerian = trivialEuler || (indexed.m > 0 && balanced && (directed ? strongCore : weakCore))
  const hasEulerianTrail =
    isEulerian || (indexed.m > 0 && weakCore && (directed ? openTrailDegrees : openTrailDegrees))

  const eulerianViolators = directed ? unbalanced : oddNodes
  let eulerianCycle: number[] | null = null
  let eulerianCycleEdgeIds: string[] | null = null
  let eulerianTrail: number[] | null = null
  let eulerianTrailEdgeIds: string[] | null = null
  if (isEulerian && indexed.m > 0) {
    const start = firstPositiveDegree(degrees.total, n)
    const tour = start === 0 ? null : hierholzer(indexed.tourLinks, indexed.edgeIds, start)
    if (tour && tour.nodes[0] === tour.nodes[tour.nodes.length - 1]) {
      eulerianCycle = tour.nodes
      eulerianCycleEdgeIds = tour.edgeIds
    }
  } else if (hasEulerianTrail && indexed.m > 0) {
    const start = directed ? firstTrailStart(degrees) : (oddNodes[0] ?? 0)
    const tour = start === 0 ? null : hierholzer(indexed.tourLinks, indexed.edgeIds, start)
    if (tour && tour.nodes[0] !== tour.nodes[tour.nodes.length - 1]) {
      eulerianTrail = tour.nodes
      eulerianTrailEdgeIds = tour.edgeIds
    }
  }

  const dirac = evaluateDirac(n, simpleDegreeByNode)
  const ore = evaluateOre(n, indexed.support, simpleDegreeByNode)
  const hamilton = findHamilton(indexed, directed, isWeaklyConnected, strongCount, dirac.satisfied, ore.satisfied)
  const bipartite = colorPartitions(n, indexed.support, indexed.loopCount)
  const spanning = describeSpanningTree(n, indexed.m, indexed.supportM, isWeaklyConnected, directed, minEdgesToConnect)
  const totals = describeTotalGraphs(n)

  return {
    n,
    m: indexed.m,
    isDirected: directed,
    maxPossibleEdges,
    edgesNeededForComplete,
    isComplete,
    isCompleteExplanation: describeComplete(n, directed, isComplete, edgesNeededForComplete, maxPossibleEdges, indexed.loopCount),
    totalGraphsWithN: totals,
    degreeSequence: sortedDescending(degreeList),
    outDegreeSequence: directed ? sortedDescending(degrees.out.slice(1)) : null,
    inDegreeSequence: directed ? sortedDescending(degrees.in.slice(1)) : null,
    degreeByNode: degrees.total,
    outDegreeByNode: directed ? degrees.out : null,
    inDegreeByNode: directed ? degrees.in : null,
    simpleDegreeByNode,
    sumOfDegrees,
    sumOfDegreesExplanation: describeHandshaking(directed, sumOfDegrees, indexed.m, degrees),
    isolatedNodes,
    pendantNodes,
    maxDegree,
    maxDegreeNodes,
    connectedComponentsCount: weakCount,
    strongComponentsCount: strongCount,
    weakComponentOf,
    strongComponentOf,
    isConnected,
    isWeaklyConnected,
    isStronglyConnected,
    connectivityExplanation: describeConnectivity(directed, isWeaklyConnected, isStronglyConnected, weakCount, strongCount, weakComponents, strongComponents),
    minEdgesToConnect,
    minEdgesToConnectExplanation: describeMinEdges(n, weakCount, minEdgesToConnect, directed, isWeaklyConnected),
    isTree,
    treeExplanation: describeTree(directed, isTree, isWeaklyConnected, supportCyclic, indexed.m, n, weakCount, supportIsTree),
    edgesToRemoveForSpanningTree: spanning.value,
    spanningTreeExplanation: spanning.text,
    isEulerian,
    hasEulerianTrail,
    eulerianExplanation: describeEuler(
      directed,
      isEulerian,
      hasEulerianTrail,
      eulerianViolators,
      isolatedNodes,
      weakCore,
      strongCore,
      indexed.m,
      n,
      eulerianCycle,
      eulerianTrail,
    ),
    eulerianViolators,
    eulerianCycle,
    eulerianCycleEdgeIds,
    eulerianTrail,
    eulerianTrailEdgeIds,
    diracSatisfied: dirac.satisfied,
    oreSatisfied: ore.satisfied,
    diracViolators: dirac.violators,
    oreViolationCount: ore.violationCount,
    oreViolatingPair: ore.example,
    diracExplanation: dirac.explanation,
    oreExplanation: ore.explanation,
    isHamiltonian: hamilton.isHamiltonian,
    hamiltonianDetermined: hamilton.determined,
    hamiltonianExplanation: describeHamilton(directed, hamilton, dirac.satisfied, n),
    hamiltonianCycle: hamilton.cycle,
    hamiltonianCycleEdgeIds: hamilton.cycleEdges,
    hamiltonianPath: hamilton.path,
    hamiltonianPathEdgeIds: hamilton.pathEdges,
    hamiltonianPathDetermined: hamilton.pathDetermined,
    isAcyclic,
    acyclicExplanation: directed
      ? orientedCyclic
        ? 'Graful conține cel puțin un circuit, deci nu este aciclic.'
        : 'Graful nu conține circuite, deci este aciclic.'
      : supportCyclic
        ? 'Graful conține cel puțin un ciclu, deci nu este aciclic.'
        : 'Graful nu conține cicluri, deci este aciclic.',
    isBipartite: bipartite.ok,
    bipartiteExplanation: describeBipartite(directed, bipartite.ok, bipartite.a, bipartite.b),
    partitionA: bipartite.a,
    partitionB: bipartite.b,
  }
}

function indexGraph(graph: GraphStateData): IndexedGraph {
  const n = graphSize(graph.nodes)
  const supportSets = Array.from({ length: n + 1 }, () => new Set<number>())
  const outgoing: number[][] = Array.from({ length: n + 1 }, () => [])
  const incoming: number[][] = Array.from({ length: n + 1 }, () => [])
  const undirectedLinks: Link[][] = Array.from({ length: n + 1 }, () => [])
  const directedLinks: Link[][] = Array.from({ length: n + 1 }, () => [])
  const seen = new Set<string>()
  const supportSeen = new Set<string>()
  const edgeIds: string[] = []
  let m = 0
  let loopCount = 0
  let supportM = 0

  for (const edge of graph.edges) {
    if (!inRange(edge.source, n) || !inRange(edge.target, n)) continue
    const key = edgeKey(edge.source, edge.target, graph.isDirected)
    if (seen.has(key)) continue
    seen.add(key)
    m += 1
    edgeIds.push(edge.id)
    const loop = edge.source === edge.target
    if (loop) loopCount += 1

    const supportKey = edgeKey(edge.source, edge.target, false)
    if (!supportSeen.has(supportKey)) {
      supportSeen.add(supportKey)
      supportM += 1
      if (!loop) {
        supportSets[edge.source]?.add(edge.target)
        supportSets[edge.target]?.add(edge.source)
      }
    }

    if (graph.isDirected) {
      outgoing[edge.source]?.push(edge.target)
      incoming[edge.target]?.push(edge.source)
      directedLinks[edge.source]?.push({ to: edge.target, id: edge.id })
    } else {
      undirectedLinks[edge.source]?.push({ to: edge.target, id: edge.id })
      if (!loop) undirectedLinks[edge.target]?.push({ to: edge.source, id: edge.id })
    }
  }

  for (const list of outgoing) list.sort((left, right) => left - right)
  for (const list of incoming) list.sort((left, right) => left - right)
  const support = supportSets.map((set) => [...set].sort((left, right) => left - right))

  return {
    n,
    m,
    loopCount,
    supportM,
    support,
    outgoing,
    incoming,
    tourLinks: graph.isDirected ? directedLinks : undirectedLinks,
    edgeIds,
  }
}

function readDegrees(
  graph: GraphStateData,
  n: number,
): { total: number[]; out: number[]; in: number[] } {
  const record = computeNodeDegrees(graph)
  const total = Array<number>(n + 1).fill(0)
  const out = Array<number>(n + 1).fill(0)
  const incoming = Array<number>(n + 1).fill(0)
  for (let node = 1; node <= n; node += 1) {
    const entry = record[node]
    total[node] = entry?.degree ?? 0
    out[node] = entry?.outDegree ?? 0
    incoming[node] = entry?.inDegree ?? 0
  }
  return { total, out, in: incoming }
}

function countSimplePairs(indexed: IndexedGraph, directed: boolean): number {
  if (!directed) return indexed.supportM - indexed.loopCount
  let arcs = 0
  for (let node = 1; node <= indexed.n; node += 1) {
    for (const target of indexed.outgoing[node] ?? []) {
      if (target !== node) arcs += 1
    }
  }
  return arcs
}

function collectComponents(n: number, neighbors: readonly number[][]): number[][] {
  const seen = new Uint8Array(n + 1)
  const components: number[][] = []
  const stack: number[] = []
  for (let start = 1; start <= n; start += 1) {
    if (seen[start]) continue
    const members: number[] = []
    stack.push(start)
    seen[start] = 1
    while (stack.length > 0) {
      const node = stack.pop()
      if (node === undefined) break
      members.push(node)
      for (const next of neighbors[node] ?? []) {
        if (seen[next]) continue
        seen[next] = 1
        stack.push(next)
      }
    }
    members.sort((left, right) => left - right)
    components.push(members)
  }
  components.sort((left, right) => (left[0] ?? 0) - (right[0] ?? 0))
  return components
}

function stronglyConnectedComponents(indexed: IndexedGraph): number[][] {
  const order = finishOrder(indexed.n, indexed.outgoing)
  const seen = new Uint8Array(indexed.n + 1)
  const components: number[][] = []
  for (let index = order.length - 1; index >= 0; index -= 1) {
    const start = order[index]
    if (start === undefined || seen[start]) continue
    const members: number[] = []
    const stack: { node: number; nextIndex: number }[] = [{ node: start, nextIndex: 0 }]
    seen[start] = 1
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      if (!frame) break
      const adjacent = indexed.incoming[frame.node] ?? []
      if (frame.nextIndex >= adjacent.length) {
        members.push(frame.node)
        stack.pop()
        continue
      }
      const next = adjacent[frame.nextIndex] ?? 0
      frame.nextIndex += 1
      if (next === 0 || next === frame.node || seen[next]) continue
      seen[next] = 1
      stack.push({ node: next, nextIndex: 0 })
    }
    members.sort((left, right) => left - right)
    components.push(members)
  }
  components.sort((left, right) => (left[0] ?? 0) - (right[0] ?? 0))
  return components
}

function finishOrder(n: number, outgoing: readonly number[][]): number[] {
  const seen = new Uint8Array(n + 1)
  const order: number[] = []
  const stack: { node: number; nextIndex: number }[] = []
  for (let start = 1; start <= n; start += 1) {
    if (seen[start]) continue
    seen[start] = 1
    stack.push({ node: start, nextIndex: 0 })
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      if (!frame) break
      const adjacent = outgoing[frame.node] ?? []
      if (frame.nextIndex >= adjacent.length) {
        order.push(frame.node)
        stack.pop()
        continue
      }
      const next = adjacent[frame.nextIndex] ?? 0
      frame.nextIndex += 1
      if (next === 0 || next === frame.node || seen[next]) continue
      seen[next] = 1
      stack.push({ node: next, nextIndex: 0 })
    }
  }
  return order
}

function assignComponents(n: number, components: readonly number[][]): number[] {
  const ids = Array<number>(n + 1).fill(0)
  components.forEach((members, index) => {
    const id = index + 1
    for (const node of members) ids[node] = id
  })
  return ids
}

function hasUndirectedCycle(n: number, neighbors: readonly number[][], loopCount: number): boolean {
  if (loopCount > 0) return true
  const seen = new Uint8Array(n + 1)
  const parent = new Int32Array(n + 1)
  const stack: number[] = []
  for (let start = 1; start <= n; start += 1) {
    if (seen[start]) continue
    seen[start] = 1
    parent[start] = 0
    stack.push(start)
    while (stack.length > 0) {
      const node = stack.pop()
      if (node === undefined) break
      for (const next of neighbors[node] ?? []) {
        if (next === parent[node]) continue
        if (seen[next]) return true
        seen[next] = 1
        parent[next] = node
        stack.push(next)
      }
    }
  }
  return false
}

function hasDirectedCycle(n: number, outgoing: readonly number[][]): boolean {
  const color = new Uint8Array(n + 1)
  const stack: { node: number; nextIndex: number }[] = []
  for (let start = 1; start <= n; start += 1) {
    if (color[start] !== 0) continue
    color[start] = 1
    stack.push({ node: start, nextIndex: 0 })
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      if (!frame) break
      const adjacent = outgoing[frame.node] ?? []
      if (frame.nextIndex >= adjacent.length) {
        color[frame.node] = 2
        stack.pop()
        continue
      }
      const next = adjacent[frame.nextIndex] ?? 0
      frame.nextIndex += 1
      if (next === 0) continue
      const shade = color[next] ?? 0
      if (shade === 1) return true
      if (shade === 0) {
        color[next] = 1
        stack.push({ node: next, nextIndex: 0 })
      }
    }
  }
  return false
}

function colorPartitions(
  n: number,
  neighbors: readonly number[][],
  loopCount: number,
): { ok: boolean; a: number[]; b: number[] } {
  if (loopCount > 0) return { ok: false, a: [], b: [] }
  const color = new Int8Array(n + 1)
  const queue: number[] = []
  for (let start = 1; start <= n; start += 1) {
    if (color[start] !== 0) continue
    color[start] = 1
    queue.push(start)
    for (let cursor = queue.length - 1; cursor < queue.length; cursor += 1) {
      const node = queue[cursor]
      if (node === undefined) continue
      for (const next of neighbors[node] ?? []) {
        const shade = color[next] ?? 0
        if (shade === 0) {
          color[next] = color[node] === 1 ? 2 : 1
          queue.push(next)
          continue
        }
        if (shade === color[node]) return { ok: false, a: [], b: [] }
      }
    }
  }
  const a: number[] = []
  const b: number[] = []
  for (let node = 1; node <= n; node += 1) {
    if (color[node] === 1) a.push(node)
    else if (color[node] === 2) b.push(node)
  }
  return { ok: true, a, b }
}

function coreIsConnected(n: number, m: number, componentOf: readonly number[], degree: readonly number[]): boolean {
  if (m === 0) return n === 1
  let component = 0
  for (let node = 1; node <= n; node += 1) {
    if ((degree[node] ?? 0) === 0) continue
    const id = componentOf[node] ?? 0
    if (component === 0) component = id
    else if (id !== component) return false
  }
  return component !== 0
}

function firstPositiveDegree(degree: readonly number[], n: number): number {
  for (let node = 1; node <= n; node += 1) {
    if ((degree[node] ?? 0) > 0) return node
  }
  return 0
}

function firstTrailStart(degrees: { out: number[]; in: number[] }): number {
  const n = degrees.out.length - 1
  for (let node = 1; node <= n; node += 1) {
    if ((degrees.out[node] ?? 0) === (degrees.in[node] ?? 0) + 1) return node
  }
  return 0
}

/** Hierholzer. The unused-edge multiset is the adjacency of `links`. */
function hierholzer(links: readonly Link[][], edgeIds: readonly string[], start: number): Walk | null {
  if (start <= 0 || edgeIds.length === 0) return null
  const alive = new Set(edgeIds)
  const unused = links.map((list) => list.slice().sort((left, right) => right.to - left.to || (left.id < right.id ? 1 : -1)))
  const stack: Frame[] = [{ node: start, via: null }]
  const circuit: Frame[] = []

  const nextEdge = (node: number): Link | null => {
    const list = unused[node]
    if (!list) return null
    while (list.length > 0) {
      const edge = list.pop()
      if (edge && alive.has(edge.id)) return edge
    }
    return null
  }

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]
    if (!frame) break
    const edge = nextEdge(frame.node)
    if (!edge) {
      const popped = stack.pop()
      if (popped) circuit.push(popped)
      continue
    }
    alive.delete(edge.id)
    stack.push({ node: edge.to, via: edge.id })
  }

  if (alive.size !== 0) return null
  circuit.reverse()
  const nodes = circuit.map((frame) => frame.node)
  const usedEdges: string[] = []
  for (let index = 1; index < circuit.length; index += 1) {
    const via = circuit[index]?.via
    if (!via) return null
    usedEdges.push(via)
  }
  if (usedEdges.length !== edgeIds.length || nodes.length !== edgeIds.length + 1) return null
  return { nodes, edgeIds: usedEdges }
}

interface HamiltonSearch {
  isHamiltonian: boolean
  determined: boolean
  cycle: number[] | null
  cycleEdges: string[] | null
  path: number[] | null
  pathEdges: string[] | null
  pathDetermined: boolean
}

function findHamilton(
  indexed: IndexedGraph,
  directed: boolean,
  weaklyConnected: boolean,
  strongCount: number,
  diracSatisfied: boolean,
  oreSatisfied: boolean,
): HamiltonSearch {
  const n = indexed.n
  const empty: HamiltonSearch = {
    isHamiltonian: false,
    determined: true,
    cycle: null,
    cycleEdges: null,
    path: null,
    pathEdges: null,
    pathDetermined: true,
  }
  if (n === 0) return empty
  if (n === 1) {
    return { ...empty, path: [1], pathEdges: [] }
  }
  if (!weaklyConnected) return empty

  const neighbors = hamiltonNeighbors(indexed.tourLinks)
  const cycleBlocked = cycleIsImpossible(indexed, directed, strongCount)
  let cycleNodes: number[] | null = null
  let cycleDetermined = cycleBlocked || n < 3
  if (!cycleBlocked && n >= 3 && n <= EXACT_HAMILTON_LIMIT) {
    cycleNodes = exactCycle(neighbors, indexed.tourLinks, n)
    cycleDetermined = true
  } else if (!cycleBlocked && n >= 3 && n <= BACKTRACK_HAMILTON_LIMIT) {
    const hit = backtrackCycle(neighbors, indexed.tourLinks, n, BACKTRACK_BUDGET)
    if (hit.status === 'found') {
      cycleNodes = hit.nodes
      cycleDetermined = true
    } else if (hit.status === 'absent') {
      cycleDetermined = true
    }
  }

  const cycleEdges = cycleNodes ? edgesForWalk(indexed.tourLinks, cycleNodes) : null
  const cycle = cycleEdges ? cycleNodes : null
  if (cycleNodes && !cycleEdges) cycleDetermined = true

  let pathNodes: number[] | null = cycle ? cycle.slice(0, -1) : null
  let pathDetermined = cycle !== null
  if (!pathNodes && n <= EXACT_HAMILTON_LIMIT) {
    pathNodes = exactPath(neighbors, n)
    pathDetermined = true
  } else if (!pathNodes && n <= BACKTRACK_HAMILTON_LIMIT) {
    const hit = backtrackPath(neighbors, n, BACKTRACK_BUDGET)
    if (hit.status === 'found') {
      pathNodes = hit.nodes
      pathDetermined = true
    } else if (hit.status === 'absent') {
      pathDetermined = true
    }
  }
  const pathEdges = pathNodes ? edgesForWalk(indexed.tourLinks, pathNodes) : null
  const path = pathEdges ? pathNodes : null
  if (pathNodes && !pathEdges) pathDetermined = true

  const theorem = !directed && (diracSatisfied || oreSatisfied)
  let isHamiltonian = false
  let determined = cycleDetermined
  if (cycle) {
    isHamiltonian = true
    determined = true
  } else if (cycleDetermined) {
    isHamiltonian = false
    determined = true
  } else if (theorem) {
    isHamiltonian = true
    determined = true
  }

  return {
    isHamiltonian,
    determined,
    cycle,
    cycleEdges: cycle ? cycleEdges : null,
    path,
    pathEdges: path ? pathEdges : null,
    pathDetermined,
  }
}

function cycleIsImpossible(indexed: IndexedGraph, directed: boolean, strongCount: number): boolean {
  if (indexed.n < 3) return true
  if (directed && strongCount !== 1) return true
  for (let node = 1; node <= indexed.n; node += 1) {
    if (!directed) {
      if ((indexed.support[node]?.length ?? 0) < 2) return true
      continue
    }
    const outNeighbors = (indexed.outgoing[node] ?? []).filter((target) => target !== node)
    const inNeighbors = (indexed.incoming[node] ?? []).filter((target) => target !== node)
    if (outNeighbors.length < 1 || inNeighbors.length < 1) return true
  }
  return false
}

function hamiltonNeighbors(links: readonly Link[][]): number[][] {
  return links.map((list, index) => {
    const unique = new Set<number>()
    for (const link of list) {
      if (link.to !== index) unique.add(link.to)
    }
    return [...unique].sort((left, right) => left - right)
  })
}

function exactCycle(neighbors: readonly number[][], links: readonly Link[][], n: number): number[] | null {
  const found = heldKarp(neighbors, n, false)
  if (!found) return null
  const end = found[found.length - 1]
  const start = found[0]
  if (end === undefined || start === undefined || !hasLink(links, end, start)) return null
  return [...found, start]
}

function exactPath(neighbors: readonly number[][], n: number): number[] | null {
  return heldKarp(neighbors, n, true)
}

function heldKarp(neighbors: readonly number[][], n: number, anyStart: boolean): number[] | null {
  if (n > EXACT_HAMILTON_LIMIT || n < 1) return null
  const full = (1 << n) - 1
  const stride = n + 1
  const reach = new Uint8Array((full + 1) * stride)
  const parent = new Int16Array((full + 1) * stride)
  if (anyStart) {
    for (let node = 1; node <= n; node += 1) reach[(1 << (node - 1)) * stride + node] = 1
  } else {
    reach[1 * stride + 1] = 1
  }

  for (let mask = 0; mask <= full; mask += 1) {
    for (let node = 1; node <= n; node += 1) {
      if (reach[mask * stride + node] !== 1) continue
      for (const next of neighbors[node] ?? []) {
        const bit = 1 << (next - 1)
        if ((mask & bit) !== 0) continue
        const nextMask = mask | bit
        const index = nextMask * stride + next
        if (reach[index] === 1) continue
        reach[index] = 1
        parent[index] = node
      }
    }
  }

  let end = 0
  for (let node = 1; node <= n; node += 1) {
    if (reach[full * stride + node] === 1) {
      end = node
      break
    }
  }
  if (end === 0) return null

  const reversed: number[] = []
  let mask = full
  let node = end
  for (let guard = 0; guard <= n && node !== 0; guard += 1) {
    reversed.push(node)
    const previous = parent[mask * stride + node] ?? 0
    mask ^= 1 << (node - 1)
    node = previous
  }
  reversed.reverse()
  return coversAll(reversed, n) ? reversed : null
}

function backtrackCycle(
  neighbors: readonly number[][],
  links: readonly Link[][],
  n: number,
  budget: number,
): SearchHit {
  const used = new Uint8Array(n + 1)
  const path = [1]
  used[1] = 1
  let left = budget
  const walk = (depth: number): SearchHit => {
    if (left <= 0) return { status: 'budget' }
    left -= 1
    if (depth === n) {
      const last = path[n - 1]
      if (last !== undefined && hasLink(links, last, 1)) return { status: 'found', nodes: [...path, 1] }
      return { status: 'absent' }
    }
    const node = path[depth - 1]
    if (node === undefined) return { status: 'absent' }
    for (const next of neighbors[node] ?? []) {
      if (used[next]) continue
      used[next] = 1
      path.push(next)
      const result = walk(depth + 1)
      if (result.status !== 'absent') return result
      path.pop()
      used[next] = 0
    }
    return { status: 'absent' }
  }
  return walk(1)
}

function backtrackPath(neighbors: readonly number[][], n: number, budget: number): SearchHit {
  const used = new Uint8Array(n + 1)
  const path: number[] = []
  let left = budget
  const walk = (depth: number): SearchHit => {
    if (left <= 0) return { status: 'budget' }
    left -= 1
    if (depth === n) return { status: 'found', nodes: path.slice() }
    const node = path[depth - 1]
    if (node === undefined) return { status: 'absent' }
    for (const next of neighbors[node] ?? []) {
      if (used[next]) continue
      used[next] = 1
      path.push(next)
      const result = walk(depth + 1)
      if (result.status !== 'absent') return result
      path.pop()
      used[next] = 0
    }
    return { status: 'absent' }
  }
  for (let start = 1; start <= n; start += 1) {
    used.fill(0)
    path.length = 0
    used[start] = 1
    path.push(start)
    const result = walk(1)
    if (result.status === 'found') return result
    if (result.status === 'budget') return result
  }
  return { status: 'absent' }
}

function edgesForWalk(links: readonly Link[][], walk: readonly number[]): string[] | null {
  const used = new Set<string>()
  const ids: string[] = []
  for (let index = 0; index < walk.length - 1; index += 1) {
    const from = walk[index]
    const to = walk[index + 1]
    if (from === undefined || to === undefined) return null
    const edge = (links[from] ?? []).find((link) => link.to === to && !used.has(link.id))
    if (!edge) return null
    used.add(edge.id)
    ids.push(edge.id)
  }
  return ids
}

function hasLink(links: readonly Link[][], from: number, to: number): boolean {
  for (const link of links[from] ?? []) {
    if (link.to === to) return true
  }
  return false
}

function coversAll(nodes: readonly number[], n: number): boolean {
  if (nodes.length !== n) return false
  const seen = new Set(nodes)
  if (seen.size !== n) return false
  for (let id = 1; id <= n; id += 1) {
    if (!seen.has(id)) return false
  }
  return true
}

function evaluateDirac(n: number, simpleDegree: readonly number[]): { satisfied: boolean; violators: number[]; explanation: string } {
  if (n < 3) {
    return {
      satisfied: false,
      violators: [],
      explanation: `Teorema lui Dirac: dacă n ≥ 3 și d(x) ≥ n / 2 pentru orice nod x, atunci graful neorientat este hamiltonian. Aici n = ${n}, deci ipoteza nu se aplică. Condiția este suficientă, nu necesară.`,
    }
  }
  const violators: number[] = []
  for (let node = 1; node <= n; node += 1) {
    if ((simpleDegree[node] ?? 0) * 2 < n) violators.push(node)
  }
  const threshold = n % 2 === 0 ? String(n / 2) : `${n}/2`
  if (violators.length === 0) {
    return {
      satisfied: true,
      violators,
      explanation: `Teorema lui Dirac este îndeplinită: n = ${n} ≥ 3 și fiecare nod are d(x) ≥ n / 2 = ${threshold}. Condiția este suficientă pentru un ciclu hamiltonian în graful neorientat, nu necesară.`,
    }
  }
  return {
    satisfied: false,
    violators,
    explanation: `Teorema lui Dirac nu este îndeplinită: n / 2 = ${threshold}, iar nodurile ${formatSet(violators)} au d(x) < n / 2. Condiția este suficientă, nu necesară, deci absența ei nu dovedește că graful nu este hamiltonian.`,
  }
}

function evaluateOre(
  n: number,
  support: readonly number[][],
  simpleDegree: readonly number[],
): { satisfied: boolean; violationCount: number; example: OreViolation | null; explanation: string } {
  if (n < 3) {
    return {
      satisfied: false,
      violationCount: 0,
      example: null,
      explanation: `Teorema lui Ore: dacă n ≥ 3 și d(u) + d(v) ≥ n pentru orice pereche de noduri neadiacente, atunci graful neorientat este hamiltonian. Aici n = ${n}, deci ipoteza nu se aplică.`,
    }
  }
  const adjacent = new Set<string>()
  for (let node = 1; node <= n; node += 1) {
    for (const next of support[node] ?? []) {
      if (next <= node) continue
      adjacent.add(`${node}-${next}`)
    }
  }
  let violationCount = 0
  let example: OreViolation | null = null
  for (let left = 1; left <= n; left += 1) {
    for (let right = left + 1; right <= n; right += 1) {
      if (adjacent.has(`${left}-${right}`)) continue
      const degreeSum = (simpleDegree[left] ?? 0) + (simpleDegree[right] ?? 0)
      if (degreeSum >= n) continue
      violationCount += 1
      if (!example) example = { u: left, v: right, degreeSum }
    }
  }
  if (violationCount === 0) {
    return {
      satisfied: true,
      violationCount: 0,
      example: null,
      explanation: `Teorema lui Ore este îndeplinită: n = ${n} ≥ 3 și d(u) + d(v) ≥ n pentru orice pereche de noduri neadiacente. Condiția este suficientă pentru un ciclu hamiltonian în graful neorientat, nu necesară.`,
    }
  }
  const sample = example
    ? ` De exemplu, nodurile ${example.u} și ${example.v} nu sunt adiacente și d(${example.u}) + d(${example.v}) = ${example.degreeSum} < ${n}.`
    : ''
  const countText = violationCount === 1 ? 'o pereche neadiacentă încalcă' : `${violationCount} perechi neadiacente încalcă`
  return {
    satisfied: false,
    violationCount,
    example,
    explanation: `Teorema lui Ore nu este îndeplinită: ${countText} condiția d(u) + d(v) ≥ n.${sample} Condiția este suficientă, nu necesară.`,
  }
}

function describeTotalGraphs(n: number): TotalGraphsWithN {
  const exponent = (n * (n - 1)) / 2
  const undirectedValue = exponent > 4096 ? `2^${exponent}` : (1n << BigInt(exponent)).toString()
  const undirectedGraphs = `2^(n*(n-1)/2) = 2^${exponent} = ${undirectedValue}`
  let labeledTrees: string
  if (n <= 0) labeledTrees = 'n^(n-2) se enunță pentru n ≥ 2.'
  else if (n === 1) labeledTrees = 'n^(n-2) se enunță pentru n ≥ 2. Pentru n = 1 există 1 arbore etichetat.'
  else if (n > 200) labeledTrees = `n^(n-2) = ${n}^(${n - 2})`
  else labeledTrees = `n^(n-2) = ${n}^(${n - 2}) = ${bigPow(BigInt(n), n - 2).toString()}`
  return {
    undirectedGraphs,
    labeledTrees,
    explanation:
      'Numărul grafurilor neorientate simple cu n noduri etichetate este 2^(n*(n-1)/2). Numărul arborilor etichetați cu n noduri este dat de formula lui Cayley, n^(n-2).',
  }
}

function describeComplete(
  n: number,
  directed: boolean,
  isComplete: boolean,
  missing: number,
  maxPossibleEdges: number,
  loopCount: number,
): string {
  if (n === 0) return 'Graful este vid. Numărul maxim de muchii este 0.'
  if (isComplete && !directed) return `Fiecare nod are gradul n - 1 = ${n - 1}.`
  if (isComplete && directed) {
    return `Fiecare nod are gradul exterior n - 1 = ${n - 1} și gradul interior n - 1 = ${n - 1}.`
  }
  const loops = loopCount > 0 ? ` Există ${loopCount === 1 ? 'o buclă' : `${loopCount} bucle`}, care nu intră în graful complet simplu.` : ''
  if (directed) {
    return `Lipsesc ${countLabel(missing, 'arc', 'arce')} până la graful complet orientat cu n*(n - 1) = ${maxPossibleEdges} arce.${loops}`
  }
  return `Lipsesc ${countLabel(missing, 'muchie', 'muchii')} până la graful complet K_${n}. Numărul maxim de muchii este n*(n - 1)/2 = ${maxPossibleEdges}.${loops}`
}

function describeHandshaking(
  directed: boolean,
  sumOfDegrees: number,
  m: number,
  degrees: { out: number[]; in: number[] },
): string {
  if (!directed) {
    return `Lema strângerii mâinilor (Euler): ∑ d(x) = 2m = ${sumOfDegrees}. Verificare: 2m = ${2 * m}.`
  }
  const outSum = degrees.out.reduce((sum, value) => sum + value, 0)
  const inSum = degrees.in.reduce((sum, value) => sum + value, 0)
  return `Pentru un graf orientat, ∑ d+(x) = ∑ d-(x) = m. Aici ∑ d+(x) = ${outSum} și ∑ d-(x) = ${inSum}, iar m = ${m}. Suma tuturor gradelor este ∑ d(x) = ∑ (d+(x) + d-(x)) = 2m = ${sumOfDegrees}.`
}

function describeConnectivity(
  directed: boolean,
  weak: boolean,
  strong: boolean,
  weakCount: number,
  strongCount: number,
  weakComponents: readonly number[][],
  strongComponents: readonly number[][],
): string {
  if (!directed) {
    if (weakCount === 0) return 'Graful este vid.'
    if (weak) return 'Graful este conex: nrc = 1.'
    return `Graful nu este conex: nrc = ${weakCount}. ${describeComponents(weakComponents)}.`
  }
  if (weakCount === 0) return 'Graful este vid.'
  const weakText = weak
    ? 'Suportul neorientat este conex (slab conex), nrc = 1.'
    : `Suportul neorientat nu este conex: nrc = ${weakCount}. ${describeComponents(weakComponents)}.`
  const strongText = strong
    ? 'Graful orientat este tare conex: o singură componentă tare conexă.'
    : `Graful orientat nu este tare conex: ${strongCount} componente tare conexe. ${describeComponents(strongComponents)}.`
  return `${weakText} ${strongText}`
}

function describeMinEdges(n: number, nrc: number, minEdges: number, directed: boolean, weak: boolean): string {
  if (n === 0) return 'Graful este vid.'
  const scope = directed ? 'componente conexe ale suportului neorientat' : 'componente conexe'
  if (weak) return `Graful este deja conex. Numărul minim de muchii de adăugat este nrc - 1 = 0.`
  return `Sunt nrc = ${nrc} ${scope}. Numărul minim de muchii care trebuie adăugate ca graful să devină conex este nrc - 1 = ${minEdges}.`
}

function describeTree(
  directed: boolean,
  isTree: boolean,
  connected: boolean,
  hasCycle: boolean,
  m: number,
  n: number,
  nrc: number,
  supportIsTree: boolean,
): string {
  if (n === 0) return 'Graful este vid, deci nu este arbore.'
  if (!directed) {
    if (isTree) return `Conex și m = n - 1 (${m} = ${n} - 1). Graful este arbore.`
    const reasons: string[] = []
    if (!connected) reasons.push(`Nu este conex (${nrc} componente conexe)`)
    if (hasCycle) reasons.push('Are cicluri')
    if (connected && !hasCycle && m !== n - 1) reasons.push(`m = ${m} diferă de n - 1 = ${n - 1}`)
    return `${reasons.join('. ')}. Graful nu este arbore.`
  }
  const support = supportIsTree
    ? 'Suportul neorientat este arbore: este conex și are m\' = n - 1.'
    : 'Suportul neorientat nu este arbore.'
  return `Graful este orientat. Un arbore, în definiția de la bacalaureat, este un graf neorientat conex și aciclic, cu m = n - 1. ${support}`
}

function describeSpanningTree(
  n: number,
  m: number,
  supportM: number,
  connected: boolean,
  directed: boolean,
  minEdges: number,
): { value: number | null; text: string } {
  if (n === 0) {
    return { value: null, text: 'Graful este vid, deci nu admite un arbore parțial.' }
  }
  if (!connected) {
    return {
      value: null,
      text: `Graful nu este conex, deci nu admite un arbore parțial. Mai întâi sunt necesare nrc - 1 = ${minEdges} muchii pentru conexitate.`,
    }
  }
  const value = supportM - (n - 1)
  const formula =
    directed && supportM !== m
      ? `Pe suportul neorientat, m' = ${supportM}. Numărul ciclomatic este m' - (n - 1) = ${supportM} - (${n} - 1) = ${value}.`
      : `Numărul ciclomatic este m - (n - 1) = ${supportM} - (${n} - 1) = ${value}.`
  const removed =
    value === 1 ? 'trebuie eliminată 1 muchie' : `trebuie eliminate ${value} muchii`
  return {
    value,
    text: `Graful este conex. ${formula} Pentru a obține un arbore parțial ${removed}.`,
  }
}

function describeEuler(
  directed: boolean,
  isEulerian: boolean,
  hasTrail: boolean,
  violators: readonly number[],
  isolated: readonly number[],
  weakCore: boolean,
  strongCore: boolean,
  m: number,
  n: number,
  cycle: readonly number[] | null,
  trail: readonly number[] | null,
): string {
  if (n === 0) return 'Graful este vid, deci nu este eulerian.'
  const theorem = directed
    ? 'Teorema lui Euler pentru grafuri orientate: există un circuit eulerian dacă, ignorând nodurile izolate, graful este tare conex și d+(x) = d-(x) pentru orice nod x.'
    : 'Teorema lui Euler: există un ciclu eulerian dacă, ignorând nodurile izolate, graful este conex și fiecare nod are grad par.'
  const degrees = directed ? directedViolatorSentence(violators) : oddSentence(violators)
  const ignored = isolated.length > 0 && m > 0 ? ` Nodurile izolate ${formatSet(isolated)} nu intră în ciclu.` : ''
  const link = directed
    ? strongCore
      ? 'Subgraful nodurilor de grad nenul este tare conex.'
      : 'Subgraful nodurilor de grad nenul nu este tare conex.'
    : weakCore
      ? 'Subgraful nodurilor de grad nenul este conex.'
      : 'Subgraful nodurilor de grad nenul nu este conex.'
  if (m === 0 && n === 1) {
    return `${theorem} Graful cu un singur nod și fără muchii este eulerian în sens trivial.${degrees}`
  }
  if (isEulerian && cycle) {
    return `${theorem} ${degrees} ${link}${ignored} Graful este eulerian. Ciclu eulerian: ${formatWalk(cycle)}.`
  }
  if (isEulerian) {
    return `${theorem} ${degrees} ${link}${ignored} Graful este eulerian.`
  }
  if (hasTrail && trail) {
    return `${theorem} ${degrees} ${link}${ignored} Există un lanț eulerian (${formatWalk(trail)}), dar nu un ciclu eulerian.`
  }
  if (hasTrail) {
    return `${theorem} ${degrees} ${link}${ignored} Graful admite un lanț eulerian, dar nu un ciclu eulerian.`
  }
  return `${theorem} ${degrees} ${link}${ignored} Graful nu este eulerian.`
}

function describeHamilton(
  directed: boolean,
  hamilton: HamiltonSearch,
  diracSatisfied: boolean,
  n: number,
): string {
  const diracNote = diracSatisfied
    ? 'Condiția suficientă a lui Dirac este îndeplinită.'
    : 'Condiția lui Dirac nu este îndeplinită; ea este doar suficientă și nu poate demonstra absența ciclului.'
  const orientation = directed ? ' Circuitul respectă orientarea arcelor.' : ''
  if (hamilton.cycle) {
    return `Există un ciclu hamiltonian: ${formatWalk(hamilton.cycle)}.${orientation} ${diracNote}`
  }
  if (!hamilton.determined) {
    const guarantee =
      !directed && diracSatisfied
        ? ' Teorema lui Dirac garantează totuși existența unui ciclu, fără a-i construi șirul de noduri.'
        : ''
    return `Pentru n = ${n} căutarea exactă nu a fost epuizată, deci ciclul hamiltonian nu este decis.${guarantee} ${diracNote}`
  }
  if (n < 3) {
    return `Un ciclu hamiltonian este definit pentru n ≥ 3. Aici n = ${n}. ${diracNote}`
  }
  const path = hamilton.path ? ` Există însă un lanț hamiltonian: ${formatWalk(hamilton.path)}.` : ''
  return `Nu există un ciclu hamiltonian.${path}${orientation} ${diracNote}`
}

function describeBipartite(directed: boolean, ok: boolean, a: readonly number[], b: readonly number[]): string {
  if (!ok) {
    return directed
      ? 'Graful orientat, privit fără orientarea arcelor, NU este bipartit: suportul conține un ciclu de lungime impară sau o buclă.'
      : 'Graful NU este bipartit: conține un ciclu de lungime impară sau o buclă.'
  }
  const prefix = directed
    ? 'Graful orientat, privit fără orientarea arcelor, este bipartit.'
    : 'Graful este bipartit.'
  return `${prefix} Mulțimea A = ${formatSet(a)}. Mulțimea B = ${formatSet(b)}.`
}

function describeComponents(components: readonly number[][]): string {
  const shown = components.slice(0, 8).map((members, index) => {
    const body = members.length > 12 ? `${members.slice(0, 12).join(', ')}, …` : members.join(', ')
    return `componenta ${index + 1}: {${body}}`
  })
  if (components.length > 8) shown.push(`încă ${components.length - 8} componente`)
  return shown.join('; ')
}

function oddSentence(ids: readonly number[]): string {
  if (ids.length === 0) return 'Toate nodurile au grad par.'
  if (ids.length === 1) return `Nodul ${String(ids[0])} are grad impar.`
  return `Nodurile ${formatSet(ids)} au grad impar.`
}

function directedViolatorSentence(ids: readonly number[]): string {
  if (ids.length === 0) return 'Toate nodurile au d+(x) = d-(x).'
  if (ids.length === 1) return `Nodul ${String(ids[0])} nu are d+(x) = d-(x).`
  return `Nodurile ${formatSet(ids)} nu au d+(x) = d-(x).`
}

function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function formatSet(ids: readonly number[]): string {
  if (ids.length === 0) return '∅'
  return `{${ids.join(', ')}}`
}

function formatWalk(nodes: readonly number[]): string {
  return nodes.join(' -> ')
}

function sortedDescending(values: readonly number[]): number[] {
  return values.slice().sort((left, right) => right - left)
}

function bigPow(base: bigint, exponent: number): bigint {
  if (exponent <= 0) return 1n
  let result = 1n
  let factor = base
  let exp = exponent
  while (exp > 0) {
    if (exp % 2 === 1) result *= factor
    exp = Math.floor(exp / 2)
    if (exp > 0) factor *= factor
  }
  return result
}

function inRange(id: number, n: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= n
}

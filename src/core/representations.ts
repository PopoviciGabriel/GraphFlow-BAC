import { applyCircularLayout, applyTreeLayout, DEFAULT_CANVAS_HEIGHT, DEFAULT_CANVAS_WIDTH } from './layout'
import type { GraphEdge, GraphNode, GraphStateData, NodeDegrees } from './types'

export interface AdjacencyNeighbor {
  target: number
  weight: number
}

/** Largest node id. BAC graphs keep this equal to the node count. */
export function graphSize(nodes: GraphNode[]): number {
  return nodes.reduce((max, node) => (node.id > max ? node.id : max), 0)
}

/**
 * Stable identity for an edge.
 * Undirected `(u, v)` shares a key with `(v, u)`. Directed edges stay ordered.
 */
export function edgeKey(source: number, target: number, isDirected: boolean): string {
  if (!isDirected && source !== target) {
    const low = Math.min(source, target)
    const high = Math.max(source, target)
    return `${low}--${high}`
  }
  return `${source}->${target}`
}

/**
 * (N + 1) × (N + 1) matrix. Row 0 and column 0 stay 0 so `a[1..N][1..N]`
 * matches the usual C++ declaration `int a[101][101]`.
 * Unweighted cells are 1 or 0. Weighted cells store the cost, or 0 when absent.
 */
export function toAdjacencyMatrix(graph: GraphStateData): number[][] {
  const n = graphSize(graph.nodes)
  const matrix = createMatrix(n)
  const seen = new Set<string>()

  for (const edge of graph.edges) {
    if (!inRange(edge.source, n) || !inRange(edge.target, n)) continue
    const key = edgeKey(edge.source, edge.target, graph.isDirected)
    if (seen.has(key)) continue
    seen.add(key)
    const value = graph.isWeighted ? edge.weight : 1
    const row = matrix[edge.source]
    if (!row) continue
    row[edge.target] = value
    if (!graph.isDirected && edge.source !== edge.target) {
      const mirror = matrix[edge.target]
      if (mirror) mirror[edge.source] = value
    }
  }

  return matrix
}

/**
 * Rebuilds a simple graph from a 1-indexed matrix.
 * Nodes that already exist keep their coordinates and labels.
 * Missing nodes are dropped onto a circle in id order.
 */
export function fromAdjacencyMatrix(
  matrix: number[][],
  existingNodes: GraphNode[],
  isDirected: boolean,
  isWeighted: boolean,
): GraphStateData {
  const n = Math.max(0, matrix.length - 1)
  const existingById = new Map<number, GraphNode>()
  for (const node of existingNodes) {
    if (!existingById.has(node.id)) existingById.set(node.id, node)
  }

  const placeholders: GraphNode[] = []
  for (let id = 1; id <= n; id += 1) {
    placeholders.push({ id, label: String(id), x: 0, y: 0 })
  }
  const circular = applyCircularLayout(placeholders, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT)
  const nodes = circular.map((node) => {
    const existing = existingById.get(node.id)
    if (!existing) return node
    return { ...node, label: existing.label, x: existing.x, y: existing.y }
  })

  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  for (let source = 1; source <= n; source += 1) {
    const start = isDirected ? 1 : source
    for (let target = start; target <= n; target += 1) {
      const forward = matrix[source]?.[target] ?? 0
      const backward = matrix[target]?.[source] ?? 0
      const value = isDirected ? forward : forward !== 0 ? forward : backward
      if (!Number.isFinite(value) || value === 0) continue
      const id = edgeKey(source, target, isDirected)
      if (seen.has(id)) continue
      seen.add(id)
      edges.push({
        id,
        source,
        target,
        weight: isWeighted ? value : 1,
      })
    }
  }

  return { nodes, edges, isDirected, isWeighted }
}

/** Adjacency lists keyed by node id `1..N`, each neighbor list sorted by target. */
export function toAdjacencyList(graph: GraphStateData): Map<number, AdjacencyNeighbor[]> {
  const n = graphSize(graph.nodes)
  const list = new Map<number, AdjacencyNeighbor[]>()
  for (let id = 1; id <= n; id += 1) list.set(id, [])

  for (const edge of graph.edges) {
    if (!inRange(edge.source, n) || !inRange(edge.target, n)) continue
    const weight = graph.isWeighted ? edge.weight : 1
    pushNeighbor(list, edge.source, edge.target, weight)
    if (!graph.isDirected && edge.source !== edge.target) {
      pushNeighbor(list, edge.target, edge.source, weight)
    }
  }

  for (const neighbors of list.values()) {
    neighbors.sort((left, right) => left.target - right.target || left.weight - right.weight)
  }

  return list
}

/**
 * Undirected graphs report `d(x)`.
 * Directed graphs report `d+(x)` as `outDegree` and `d-(x)` as `inDegree`.
 * A loop contributes 2 to an undirected degree and 1 in + 1 out when directed.
 * Isolated means degree 0. Pendant / terminal means degree 1.
 */
export function computeNodeDegrees(graph: GraphStateData): Record<number, NodeDegrees> {
  const n = graphSize(graph.nodes)
  const incoming = Array<number>(n + 1).fill(0)
  const outgoing = Array<number>(n + 1).fill(0)
  const seen = new Set<string>()

  for (const edge of graph.edges) {
    if (!inRange(edge.source, n) || !inRange(edge.target, n)) continue
    const key = edgeKey(edge.source, edge.target, graph.isDirected)
    if (seen.has(key)) continue
    seen.add(key)
    if (!graph.isDirected) {
      const contribution = edge.source === edge.target ? 2 : 1
      incoming[edge.source] = (incoming[edge.source] ?? 0) + contribution
      outgoing[edge.source] = (outgoing[edge.source] ?? 0) + contribution
      if (edge.source !== edge.target) {
        incoming[edge.target] = (incoming[edge.target] ?? 0) + 1
        outgoing[edge.target] = (outgoing[edge.target] ?? 0) + 1
      }
      continue
    }
    outgoing[edge.source] = (outgoing[edge.source] ?? 0) + 1
    incoming[edge.target] = (incoming[edge.target] ?? 0) + 1
  }

  const degrees: Record<number, NodeDegrees> = {}
  for (let nodeId = 1; nodeId <= n; nodeId += 1) {
    const incomingCount = incoming[nodeId] ?? 0
    const outgoingCount = outgoing[nodeId] ?? 0
    const degree = graph.isDirected ? incomingCount + outgoingCount : incomingCount
    degrees[nodeId] = {
      nodeId,
      degree,
      inDegree: graph.isDirected ? incomingCount : degree,
      outDegree: graph.isDirected ? outgoingCount : degree,
      isIsolated: degree === 0,
      isPendant: degree === 1,
    }
  }

  return degrees
}

/**
 * Reads a BAC `.in` edge list.
 * First line is `N M` or just `N`. Each following line is `x y` or `x y cost`.
 */
export function parseBacInputFormat(
  text: string,
  isDirected: boolean,
  isWeighted: boolean,
  canvasWidth: number = DEFAULT_CANVAS_WIDTH,
  canvasHeight: number = DEFAULT_CANVAS_HEIGHT,
): { graph: GraphStateData; error: string | null } {
  const empty: GraphStateData = { nodes: [], edges: [], isDirected, isWeighted }
  const source = text.replace(/^\uFEFF/, '')
  const lines: { lineNumber: number; tokens: string[] }[] = []

  source.split(/\r?\n/).forEach((line, index) => {
    const tokens = line.trim().split(/\s+/).filter((token) => token.length > 0)
    if (tokens.length === 0) return
    lines.push({ lineNumber: index + 1, tokens })
  })

  if (lines.length === 0) {
    return { graph: empty, error: 'Empty input.' }
  }

  const header = lines[0]
  if (!header || (header.tokens.length !== 1 && header.tokens.length !== 2)) {
    return { graph: empty, error: 'The first line must contain N or N M.' }
  }

  const n = readInteger(header.tokens[0])
  if (n === null || n < 0) {
    return { graph: empty, error: 'N must be a non-negative integer.' }
  }

  let expectedEdges: number | null = null
  if (header.tokens.length === 2) {
    const m = readInteger(header.tokens[1])
    if (m === null || m < 0) {
      return { graph: empty, error: 'M must be a non-negative integer.' }
    }
    expectedEdges = m
  }

  const edgeLines = lines.slice(1)
  if (expectedEdges !== null && edgeLines.length < expectedEdges) {
    return {
      graph: empty,
      error: `Expected ${expectedEdges} edges, found ${edgeLines.length}.`,
    }
  }

  const selected = expectedEdges === null ? edgeLines : edgeLines.slice(0, expectedEdges)
  const parsed: { source: number; target: number; weight: number }[] = []

  for (const line of selected) {
    const minimum = isWeighted ? 3 : 2
    if (line.tokens.length < minimum) {
      return {
        graph: empty,
        error: `Line ${line.lineNumber}: expected ${isWeighted ? 'x y cost' : 'x y'}.`,
      }
    }

    const sourceId = readInteger(line.tokens[0])
    const targetId = readInteger(line.tokens[1])
    if (sourceId === null || targetId === null) {
      return {
        graph: empty,
        error: `Line ${line.lineNumber}: expected ${isWeighted ? 'x y cost' : 'x y'}.`,
      }
    }
    if (!inRange(sourceId, n) || !inRange(targetId, n)) {
      return {
        graph: empty,
        error: `Line ${line.lineNumber}: nodes must be inside [1, ${n}].`,
      }
    }

    let weight = 1
    if (isWeighted) {
      const cost = Number(line.tokens[2])
      if (!Number.isFinite(cost)) {
        return { graph: empty, error: `Line ${line.lineNumber}: cost must be a finite number.` }
      }
      weight = cost
    }

    parsed.push({ source: sourceId, target: targetId, weight })
  }

  const placeholders: GraphNode[] = []
  for (let id = 1; id <= n; id += 1) {
    placeholders.push({ id, label: String(id), x: 0, y: 0 })
  }

  const nodes = applyCircularLayout(placeholders, canvasWidth, canvasHeight)
  const edges: GraphEdge[] = []
  const seen = new Set<string>()
  for (const edge of parsed) {
    const id = edgeKey(edge.source, edge.target, isDirected)
    if (seen.has(id)) continue
    seen.add(id)
    edges.push({
      id,
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
    })
  }

  return {
    graph: { nodes, edges, isDirected, isWeighted },
    error: null,
  }
}

/**
 * Reads a 1-indexed parent array `tata[1..n]`.
 * Tokens are space- or comma-separated integers in `0..N`.
 * `0` marks a root; every other value `tata[i]` adds the edge `(tata[i], i)`.
 * The smallest index with value `0` is the root, and the tree is laid out top-down.
 */
export function fromParentArray(
  tataInput: string,
  canvasWidth: number = DEFAULT_CANVAS_WIDTH,
  canvasHeight: number = DEFAULT_CANVAS_HEIGHT,
): { graph: GraphStateData; rootId: number; error: string | null } {
  const empty: GraphStateData = { nodes: [], edges: [], isDirected: false, isWeighted: false }
  const tokens = tataInput
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/[\s,]+/)
    .filter((token) => token.length > 0)

  if (tokens.length === 0) {
    return { graph: empty, rootId: 0, error: 'Vectorul tata este gol.' }
  }

  const n = tokens.length
  const tata = [0]
  for (let index = 0; index < tokens.length; index += 1) {
    const nodeId = index + 1
    const value = readInteger(tokens[index])
    if (value === null) {
      return { graph: empty, rootId: 0, error: `tata[${nodeId}] trebuie să fie un întreg.` }
    }
    if (value < 0 || value > n) {
      return { graph: empty, rootId: 0, error: `tata[${nodeId}] trebuie să fie între 0 și ${n}.` }
    }
    if (value === nodeId) {
      return { graph: empty, rootId: 0, error: `tata[${nodeId}] nu poate fi ${nodeId}.` }
    }
    tata.push(value)
  }

  let rootId = 0
  for (let index = 1; index <= n; index += 1) {
    if (tata[index] === 0) {
      rootId = index
      break
    }
  }
  if (rootId === 0) {
    return { graph: empty, rootId: 0, error: 'Vectorul nu conține rădăcină (niciun 0).' }
  }

  const placeholders: GraphNode[] = []
  for (let id = 1; id <= n; id += 1) {
    placeholders.push({ id, label: String(id), x: 0, y: 0 })
  }

  const edges: GraphEdge[] = []
  const seen = new Set<string>()
  for (let index = 1; index <= n; index += 1) {
    const parent = tata[index] ?? 0
    if (parent === 0) continue
    const id = edgeKey(parent, index, false)
    if (seen.has(id)) continue
    seen.add(id)
    edges.push({ id, source: parent, target: index, weight: 1 })
  }

  const nodes = applyTreeLayout(
    { nodes: placeholders, edges, isDirected: false, isWeighted: false },
    rootId,
    canvasWidth,
    canvasHeight,
  )

  return {
    graph: { nodes, edges, isDirected: false, isWeighted: false },
    rootId,
    error: null,
  }
}

/** Writes `N M` followed by one `u v` or `u v w` line per stored edge. */
export function serializeToBacFormat(graph: GraphStateData): string {
  const n = graphSize(graph.nodes)
  const lines = [`${n} ${graph.edges.length}`]
  for (const edge of graph.edges) {
    lines.push(
      graph.isWeighted
        ? `${edge.source} ${edge.target} ${edge.weight}`
        : `${edge.source} ${edge.target}`,
    )
  }
  return `${lines.join('\n')}\n`
}

function createMatrix(n: number): number[][] {
  const size = n + 1
  const matrix: number[][] = []
  for (let row = 0; row < size; row += 1) {
    matrix.push(Array<number>(size).fill(0))
  }
  return matrix
}

function inRange(id: number, n: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= n
}

function readInteger(token: string | undefined): number | null {
  if (token === undefined || !/^[+-]?\d+$/.test(token)) return null
  const value = Number(token)
  return Number.isSafeInteger(value) ? value : null
}

function pushNeighbor(
  list: Map<number, AdjacencyNeighbor[]>,
  source: number,
  target: number,
  weight: number,
): void {
  const neighbors = list.get(source)
  if (!neighbors) return
  if (neighbors.some((neighbor) => neighbor.target === target)) return
  neighbors.push({ target, weight })
}

import { create } from 'zustand'
import {
  applyCircularLayout,
  applyForceDirectedLayout,
  applyGridLayout,
  applyTreeLayout,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
} from '../core/layout'
import { edgeKey, fromParentArray, parseBacInputFormat } from '../core/representations'
import {
  GRAPH_STORAGE_KEY,
  decodeGraphFromUrlHash,
  parseStoredGraph,
  serializeGraphForStorage,
} from '../core/share'
import type { GraphEdge, GraphNode, GraphStateData } from '../core/types'

export type InteractionMode = 'select' | 'addNode' | 'addEdge' | 'delete'
export type GraphLayoutType = 'circular' | 'force' | 'grid' | 'tree'

const HISTORY_LIMIT = 100

export interface GraphSnapshot {
  nodes: GraphNode[]
  edges: GraphEdge[]
  isDirected: boolean
  isWeighted: boolean
  selectedNodeId: number | null
  selectedEdgeId: string | null
}

export interface BacImportOptions {
  preserveLayout?: boolean
  isDirected?: boolean
  isWeighted?: boolean
}

interface GraphStore extends GraphSnapshot {
  /** Bumped when a gallery graph or the default graph replaces the canvas, so the view refits. */
  layoutEpoch: number
  interactionMode: InteractionMode
  past: GraphSnapshot[]
  future: GraphSnapshot[]
  addNode: (x: number, y: number) => void
  removeNode: (id: number) => void
  updateNodePosition: (id: number, x: number, y: number, recordHistory?: boolean) => void
  addOrToggleEdge: (source: number, target: number, weight?: number) => void
  updateEdgeWeight: (edgeId: string, weight: number) => void
  removeEdge: (edgeId: string) => void
  toggleMatrixCell: (i: number, j: number) => void
  setMatrixCell: (i: number, j: number, value: number) => void
  setGraphFromBacText: (text: string, options?: BacImportOptions) => string | null
  setGraphFromParentArray: (text: string) => string | null
  applyLayout: (type: GraphLayoutType, width: number, height: number, rootId?: number) => void
  setDirected: (value: boolean) => void
  setWeighted: (value: boolean) => void
  activateWeightedCosts: () => void
  clearGraph: () => void
  loadGraph: (graph: GraphStateData) => void
  resetToInitial: () => void
  undo: () => void
  redo: () => void
  setInteractionMode: (mode: InteractionMode) => void
  setSelectedNodeId: (id: number | null) => void
  setSelectedEdgeId: (id: string | null) => void
}

const INITIAL_PAIRS: readonly (readonly [number, number])[] = [
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 1],
  [1, 4],
  [2, 5],
  [3, 6],
]

function createDefaultNodes(): GraphNode[] {
  const nodes: GraphNode[] = []
  for (let id = 1; id <= 6; id += 1) {
    nodes.push({ id, label: String(id), x: 0, y: 0 })
  }
  return applyCircularLayout(nodes, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT)
}

function createDefaultEdges(): GraphEdge[] {
  return INITIAL_PAIRS.map(([source, target]) => ({
    id: edgeKey(source, target, false),
    source,
    target,
    weight: 1,
  }))
}

function snapshotOf(state: GraphSnapshot): GraphSnapshot {
  return {
    nodes: state.nodes,
    edges: state.edges,
    isDirected: state.isDirected,
    isWeighted: state.isWeighted,
    selectedNodeId: state.selectedNodeId,
    selectedEdgeId: state.selectedEdgeId,
  }
}

function withHistory(state: GraphSnapshot & { past: GraphSnapshot[] }): {
  past: GraphSnapshot[]
  future: GraphSnapshot[]
} {
  const past = [...state.past, snapshotOf(state)]
  if (past.length > HISTORY_LIMIT) {
    past.splice(0, past.length - HISTORY_LIMIT)
  }
  return { past, future: [] }
}

function hasNode(nodes: GraphNode[], id: number): boolean {
  return nodes.some((node) => node.id === id)
}

function edgesMatch(
  edge: GraphEdge,
  source: number,
  target: number,
  isDirected: boolean,
): boolean {
  if (isDirected || source === target) {
    return edge.source === source && edge.target === target
  }
  return (
    (edge.source === source && edge.target === target) ||
    (edge.source === target && edge.target === source)
  )
}

function sameNodes(left: GraphNode[], right: GraphNode[]): boolean {
  if (left.length !== right.length) return false
  return left.every((node, index) => {
    const other = right[index]
    return (
      other !== undefined &&
      node.id === other.id &&
      node.label === other.label &&
      node.x === other.x &&
      node.y === other.y
    )
  })
}

function edgeSignature(edges: GraphEdge[]): string {
  return edges
    .map((edge) => `${edge.source}\t${edge.target}\t${edge.weight}`)
    .sort()
    .join('\n')
}

function canonicalizeEdges(edges: GraphEdge[], isDirected: boolean): GraphEdge[] {
  const seen = new Set<string>()
  const next: GraphEdge[] = []
  for (const edge of edges) {
    const id = edgeKey(edge.source, edge.target, isDirected)
    if (seen.has(id)) continue
    seen.add(id)
    next.push({ ...edge, id })
  }
  return next
}

function shiftId(value: number, removedId: number): number {
  return value > removedId ? value - 1 : value
}

function sensibleWeight(source: number, target: number): number {
  const low = Math.min(source, target)
  const high = Math.max(source, target)
  return ((low * 5 + high * 3) % 9) + 1
}

function toGraphData(state: GraphSnapshot): GraphStateData {
  return {
    nodes: state.nodes,
    edges: state.edges,
    isDirected: state.isDirected,
    isWeighted: state.isWeighted,
  }
}

function positionsChanged(previous: GraphNode[], next: GraphNode[]): boolean {
  if (previous.length !== next.length) return true
  return next.some((node, index) => {
    const before = previous[index]
    return !before || before.id !== node.id || before.x !== node.x || before.y !== node.y
  })
}

export function createDefaultGraphData(): GraphStateData {
  return {
    nodes: createDefaultNodes(),
    edges: createDefaultEdges(),
    isDirected: false,
    isWeighted: false,
  }
}

function readInitialGraph(): GraphStateData {
  if (typeof window === 'undefined') return createDefaultGraphData()
  const hash = window.location.hash
  if (hash.startsWith('#g=')) {
    try {
      const shared = decodeGraphFromUrlHash(hash)
      if (shared) {
        try {
          window.localStorage.setItem(GRAPH_STORAGE_KEY, serializeGraphForStorage(shared))
        } catch {
          // The shared graph still opens when storage is blocked.
        }
        return shared
      }
    } catch {
      // Fall through to the saved graph.
    }
  }
  try {
    const raw = window.localStorage.getItem(GRAPH_STORAGE_KEY)
    if (raw) {
      const stored = parseStoredGraph(raw)
      if (stored) return stored
      window.localStorage.removeItem(GRAPH_STORAGE_KEY)
    }
  } catch {
    // Private mode can throw on localStorage access.
  }
  return createDefaultGraphData()
}

const initialGraph = readInitialGraph()

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: initialGraph.nodes,
  edges: initialGraph.edges,
  isDirected: initialGraph.isDirected,
  isWeighted: initialGraph.isWeighted,
  layoutEpoch: 0,
  selectedNodeId: null,
  selectedEdgeId: null,
  interactionMode: 'select',
  past: [],
  future: [],

  addNode: (x, y) => {
    const state = get()
    const id = state.nodes.reduce((max, node) => Math.max(max, node.id), 0) + 1
    const node: GraphNode = { id, label: String(id), x, y }
    set({
      ...withHistory(state),
      nodes: [...state.nodes, node].sort((left, right) => left.id - right.id),
      selectedNodeId: id,
      selectedEdgeId: null,
    })
  },

  removeNode: (id) => {
    const state = get()
    if (!hasNode(state.nodes, id)) return

    const nodes = state.nodes
      .filter((node) => node.id !== id)
      .map((node) => {
        const nextId = shiftId(node.id, id)
        return {
          ...node,
          id: nextId,
          label: node.label === String(node.id) ? String(nextId) : node.label,
        }
      })
      .sort((left, right) => left.id - right.id)

    const remapped = state.edges
      .filter((edge) => edge.source !== id && edge.target !== id)
      .map((edge) => ({
        ...edge,
        source: shiftId(edge.source, id),
        target: shiftId(edge.target, id),
      }))
    const edges = canonicalizeEdges(remapped, state.isDirected)

    let selectedNodeId = state.selectedNodeId
    if (selectedNodeId === id) selectedNodeId = null
    else if (selectedNodeId !== null) selectedNodeId = shiftId(selectedNodeId, id)

    let selectedEdgeId: string | null = null
    if (state.selectedEdgeId) {
      const selected = state.edges.find((edge) => edge.id === state.selectedEdgeId)
      if (selected && selected.source !== id && selected.target !== id) {
        const nextId = edgeKey(
          shiftId(selected.source, id),
          shiftId(selected.target, id),
          state.isDirected,
        )
        if (edges.some((edge) => edge.id === nextId)) selectedEdgeId = nextId
      }
    }

    set({
      ...withHistory(state),
      nodes,
      edges,
      selectedNodeId,
      selectedEdgeId,
    })
  },

  updateNodePosition: (id, x, y, recordHistory = true) => {
    const state = get()
    const node = state.nodes.find((item) => item.id === id)
    if (!node || (node.x === x && node.y === y)) return
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    set({
      ...(recordHistory ? withHistory(state) : {}),
      nodes: state.nodes.map((item) => (item.id === id ? { ...item, x, y } : item)),
    })
  },

  addOrToggleEdge: (source, target, weight = 1) => {
    toggleEdge(source, target, weight, true)
  },

  updateEdgeWeight: (edgeId, weight) => {
    if (!Number.isFinite(weight)) return
    const state = get()
    const edge = state.edges.find((item) => item.id === edgeId)
    if (!edge || edge.weight === weight) return
    set({
      ...withHistory(state),
      edges: state.edges.map((item) => (item.id === edgeId ? { ...item, weight } : item)),
    })
  },

  removeEdge: (edgeId) => {
    const state = get()
    if (!state.edges.some((edge) => edge.id === edgeId)) return
    set({
      ...withHistory(state),
      edges: state.edges.filter((edge) => edge.id !== edgeId),
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
    })
  },

  toggleMatrixCell: (i, j) => {
    toggleEdge(i, j, 1, false)
  },

  setMatrixCell: (i, j, value) => {
    const state = get()
    const n = state.nodes.reduce((max, node) => Math.max(max, node.id), 0)
    if (!Number.isInteger(i) || !Number.isInteger(j) || i < 1 || j < 1 || i > n || j > n || i === j) {
      return
    }
    if (!Number.isFinite(value)) return

    const existing = state.edges.find((edge) => edgesMatch(edge, i, j, state.isDirected))
    if (value === 0) {
      if (!existing) return
      set({
        ...withHistory(state),
        edges: state.edges.filter((edge) => edge.id !== existing.id),
        selectedEdgeId: state.selectedEdgeId === existing.id ? null : state.selectedEdgeId,
      })
      return
    }

    const weight = state.isWeighted ? value : 1
    if (!existing) {
      const edge: GraphEdge = {
        id: edgeKey(i, j, state.isDirected),
        source: i,
        target: j,
        weight,
      }
      set({
        ...withHistory(state),
        edges: [...state.edges, edge],
      })
      return
    }
    if (existing.weight === weight) return
    set({
      ...withHistory(state),
      edges: state.edges.map((edge) => (edge.id === existing.id ? { ...edge, weight } : edge)),
    })
  },

  setGraphFromBacText: (text, options) => {
    const state = get()
    const isDirected = options?.isDirected ?? state.isDirected
    const isWeighted = options?.isWeighted ?? state.isWeighted
    const { graph, error } = parseBacInputFormat(
      text,
      isDirected,
      isWeighted,
      DEFAULT_CANVAS_WIDTH,
      DEFAULT_CANVAS_HEIGHT,
    )
    if (error) return error

    const nodes = options?.preserveLayout
      ? graph.nodes.map((node) => {
          const previous = state.nodes.find((candidate) => candidate.id === node.id)
          return previous ? { ...node, x: previous.x, y: previous.y, label: previous.label } : node
        })
      : graph.nodes

    if (
      state.isDirected === isDirected &&
      state.isWeighted === isWeighted &&
      sameNodes(state.nodes, nodes) &&
      edgeSignature(state.edges) === edgeSignature(graph.edges)
    ) {
      return null
    }

    set({
      ...withHistory(state),
      nodes,
      edges: graph.edges,
      isDirected,
      isWeighted,
      selectedNodeId: null,
      selectedEdgeId: null,
    })
    return null
  },

  setGraphFromParentArray: (text) => {
    const state = get()
    const parsed = fromParentArray(text)
    if (parsed.error) return parsed.error
    const edges = canonicalizeEdges(
      parsed.graph.edges.map((edge) => ({ ...edge, weight: 1 })),
      false,
    )
    if (
      !state.isDirected &&
      sameNodes(state.nodes, parsed.graph.nodes) &&
      edgeSignature(state.edges) === edgeSignature(edges)
    ) {
      return null
    }
    set({
      ...withHistory(state),
      nodes: parsed.graph.nodes,
      edges,
      isDirected: false,
      selectedNodeId: null,
      selectedEdgeId: null,
    })
    return null
  },

  applyLayout: (type, width, height, rootId = 1) => {
    const state = get()
    if (state.nodes.length === 0) return
    const graph = toGraphData(state)
    const nodes =
      type === 'circular'
        ? applyCircularLayout(state.nodes, width, height)
        : type === 'force'
          ? applyForceDirectedLayout(graph, width, height)
          : type === 'tree'
            ? applyTreeLayout(graph, rootId, width, height)
            : applyGridLayout(state.nodes, width, height)
    if (!positionsChanged(state.nodes, nodes)) return
    set({
      ...withHistory(state),
      nodes,
    })
  },

  setDirected: (value) => {
    const state = get()
    if (state.isDirected === value) return
    const edges = canonicalizeEdges(state.edges, value)
    let selectedEdgeId = state.selectedEdgeId
    if (selectedEdgeId) {
      const selected = state.edges.find((edge) => edge.id === selectedEdgeId)
      if (!selected) {
        selectedEdgeId = null
      } else {
        const nextId = edgeKey(selected.source, selected.target, value)
        selectedEdgeId = edges.some((edge) => edge.id === nextId) ? nextId : null
      }
    }
    set({
      ...withHistory(state),
      isDirected: value,
      edges,
      selectedEdgeId,
    })
  },

  setWeighted: (value) => {
    const state = get()
    if (state.isWeighted === value) return
    set({
      ...withHistory(state),
      isWeighted: value,
      edges: value ? state.edges : state.edges.map((edge) => ({ ...edge, weight: 1 })),
    })
  },

  activateWeightedCosts: () => {
    const state = get()
    const uniform = state.edges.length > 0 && state.edges.every((edge) => edge.weight === 1)
    const edges = uniform
      ? state.edges.map((edge) => ({ ...edge, weight: sensibleWeight(edge.source, edge.target) }))
      : state.edges
    if (state.isWeighted && edgeSignature(state.edges) === edgeSignature(edges)) return
    set({
      ...withHistory(state),
      isWeighted: true,
      edges,
    })
  },

  clearGraph: () => {
    const state = get()
    if (
      state.nodes.length === 0 &&
      state.edges.length === 0 &&
      state.selectedNodeId === null &&
      state.selectedEdgeId === null
    ) {
      return
    }
    set({
      ...withHistory(state),
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    })
  },

  loadGraph: (graph) => {
    const state = get()
    const next = adoptGraph(graph)
    if (matchesGraph(state, next)) {
      set({
        layoutEpoch: state.layoutEpoch + 1,
        selectedNodeId: null,
        selectedEdgeId: null,
      })
      return
    }
    set({
      ...withHistory(state),
      nodes: next.nodes,
      edges: next.edges,
      isDirected: next.isDirected,
      isWeighted: next.isWeighted,
      selectedNodeId: null,
      selectedEdgeId: null,
      layoutEpoch: state.layoutEpoch + 1,
    })
  },

  resetToInitial: () => {
    const state = get()
    const next = adoptGraph(createDefaultGraphData())
    if (matchesGraph(state, next)) {
      set({
        layoutEpoch: state.layoutEpoch + 1,
        selectedNodeId: null,
        selectedEdgeId: null,
      })
      return
    }
    set({
      ...withHistory(state),
      nodes: next.nodes,
      edges: next.edges,
      isDirected: next.isDirected,
      isWeighted: next.isWeighted,
      selectedNodeId: null,
      selectedEdgeId: null,
      layoutEpoch: state.layoutEpoch + 1,
    })
  },

  undo: () => {
    const state = get()
    const previous = state.past[state.past.length - 1]
    if (!previous) return
    const present = snapshotOf(state)
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      isDirected: previous.isDirected,
      isWeighted: previous.isWeighted,
      selectedNodeId: previous.selectedNodeId,
      selectedEdgeId: previous.selectedEdgeId,
      past: state.past.slice(0, -1),
      future: [present, ...state.future].slice(0, HISTORY_LIMIT),
    })
  },

  redo: () => {
    const state = get()
    const next = state.future[0]
    if (!next) return
    const present = snapshotOf(state)
    set({
      nodes: next.nodes,
      edges: next.edges,
      isDirected: next.isDirected,
      isWeighted: next.isWeighted,
      selectedNodeId: next.selectedNodeId,
      selectedEdgeId: next.selectedEdgeId,
      past: [...state.past, present].slice(-HISTORY_LIMIT),
      future: state.future.slice(1),
    })
  },

  setInteractionMode: (interactionMode) => {
    if (get().interactionMode === interactionMode) return
    set({ interactionMode })
  },

  setSelectedNodeId: (selectedNodeId) => {
    const state = get()
    if (selectedNodeId !== null && !hasNode(state.nodes, selectedNodeId)) return
    set({
      selectedNodeId,
      selectedEdgeId: selectedNodeId === null ? state.selectedEdgeId : null,
    })
  },

  setSelectedEdgeId: (selectedEdgeId) => {
    const state = get()
    if (selectedEdgeId !== null && !state.edges.some((edge) => edge.id === selectedEdgeId)) return
    set({
      selectedEdgeId,
      selectedNodeId: selectedEdgeId === null ? state.selectedNodeId : null,
    })
  },
}))

function adoptGraph(graph: GraphStateData): GraphStateData {
  const nodes = graph.nodes
    .map((node) => ({
      id: node.id,
      label: node.label,
      x: node.x,
      y: node.y,
    }))
    .sort((left, right) => left.id - right.id)
  return {
    nodes,
    edges: canonicalizeEdges(graph.edges, graph.isDirected),
    isDirected: graph.isDirected,
    isWeighted: graph.isWeighted,
  }
}

function matchesGraph(state: GraphSnapshot, graph: GraphStateData): boolean {
  return (
    state.isDirected === graph.isDirected &&
    state.isWeighted === graph.isWeighted &&
    sameNodes(state.nodes, graph.nodes) &&
    edgeSignature(state.edges) === edgeSignature(graph.edges)
  )
}

function graphDataKey(state: GraphSnapshot): string {
  const nodes = state.nodes
    .map((node) => `${node.id}:${node.label}:${node.x}:${node.y}`)
    .join(';')
  const edges = state.edges.map((edge) => `${edge.source}>${edge.target}:${edge.weight}`).join('|')
  return `${state.isDirected ? 1 : 0}${state.isWeighted ? 1 : 0}#${nodes}#${edges}`
}

function persistGraph(graph: GraphStateData): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GRAPH_STORAGE_KEY, serializeGraphForStorage(graph))
  } catch {
    // Ignore quota and privacy errors. The canvas still keeps the graph.
  }
  if (!window.location.hash.startsWith('#g=')) return
  const next = `${window.location.pathname}${window.location.search}`
  window.history.replaceState(window.history.state, '', next)
}

if (typeof window !== 'undefined') {
  useGraphStore.subscribe((state, previous) => {
    if (graphDataKey(state) === graphDataKey(previous)) return
    persistGraph(toGraphData(state))
  })
}

function toggleEdge(source: number, target: number, weight: number, selectEdge: boolean): void {
  const state = useGraphStore.getState()
  if (!hasNode(state.nodes, source) || !hasNode(state.nodes, target)) return
  const resolvedWeight = Number.isFinite(weight) ? weight : 1
  const existing = state.edges.find((edge) => edgesMatch(edge, source, target, state.isDirected))

  if (existing) {
    const selectedEdgeId =
      selectEdge || state.selectedEdgeId === existing.id ? null : state.selectedEdgeId
    useGraphStore.setState({
      ...withHistory(state),
      edges: state.edges.filter((edge) => edge.id !== existing.id),
      selectedEdgeId,
    })
    return
  }

  const edge: GraphEdge = {
    id: edgeKey(source, target, state.isDirected),
    source,
    target,
    weight: resolvedWeight,
  }
  useGraphStore.setState({
    ...withHistory(state),
    edges: [...state.edges, edge],
    selectedEdgeId: selectEdge ? edge.id : state.selectedEdgeId,
    selectedNodeId: selectEdge ? null : state.selectedNodeId,
  })
}

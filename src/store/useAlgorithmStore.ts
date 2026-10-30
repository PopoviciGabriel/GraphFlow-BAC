import { create } from 'zustand'
import {
  runBFS,
  runBipartiteCheck,
  runConnectedComponents,
  runCycleDetection,
  runDFS,
} from '../core/algorithms/traversals'
import { runEulerianCheck, runHamiltonianCheck } from '../core/algorithms/eulerHamilton'
import { runDijkstra, runKruskal, runPrim, runRootedTreeAnalysis, runRoyFloyd } from '../core/algorithms/weighted'
import type { AlgorithmId, AlgorithmStep } from '../core/algorithms/types'
import { graphSize } from '../core/representations'
import type { GraphStateData } from '../core/types'
import { useGraphStore } from './useGraphStore'

export const PLAYBACK_SPEEDS_MS = [1400, 700, 350, 150] as const

export type PlaybackSpeedMs = (typeof PLAYBACK_SPEEDS_MS)[number]

export interface AlgorithmStore {
  selectedAlgorithm: AlgorithmId
  startNode: number
  /** Dijkstra target. `null` means every node ("Toate nodurile"). */
  targetNode: number | null
  steps: AlgorithmStep[]
  /** `-1` while idle. Otherwise an index into `steps`. */
  currentStepIndex: number
  isPlaying: boolean
  /** Delay between automatic steps. One of 1400, 700, 350, 150. */
  speedMs: number
  setAlgorithm: (algorithm: AlgorithmId) => void
  setStartNode: (startNode: number) => void
  setTargetNode: (node: number | null) => void
  generateAndStart: () => void
  play: () => void
  pause: () => void
  stepForward: () => void
  stepBackward: () => void
  jumpToStep: (index: number) => void
  setSpeed: (speedMs: number) => void
  resetExecution: () => void
}

const SPEED_SET = new Set<number>(PLAYBACK_SPEEDS_MS)

function clampStartNode(startNode: number, nodeCount: number): number {
  if (nodeCount <= 0) return 1
  if (!Number.isFinite(startNode)) return 1
  const truncated = Math.trunc(startNode)
  if (truncated < 1) return 1
  if (truncated > nodeCount) return nodeCount
  return truncated
}

function isPlaybackSpeed(speedMs: number): speedMs is PlaybackSpeedMs {
  return SPEED_SET.has(speedMs)
}

function clampTargetNode(targetNode: number | null, nodeCount: number): number | null {
  if (targetNode === null) return null
  if (nodeCount <= 0 || !Number.isFinite(targetNode)) return null
  const truncated = Math.trunc(targetNode)
  if (truncated < 1 || truncated > nodeCount) return null
  return truncated
}

function currentGraph(): GraphStateData {
  const state = useGraphStore.getState()
  return {
    nodes: state.nodes,
    edges: state.edges,
    isDirected: state.isDirected,
    isWeighted: state.isWeighted,
  }
}

function runSelected(
  algorithm: AlgorithmId,
  graph: GraphStateData,
  startNode: number,
  targetNode: number | null,
): AlgorithmStep[] {
  switch (algorithm) {
    case 'bfs':
      return runBFS(graph, startNode)
    case 'dfs':
      return runDFS(graph, startNode)
    case 'connected_components':
      return runConnectedComponents(graph, startNode)
    case 'cycle_detection':
      return runCycleDetection(graph, startNode)
    case 'bipartite':
      return runBipartiteCheck(graph, startNode)
    case 'dijkstra':
      return runDijkstra(graph, startNode, targetNode)
    case 'roy_floyd':
      return runRoyFloyd(graph)
    case 'kruskal':
      return runKruskal(graph)
    case 'prim':
      return runPrim(graph, startNode)
    case 'rooted_tree':
      return runRootedTreeAnalysis(graph, startNode)
    case 'eulerian':
      return runEulerianCheck(graph, startNode)
    case 'hamiltonian':
      return runHamiltonianCheck(graph, startNode)
  }
}

function graphStructureKey(state: {
  nodes: readonly { id: number }[]
  edges: readonly { source: number; target: number; weight: number }[]
  isDirected: boolean
  isWeighted: boolean
}): string {
  const nodeIds = state.nodes
    .map((node) => node.id)
    .sort((left, right) => left - right)
    .join(',')
  const edges = state.edges
    .map((edge) => `${edge.source}>${edge.target}:${edge.weight}`)
    .sort()
    .join('|')
  return `${state.isDirected ? 'D' : 'U'}${state.isWeighted ? 'W' : 'P'}#${nodeIds}#${edges}`
}

export const useAlgorithmStore = create<AlgorithmStore>((set, get) => ({
  selectedAlgorithm: 'bfs',
  startNode: 1,
  targetNode: null,
  steps: [],
  currentStepIndex: -1,
  isPlaying: false,
  speedMs: 700,

  setAlgorithm: (selectedAlgorithm) => {
    if (get().selectedAlgorithm === selectedAlgorithm) return
    set({
      selectedAlgorithm,
      steps: [],
      currentStepIndex: -1,
      isPlaying: false,
    })
  },

  setStartNode: (startNode) => {
    const nodeCount = graphSize(useGraphStore.getState().nodes)
    const clamped = clampStartNode(startNode, nodeCount)
    if (clamped === get().startNode) return
    set({
      startNode: clamped,
      steps: [],
      currentStepIndex: -1,
      isPlaying: false,
    })
  },

  setTargetNode: (targetNode) => {
    const nodeCount = graphSize(useGraphStore.getState().nodes)
    const clamped = clampTargetNode(targetNode, nodeCount)
    if (clamped === get().targetNode) return
    set({
      targetNode: clamped,
      steps: [],
      currentStepIndex: -1,
      isPlaying: false,
    })
  },

  generateAndStart: () => {
    const graph = currentGraph()
    const count = graphSize(graph.nodes)
    const startNode = clampStartNode(get().startNode, count)
    const targetNode = clampTargetNode(get().targetNode, count)
    const steps = runSelected(get().selectedAlgorithm, graph, startNode, targetNode)
    set({
      startNode,
      targetNode,
      steps,
      currentStepIndex: steps.length > 0 ? 0 : -1,
      isPlaying: false,
    })
  },

  play: () => {
    if (get().steps.length === 0) get().generateAndStart()
    const current = get()
    if (current.steps.length === 0) return
    const lastIndex = current.steps.length - 1
    if (current.isPlaying && current.currentStepIndex < lastIndex) return
    if (current.currentStepIndex >= lastIndex) {
      set({ currentStepIndex: 0, isPlaying: lastIndex > 0 })
      return
    }
    const index = current.currentStepIndex < 0 ? 0 : current.currentStepIndex
    set({ currentStepIndex: index, isPlaying: true })
  },

  pause: () => {
    if (get().isPlaying) set({ isPlaying: false })
  },

  /**
   * Advance one frame and leave `isPlaying` untouched.
   * The player timer calls this; it pauses itself on the final frame.
   * Stepping backward or scrubbing still stops playback.
   */
  stepForward: () => {
    const state = get()
    if (state.steps.length === 0) return
    const nextIndex = Math.min(state.steps.length - 1, state.currentStepIndex + 1)
    if (nextIndex === state.currentStepIndex) return
    set({ currentStepIndex: nextIndex })
  },

  stepBackward: () => {
    const state = get()
    if (state.currentStepIndex <= 0) {
      if (state.isPlaying) set({ isPlaying: false })
      return
    }
    set({ currentStepIndex: state.currentStepIndex - 1, isPlaying: false })
  },

  jumpToStep: (index) => {
    const state = get()
    if (state.steps.length === 0 || !Number.isFinite(index)) {
      if (state.isPlaying) set({ isPlaying: false })
      return
    }
    const clamped = Math.min(state.steps.length - 1, Math.max(0, Math.trunc(index)))
    set({ currentStepIndex: clamped, isPlaying: false })
  },

  setSpeed: (speedMs) => {
    if (!isPlaybackSpeed(speedMs) || get().speedMs === speedMs) return
    set({ speedMs })
  },

  resetExecution: () => {
    set({ steps: [], currentStepIndex: -1, isPlaying: false })
  },
}))

/**
 * Structural graph edits cancel an active run and clamp the start node into `1..N`.
 * Moving a node does not, because the snapshots are tied to ids rather than coordinates.
 */
useGraphStore.subscribe((state, previous) => {
  if (graphStructureKey(state) === graphStructureKey(previous)) return
  const algorithm = useAlgorithmStore.getState()
  const count = graphSize(state.nodes)
  const startNode = clampStartNode(algorithm.startNode, count)
  const targetNode = clampTargetNode(algorithm.targetNode, count)
  const executionActive =
    algorithm.isPlaying || algorithm.currentStepIndex >= 0 || algorithm.steps.length > 0
  if (!executionActive && startNode === algorithm.startNode && targetNode === algorithm.targetNode) return
  if (!executionActive) {
    useAlgorithmStore.setState({ startNode, targetNode })
    return
  }
  useAlgorithmStore.setState({
    startNode,
    targetNode,
    steps: [],
    currentStepIndex: -1,
    isPlaying: false,
  })
})

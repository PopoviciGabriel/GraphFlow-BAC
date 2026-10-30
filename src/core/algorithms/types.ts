/**
 * Frame-by-frame algorithm playback.
 * Every array is 1-based, matching BAC C++ declarations such as `int viz[101]`.
 * Index 0 is unused. Node ids are always `1..N`.
 */

export type AlgorithmId =
  | 'bfs'
  | 'dfs'
  | 'connected_components'
  | 'cycle_detection'
  | 'bipartite'
  | 'dijkstra'
  | 'roy_floyd'
  | 'kruskal'
  | 'prim'
  | 'rooted_tree'
  | 'eulerian'
  | 'hamiltonian'

/** One row in the Kruskal edge table, kept in sorted order across the whole run. */
export interface KruskalEdgeRow {
  id: string
  u: number
  v: number
  weight: number
  status: 'pending' | 'inspecting' | 'accepted' | 'rejected'
}

/**
 * 1-based Roy-Floyd cost matrix.
 * `matrix[0]` and column 0 are unused. `null` means ∞.
 */
export interface RoyFloydState {
  k: number
  i: number
  j: number
  matrix: (number | null)[][]
  updated: boolean
}

/** BAC analysis of a tree rooted at `root`. Levels use depth, with `nivel[root] = 0`. */
export interface RootedTreeInfo {
  root: number
  leaves: number[]
  levels: Record<number, number>
  childrenMap: Record<number, number[]>
  height: number
  isValidTree: boolean
}

export type NodeVisualState =
  | 'default'
  | 'current'
  | 'frontier'
  | 'visited'
  | 'path'
  | 'conflict'
  | 'comp_1'
  | 'comp_2'
  | 'comp_3'
  | 'comp_4'
  | 'comp_5'
  | 'set_A'
  | 'set_B'

export type EdgeVisualState =
  | 'default'
  | 'active'
  | 'tree'
  | 'back_edge'
  | 'cycle'
  | 'discarded'

/**
 * Romanian BAC queue `C[0..n]`.
 * `items[0]` is unused. Live elements are `items[st] .. items[st]` through `items[dr]`
 * while `st <= dr`. Values before `st` stay in the array because `st++` does not erase them.
 */
export interface AlgorithmQueue {
  items: number[]
  st: number
  dr: number
}

export interface AlgorithmStep {
  stepIndex: number
  /** Short Romanian header, for example "Extragere din coadă". */
  title: string
  /** What this exact frame does, using BAC names (`viz`, `tata`, `C`, `st`, `dr`). */
  explanation: string
  activeNodeId: number | null
  activeEdgeId: string | null
  /** Visual state for every node `1..N`. */
  nodeStates: Record<number, NodeVisualState>
  /** Visual state keyed by `GraphEdge.id`. */
  edgeStates: Record<string, EdgeVisualState>
  /**
   * `viz[1..n]`: `0` unvisited, `1` visited, component number `nrc`,
   * bipartite color `1` / `2`, Kruskal component id, or rooted-tree role
   * (`1` internal, `2` leaf, `3` root).
   */
  viz: number[]
  /** `tata[1..n]`. `0` means “no parent”. */
  tata: number[]
  /**
   * `d[1..n]`. `null` means ∞ or not computed.
   * `0` is the start level, a zero Dijkstra distance, or the root depth.
   */
  dist: (number | null)[]
  queue: AlgorithmQueue | null
  /** Explicit DFS / recursion stack. `null` when the algorithm does not use one. */
  stack: number[] | null
  /** Nodes printed so far (`cout`), in order. */
  outputOrder: number[]
  /** 1-based line in the reference C++ program for this algorithm. */
  cppLine: number
  /** Dijkstra destination. `null` means every node. Omitted by the other algorithms. */
  targetNodeId?: number | null
  /** Running MST cost, or the reconstructed shortest-path cost. */
  totalCost?: number
  /** Sorted Kruskal edges. Present on every Kruskal frame. */
  kruskalEdges?: KruskalEdgeRow[]
  /** Live Roy-Floyd matrix for intermediate `k` and the pair `(i, j)`. */
  royFloydState?: RoyFloydState
  /** Root, leaves, levels, and children for the rooted-tree analysis. */
  treeInfo?: RootedTreeInfo
  /** Present on the final frame only. */
  summaryVerdict?: string
}

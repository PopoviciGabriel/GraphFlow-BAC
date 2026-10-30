import { describe, expect, it } from 'vitest'
import { runDijkstra, runKruskal, runPrim, runRootedTreeAnalysis, runRoyFloyd } from '../algorithms/weighted'
import type { AlgorithmStep } from '../algorithms/types'
import { fromParentArray } from '../representations'
import type { GraphEdge, GraphNode, GraphStateData } from '../types'

function makeGraph(
  n: number,
  links: readonly (readonly [number, number, number])[],
  isDirected = false,
): GraphStateData {
  const nodes: GraphNode[] = []
  for (let id = 1; id <= n; id += 1) nodes.push({ id, label: String(id), x: id * 40, y: 60 })
  const edges: GraphEdge[] = links.map(([source, target, weight]) => ({
    id: isDirected ? `${source}->${target}` : `${Math.min(source, target)}--${Math.max(source, target)}`,
    source,
    target,
    weight,
  }))
  return { nodes, edges, isDirected, isWeighted: true }
}

function finalStep(steps: AlgorithmStep[]): AlgorithmStep {
  const step = steps[steps.length - 1]
  if (!step) throw new Error('Algoritmul nu a produs niciun pas.')
  return step
}

describe('runDijkstra', () => {
  it('prefers the longer route when its cost is smaller than the direct edge', () => {
    const graph = makeGraph(5, [
      [1, 2, 2],
      [2, 3, 2],
      [3, 4, 2],
      [4, 5, 3],
      [1, 5, 15],
    ])
    const steps = runDijkstra(graph, 1, 5)
    const sawDirect = steps.some((step) => step.dist[5] === 15 && step.tata[5] === 1)
    expect(sawDirect).toBe(true)

    const done = finalStep(steps)
    expect(done.dist).toEqual([null, 0, 2, 4, 6, 9])
    expect(done.tata).toEqual([0, 0, 1, 2, 3, 4])
    expect(done.outputOrder).toEqual([1, 2, 3, 4, 5])
    expect(done.totalCost).toBe(9)
    expect(done.summaryVerdict).toContain('1 -> 2 -> 3 -> 4 -> 5')
    expect(done.summaryVerdict).toContain('cost 9')
  })
})

describe('runRoyFloyd', () => {
  it('relaxes the direct arcs through intermediate nodes', () => {
    const graph = makeGraph(
      4,
      [
        [1, 2, 1],
        [2, 3, 1],
        [1, 3, 100],
        [3, 4, 1],
        [1, 4, 50],
        [2, 4, 20],
      ],
      true,
    )
    const steps = runRoyFloyd(graph)
    const opened = steps.find((step) => step.royFloydState?.k === 0)
    expect(opened?.royFloydState?.matrix[1]?.[3]).toBe(100)
    expect(opened?.royFloydState?.matrix[1]?.[4]).toBe(50)

    const matrix = finalStep(steps).royFloydState?.matrix
    expect(matrix?.[1]?.[1]).toBe(0)
    expect(matrix?.[1]?.[2]).toBe(1)
    expect(matrix?.[1]?.[3]).toBe(2)
    expect(matrix?.[1]?.[4]).toBe(3)
    expect(matrix?.[2]?.[3]).toBe(1)
    expect(matrix?.[2]?.[4]).toBe(2)
    expect(matrix?.[3]?.[4]).toBe(1)
    expect(matrix?.[4]?.[1]).toBeNull()
    expect(matrix?.[2]?.[1]).toBeNull()
  })
})

describe('runKruskal and runPrim', () => {
  it('build the same MST cost and keep exactly n - 1 edges', () => {
    const graph = makeGraph(6, [
      [1, 2, 1],
      [2, 3, 2],
      [1, 3, 3],
      [2, 4, 4],
      [4, 5, 5],
      [4, 6, 6],
      [3, 4, 7],
      [5, 6, 8],
      [2, 5, 10],
    ])

    const kruskal = finalStep(runKruskal(graph))
    const accepted = kruskal.kruskalEdges?.filter((row) => row.status === 'accepted') ?? []
    const rejectedCycle = kruskal.kruskalEdges?.find((row) => row.u === 1 && row.v === 3)
    expect(rejectedCycle?.status).toBe('rejected')
    expect(rejectedCycle?.weight).toBe(3)
    expect(accepted).toHaveLength(5)
    expect(accepted.reduce((sum, row) => sum + row.weight, 0)).toBe(18)
    expect(kruskal.totalCost).toBe(18)

    const prim = finalStep(runPrim(graph, 1))
    const treeEdges = Object.values(prim.edgeStates).filter((state) => state === 'tree')
    expect(treeEdges).toHaveLength(5)
    expect(prim.totalCost).toBe(kruskal.totalCost)
    expect(prim.totalCost).toBe(18)
  })
})

describe('runRootedTreeAnalysis', () => {
  it('reads tata = 0 1 1 2 2 3 3 as root 1, leaves 4..7, and height 2', () => {
    const built = fromParentArray('0 1 1 2 2 3 3')
    expect(built.error).toBeNull()
    const info = finalStep(runRootedTreeAnalysis(built.graph, built.rootId)).treeInfo
    expect(info).toMatchObject({
      root: 1,
      leaves: [4, 5, 6, 7],
      height: 2,
      isValidTree: true,
      levels: { 1: 0, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2, 7: 2 },
    })
    expect(info?.childrenMap[1]).toEqual([2, 3])
    expect(info?.childrenMap[2]).toEqual([4, 5])
    expect(info?.childrenMap[3]).toEqual([6, 7])
  })
})

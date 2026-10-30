import { describe, expect, it } from 'vitest'
import { runEulerianCheck, runHamiltonianCheck } from '../algorithms/eulerHamilton'
import type { AlgorithmStep } from '../algorithms/types'
import { analyzeGraph } from '../bacInspector'
import type { GraphEdge, GraphNode, GraphStateData } from '../types'

function makeGraph(n: number, links: readonly (readonly [number, number])[]): GraphStateData {
  const nodes: GraphNode[] = []
  for (let id = 1; id <= n; id += 1) nodes.push({ id, label: String(id), x: id * 50, y: 80 })
  const edges: GraphEdge[] = links.map(([source, target]) => ({
    id: `${Math.min(source, target)}--${Math.max(source, target)}`,
    source,
    target,
    weight: 1,
  }))
  return { nodes, edges, isDirected: false, isWeighted: false }
}

function complete(n: number): GraphStateData {
  const links: [number, number][] = []
  for (let source = 1; source <= n; source += 1) {
    for (let target = source + 1; target <= n; target += 1) links.push([source, target])
  }
  return makeGraph(n, links)
}

/** Default 6-node drawing: the cycle plus the three diameters, which is K₃,₃. */
function k33(): GraphStateData {
  return makeGraph(6, [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 1],
    [1, 4],
    [2, 5],
    [3, 6],
  ])
}

function expectPlayback(steps: AlgorithmStep[]): AlgorithmStep {
  expect(steps.length).toBeGreaterThan(1)
  steps.forEach((step, index) => {
    expect(step.stepIndex).toBe(index)
  })
  const step = steps[steps.length - 1]
  if (!step) throw new Error('Algoritmul nu a produs niciun pas.')
  return step
}

describe('analyzeGraph', () => {
  it('recognizes K5 as complete, Eulerian, and Hamiltonian with m = 10', () => {
    const report = analyzeGraph(complete(5))
    expect(report.n).toBe(5)
    expect(report.m).toBe(10)
    expect(report.isComplete).toBe(true)
    expect(report.degreeSequence).toEqual([4, 4, 4, 4, 4])
    expect(report.isEulerian).toBe(true)
    expect(report.eulerianCycleEdgeIds).toHaveLength(10)
    expect(report.isHamiltonian).toBe(true)
    expect(report.hamiltonianCycle?.[0]).toBe(report.hamiltonianCycle?.at(-1))
    expect(report.hamiltonianDetermined).toBe(true)
  })

  it('recognizes the default K3,3: bipartite and Hamiltonian, not Eulerian', () => {
    const report = analyzeGraph(k33())
    expect(report.n).toBe(6)
    expect(report.m).toBe(9)
    expect(report.isBipartite).toBe(true)
    expect(report.partitionA).toHaveLength(3)
    expect(report.partitionB).toHaveLength(3)
    expect(report.isHamiltonian).toBe(true)
    expect(report.isEulerian).toBe(false)
    expect(report.eulerianViolators).toEqual([1, 2, 3, 4, 5, 6])
    expect(report.edgesToRemoveForSpanningTree).toBe(4)
    expect(report.m - report.n + 1).toBe(4)
    expect(report.totalGraphsWithN.labeledTrees).toContain('6^(4)')
    expect(report.totalGraphsWithN.labeledTrees).toContain('1296')
  })

  it('recognizes a tree: connected, acyclic, m = n - 1, nothing to delete', () => {
    const report = analyzeGraph(
      makeGraph(4, [
        [1, 2],
        [2, 3],
        [3, 4],
      ]),
    )
    expect(report.m).toBe(report.n - 1)
    expect(report.isConnected).toBe(true)
    expect(report.isAcyclic).toBe(true)
    expect(report.isTree).toBe(true)
    expect(report.edgesToRemoveForSpanningTree).toBe(0)
  })
})

describe('runEulerianCheck and runHamiltonianCheck', () => {
  it('generates an Eulerian circuit on K5 and rejects K3,3', () => {
    const k5 = expectPlayback(runEulerianCheck(complete(5), 1))
    expect(k5.summaryVerdict).toBe('Graful este eulerian.')
    expect(k5.outputOrder[0]).toBe(1)
    expect(k5.outputOrder.at(-1)).toBe(1)
    expect(k5.outputOrder.length).toBe(11)

    const bipartite = expectPlayback(runEulerianCheck(k33(), 1))
    expect(bipartite.summaryVerdict).toBe('Graful NU este eulerian.')
  })

  it('generates a Hamiltonian cycle on K5', () => {
    const done = expectPlayback(runHamiltonianCheck(complete(5), 1))
    expect(done.summaryVerdict).toBe('Graful este hamiltonian.')
    expect(done.outputOrder[0]).toBe(1)
    expect(done.outputOrder.at(-1)).toBe(1)
    expect(new Set(done.outputOrder.slice(0, -1)).size).toBe(5)
  })
})

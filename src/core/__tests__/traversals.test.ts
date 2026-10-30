import { describe, expect, it } from 'vitest'
import {
  runBFS,
  runBipartiteCheck,
  runConnectedComponents,
  runCycleDetection,
  runDFS,
} from '../algorithms/traversals'
import type { AlgorithmStep } from '../algorithms/types'
import type { GraphEdge, GraphNode, GraphStateData } from '../types'

function makeGraph(
  n: number,
  links: readonly (readonly [number, number])[],
  isDirected = false,
): GraphStateData {
  const nodes: GraphNode[] = []
  for (let id = 1; id <= n; id += 1) nodes.push({ id, label: String(id), x: id * 30, y: 40 })
  const edges: GraphEdge[] = links.map(([source, target]) => ({
    id: isDirected ? `${source}->${target}` : `${Math.min(source, target)}--${Math.max(source, target)}`,
    source,
    target,
    weight: 1,
  }))
  return { nodes, edges, isDirected, isWeighted: false }
}

function finalStep(steps: AlgorithmStep[]): AlgorithmStep {
  const step = steps[steps.length - 1]
  if (!step) throw new Error('Algoritmul nu a produs niciun pas.')
  return step
}

/** Tree 1-2, 1-3, 2-4, 2-5, 3-6. Neighbors are always taken in increasing order. */
function sampleTree(): GraphStateData {
  return makeGraph(6, [
    [1, 2],
    [1, 3],
    [2, 4],
    [2, 5],
    [3, 6],
  ])
}

describe('runBFS', () => {
  it('visits neighbors in ascending order and records dist, tata, and the BAC queue', () => {
    const steps = runBFS(sampleTree(), 1)
    const opened = steps[0]
    if (!opened) throw new Error('missing BFS frame')
    expect(opened.title).toBe('Inițializare BFS')
    expect(opened.queue).toMatchObject({ st: 1, dr: 1 })
    expect(opened.queue?.items[1]).toBe(1)
    expect(opened.dist[1]).toBe(0)
    expect(opened.tata[1]).toBe(0)

    const firstChild = steps.find((step) => step.title === 'Adăugare în coadă' && step.dist[2] === 1)
    expect(firstChild?.tata[2]).toBe(1)
    expect(firstChild?.queue).toMatchObject({ st: 2, dr: 2 })
    expect(firstChild?.queue?.items[2]).toBe(2)

    const done = finalStep(steps)
    expect(done.outputOrder).toEqual([1, 2, 3, 4, 5, 6])
    expect(done.dist).toEqual([null, 0, 1, 1, 2, 2, 2])
    expect(done.tata).toEqual([0, 0, 1, 1, 2, 2, 3])
    expect(done.viz.slice(1).every((value) => value === 1)).toBe(true)
    expect(done.queue).toMatchObject({ st: 7, dr: 6 })
    expect(done.summaryVerdict).toContain('1 2 3 4 5 6')
  })
})

describe('runDFS', () => {
  it('follows the recursive depth-first order and marks viz', () => {
    const done = finalStep(runDFS(sampleTree(), 1))
    expect(done.outputOrder).toEqual([1, 2, 4, 5, 3, 6])
    expect(done.viz).toEqual([0, 1, 1, 1, 1, 1, 1])
    expect(done.tata).toEqual([0, 0, 1, 1, 2, 2, 3])
    expect(done.dist).toEqual([null, 0, 1, 1, 2, 2, 2])
    expect(done.stack).toEqual([])
  })
})

describe('runConnectedComponents', () => {
  it('reports nrc = 3 on an undirected disconnected graph', () => {
    const graph = makeGraph(5, [
      [1, 2],
      [4, 5],
    ])
    const done = finalStep(runConnectedComponents(graph, 1))
    expect(done.viz).toEqual([0, 1, 1, 2, 3, 3])
    expect(done.summaryVerdict).toBe('Graful NU este conex (3 componente conexe).')
  })

  it('splits a digraph with the Plus-Minus method', () => {
    const graph = makeGraph(
      6,
      [
        [1, 2],
        [2, 3],
        [3, 1],
        [4, 5],
        [5, 6],
        [6, 4],
        [2, 4],
      ],
      true,
    )
    const done = finalStep(runConnectedComponents(graph, 1))
    expect(done.viz).toEqual([0, 1, 1, 1, 2, 2, 2])
    expect(done.summaryVerdict).toBe('Graful are 2 componente tare conexe.')
  })
})

describe('runCycleDetection', () => {
  it('accepts a tree as acyclic and reports a cycle when one exists', () => {
    const tree = finalStep(runCycleDetection(sampleTree(), 1))
    expect(tree.summaryVerdict).toContain('aciclic')
    expect(tree.summaryVerdict).not.toContain('Ciclu detectat')

    const triangle = finalStep(
      runCycleDetection(
        makeGraph(3, [
          [1, 2],
          [2, 3],
          [3, 1],
        ]),
        1,
      ),
    )
    expect(triangle.summaryVerdict).toContain('Ciclu detectat')

    const dag = finalStep(
      runCycleDetection(
        makeGraph(
          3,
          [
            [1, 2],
            [2, 3],
          ],
          true,
        ),
        1,
      ),
    )
    expect(dag.summaryVerdict).toContain('aciclic')

    const circuit = finalStep(
      runCycleDetection(
        makeGraph(
          3,
          [
            [1, 2],
            [2, 3],
            [3, 1],
          ],
          true,
        ),
        1,
      ),
    )
    expect(circuit.summaryVerdict).toContain('Ciclu detectat')
  })
})

describe('runBipartiteCheck', () => {
  it('answers DA for an even cycle and a tree, and NU for C3 and C5', () => {
    const even = finalStep(
      runBipartiteCheck(
        makeGraph(4, [
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 1],
        ]),
        1,
      ),
    )
    expect(even.summaryVerdict).toContain('ESTE bipartit')
    expect(even.viz).toEqual([0, 1, 2, 1, 2])

    const tree = finalStep(runBipartiteCheck(sampleTree(), 1))
    expect(tree.summaryVerdict).toContain('ESTE bipartit')
    expect(tree.summaryVerdict).not.toContain('NU este bipartit')

    const triangle = finalStep(
      runBipartiteCheck(
        makeGraph(3, [
          [1, 2],
          [2, 3],
          [1, 3],
        ]),
        1,
      ),
    )
    expect(triangle.summaryVerdict).toContain('NU este bipartit')

    const pentagon = finalStep(
      runBipartiteCheck(
        makeGraph(5, [
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 5],
          [5, 1],
        ]),
        1,
      ),
    )
    expect(pentagon.summaryVerdict).toContain('NU este bipartit')
  })
})

import { describe, expect, it } from 'vitest'
import {
  computeNodeDegrees,
  fromAdjacencyMatrix,
  fromParentArray,
  parseBacInputFormat,
  serializeToBacFormat,
  toAdjacencyMatrix,
} from '../representations'
import type { GraphEdge, GraphNode, GraphStateData } from '../types'

function makeGraph(
  n: number,
  links: readonly (readonly [number, number, number?])[],
  isDirected = false,
  isWeighted = false,
): GraphStateData {
  const nodes: GraphNode[] = []
  for (let id = 1; id <= n; id += 1) {
    nodes.push({ id, label: String(id), x: 40 + id * 20, y: 80 + id * 10 })
  }
  const edges: GraphEdge[] = links.map(([source, target, weight]) => ({
    id: isDirected ? `${source}->${target}` : `${Math.min(source, target)}--${Math.max(source, target)}`,
    source,
    target,
    weight: weight ?? 1,
  }))
  return { nodes, edges, isDirected, isWeighted }
}

function edgeSignature(graph: GraphStateData): string[] {
  return graph.edges
    .map((edge) => {
      const source = graph.isDirected ? edge.source : Math.min(edge.source, edge.target)
      const target = graph.isDirected ? edge.target : Math.max(edge.source, edge.target)
      return `${source}:${target}:${edge.weight}`
    })
    .sort()
}

describe('toAdjacencyMatrix', () => {
  it('builds a 1-based matrix with unused row 0 and column 0', () => {
    const graph = makeGraph(3, [
      [1, 2],
      [2, 3],
    ])
    const matrix = toAdjacencyMatrix(graph)

    expect(matrix).toHaveLength(4)
    expect(matrix.every((row) => row.length === 4)).toBe(true)
    for (let index = 0; index < matrix.length; index += 1) {
      expect(matrix[0]?.[index]).toBe(0)
      expect(matrix[index]?.[0]).toBe(0)
    }
  })

  it('keeps an undirected matrix symmetric and a directed matrix asymmetric', () => {
    const undirected = toAdjacencyMatrix(
      makeGraph(3, [
        [1, 2],
        [2, 3],
      ]),
    )
    expect(undirected[1]?.[2]).toBe(1)
    expect(undirected[2]?.[1]).toBe(1)
    expect(undirected[1]?.[3]).toBe(0)
    expect(undirected[3]?.[1]).toBe(0)
    for (let row = 1; row <= 3; row += 1) {
      for (let column = 1; column <= 3; column += 1) {
        expect(undirected[row]?.[column]).toBe(undirected[column]?.[row])
      }
    }

    const directed = toAdjacencyMatrix(makeGraph(3, [[1, 2]], true))
    expect(directed[1]?.[2]).toBe(1)
    expect(directed[2]?.[1]).toBe(0)
  })

  it('stores the cost in a weighted matrix instead of 1', () => {
    const matrix = toAdjacencyMatrix(makeGraph(2, [[1, 2, 7]], false, true))
    expect(matrix[1]?.[2]).toBe(7)
    expect(matrix[2]?.[1]).toBe(7)
  })
})

describe('fromAdjacencyMatrix', () => {
  it('round-trips undirected weights and keeps existing coordinates', () => {
    const graph = makeGraph(
      3,
      [
        [2, 1, 4],
        [3, 2, 9],
      ],
      false,
      true,
    )
    const node = graph.nodes[1]
    if (!node) throw new Error('missing node')
    node.label = 'B'
    node.x = 123
    node.y = 456

    const rebuilt = fromAdjacencyMatrix(toAdjacencyMatrix(graph), graph.nodes, false, true)
    expect(edgeSignature(rebuilt)).toEqual(edgeSignature(graph))
    expect(rebuilt.nodes.find((item) => item.id === 2)).toMatchObject({ label: 'B', x: 123, y: 456 })
    expect(rebuilt.isDirected).toBe(false)
    expect(rebuilt.isWeighted).toBe(true)
  })

  it('round-trips a directed matrix without mirroring arcs', () => {
    const graph = makeGraph(
      3,
      [
        [1, 2, 4],
        [2, 3, 5],
      ],
      true,
      true,
    )
    const rebuilt = fromAdjacencyMatrix(toAdjacencyMatrix(graph), graph.nodes, true, true)
    expect(edgeSignature(rebuilt)).toEqual(['1:2:4', '2:3:5'])
    const matrix = toAdjacencyMatrix(rebuilt)
    expect(matrix[1]?.[2]).toBe(4)
    expect(matrix[2]?.[1]).toBe(0)
  })
})

describe('computeNodeDegrees', () => {
  it('marks isolated, pendant, and internal nodes on an undirected graph', () => {
    const degrees = computeNodeDegrees(
      makeGraph(4, [
        [1, 2],
        [2, 3],
      ]),
    )

    expect(degrees[1]).toMatchObject({ degree: 1, isPendant: true, isIsolated: false })
    expect(degrees[2]).toMatchObject({ degree: 2, isPendant: false, isIsolated: false })
    expect(degrees[3]).toMatchObject({ degree: 1, isPendant: true, isIsolated: false })
    expect(degrees[4]).toMatchObject({ degree: 0, inDegree: 0, outDegree: 0, isIsolated: true, isPendant: false })
    expect(degrees[2]?.degree).toBeGreaterThanOrEqual(2)
  })

  it('counts an undirected loop as degree 2', () => {
    const degrees = computeNodeDegrees(makeGraph(1, [[1, 1]]))
    expect(degrees[1]).toMatchObject({ degree: 2, inDegree: 2, outDegree: 2, isIsolated: false, isPendant: false })
  })

  it('separates inDegree and outDegree on a digraph', () => {
    const degrees = computeNodeDegrees(
      makeGraph(
        4,
        [
          [1, 2],
          [1, 3],
          [2, 3],
        ],
        true,
      ),
    )

    expect(degrees[1]).toMatchObject({ degree: 2, inDegree: 0, outDegree: 2 })
    expect(degrees[2]).toMatchObject({ degree: 2, inDegree: 1, outDegree: 1 })
    expect(degrees[3]).toMatchObject({ degree: 2, inDegree: 2, outDegree: 0 })
    expect(degrees[4]).toMatchObject({ degree: 0, inDegree: 0, outDegree: 0, isIsolated: true })
  })
})

describe('parseBacInputFormat and serializeToBacFormat', () => {
  it('reads a valid N M edge list and writes it back', () => {
    const parsed = parseBacInputFormat('3 2\n1 2\n2 3\n', false, false)
    expect(parsed.error).toBeNull()
    expect(parsed.graph.nodes.map((node) => node.id)).toEqual([1, 2, 3])
    expect(edgeSignature(parsed.graph)).toEqual(['1:2:1', '2:3:1'])

    const again = parseBacInputFormat(serializeToBacFormat(parsed.graph), false, false)
    expect(again.error).toBeNull()
    expect(edgeSignature(again.graph)).toEqual(edgeSignature(parsed.graph))
    expect(serializeToBacFormat(parsed.graph)).toBe('3 2\n1 2\n2 3\n')
  })

  it('keeps costs from a weighted N M list', () => {
    const parsed = parseBacInputFormat('3 2\n1 2 5\n2 3 4\n', false, true)
    expect(parsed.error).toBeNull()
    expect(edgeSignature(parsed.graph)).toEqual(['1:2:5', '2:3:4'])
    expect(serializeToBacFormat(parsed.graph)).toBe('3 2\n1 2 5\n2 3 4\n')
  })

  it('rejects a node greater than N or smaller than 1', () => {
    const tooHigh = parseBacInputFormat('3 1\n1 4\n', false, false)
    expect(tooHigh.error).toContain('inside [1, 3]')
    expect(tooHigh.graph.nodes).toEqual([])

    const tooLow = parseBacInputFormat('2 1\n0 1\n', false, false)
    expect(tooLow.error).toContain('inside [1, 2]')
    expect(tooLow.graph.edges).toEqual([])
  })
})

describe('fromParentArray', () => {
  it('builds the BAC tree for tata = 0 1 1 2 2 3 3', () => {
    const built = fromParentArray('0 1 1 2 2 3 3')
    expect(built.error).toBeNull()
    expect(built.rootId).toBe(1)
    expect(built.graph.nodes).toHaveLength(7)
    expect(built.graph.edges).toHaveLength(6)
    expect(edgeSignature(built.graph)).toEqual(['1:2:1', '1:3:1', '2:4:1', '2:5:1', '3:6:1', '3:7:1'])
    expect(built.graph.isDirected).toBe(false)
    expect(built.graph.isWeighted).toBe(false)
  })

  it('rejects an index outside 0..N and a vector with no root', () => {
    const tooHigh = fromParentArray('0 5')
    expect(tooHigh.error).toContain('între 0 și 2')
    expect(tooHigh.graph.edges).toEqual([])
    expect(tooHigh.rootId).toBe(0)

    const negative = fromParentArray('0 -1')
    expect(negative.error).toContain('între 0 și 2')

    const self = fromParentArray('1 0')
    expect(self.error).toContain('nu poate fi 1')

    const missingRoot = fromParentArray('2 3 1')
    expect(missingRoot.error).toContain('rădăcină')
    expect(missingRoot.rootId).toBe(0)
    expect(missingRoot.graph.nodes).toEqual([])
  })
})

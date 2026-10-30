import { runEulerianCheck, runHamiltonianCheck } from '../src/core/algorithms/eulerHamilton'
import { analyzeGraph } from '../src/core/bacInspector'
import { edgeKey } from '../src/core/representations'
import type { GraphStateData } from '../src/core/types'

let failed = 0

function check(condition: boolean, message: string): void {
  if (condition) return
  failed += 1
  console.error(`FAIL ${message}`)
}

function graph(n: number, pairs: readonly (readonly [number, number])[], directed = false): GraphStateData {
  const nodes = Array.from({ length: n }, (_, index) => ({
    id: index + 1,
    label: String(index + 1),
    x: 0,
    y: 0,
  }))
  const edges = pairs.map(([source, target]) => ({
    id: edgeKey(source, target, directed),
    source,
    target,
    weight: 1,
  }))
  return { nodes, edges, isDirected: directed, isWeighted: false }
}

function assertClosedTour(name: string, data: GraphStateData, nodes: number[] | null, edgeIds: string[] | null): void {
  check(nodes !== null && edgeIds !== null, `${name}: missing closed tour`)
  if (!nodes || !edgeIds) return
  check(nodes[0] === nodes[nodes.length - 1], `${name}: tour is not closed (${nodes.join('->')})`)
  check(edgeIds.length === data.edges.length, `${name}: expected ${data.edges.length} edges, got ${edgeIds.length}`)
  check(new Set(edgeIds).size === edgeIds.length, `${name}: repeated edge in tour`)
  const expected = new Set(data.edges.map((item) => item.id))
  check(edgeIds.every((id) => expected.has(id)), `${name}: tour uses an unknown edge`)
  for (let index = 0; index < edgeIds.length; index += 1) {
    const from = nodes[index]
    const to = nodes[index + 1]
    const id = edgeIds[index]
    const edge = data.edges.find((item) => item.id === id)
    const matches =
      edge !== undefined &&
      ((edge.source === from && edge.target === to) ||
        (!data.isDirected && edge.source === to && edge.target === from))
    check(matches, `${name}: edge ${String(id)} does not join ${String(from)} and ${String(to)}`)
  }
}

function assertPath(name: string, data: GraphStateData, nodes: number[] | null, edgeIds: string[] | null, closed: boolean): void {
  check(nodes !== null && edgeIds !== null, `${name}: missing walk`)
  if (!nodes || !edgeIds) return
  check(nodes.length === data.nodes.length + (closed ? 1 : 0), `${name}: walk length ${nodes.length}`)
  const body = closed ? nodes.slice(0, -1) : nodes
  check(new Set(body).size === data.nodes.length, `${name}: walk misses a node ${nodes.join('->')}`)
  check(edgeIds.length === nodes.length - 1, `${name}: edge count`)
  for (let index = 0; index < edgeIds.length; index += 1) {
    const from = nodes[index]
    const to = nodes[index + 1]
    const edge = data.edges.find((item) => item.id === edgeIds[index])
    const matches =
      edge !== undefined &&
      ((edge.source === from && edge.target === to) ||
        (!data.isDirected && edge.source === to && edge.target === from))
    check(matches, `${name}: bad hop ${String(from)} -> ${String(to)}`)
  }
}

const triangle = graph(3, [
  [1, 2],
  [2, 3],
  [3, 1],
])
const triangleReport = analyzeGraph(triangle)
check(triangleReport.isComplete, 'K3 complete')
check(triangleReport.isCompleteExplanation.includes('Fiecare nod are gradul n - 1 = 2'), triangleReport.isCompleteExplanation)
check(triangleReport.sumOfDegrees === 6, `K3 sum ${triangleReport.sumOfDegrees}`)
check(triangleReport.isEulerian, 'K3 eulerian')
check(triangleReport.eulerianExplanation.includes('Toate nodurile au grad par'), triangleReport.eulerianExplanation)
check(triangleReport.isHamiltonian && triangleReport.hamiltonianDetermined, 'K3 hamilton')
check(triangleReport.diracSatisfied, 'K3 Dirac')
check(triangleReport.oreSatisfied, 'K3 Ore')
check(!triangleReport.isBipartite, 'K3 not bipartite')
check(!triangleReport.isAcyclic, 'K3 cyclic')
check(!triangleReport.isTree && triangleReport.treeExplanation.includes('Are cicluri'), triangleReport.treeExplanation)
check(triangleReport.edgesToRemoveForSpanningTree === 1, 'K3 cyclomatic')
check(triangleReport.totalGraphsWithN.undirectedGraphs.includes('2^3 = 8'), triangleReport.totalGraphsWithN.undirectedGraphs)
check(triangleReport.totalGraphsWithN.labeledTrees.includes('3^(1) = 3'), triangleReport.totalGraphsWithN.labeledTrees)
assertClosedTour('K3 euler', triangle, triangleReport.eulerianCycle, triangleReport.eulerianCycleEdgeIds)
assertPath('K3 ham', triangle, triangleReport.hamiltonianCycle, triangleReport.hamiltonianCycleEdgeIds, true)

const path4 = graph(4, [
  [1, 2],
  [2, 3],
  [3, 4],
])
const pathReport = analyzeGraph(path4)
check(pathReport.isTree, pathReport.treeExplanation)
check(pathReport.treeExplanation.includes('Conex și m = n - 1'), pathReport.treeExplanation)
check(pathReport.isAcyclic && pathReport.isBipartite, 'path bipartite acyclic')
check(pathReport.partitionA.join(',') === '1,3' && pathReport.partitionB.join(',') === '2,4', `parts ${pathReport.partitionA} / ${pathReport.partitionB}`)
check(!pathReport.isEulerian && pathReport.hasEulerianTrail, 'path trail')
check(pathReport.eulerianExplanation.includes('Nodurile {1, 4} au grad impar'), pathReport.eulerianExplanation)
check(pathReport.eulerianTrail?.join(',') === '1,2,3,4', `trail ${pathReport.eulerianTrail?.join(',')}`)
check(!pathReport.isHamiltonian && pathReport.hamiltonianPath?.length === 4, 'path ham path only')
check(!pathReport.diracSatisfied && !pathReport.oreSatisfied, 'path theorems fail')
check(pathReport.edgesNeededForComplete === 3, 'path missing edges')
check(pathReport.isolatedNodes.length === 0 && pathReport.pendantNodes.join(',') === '1,4', 'pendants')
check(pathReport.edgesToRemoveForSpanningTree === 0, 'tree removes 0')
check(pathReport.sumOfDegrees === 6, 'path handshaking')

const disconnected = graph(4, [
  [1, 2],
  [3, 4],
])
const disconnectedReport = analyzeGraph(disconnected)
check(!disconnectedReport.isConnected && disconnectedReport.connectedComponentsCount === 2, 'two components')
check(disconnectedReport.minEdgesToConnect === 1, 'one edge to connect')
check(disconnectedReport.treeExplanation.includes('Nu este conex'), disconnectedReport.treeExplanation)
check(disconnectedReport.edgesToRemoveForSpanningTree === null, 'no spanning tree')
check(!disconnectedReport.isEulerian && !disconnectedReport.hasEulerianTrail, 'disconnected not euler')
check(!disconnectedReport.isHamiltonian && disconnectedReport.hamiltonianPath === null, 'disconnected no ham path')
check(disconnectedReport.isBipartite, 'two edges are bipartite')

const figure8 = graph(5, [
  [1, 2],
  [2, 3],
  [3, 1],
  [1, 4],
  [4, 5],
  [5, 1],
])
const eight = analyzeGraph(figure8)
check(eight.isEulerian && !eight.isHamiltonian && eight.hamiltonianDetermined, `figure8 euler ${eight.isEulerian} ham ${eight.isHamiltonian}`)
check(eight.hamiltonianPath !== null && eight.hamiltonianPath.length === 5, `figure8 path ${eight.hamiltonianPath?.join(',')}`)
check(eight.degreeSequence.join(',') === '4,2,2,2,2', `figure8 degrees ${eight.degreeSequence.join(',')}`)
check(eight.maxDegreeNodes.join(',') === '1', 'figure8 center')
assertClosedTour('figure8', figure8, eight.eulerianCycle, eight.eulerianCycleEdgeIds)

const withIsolate = graph(4, [
  [1, 2],
  [2, 3],
  [3, 1],
])
const isolateReport = analyzeGraph(withIsolate)
check(isolateReport.isolatedNodes.join(',') === '4', 'isolate id')
check(isolateReport.isEulerian && !isolateReport.isConnected, 'euler ignoring isolate')
check(isolateReport.eulerianExplanation.includes('izolate'), isolateReport.eulerianExplanation)
assertClosedTour('isolate triangle', withIsolate, isolateReport.eulerianCycle, isolateReport.eulerianCycleEdgeIds)
check(isolateReport.minEdgesToConnect === 1, 'isolate needs one edge')

const k5 = graph(
  5,
  [
    [1, 2],
    [1, 3],
    [1, 4],
    [1, 5],
    [2, 3],
    [2, 4],
    [2, 5],
    [3, 4],
    [3, 5],
    [4, 5],
  ],
)
const k5Report = analyzeGraph(k5)
check(k5Report.isComplete && k5Report.isEulerian && k5Report.isHamiltonian, 'K5 flags')
check(k5Report.totalGraphsWithN.undirectedGraphs.includes('2^10 = 1024'), k5Report.totalGraphsWithN.undirectedGraphs)
check(k5Report.totalGraphsWithN.labeledTrees.includes('5^(3) = 125'), k5Report.totalGraphsWithN.labeledTrees)
check(k5Report.sumOfDegrees === 20 && k5Report.m === 10, 'K5 handshaking')
assertClosedTour('K5 euler', k5, k5Report.eulerianCycle, k5Report.eulerianCycleEdgeIds)
assertPath('K5 ham', k5, k5Report.hamiltonianCycle, k5Report.hamiltonianCycleEdgeIds, true)

const k4 = graph(4, [
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 3],
  [2, 4],
  [3, 4],
])
const k4Report = analyzeGraph(k4)
check(k4Report.isComplete && !k4Report.isEulerian && k4Report.eulerianViolators.length === 4, 'K4 odd')
check(k4Report.eulerianExplanation.includes('au grad impar'), k4Report.eulerianExplanation)
check(k4Report.isHamiltonian && k4Report.diracSatisfied, 'K4 Dirac')
check(k4Report.edgesToRemoveForSpanningTree === 3, 'K4 cyclomatic')

const directedCycle = graph(
  3,
  [
    [1, 2],
    [2, 3],
    [3, 1],
  ],
  true,
)
const directedCycleReport = analyzeGraph(directedCycle)
check(directedCycleReport.isStronglyConnected && directedCycleReport.isEulerian, 'directed cycle euler')
check(directedCycleReport.isHamiltonian, 'directed cycle ham')
check(!directedCycleReport.isBipartite && !directedCycleReport.isAcyclic && !directedCycleReport.isTree, 'directed cycle shape')
check(directedCycleReport.edgesToRemoveForSpanningTree === 1, 'directed support cyclomatic')
assertClosedTour('directed cycle', directedCycle, directedCycleReport.eulerianCycle, directedCycleReport.eulerianCycleEdgeIds)
assertPath('directed ham', directedCycle, directedCycleReport.hamiltonianCycle, directedCycleReport.hamiltonianCycleEdgeIds, true)

const directedPath = graph(
  3,
  [
    [1, 2],
    [2, 3],
  ],
  true,
)
const directedPathReport = analyzeGraph(directedPath)
check(!directedPathReport.isEulerian && directedPathReport.hasEulerianTrail, 'directed trail')
check(directedPathReport.eulerianTrail?.join(',') === '1,2,3', `directed trail ${directedPathReport.eulerianTrail?.join(',')}`)
check(directedPathReport.isAcyclic && directedPathReport.isBipartite, 'directed path acyclic bipartite')
check(!directedPathReport.isTree && directedPathReport.treeExplanation.includes('orientat'), directedPathReport.treeExplanation)
check(directedPathReport.edgesToRemoveForSpanningTree === 0, 'support is a tree')
check(!directedPathReport.isHamiltonian && directedPathReport.hamiltonianPath?.join(',') === '1,2,3', 'directed ham path')
check(directedPathReport.isWeaklyConnected && !directedPathReport.isStronglyConnected, 'weak but not strong')
check(directedPathReport.strongComponentsCount === 3, `scc ${directedPathReport.strongComponentsCount}`)

const mutual = graph(
  4,
  [
    [1, 2],
    [2, 1],
  ],
  true,
)
const mutualReport = analyzeGraph(mutual)
check(mutualReport.isEulerian, `mutual euler ${mutualReport.eulerianExplanation}`)
check(mutualReport.isolatedNodes.join(',') === '3,4', `mutual isolates ${mutualReport.isolatedNodes.join(',')}`)
assertClosedTour('mutual', mutual, mutualReport.eulerianCycle, mutualReport.eulerianCycleEdgeIds)

const empty = analyzeGraph({ nodes: [], edges: [], isDirected: false, isWeighted: false })
check(!empty.isEulerian && !empty.isTree && empty.n === 0 && empty.m === 0, 'empty')
check(empty.totalGraphsWithN.undirectedGraphs.includes('2^0 = 1'), empty.totalGraphsWithN.undirectedGraphs)

const single = analyzeGraph({
  nodes: [{ id: 1, label: '1', x: 0, y: 0 }],
  edges: [],
  isDirected: false,
  isWeighted: false,
})
check(single.isTree && single.isComplete && single.isEulerian && !single.isHamiltonian, `single ${single.treeExplanation}`)
check(single.hamiltonianPath?.join(',') === '1', 'single path')
check(single.isCompleteExplanation.includes('n - 1 = 0'), single.isCompleteExplanation)

const classic = graph(6, [
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
const classicReport = analyzeGraph(classic)
check(classicReport.m === 9 && classicReport.sumOfDegrees === 18, 'classic handshaking')
check(!classicReport.isEulerian && classicReport.eulerianViolators.length === 6, 'classic all odd')
check(classicReport.isBipartite, `classic bipartite ${classicReport.bipartiteExplanation}`)
check(classicReport.isHamiltonian, 'classic ham')
check(classicReport.partitionA.length === 3 && classicReport.partitionB.length === 3, 'classic halves')

const eulerSteps = runEulerianCheck(triangle, 2)
const eulerLast = eulerSteps[eulerSteps.length - 1]
check(eulerLast?.summaryVerdict === 'Graful este eulerian.', eulerLast?.summaryVerdict ?? 'missing euler verdict')
check(
  eulerLast?.outputOrder[0] === 2 && eulerLast.outputOrder[eulerLast.outputOrder.length - 1] === 2,
  `rotated tour ${eulerLast?.outputOrder.join(',')}`,
)
check(
  eulerSteps.some((step) => step.activeEdgeId !== null && step.edgeStates[step.activeEdgeId] === 'active'),
  'euler tour highlights the current edge',
)
check(
  triangle.edges.every((edge) => eulerLast?.edgeStates[edge.id] === 'cycle'),
  'euler tour paints every edge',
)

const pathSteps = runHamiltonianCheck(path4, 1)
const pathLast = pathSteps[pathSteps.length - 1]
check(pathLast?.summaryVerdict === 'Graful NU este hamiltonian.', pathLast?.summaryVerdict ?? 'missing ham verdict')
check(pathLast?.viz.slice(1).every((value) => value === 1) === true, `path viz ${pathLast?.viz.join(',')}`)
check(
  path4.edges.every((edge) => pathLast?.edgeStates[edge.id] === 'cycle'),
  'hamilton path paints its edges',
)

const oddSteps = runEulerianCheck(k4, 1)
const oddLast = oddSteps[oddSteps.length - 1]
check(oddLast?.summaryVerdict?.includes('NU este eulerian') === true, oddLast?.summaryVerdict ?? 'missing odd verdict')
check(
  Object.values(oddLast?.nodeStates ?? {}).filter((state) => state === 'conflict').length === 4,
  'K4 highlights four odd nodes',
)

const directedSteps = runEulerianCheck(directedCycle, 3)
const directedLast = directedSteps[directedSteps.length - 1]
check(directedLast?.outputOrder[0] === 3 && directedLast.summaryVerdict === 'Graful este eulerian.', `directed start ${directedLast?.outputOrder.join(',')}`)

if (failed > 0) {
  console.error(`${failed} checks failed`)
  process.exit(1)
}
console.log('bac inspector checks passed')

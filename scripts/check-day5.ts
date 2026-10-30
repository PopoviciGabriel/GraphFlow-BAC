import { runDijkstra, runKruskal, runRootedTreeAnalysis, runRoyFloyd } from '../src/core/algorithms/weighted'
import type { AlgorithmStep } from '../src/core/algorithms/types'
import { analyzeGraph } from '../src/core/bacInspector'
import { BAC_SCENARIO_CATEGORIES, BAC_SCENARIO_DIFFICULTIES, BAC_SCENARIOS } from '../src/core/presets'
import {
  buildGraphShareUrl,
  decodeGraphFromUrlHash,
  encodeGraphToUrlHash,
  parseStoredGraph,
  serializeGraphForStorage,
} from '../src/core/share'
import type { GraphStateData } from '../src/core/types'

let failed = 0

function check(condition: boolean, message: string): void {
  if (condition) return
  failed += 1
  console.error(`FAIL ${message}`)
}

function lastStep(steps: readonly AlgorithmStep[], name: string): AlgorithmStep | null {
  const step = steps[steps.length - 1]
  if (!step) {
    check(false, `${name}: no steps`)
    return null
  }
  return step
}

function sameGraph(left: GraphStateData, right: GraphStateData, places = 100): boolean {
  if (left.isDirected !== right.isDirected || left.isWeighted !== right.isWeighted) return false
  if (left.nodes.length !== right.nodes.length || left.edges.length !== right.edges.length) return false
  const nodes = [...left.nodes].sort((a, b) => a.id - b.id)
  const otherNodes = [...right.nodes].sort((a, b) => a.id - b.id)
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    const other = otherNodes[index]
    if (!node || !other) return false
    if (node.id !== other.id || node.label !== other.label) return false
    if (Math.round(node.x * places) !== Math.round(other.x * places)) return false
    if (Math.round(node.y * places) !== Math.round(other.y * places)) return false
  }
  const signature = (graph: GraphStateData) =>
    graph.edges
      .map((edge) => `${edge.source}>${edge.target}:${edge.weight}`)
      .sort()
      .join('|')
  return signature(left) === signature(right)
}

function minDistance(graph: GraphStateData): { gap: number; pair: string } {
  let gap = Infinity
  let pair = ''
  for (let i = 0; i < graph.nodes.length; i += 1) {
    for (let j = i + 1; j < graph.nodes.length; j += 1) {
      const left = graph.nodes[i]
      const right = graph.nodes[j]
      if (!left || !right) continue
      const distance = Math.hypot(left.x - right.x, left.y - right.y)
      if (distance < gap) {
        gap = distance
        pair = `${left.id}-${right.id}`
      }
    }
  }
  return { gap, pair }
}

const scenario = (id: string) => {
  const found = BAC_SCENARIOS.find((item) => item.id === id)
  if (!found) throw new Error(`missing ${id}`)
  return found
}

check(BAC_SCENARIOS.length === 10, `expected 10 scenarios, got ${BAC_SCENARIOS.length}`)
check(new Set(BAC_SCENARIOS.map((item) => item.id)).size === 10, 'scenario ids are not unique')

for (const item of BAC_SCENARIOS) {
  check(BAC_SCENARIO_CATEGORIES.includes(item.category), `${item.id} category`)
  check(BAC_SCENARIO_DIFFICULTIES.includes(item.difficulty), `${item.id} difficulty`)
  check(item.description.length > 80, `${item.id} description is too short`)
  const report = analyzeGraph(item.graph)
  check(report.n === item.graph.nodes.length, `${item.id} n`)
  check(report.m === item.graph.edges.length, `${item.id} m ${report.m} vs ${item.graph.edges.length}`)
  for (const node of item.graph.nodes) {
    check(node.x >= 40 && node.x <= 920 && node.y >= 40 && node.y <= 600, `${item.id} node ${node.id} is off-canvas`)
    check(node.label === String(node.id), `${item.id} label ${node.label}`)
  }
  const spacing = minDistance(item.graph)
  check(spacing.gap >= 80, `${item.id} nodes ${spacing.pair} are only ${spacing.gap.toFixed(1)}px apart`)

  const hash = encodeGraphToUrlHash(item.graph)
  check(hash.startsWith('#g='), `${item.id} hash prefix`)
  const decoded = decodeGraphFromUrlHash(hash)
  check(decoded !== null && sameGraph(item.graph, decoded), `${item.id} hash roundtrip`)
  const page = buildGraphShareUrl(item.graph, 'http://localhost:5173/graf?lab=1')
  const fromPage = decodeGraphFromUrlHash(new URL(page).hash)
  check(fromPage !== null && sameGraph(item.graph, fromPage), `${item.id} share url`)
  const stored = parseStoredGraph(serializeGraphForStorage(item.graph))
  check(stored !== null && sameGraph(item.graph, stored, 1_000_000), `${item.id} storage roundtrip`)
}

const k33 = analyzeGraph(scenario('k33-bipartite').graph)
check(k33.n === 6 && k33.m === 9, `k33 size ${k33.n} ${k33.m}`)
check(k33.isBipartite && !k33.isEulerian && k33.isHamiltonian, `k33 flags b=${k33.isBipartite} e=${k33.isEulerian} h=${k33.isHamiltonian}`)
check(k33.degreeByNode.slice(1).every((degree) => degree === 3), `k33 degrees ${k33.degreeByNode.join(',')}`)
const parts = [new Set(k33.partitionA), new Set(k33.partitionB)]
check(
  (parts[0]?.has(1) && parts[0]?.has(3) && parts[0]?.has(5) && parts[1]?.has(2) && parts[1]?.has(4) && parts[1]?.has(6)) ||
    (parts[1]?.has(1) && parts[1]?.has(3) && parts[1]?.has(5) && parts[0]?.has(2) && parts[0]?.has(4) && parts[0]?.has(6)),
  `k33 partitions ${k33.partitionA.join(',')} / ${k33.partitionB.join(',')}`,
)

const flower = analyzeGraph(scenario('even-flower').graph)
check(flower.isEulerian && flower.isHamiltonian && !flower.isBipartite, `flower flags e=${flower.isEulerian} h=${flower.isHamiltonian} b=${flower.isBipartite}`)
check(flower.degreeByNode.slice(1).every((degree) => degree === 2 || degree === 4), `flower degrees ${flower.degreeByNode.join(',')}`)

const pieces = analyzeGraph(scenario('three-components').graph)
check(pieces.connectedComponentsCount === 3, `components ${pieces.connectedComponentsCount}`)
check(pieces.minEdgesToConnect === 2, `min edges ${pieces.minEdgesToConnect}`)
check(pieces.isolatedNodes.join(',') === '7', `isolated ${pieces.isolatedNodes.join(',')}`)
check(pieces.pendantNodes.join(',') === '4,5,6', `pendants ${pieces.pendantNodes.join(',')}`)

const strong = analyzeGraph(scenario('strong-components').graph)
check(strong.strongComponentsCount === 2 && strong.isWeaklyConnected && !strong.isStronglyConnected, `scc ${strong.strongComponentsCount} weak=${strong.isWeaklyConnected} strong=${strong.isStronglyConnected}`)
check(strong.strongComponentOf[1] === strong.strongComponentOf[2] && strong.strongComponentOf[2] === strong.strongComponentOf[3], 'scc left cycle')
check(strong.strongComponentOf[4] === strong.strongComponentOf[5] && strong.strongComponentOf[5] === strong.strongComponentOf[6], 'scc right cycle')
check(strong.strongComponentOf[1] !== strong.strongComponentOf[4], 'scc are distinct')

const treeStep = lastStep(runRootedTreeAnalysis(scenario('rooted-tata-bac').graph, 1), 'tree')
const tree = treeStep?.treeInfo
check(tree?.isValidTree === true, 'tree valid')
check(tree?.leaves.join(',') === '4,6,7,8', `leaves ${tree?.leaves.join(',')}`)
check(tree?.height === 3, `height ${tree?.height}`)
check(tree?.levels[1] === 0 && tree?.levels[2] === 1 && tree?.levels[8] === 3, `levels ${JSON.stringify(tree?.levels)}`)
check(tree?.childrenMap[1]?.length === 2 && tree?.childrenMap[2]?.length === 2 && tree?.childrenMap[3]?.length === 2, 'nodes with two children')
check(tree?.childrenMap[5]?.join(',') === '8', `child of 5 is ${tree?.childrenMap[5]?.join(',')}`)

const dijkstra = lastStep(runDijkstra(scenario('dijkstra-detour').graph, 1, 5), 'dijkstra')
check(dijkstra?.dist[5] === 9, `dijkstra d[5]=${String(dijkstra?.dist[5])}`)
check(dijkstra?.outputOrder.join(',') === '1,2,3,4,5', `dijkstra path ${dijkstra?.outputOrder.join(',')}`)
check(dijkstra?.totalCost === 9, `dijkstra cost ${String(dijkstra?.totalCost)}`)

const kruskal = lastStep(runKruskal(scenario('kruskal-cycle').graph), 'kruskal')
check(kruskal?.totalCost === 18, `kruskal cost ${String(kruskal?.totalCost)}`)
const rejected = kruskal?.kruskalEdges?.find((edge) => edge.id === '1--3')
check(rejected?.status === 'rejected' && rejected.weight === 3, `kruskal 1--3 ${rejected?.status}`)
const accepted = (kruskal?.kruskalEdges ?? []).filter((edge) => edge.status === 'accepted').map((edge) => edge.id).sort()
check(accepted.join(',') === '1--2,2--3,2--4,4--5,4--6', `kruskal accepted ${accepted.join(',')}`)

const roy = lastStep(runRoyFloyd(scenario('roy-floyd-detour').graph), 'roy')
const matrix = roy?.royFloydState?.matrix
check(matrix?.[1]?.[3] === 2, `roy D[1][3]=${String(matrix?.[1]?.[3])}`)
check(matrix?.[1]?.[4] === 3, `roy D[1][4]=${String(matrix?.[1]?.[4])}`)
check(matrix?.[2]?.[4] === 2, `roy D[2][4]=${String(matrix?.[2]?.[4])}`)
check((roy?.stepIndex ?? 999) < 80, `roy produced too many steps: ${String(roy?.stepIndex)}`)

const complete = analyzeGraph(scenario('complete-k5').graph)
check(complete.isComplete && complete.m === 10 && complete.isEulerian && complete.isHamiltonian, `k5 c=${complete.isComplete} m=${complete.m} e=${complete.isEulerian} h=${complete.isHamiltonian}`)
check(complete.degreeByNode.slice(1).every((degree) => degree === 4), `k5 degrees ${complete.degreeByNode.join(',')}`)

const cycle = analyzeGraph(scenario('odd-cycle-c5').graph)
check(!cycle.isBipartite && cycle.isEulerian && cycle.m === 5, `c5 b=${cycle.isBipartite} e=${cycle.isEulerian} m=${cycle.m}`)
check(cycle.degreeByNode.slice(1).every((degree) => degree === 2), `c5 degrees ${cycle.degreeByNode.join(',')}`)

check(decodeGraphFromUrlHash('') === null, 'empty hash')
check(decodeGraphFromUrlHash('#g=') === null, 'blank payload')
check(decodeGraphFromUrlHash('#other') === null, 'foreign hash')
check(decodeGraphFromUrlHash('#g=@@@') === null, 'garbage payload')
check(parseStoredGraph('{') === null, 'broken json')
check(
  parseStoredGraph('{"v":2,"nodes":[],"edges":[],"isDirected":false,"isWeighted":false}') === null,
  'future storage version',
)
check(
  parseStoredGraph(
    JSON.stringify({
      v: 1,
      nodes: [
        { id: 1, label: '1', x: 0, y: 0 },
        { id: 3, label: '3', x: 10, y: 10 },
      ],
      edges: [],
      isDirected: false,
      isWeighted: false,
    }),
  ) === null,
  'gapped node ids',
)

const floats: GraphStateData = {
  nodes: [{ id: 1, label: 'A', x: 10.129, y: 20.994 }],
  edges: [],
  isDirected: false,
  isWeighted: false,
}
const storedFloat = parseStoredGraph(serializeGraphForStorage(floats))
check(storedFloat?.nodes[0]?.x === 10.129 && storedFloat.nodes[0]?.label === 'A', 'storage keeps precision and label')
const sharedFloat = decodeGraphFromUrlHash(encodeGraphToUrlHash(floats))
check(sharedFloat?.nodes[0]?.x === 10.13 && sharedFloat.nodes[0]?.y === 20.99, `share rounds ${sharedFloat?.nodes[0]?.x},${sharedFloat?.nodes[0]?.y}`)

if (failed > 0) {
  console.error(`${failed} day-5 checks failed`)
  process.exit(1)
}
console.log('day-5 checks passed')

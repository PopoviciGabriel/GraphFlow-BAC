/**
 * Ten curated Romanian BAC graphs.
 * Node ids are `1..N`. Coordinates sit in the 960×640 canvas and are copied
 * onto the drawing when a scenario is loaded.
 */
import type { AlgorithmId } from './algorithms/types'
import { edgeKey } from './representations'
import type { GraphEdge, GraphNode, GraphStateData } from './types'

export const BAC_SCENARIO_CATEGORIES = [
  'Parcurgeri & Conexitate',
  'Arbori & Vector de Tați',
  'Cost Minim & APM',
  'Eulerian & Hamiltonian',
] as const

export type BacScenarioCategory = (typeof BAC_SCENARIO_CATEGORIES)[number]

export const BAC_SCENARIO_DIFFICULTIES = ['Subiectul I', 'Subiectul II', 'Subiectul III'] as const

export type BacScenarioDifficulty = (typeof BAC_SCENARIO_DIFFICULTIES)[number]

export interface BacScenario {
  id: string
  title: string
  category: BacScenarioCategory
  difficulty: BacScenarioDifficulty
  /** Classic exam trap, written the way a teacher would explain it. */
  description: string
  recommendedAlgorithm: AlgorithmId
  recommendedStartNode: number
  /**
   * Dijkstra destination. Missing means the run clears any previous target.
   * `null` would mean „toate nodurile”.
   */
  recommendedTargetNode?: number | null
  graph: GraphStateData
}

function buildGraph(
  points: readonly (readonly [number, number])[],
  links: readonly (readonly [number, number, number?])[],
  isDirected: boolean,
  isWeighted: boolean,
): GraphStateData {
  const nodes: GraphNode[] = points.map(([x, y], index) => {
    const id = index + 1
    return { id, label: String(id), x, y }
  })
  const edges: GraphEdge[] = links.map(([source, target, weight]) => ({
    id: edgeKey(source, target, isDirected),
    source,
    target,
    weight: weight ?? 1,
  }))
  return { nodes, edges, isDirected, isWeighted }
}

function assertGallery(scenarios: readonly BacScenario[]): readonly BacScenario[] {
  if (scenarios.length !== 10) {
    throw new Error('Galeria BAC trebuie să conțină exact 10 scenarii.')
  }
  const ids = new Set<string>()
  for (const scenario of scenarios) {
    if (ids.has(scenario.id)) throw new Error(`Scenariu duplicat: ${scenario.id}`)
    ids.add(scenario.id)
    const graph = scenario.graph
    const count = graph.nodes.length
    const seenNodes = new Set<number>()
    for (const node of graph.nodes) {
      if (!Number.isInteger(node.id) || node.id < 1 || node.id > count || seenNodes.has(node.id)) {
        throw new Error(`Noduri 1..N invalide în ${scenario.id}`)
      }
      seenNodes.add(node.id)
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
        throw new Error(`Coordonate invalide în ${scenario.id}`)
      }
    }
    const seenEdges = new Set<string>()
    for (const edge of graph.edges) {
      const key = edgeKey(edge.source, edge.target, graph.isDirected)
      if (edge.id !== key || seenEdges.has(key)) throw new Error(`Muchie invalidă în ${scenario.id}`)
      if (edge.source < 1 || edge.target < 1 || edge.source > count || edge.target > count) {
        throw new Error(`Capăt de muchie invalid în ${scenario.id}`)
      }
      seenEdges.add(key)
    }
    if (scenario.recommendedStartNode < 1 || scenario.recommendedStartNode > count) {
      throw new Error(`Nod de start invalid în ${scenario.id}`)
    }
    const target = scenario.recommendedTargetNode
    if (typeof target === 'number' && (target < 1 || target > count)) {
      throw new Error(`Destinație invalidă în ${scenario.id}`)
    }
  }
  return scenarios
}

const HEXAGON: readonly (readonly [number, number])[] = [
  [480, 110],
  [662, 215],
  [662, 425],
  [480, 530],
  [298, 425],
  [298, 215],
]

const PENTAGON: readonly (readonly [number, number])[] = [
  [480, 120],
  [670, 258],
  [598, 482],
  [362, 482],
  [290, 258],
]

export const BAC_SCENARIOS: readonly BacScenario[] = assertGallery([
  {
    id: 'k33-bipartite',
    title: 'Graf Bipartit Clasic (K₃,₃ — 6 noduri, 9 muchii)',
    category: 'Eulerian & Hamiltonian',
    difficulty: 'Subiectul II',
    description:
      'Hexagonul 1–2–3–4–5–6, împreună cu diagonalele 1–4, 2–5 și 3–6, este graful complet bipartit K₃,₃. Mulțimile {1, 3, 5} și {2, 4, 6} nu au muchii interne, deci colorarea în două culori reușește, iar ciclul hexagonului este hamiltonian. Capcana: toate gradele sunt 3, impare, deci graful nu este eulerian. Un ciclu hamiltonian nu garantează un ciclu eulerian.',
    recommendedAlgorithm: 'bipartite',
    recommendedStartNode: 1,
    graph: buildGraph(
      HEXAGON,
      [
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [6, 1],
        [1, 4],
        [2, 5],
        [3, 6],
      ],
      false,
      false,
    ),
  },
  {
    id: 'even-flower',
    title: 'Graf Eulerian & Hamiltonian („Roata / Floarea Pară” — toate gradele pare)',
    category: 'Eulerian & Hamiltonian',
    difficulty: 'Subiectul II',
    description:
      'Ciclul exterior lasă fiecare nod cu gradul 2. Triunghiul interior 1–3–5 urcă nodurile 1, 3 și 5 la gradul 4, tot par, iar 2, 4 și 6 rămân de grad 2. Graful este conex, deci admite un ciclu eulerian, iar ciclul exterior este hamiltonian. La bac se verifică paritatea fiecărui grad: roata clasică are bordul de grad impar, floarea aceasta nu.',
    recommendedAlgorithm: 'eulerian',
    recommendedStartNode: 1,
    graph: buildGraph(
      HEXAGON,
      [
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [6, 1],
        [1, 3],
        [3, 5],
        [5, 1],
      ],
      false,
      false,
    ),
  },
  {
    id: 'three-components',
    title: 'Graf cu 3 Componente Conexe, Nod Izolat și Noduri Terminale',
    category: 'Parcurgeri & Conexitate',
    difficulty: 'Subiectul I',
    description:
      'Sunt trei componente: triunghiul 1–2–3 cu nodul terminal 4, muchia 5–6 (ambele capete terminale) și nodul izolat 7. Subiectul I întreabă des câte muchii minime fac graful conex. Răspunsul este nrc − 1 = 2, nu numărul de noduri izolate și nu numărul de terminale. Nodul izolat este el însuși o componentă conexă, iar un nod terminal are gradul 1.',
    recommendedAlgorithm: 'connected_components',
    recommendedStartNode: 1,
    graph: buildGraph(
      [
        [140, 170],
        [300, 170],
        [220, 310],
        [220, 470],
        [520, 280],
        [700, 280],
        [840, 470],
      ],
      [
        [1, 2],
        [2, 3],
        [3, 1],
        [3, 4],
        [5, 6],
      ],
      false,
      false,
    ),
  },
  {
    id: 'strong-components',
    title: 'Graf Orientat — Componente Tare Conexe (Metoda Plus-Minus)',
    category: 'Parcurgeri & Conexitate',
    difficulty: 'Subiectul III',
    description:
      'Ciclurile 1→2→3→1 și 4→5→6→4 sunt legate doar prin arcul 2→4. Din {1, 2, 3} se ajunge în {4, 5, 6}, dar nu și invers, deci graful nu este tare conex. La Plus-Minus, PLUS(1) conține și a doua componentă, fiindcă arcul pleacă spre ea. MINUS(1) rămâne {1, 2, 3}. Componenta tare conexă este intersecția, nu PLUS singur. A doua componentă este {4, 5, 6}.',
    recommendedAlgorithm: 'connected_components',
    recommendedStartNode: 1,
    graph: buildGraph(
      [
        [180, 180],
        [340, 300],
        [180, 420],
        [620, 300],
        [800, 180],
        [800, 420],
      ],
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
      false,
    ),
  },
  {
    id: 'rooted-tata-bac',
    title: 'Arbore cu Rădăcină din Variantele Oficiale BAC (tata = [0, 1, 1, 2, 2, 3, 3, 5])',
    category: 'Arbori & Vector de Tați',
    difficulty: 'Subiectul II',
    description:
      'Vectorul tata[1..8] = (0, 1, 1, 2, 2, 3, 3, 5) are rădăcina pe prima poziție, acolo unde valoarea este 0. Nivelurile, cu nivel[rădăcină] = 0, sunt 0, 1, 1, 2, 2, 2, 2, 3, iar înălțimea este 3. Frunzele sunt 4, 6, 7 și 8: nodul 5 nu este frunză, pentru că are fiul 8. Nodurile 1, 2 și 3 au fiecare câte doi fii — la egalitate se scriu toate, nu doar rădăcina.',
    recommendedAlgorithm: 'rooted_tree',
    recommendedStartNode: 1,
    graph: buildGraph(
      [
        [560, 80],
        [360, 210],
        [760, 210],
        [220, 340],
        [500, 340],
        [660, 340],
        [860, 340],
        [520, 490],
      ],
      [
        [1, 2],
        [1, 3],
        [2, 4],
        [2, 5],
        [3, 6],
        [3, 7],
        [5, 8],
      ],
      false,
      false,
    ),
  },
  {
    id: 'dijkstra-detour',
    title: 'Rețea Ponderată Dijkstra (Capcana „Drum cu mai multe muchii, dar cost mai mic”)',
    category: 'Cost Minim & APM',
    difficulty: 'Subiectul III',
    description:
      'Muchia directă 1–5 costă 15 și pare candidatul natural. Lanțul 1–2–3–4–5 costă 2 + 2 + 2 + 3 = 9. Dijkstra compară sume, nu numărul de muchii: d[5] devine întâi 15, apoi este corectat la 9, iar muchia scumpă nu rămâne pe drumul minim. Capcana clasică de la rețele: drumul cu mai multe muchii poate fi cel mai ieftin.',
    recommendedAlgorithm: 'dijkstra',
    recommendedStartNode: 1,
    recommendedTargetNode: 5,
    graph: buildGraph(
      [
        [140, 430],
        [300, 190],
        [480, 110],
        [660, 190],
        [820, 430],
      ],
      [
        [1, 2, 2],
        [2, 3, 2],
        [3, 4, 2],
        [4, 5, 3],
        [1, 5, 15],
      ],
      false,
      true,
    ),
  },
  {
    id: 'kruskal-cycle',
    title: 'Rețea Kruskal & Prim (Arbore Parțial de Cost Minim cu Cicluri de Cost Mic)',
    category: 'Cost Minim & APM',
    difficulty: 'Subiectul III',
    description:
      'Muchia 1–3 are costul 3, mai mic decât muchiile de cost 4, 5 și 6 care intră în arbore. Kruskal o respinge totuși: 1–2 și 2–3 sunt deja alese, iar 1–3 ar închide ciclul. Costul arborelui parțial minim este 1 + 2 + 4 + 5 + 6 = 18. Prim, pornit din nodul 1, ajunge la același cost. O muchie ieftină între două noduri din aceeași componentă nu se acceptă.',
    recommendedAlgorithm: 'kruskal',
    recommendedStartNode: 1,
    graph: buildGraph(
      [
        [160, 300],
        [340, 150],
        [340, 450],
        [560, 300],
        [760, 140],
        [760, 460],
      ],
      [
        [1, 2, 1],
        [2, 3, 2],
        [1, 3, 3],
        [2, 4, 4],
        [4, 5, 5],
        [4, 6, 6],
        [3, 4, 7],
        [5, 6, 8],
        [2, 5, 10],
      ],
      false,
      true,
    ),
  },
  {
    id: 'roy-floyd-detour',
    title: 'Graf Orientat Ponderat pentru Roy-Floyd (Drumuri Ocolitoare Minime)',
    category: 'Cost Minim & APM',
    difficulty: 'Subiectul III',
    description:
      'Arcul direct 1→3 costă 100, iar ocolul 1→2→3 costă 1 + 1 = 2. La k = 2, formula D[i][j] = min(D[i][j], D[i][k] + D[k][j]) înlocuiește 100 cu 2, iar D[1][4] scade întâi de la 50 la 1 + 20 = 21. La k = 3, D[1][4] devine 2 + 1 = 3 și D[2][4] coboară de la 20 la 2. Un drum ocolitor poate fi strict mai ieftin decât arcul direct.',
    recommendedAlgorithm: 'roy_floyd',
    recommendedStartNode: 1,
    graph: buildGraph(
      [
        [240, 170],
        [720, 170],
        [720, 470],
        [240, 470],
      ],
      [
        [1, 2, 1],
        [2, 3, 1],
        [1, 3, 100],
        [3, 4, 1],
        [1, 4, 50],
        [2, 4, 20],
      ],
      true,
      true,
    ),
  },
  {
    id: 'complete-k5',
    title: 'Graf Complet K₅ (Pentagonul cu Stea)',
    category: 'Eulerian & Hamiltonian',
    difficulty: 'Subiectul I',
    description:
      'Pentagonul împreună cu toate diagonalele (steaua în cinci colțuri) este graful complet K₅: m = 5·4/2 = 10. Fiecare nod are gradul 4, par, deci graful este eulerian. Este și hamiltonian — orice ciclu de lungime 5 trece prin toate nodurile. La bac, Kₙ cu n impar este eulerian, pentru că gradul n − 1 este par.',
    recommendedAlgorithm: 'eulerian',
    recommendedStartNode: 1,
    graph: buildGraph(
      PENTAGON,
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
      false,
      false,
    ),
  },
  {
    id: 'odd-cycle-c5',
    title: 'Graf Petersen Simplificat / Capcană Bipartit (Ciclu Impar C₅)',
    category: 'Parcurgeri & Conexitate',
    difficulty: 'Subiectul II',
    description:
      'Ciclul 1–2–3–4–5–1 are lungimea 5, impară. Colorarea în două mulțimi alternează vecinii și, pe ultima muchie, ambele capete ajung în aceeași mulțime. Un singur ciclu impar ajunge ca graful să nu fie bipartit, chiar dacă toate gradele sunt pare. Graful Petersen are circumferința 5; varianta de bac reduce capcana exact la acest C₅.',
    recommendedAlgorithm: 'bipartite',
    recommendedStartNode: 1,
    graph: buildGraph(
      PENTAGON,
      [
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 1],
      ],
      false,
      false,
    ),
  },
])

/**
 * Playable Euler and Hamilton checks.
 * The verdict comes from `analyzeGraph`; these frames only show that verdict
 * the way a BAC program would: degrees first, then the walk.
 */
import { analyzeGraph, type BacGraphReport } from '../bacInspector'
import { graphSize } from '../representations'
import type { GraphStateData } from '../types'
import type { AlgorithmStep, EdgeVisualState, NodeVisualState } from './types'

const EULER_UNDIRECTED_LINES = [
  'int impar, euler, lc;',
  '',
  'void grade()',
  '{',
  '    int i, j;',
  '    impar = 0;',
  '    for (i = 1; i <= n; i++)',
  '    {',
  '        d[i] = 0;',
  '        for (j = 1; j <= n; j++)',
  '            if (a[i][j] == 1)',
  '                d[i] = d[i] + (i == j ? 2 : 1);',
  '        if (d[i] % 2 == 1)',
  '            impar = impar + 1;',
  '    }',
  '    euler = (impar == 0);',
  '}',
  '',
  'void hierholzer(int start)',
  '{',
  '    int vf, x, y, j;',
  '    vf = 1;',
  '    st[1] = start;',
  '    lc = 0;',
  '    while (vf >= 1)',
  '    {',
  '        x = st[vf];',
  '        y = 0;',
  '        for (j = 1; j <= n; j++)',
  '            if (a[x][j] == 1)',
  '            {',
  '                y = j;',
  '                break;',
  '            }',
  '        if (y != 0)',
  '        {',
  '            a[x][y] = 0;',
  '            a[y][x] = 0;',
  '            vf = vf + 1;',
  '            st[vf] = y;',
  '        }',
  '        else',
  '        {',
  '            lc = lc + 1;',
  '            circuit[lc] = x;',
  '            vf = vf - 1;',
  '        }',
  '    }',
  '}',
] as const

const EULER_DIRECTED_LINES = [
  'int neegal, euler, lc;',
  '',
  'void grade_orientat()',
  '{',
  '    int i, j;',
  '    neegal = 0;',
  '    for (i = 1; i <= n; i++)',
  '    {',
  '        dplus[i] = 0;',
  '        dminus[i] = 0;',
  '        for (j = 1; j <= n; j++)',
  '            if (a[i][j] == 1)',
  '            {',
  '                dplus[i] = dplus[i] + 1;',
  '                dminus[j] = dminus[j] + 1;',
  '            }',
  '        if (dplus[i] != dminus[i])',
  '            neegal = neegal + 1;',
  '    }',
  '    euler = (neegal == 0);',
  '}',
  '',
  'void hierholzer_orientat(int start)',
  '{',
  '    int vf, x, y, j;',
  '    vf = 1;',
  '    st[1] = start;',
  '    lc = 0;',
  '    while (vf >= 1)',
  '    {',
  '        x = st[vf];',
  '        y = 0;',
  '        for (j = 1; j <= n; j++)',
  '            if (a[x][j] == 1)',
  '            {',
  '                y = j;',
  '                break;',
  '            }',
  '        if (y != 0)',
  '        {',
  '            a[x][y] = 0;',
  '            vf = vf + 1;',
  '            st[vf] = y;',
  '        }',
  '        else',
  '        {',
  '            lc = lc + 1;',
  '            circuit[lc] = x;',
  '            vf = vf - 1;',
  '        }',
  '    }',
  '}',
] as const

const HAMILTON_LINES = [
  'int gasit, sol[101];',
  '',
  'int verifica_dirac()',
  '{',
  '    int i;',
  '    if (n < 3)',
  '        return 0;',
  '    for (i = 1; i <= n; i++)',
  '        if (d[i] * 2 < n)',
  '            return 0;',
  '    return 1;',
  '}',
  '',
  'int verifica_ore()',
  '{',
  '    int i, j;',
  '    for (i = 1; i <= n; i++)',
  '        for (j = i + 1; j <= n; j++)',
  '            if (a[i][j] == 0 && d[i] + d[j] < n)',
  '                return 0;',
  '    return 1;',
  '}',
  '',
  'void ham(int k)',
  '{',
  '    int i;',
  '    if (gasit)',
  '        return;',
  '    if (k == n + 1)',
  '    {',
  '        if (a[sol[n]][sol[1]] == 1)',
  '            gasit = 1;',
  '        return;',
  '    }',
  '    for (i = 1; i <= n; i++)',
  '        if (viz[i] == 0 && (k == 1 || a[sol[k - 1]][i] == 1))',
  '        {',
  '            viz[i] = 1;',
  '            sol[k] = i;',
  '            tata[i] = (k == 1 ? 0 : sol[k - 1]);',
  '            ham(k + 1);',
  '            if (gasit)',
  '                return;',
  '            viz[i] = 0;',
  '        }',
  '}',
] as const

export const EULER_UNDIRECTED_CPP_SOURCE = EULER_UNDIRECTED_LINES.join('\n')
export const EULER_DIRECTED_CPP_SOURCE = EULER_DIRECTED_LINES.join('\n')
export const HAMILTON_CPP_SOURCE = HAMILTON_LINES.join('\n')

function mustFind(lines: readonly string[], trimmed: string): number {
  const index = lines.findIndex((line) => line.trim() === trimmed)
  if (index < 0) throw new Error(`Missing C++ line: ${trimmed}`)
  return index + 1
}

const EULER_LINE = {
  undirectedIntro: mustFind(EULER_UNDIRECTED_LINES, 'void grade()'),
  undirectedDegree: mustFind(EULER_UNDIRECTED_LINES, 'd[i] = 0;'),
  undirectedOdd: mustFind(EULER_UNDIRECTED_LINES, 'if (d[i] % 2 == 1)'),
  undirectedCount: mustFind(EULER_UNDIRECTED_LINES, 'impar = impar + 1;'),
  undirectedFlag: mustFind(EULER_UNDIRECTED_LINES, 'euler = (impar == 0);'),
  undirectedStart: mustFind(EULER_UNDIRECTED_LINES, 'st[1] = start;'),
  undirectedStep: mustFind(EULER_UNDIRECTED_LINES, 'st[vf] = y;'),
  undirectedRecord: mustFind(EULER_UNDIRECTED_LINES, 'circuit[lc] = x;'),
  directedIntro: mustFind(EULER_DIRECTED_LINES, 'void grade_orientat()'),
  directedDegree: mustFind(EULER_DIRECTED_LINES, 'dplus[i] = 0;'),
  directedOdd: mustFind(EULER_DIRECTED_LINES, 'if (dplus[i] != dminus[i])'),
  directedCount: mustFind(EULER_DIRECTED_LINES, 'neegal = neegal + 1;'),
  directedFlag: mustFind(EULER_DIRECTED_LINES, 'euler = (neegal == 0);'),
  directedStart: mustFind(EULER_DIRECTED_LINES, 'st[1] = start;'),
  directedStep: mustFind(EULER_DIRECTED_LINES, 'st[vf] = y;'),
  directedRecord: mustFind(EULER_DIRECTED_LINES, 'circuit[lc] = x;'),
}

const HAMILTON_LINE = {
  intro: mustFind(HAMILTON_LINES, 'int verifica_dirac()'),
  small: mustFind(HAMILTON_LINES, 'if (n < 3)'),
  dirac: mustFind(HAMILTON_LINES, 'if (d[i] * 2 < n)'),
  ore: mustFind(HAMILTON_LINES, 'if (a[i][j] == 0 && d[i] + d[j] < n)'),
  place: mustFind(HAMILTON_LINES, 'viz[i] = 1;'),
  sol: mustFind(HAMILTON_LINES, 'sol[k] = i;'),
  close: mustFind(HAMILTON_LINES, 'if (a[sol[n]][sol[1]] == 1)'),
  found: mustFind(HAMILTON_LINES, 'gasit = 1;'),
}

const COMPONENT_PAINT: readonly NodeVisualState[] = ['comp_1', 'comp_2', 'comp_3', 'comp_4', 'comp_5']

class Tape {
  readonly steps: AlgorithmStep[] = []
  readonly graph: GraphStateData
  readonly n: number
  viz: number[]
  tata: number[]
  dist: (number | null)[]
  nodeStates: Record<number, NodeVisualState>
  edgeStates: Record<string, EdgeVisualState>
  outputOrder: number[] = []

  constructor(graph: GraphStateData) {
    this.graph = graph
    this.n = graphSize(graph.nodes)
    this.viz = Array<number>(this.n + 1).fill(0)
    this.tata = Array<number>(this.n + 1).fill(0)
    this.dist = Array<number | null>(this.n + 1).fill(null)
    this.nodeStates = {}
    for (let id = 1; id <= this.n; id += 1) this.nodeStates[id] = 'default'
    this.edgeStates = {}
    for (const edge of graph.edges) this.edgeStates[edge.id] = 'default'
  }

  snap(input: {
    title: string
    explanation: string
    activeNodeId: number | null
    activeEdgeId: string | null
    cppLine: number
    summaryVerdict?: string
  }): void {
    const step: AlgorithmStep = {
      stepIndex: this.steps.length,
      title: input.title,
      explanation: input.explanation,
      activeNodeId: input.activeNodeId,
      activeEdgeId: input.activeEdgeId,
      nodeStates: { ...this.nodeStates },
      edgeStates: { ...this.edgeStates },
      viz: this.viz.slice(),
      tata: this.tata.slice(),
      dist: this.dist.slice(),
      queue: null,
      stack: null,
      outputOrder: this.outputOrder.slice(),
      cppLine: input.cppLine,
    }
    if (input.summaryVerdict !== undefined) step.summaryVerdict = input.summaryVerdict
    this.steps.push(step)
  }

  resetEdges(): void {
    for (const edge of this.graph.edges) this.edgeStates[edge.id] = 'default'
  }
}

/** Degree parity, then the Eulerian circuit edge by edge when the theorem applies. */
export function runEulerianCheck(graph: GraphStateData, startNode = 1): AlgorithmStep[] {
  const report = analyzeGraph(graph)
  if (report.n === 0) {
    return [
      emptyStep(
        'Graf vid',
        'Graful nu conține noduri (n = 0). Teorema lui Euler nu are ce verifica.',
        'Graful este vid.',
      ),
    ]
  }

  const directed = graph.isDirected
  const tape = new Tape(graph)
  const violators = new Set(report.eulerianViolators)
  const degreeLine = directed ? EULER_LINE.directedDegree : EULER_LINE.undirectedDegree
  const oddLine = directed ? EULER_LINE.directedOdd : EULER_LINE.undirectedOdd
  const flagLine = directed ? EULER_LINE.directedFlag : EULER_LINE.undirectedFlag

  tape.snap({
    title: directed ? 'Teorema lui Euler (orientat)' : 'Teorema lui Euler',
    explanation: directed
      ? 'Un graf orientat admite un circuit eulerian dacă, ignorând nodurile izolate, este tare conex și d+(x) = d-(x) pentru orice nod. Un lanț eulerian cere, în plus față de conexitatea slabă, exact un nod cu d+(x) = d-(x) + 1 și exact unul cu d-(x) = d+(x) + 1. Începem cu gradele.'
      : 'Un graf neorientat admite un ciclu eulerian dacă, ignorând nodurile izolate, este conex și d(x) este par pentru orice nod. Un lanț eulerian există când nodurile de grad impar sunt exact 0 sau 2. Începem cu gradele.',
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: directed ? EULER_LINE.directedIntro : EULER_LINE.undirectedIntro,
  })

  for (let node = 1; node <= report.n; node += 1) {
    const degree = report.degreeByNode[node] ?? 0
    tape.dist[node] = degree
    tape.viz[node] = 1
    paintInspected(tape, node, violators)
    const outDegree = report.outDegreeByNode?.[node] ?? degree
    const inDegree = report.inDegreeByNode?.[node] ?? degree
    const violates = violators.has(node)
    tape.snap({
      title: `Gradul nodului ${node}`,
      explanation: directed
        ? `d+(${node}) = ${outDegree}, d-(${node}) = ${inDegree}. ${
            outDegree === inDegree
              ? `Sunt egale, deci nodul ${node} respectă condiția.`
              : `Nu sunt egale, deci nodul ${node} încalcă d+(x) = d-(x).`
          }`
        : `d(${node}) = ${degree}. ${degree} mod 2 = ${degree % 2}. ${
            violates
              ? `Nodul ${node} are grad impar.`
              : `Nodul ${node} are grad par.`
          }`,
      activeNodeId: node,
      activeEdgeId: null,
      cppLine: violates ? oddLine : degreeLine,
    })
  }

  paintInspected(tape, null, violators)
  const parity = directed
    ? report.eulerianViolators.length === 0
      ? 'Toate nodurile au d+(x) = d-(x).'
      : `Nodurile ${formatSet(report.eulerianViolators)} nu au d+(x) = d-(x).`
    : report.eulerianViolators.length === 0
      ? 'Toate nodurile au grad par (impar = 0).'
      : `Nodurile ${formatSet(report.eulerianViolators)} au grad impar. impar = ${report.eulerianViolators.length}.`
  tape.snap({
    title: 'Bilanțul gradelor',
    explanation: `${parity} ${
      directed ? 'euler = (neegal == 0)' : 'euler = (impar == 0)'
    } este ${report.eulerianViolators.length === 0 ? 'adevărat' : 'fals'}. Mai trebuie verificată conexitatea.`,
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: directed ? EULER_LINE.directedCount : EULER_LINE.undirectedCount,
  })

  const componentOf = directed ? report.strongComponentOf : report.weakComponentOf
  paintComponents(tape, componentOf, violators)
  const connected = directed ? report.isStronglyConnected : report.isWeaklyConnected
  tape.snap({
    title: directed ? 'Conexitate tare' : 'Conexitate',
    explanation: `${report.connectivityExplanation} Pentru teorema lui Euler contăm nodurile izolate separat: ${
      report.isolatedNodes.length === 0 ? 'nu există noduri izolate.' : `noduri izolate ${formatSet(report.isolatedNodes)}.`
    }`,
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: flagLine,
  })

  const cycle = report.eulerianCycle
  const cycleEdges = report.eulerianCycleEdgeIds
  if (report.isEulerian && cycle && cycleEdges) {
    const start = preferredStart(startNode, report.n)
    const rotated = rotateClosed(cycle, cycleEdges, start)
    const chosen = rotated.nodes[0] ?? start
    const note =
      chosen === start
        ? `Pornim din nodul de start ${start}.`
        : `Nodul ${start} nu poate deschide circuitul, deci Hierholzer pornește din ${chosen}.`
    animateEulerTour(tape, rotated.nodes, rotated.edgeIds, directed, note, report.isolatedNodes)
    return tape.steps
  }

  const verdict = report.hasEulerianTrail
    ? 'Graful admite un lanț eulerian, dar NU este eulerian.'
    : 'Graful NU este eulerian.'
  paintInspected(tape, null, violators)
  if (violators.size === 0 && !connected) paintComponents(tape, componentOf, violators)
  tape.snap({
    title: report.hasEulerianTrail ? 'Lanț eulerian' : 'Nu este eulerian',
    explanation: report.eulerianExplanation,
    activeNodeId: report.eulerianViolators[0] ?? null,
    activeEdgeId: null,
    cppLine: flagLine,
    summaryVerdict: verdict,
  })
  return tape.steps
}

/** Dirac, Ore, then the Hamiltonian cycle (or the reason it does not exist). */
export function runHamiltonianCheck(graph: GraphStateData, startNode = 1): AlgorithmStep[] {
  const report = analyzeGraph(graph)
  if (report.n === 0) {
    return [
      emptyStep(
        'Graf vid',
        'Graful nu conține noduri (n = 0). Un ciclu hamiltonian cere n ≥ 3.',
        'Graful este vid.',
      ),
    ]
  }

  const tape = new Tape(graph)
  const directed = graph.isDirected
  tape.snap({
    title: 'Teoremele lui Dirac și Ore',
    explanation: directed
      ? 'Căutăm un circuit hamiltonian: un circuit care trece prin fiecare nod exact o dată. Teoremele lui Dirac și Ore se enunță pentru grafuri neorientate; le verificăm pe suportul neorientat. Ele sunt condiții suficiente, nu necesare. Circuitul orientat este decis de căutarea exactă.'
      : 'Căutăm un ciclu hamiltonian: un ciclu care trece prin fiecare nod exact o dată și revine în start. Teorema lui Dirac cere d(x) ≥ n / 2 pentru orice x. Teorema lui Ore cere d(u) + d(v) ≥ n pentru nodurile neadiacente. Ambele sunt suficiente, nu necesare.',
    activeNodeId: null,
    activeEdgeId: null,
    cppLine: HAMILTON_LINE.intro,
  })

  if (report.n < 3) {
    tape.snap({
      title: 'n este prea mic',
      explanation: `Un ciclu hamiltonian este definit pentru n ≥ 3. Aici n = ${report.n}. if (n < 3) return 0. ${report.diracExplanation}`,
      activeNodeId: 1,
      activeEdgeId: null,
      cppLine: HAMILTON_LINE.small,
      summaryVerdict: 'Graful NU este hamiltonian.',
    })
    return tape.steps
  }

  const half = report.n % 2 === 0 ? String(report.n / 2) : `${report.n}/2`
  for (let node = 1; node <= report.n; node += 1) {
    const simple = report.simpleDegreeByNode[node] ?? 0
    const stored = report.degreeByNode[node] ?? simple
    tape.dist[node] = simple
    const fails = simple * 2 < report.n
    paintDirac(tape, node, fails)
    const same = simple === stored
    tape.snap({
      title: `Dirac pentru nodul ${node}`,
      explanation: same
        ? `d(${node}) = ${simple}. Pragul este n / 2 = ${half}. ${fails ? `${simple} < ${half}, deci nodul nu satisface ipoteza.` : `${simple} ≥ ${half}.`} if (d[i] * 2 < n) este ${fails ? 'adevărat' : 'fals'}.`
        : `Gradul din matrice, cu bucle, este ${stored}. Gradul simplu, fără bucle, este d(${node}) = ${simple}. Pragul n / 2 = ${half}. ${fails ? 'Nodul nu satisface ipoteza lui Dirac.' : 'Nodul satisface ipoteza lui Dirac.'}`,
      activeNodeId: node,
      activeEdgeId: null,
      cppLine: HAMILTON_LINE.dirac,
    })
  }

  const pair = report.oreViolatingPair
  if (pair) {
    for (let node = 1; node <= report.n; node += 1) {
      tape.nodeStates[node] = node === pair.u || node === pair.v ? 'current' : 'default'
    }
  } else {
    for (let node = 1; node <= report.n; node += 1) tape.nodeStates[node] = 'visited'
  }
  tape.snap({
    title: report.oreSatisfied ? 'Ore este îndeplinită' : 'Ore nu este îndeplinită',
    explanation: report.oreExplanation,
    activeNodeId: pair?.u ?? null,
    activeEdgeId: null,
    cppLine: HAMILTON_LINE.ore,
  })

  const cycle = report.hamiltonianCycle
  const cycleEdges = report.hamiltonianCycleEdgeIds
  if (cycle && cycleEdges) {
    const start = preferredStart(startNode, report.n)
    const rotated = rotateClosed(cycle, cycleEdges, start)
    animateHamiltonCycle(tape, rotated.nodes, rotated.edgeIds, report.diracSatisfied)
    return tape.steps
  }

  const path = report.hamiltonianPath
  const pathEdges = report.hamiltonianPathEdgeIds
  if (path && pathEdges && path.length === report.n) {
    animateHamiltonPath(tape, path, pathEdges, report)
    return tape.steps
  }

  const blocked = lowDegreeNodes(report)
  if (blocked.length > 0) {
    const blockedSet = new Set(blocked)
    for (let node = 1; node <= report.n; node += 1) {
      tape.nodeStates[node] = blockedSet.has(node) ? 'conflict' : 'default'
    }
  } else if (!report.isWeaklyConnected) {
    paintComponents(tape, report.weakComponentOf, new Set())
  } else {
    for (let node = 1; node <= report.n; node += 1) tape.nodeStates[node] = 'visited'
  }
  const verdict = report.hamiltonianDetermined
    ? 'Graful NU este hamiltonian.'
    : 'Ciclul hamiltonian nu este decis.'
  tape.snap({
    title: report.hamiltonianDetermined ? 'Nu există ciclu hamiltonian' : 'Căutare neîncheiată',
    explanation: report.hamiltonianExplanation,
    activeNodeId: blocked[0] ?? null,
    activeEdgeId: null,
    cppLine: HAMILTON_LINE.found,
    summaryVerdict: verdict,
  })
  return tape.steps
}

function animateEulerTour(
  tape: Tape,
  nodes: readonly number[],
  edgeIds: readonly string[],
  directed: boolean,
  startNote: string,
  isolated: readonly number[],
): void {
  const start = nodes[0] ?? 1
  tape.viz.fill(0)
  tape.tata.fill(0)
  tape.outputOrder = []
  tape.resetEdges()
  for (let node = 1; node <= tape.n; node += 1) tape.nodeStates[node] = 'default'
  tape.viz[start] = 1
  tape.outputOrder.push(start)
  paintWalkNodes(tape, nodes, 0, new Set(isolated))
  tape.snap({
    title: `Plecare din ${start}`,
    explanation: `${startNote} st[1] = ${start}. Circuitul va folosi fiecare ${directed ? 'arc' : 'muchie'} exact o dată și va reveni în ${start}.`,
    activeNodeId: start,
    activeEdgeId: null,
    cppLine: directed ? EULER_LINE.directedStart : EULER_LINE.undirectedStart,
  })

  for (let index = 0; index < edgeIds.length; index += 1) {
    const from = nodes[index] ?? start
    const to = nodes[index + 1] ?? start
    const edgeId = edgeIds[index] ?? null
    if (index === edgeIds.length - 1) commitWalkEdges(tape, edgeIds)
    else paintWalkEdges(tape, edgeIds, index)
    tape.viz[to] = 1
    tape.tata[to] = from
    tape.outputOrder.push(to)
    paintWalkNodes(tape, nodes, index + 1, new Set(isolated))
    const last = index === edgeIds.length - 1
    tape.snap({
      title: last ? `Revenire în ${to}` : `Muchia (${from}, ${to})`,
      explanation: last
        ? `Închidem circuitul cu (${from}, ${to}). Am parcurs toate cele ${edgeIds.length} ${directed ? 'arce' : 'muchii'} exact o dată. Traseu: ${formatWalk(tape.outputOrder)}.`
        : `Hierholzer trece din ${from} în ${to}. Muchia ${index + 1} din ${edgeIds.length} este folosită o singură dată. Traseu parțial: ${formatWalk(tape.outputOrder)}.`,
      activeNodeId: to,
      activeEdgeId: edgeId,
      cppLine: last
        ? directed
          ? EULER_LINE.directedRecord
          : EULER_LINE.undirectedRecord
        : directed
          ? EULER_LINE.directedStep
          : EULER_LINE.undirectedStep,
      summaryVerdict: last ? 'Graful este eulerian.' : undefined,
    })
  }
}

function animateHamiltonCycle(
  tape: Tape,
  nodes: readonly number[],
  edgeIds: readonly string[],
  diracSatisfied: boolean,
): void {
  prepareWalk(tape)
  const body = nodes.slice(0, -1)
  for (let index = 0; index < body.length; index += 1) {
    const node = body[index] ?? 1
    const previous = index === 0 ? 0 : (body[index - 1] ?? 0)
    tape.viz[node] = 1
    tape.tata[node] = previous
    tape.outputOrder.push(node)
    if (index > 0) paintWalkEdges(tape, edgeIds, index - 1)
    paintWalkNodes(tape, body, index, new Set())
    tape.snap({
      title: `viz[${node}] = 1`,
      explanation:
        index === 0
          ? `sol[1] = ${node}. Punem viz[${node}] = 1. Ciclul va trece prin toate cele ${body.length} noduri.`
          : `Din ${previous} alegem ${node}. viz[${node}] = 1, sol[${index + 1}] = ${node}, tata[${node}] = ${previous}. Noduri alese: ${formatWalk(tape.outputOrder)}.`,
      activeNodeId: node,
      activeEdgeId: index === 0 ? null : (edgeIds[index - 1] ?? null),
      cppLine: index === 0 ? HAMILTON_LINE.sol : HAMILTON_LINE.place,
    })
  }

  const last = body[body.length - 1] ?? 1
  const first = body[0] ?? 1
  const closing = edgeIds[edgeIds.length - 1] ?? null
  commitWalkEdges(tape, edgeIds)
  tape.tata[first] = last
  tape.outputOrder.push(first)
  paintWalkNodes(tape, nodes, nodes.length - 1, new Set())
  const dirac = diracSatisfied
    ? 'Condiția suficientă a lui Dirac este și ea îndeplinită.'
    : 'Condiția lui Dirac nu este îndeplinită; ea este doar suficientă, iar ciclul a fost găsit prin căutare exactă.'
  tape.snap({
    title: `Închidere (${last}, ${first})`,
    explanation: `k = n + 1 și a[sol[n]][sol[1]] = 1, deci gasit = 1. Muchia (${last}, ${first}) închide ciclul ${formatWalk(nodes)}. viz[x] = 1 pentru toate nodurile 1..${body.length}. ${dirac}`,
    activeNodeId: first,
    activeEdgeId: closing,
    cppLine: HAMILTON_LINE.found,
    summaryVerdict: 'Graful este hamiltonian.',
  })
}

function animateHamiltonPath(
  tape: Tape,
  nodes: readonly number[],
  edgeIds: readonly string[],
  report: BacGraphReport,
): void {
  prepareWalk(tape)
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index] ?? 1
    const previous = index === 0 ? 0 : (nodes[index - 1] ?? 0)
    tape.viz[node] = 1
    tape.tata[node] = previous
    tape.outputOrder.push(node)
    if (lastEdge(index, edgeIds.length)) commitWalkEdges(tape, edgeIds)
    else if (index > 0) paintWalkEdges(tape, edgeIds, index - 1)
    paintWalkNodes(tape, nodes, index, new Set())
    const last = index === nodes.length - 1
    if (last) {
      const blocked = new Set(lowDegreeNodes(report))
      const head = nodes[0] ?? node
      if (blocked.size === 0) {
        tape.nodeStates[head] = 'conflict'
        tape.nodeStates[node] = 'conflict'
      } else {
        for (let id = 1; id <= tape.n; id += 1) {
          if (blocked.has(id)) tape.nodeStates[id] = 'conflict'
        }
      }
    }
    tape.snap({
      title: last ? 'Lanț fără închidere' : `viz[${node}] = 1`,
      explanation: last
        ? `Lanțul ${formatWalk(nodes)} vizitează fiecare nod o dată, dar nu există muchie de întoarcere care să-l închidă într-un ciclu. ${report.hamiltonianExplanation}`
        : index === 0
          ? `Construim un lanț hamiltonian. Primul nod este ${node}, viz[${node}] = 1.`
          : `Continuăm lanțul cu ${node}. viz[${node}] = 1, tata[${node}] = ${previous}.`,
      activeNodeId: node,
      activeEdgeId: index === 0 ? null : (edgeIds[index - 1] ?? null),
      cppLine: last ? HAMILTON_LINE.close : HAMILTON_LINE.place,
      summaryVerdict: last ? 'Graful NU este hamiltonian.' : undefined,
    })
  }
}

function prepareWalk(tape: Tape): void {
  tape.viz.fill(0)
  tape.tata.fill(0)
  tape.outputOrder = []
  tape.resetEdges()
  for (let node = 1; node <= tape.n; node += 1) tape.nodeStates[node] = 'default'
}

function paintInspected(tape: Tape, active: number | null, violators: ReadonlySet<number>): void {
  for (let node = 1; node <= tape.n; node += 1) {
    const seen = tape.dist[node] !== null && tape.dist[node] !== undefined
    if (!seen && node !== active) {
      tape.nodeStates[node] = 'default'
      continue
    }
    if (violators.has(node)) tape.nodeStates[node] = 'conflict'
    else if (node === active) tape.nodeStates[node] = 'current'
    else tape.nodeStates[node] = 'visited'
  }
}

function paintDirac(tape: Tape, active: number, fails: boolean): void {
  for (let node = 1; node <= tape.n; node += 1) {
    const seen = tape.dist[node] !== null && tape.dist[node] !== undefined
    if (node === active) tape.nodeStates[node] = fails ? 'conflict' : 'current'
    else if (!seen) tape.nodeStates[node] = 'default'
    else if ((tape.dist[node] ?? 0) * 2 < tape.n) tape.nodeStates[node] = 'frontier'
    else tape.nodeStates[node] = 'visited'
  }
}

function paintComponents(tape: Tape, componentOf: readonly number[], violators: ReadonlySet<number>): void {
  for (let node = 1; node <= tape.n; node += 1) {
    if (violators.has(node)) {
      tape.nodeStates[node] = 'conflict'
      continue
    }
    const component = componentOf[node] ?? 1
    tape.nodeStates[node] = COMPONENT_PAINT[(Math.max(1, component) - 1) % COMPONENT_PAINT.length] ?? 'comp_1'
  }
}

function paintWalkNodes(tape: Tape, nodes: readonly number[], cursor: number, isolated: ReadonlySet<number>): void {
  const seen = new Set<number>()
  for (let index = 0; index <= cursor && index < nodes.length; index += 1) {
    const node = nodes[index]
    if (node !== undefined) seen.add(node)
  }
  const current = nodes[Math.min(cursor, nodes.length - 1)] ?? null
  for (let node = 1; node <= tape.n; node += 1) {
    if (node === current) tape.nodeStates[node] = 'current'
    else if (seen.has(node)) tape.nodeStates[node] = 'path'
    else if (isolated.has(node)) tape.nodeStates[node] = 'default'
    else tape.nodeStates[node] = 'default'
  }
}

function paintWalkEdges(tape: Tape, edgeIds: readonly string[], activeIndex: number): void {
  tape.resetEdges()
  for (let index = 0; index < edgeIds.length; index += 1) {
    const edgeId = edgeIds[index]
    if (!edgeId || !Object.hasOwn(tape.edgeStates, edgeId)) continue
    if (index < activeIndex) tape.edgeStates[edgeId] = 'cycle'
    else if (index === activeIndex) tape.edgeStates[edgeId] = 'active'
  }
}

function commitWalkEdges(tape: Tape, edgeIds: readonly string[]): void {
  tape.resetEdges()
  for (const edgeId of edgeIds) {
    if (Object.hasOwn(tape.edgeStates, edgeId)) tape.edgeStates[edgeId] = 'cycle'
  }
}

function lastEdge(index: number, edgeCount: number): boolean {
  return edgeCount > 0 && index === edgeCount
}

function lowDegreeNodes(report: BacGraphReport): number[] {
  const nodes: number[] = []
  for (let node = 1; node <= report.n; node += 1) {
    if ((report.simpleDegreeByNode[node] ?? 0) < 2) nodes.push(node)
  }
  return nodes
}

function rotateClosed(
  nodes: readonly number[],
  edgeIds: readonly string[],
  start: number,
): { nodes: number[]; edgeIds: string[] } {
  if (nodes.length < 2) return { nodes: nodes.slice(), edgeIds: edgeIds.slice() }
  const body = nodes.slice(0, -1)
  const index = body.indexOf(start)
  if (index <= 0) return { nodes: nodes.slice(), edgeIds: edgeIds.slice() }
  return {
    nodes: [...body.slice(index), ...body.slice(0, index), start],
    edgeIds: [...edgeIds.slice(index), ...edgeIds.slice(0, index)],
  }
}

function preferredStart(startNode: number, n: number): number {
  if (!Number.isInteger(startNode) || startNode < 1 || startNode > n) return 1
  return startNode
}

function formatSet(ids: readonly number[]): string {
  if (ids.length === 0) return '∅'
  return `{${ids.join(', ')}}`
}

function formatWalk(nodes: readonly number[]): string {
  return nodes.join(' -> ')
}

function emptyStep(title: string, explanation: string, summaryVerdict: string): AlgorithmStep {
  return {
    stepIndex: 0,
    title,
    explanation,
    activeNodeId: null,
    activeEdgeId: null,
    nodeStates: {},
    edgeStates: {},
    viz: [0],
    tata: [0],
    dist: [null],
    queue: null,
    stack: null,
    outputOrder: [],
    cppLine: 1,
    summaryVerdict,
  }
}

import { clsx } from 'clsx'
import { GraduationCap, Play, RefreshCw } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { runBFS, runDFS } from '../../core/algorithms/traversals'
import { analyzeGraph, type BacGraphReport } from '../../core/bacInspector'
import { toAdjacencyMatrix } from '../../core/representations'
import type { GraphStateData } from '../../core/types'
import { useAlgorithmStore } from '../../store/useAlgorithmStore'

const LETTERS = ['A', 'B', 'C', 'D'] as const

type Letter = (typeof LETTERS)[number]
type Verdict = 'yes' | 'no' | 'open'
type TraversalKind = 'bfs' | 'dfs'

interface QuizOption {
  id: Letter
  text: string
}

interface QuizQuestion {
  id: string
  prompt: string
  options: readonly QuizOption[]
  correctId: Letter
  explanation: string
}

interface Claim {
  kind: 'property' | 'count'
  text: string
  holds: boolean
  why: string
}

export function BacTheoryInspectorPanel({ graph }: { graph: GraphStateData }) {
  const nodeKey = graph.nodes.map((node) => node.id).join(',')
  const edgeKey = graph.edges.map((edge) => `${edge.id}:${edge.source}:${edge.target}:${edge.weight}`).join('|')
  const report = useMemo(
    () => analyzeGraph(graph),
    // Dragging a node changes coordinates only. The report depends on structure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeKey, edgeKey, graph.isDirected, graph.isWeighted],
  )
  const [regen, setRegen] = useState(0)
  const signature = `${nodeKey}|${edgeKey}|${graph.isDirected ? 'D' : 'U'}|${graph.isWeighted ? 'W' : 'P'}`
  const removal = report.m - report.n + 1

  return (
    <div role="tabpanel" id="bac-panel-theory" aria-labelledby="bac-tab-theory" className="space-y-3">
      <header className="flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-300/30 bg-violet-400/10 text-violet-100">
          <GraduationCap size={16} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-50">Inspector BAC (Teorie & Grile)</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
            n = {report.n}, m = {report.m}
            {report.isDirected ? ', graf orientat' : ', graf neorientat'}. Se actualizează la fiecare editare a desenului.
          </p>
        </div>
      </header>

      <section className="space-y-2" aria-label="Proprietățile grafului curent">
        <h4 className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          Proprietățile grafului curent
        </h4>
        <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2">
          <VerdictCard
            title="Conex / Tare conex"
            verdict={report.n > 0 && report.isConnected ? 'yes' : 'no'}
          >
            <p>
              nrc = {report.connectedComponentsCount}. Număr minim de muchii de adăugat pentru conexitate:{' '}
              {report.minEdgesToConnect}.
            </p>
            <p>{report.connectivityExplanation}</p>
            <p>{report.minEdgesToConnectExplanation}</p>
            {report.isDirected ? <p>Componente tare conexe: {report.strongComponentsCount}.</p> : null}
          </VerdictCard>

          <VerdictCard title="Arbore" verdict={report.isTree ? 'yes' : 'no'}>
            <ul className="space-y-1">
              <Condition ok={report.isWeaklyConnected} label={report.isDirected ? 'Conex (suport)' : 'Conex'} />
              <Condition ok={report.isAcyclic} label="Aciclic" />
              <Condition
                ok={report.n > 0 && report.m === report.n - 1}
                label={report.n === 0 ? 'm = n - 1' : `m = n - 1 (${report.m} = ${report.n - 1})`}
              />
            </ul>
            <p className="font-mono text-[11px] text-cyan-100">
              Muchii de eliminat pentru arbore parțial: m - n + 1 = {report.m} - {report.n} + 1 = {removal}.
            </p>
            <p>{report.treeExplanation}</p>
            {report.edgesToRemoveForSpanningTree === null || report.edgesToRemoveForSpanningTree !== removal ? (
              <p>{report.spanningTreeExplanation}</p>
            ) : null}
          </VerdictCard>

          <VerdictCard title="Graf eulerian" verdict={report.isEulerian ? 'yes' : 'no'}>
            <p>{degreeCondition(report)}</p>
            <p className="font-mono text-[11px] text-slate-200">d(1..n) = ({list(report.degreeByNode.slice(1))})</p>
            {report.eulerianCycle ? (
              <p className="font-mono text-[11px] break-words text-emerald-100">
                Ciclu eulerian: {report.eulerianCycle.join(' -> ')}
              </p>
            ) : null}
            {report.eulerianTrail ? (
              <p className="font-mono text-[11px] break-words text-amber-100">
                Lanț eulerian: {report.eulerianTrail.join(' -> ')}
              </p>
            ) : null}
            <p>{report.eulerianExplanation}</p>
            {report.isEulerian ? <AnimateButton algorithm="eulerian" label="Animează Ciclul Eulerian" /> : null}
          </VerdictCard>

          <VerdictCard title="Graf hamiltonian" verdict={hamiltonVerdict(report)}>
            <p>
              Un ciclu hamiltonian vizitează toate cele {report.n} noduri o singură dată și revine la start.
            </p>
            <p>
              Dirac (d(x) ≥ n/2 = {report.n}/2): {report.diracSatisfied ? 'DA' : 'NU'}.
              {report.diracSatisfied || report.diracViolators.length === 0
                ? ''
                : ` Noduri sub prag: ${formatSet(report.diracViolators)}.`}
            </p>
            <p>Ore (d(u) + d(v) ≥ n pentru noduri neadiacente): {report.oreSatisfied ? 'DA' : 'NU'}.</p>
            {report.hamiltonianCycle ? (
              <p className="font-mono text-[11px] break-words text-emerald-100">
                Ciclu hamiltonian: {report.hamiltonianCycle.join(' -> ')}
              </p>
            ) : (
              <p>{report.hamiltonianExplanation}</p>
            )}
            {report.isHamiltonian ? (
              <AnimateButton algorithm="hamiltonian" label="Animează Ciclul Hamiltonian" />
            ) : null}
          </VerdictCard>

          <VerdictCard title="Graf bipartit" verdict={report.isBipartite ? 'yes' : 'no'}>
            <p>{report.bipartiteExplanation}</p>
            {report.isBipartite ? (
              <p className="font-mono text-[11px] text-cyan-100">
                A = {formatSet(report.partitionA)} · B = {formatSet(report.partitionB)}
              </p>
            ) : null}
            <AnimateButton algorithm="bipartite" label="Colorează Bipartit" />
          </VerdictCard>

          <VerdictCard title="Graf complet (Kₙ)" verdict={report.isComplete ? 'yes' : 'no'}>
            <p className="font-mono text-[11px] text-cyan-100">{completeRatio(report)}</p>
            <p>
              Lipsesc {report.edgesNeededForComplete}{' '}
              {report.isDirected ? arcWord(report.edgesNeededForComplete) : edgeWord(report.edgesNeededForComplete)} până
              la graful complet.
            </p>
            <p>{report.isCompleteExplanation}</p>
          </VerdictCard>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <h4 className="text-sm font-medium text-slate-50">Fișa formulelor de calcul pe graful curent</h4>
        <p className="mt-0.5 text-[10px] font-semibold tracking-[0.14em] text-indigo-200/80 uppercase">Subiectul I BAC</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Valorile folosesc n = {report.n} și m = {report.m} din desenul curent.
        </p>
        <div className="mt-2 space-y-1.5">
          <FormulaRow label="Suma gradelor" formula={`∑ d(i) = 2m = ${report.sumOfDegrees}`} note={report.sumOfDegreesExplanation} />
          <FormulaRow label="Număr maxim de muchii" formula={maxEdgesFormula(report)} />
          <FormulaRow
            label={`Număr total de grafuri neorientate cu n = ${report.n} noduri`}
            formula={report.totalGraphsWithN.undirectedGraphs}
          />
          <FormulaRow
            label="Număr de arbori cu n noduri (formula lui Cayley)"
            formula={report.totalGraphsWithN.labeledTrees}
          />
          <FormulaRow
            label="Număr de subgrafuri cu n noduri"
            formula={formatSubsetCount(report.n)}
            note="2^n - 1 numără submulțimile nevide de noduri."
          />
        </div>
      </section>

      <LiveQuiz
        key={`${signature}:${regen}`}
        graph={graph}
        report={report}
        seed={regen}
        onRegenerate={() => setRegen((value) => value + 1)}
      />
    </div>
  )
}

function LiveQuiz({
  graph,
  report,
  seed,
  onRegenerate,
}: {
  graph: GraphStateData
  report: BacGraphReport
  seed: number
  onRegenerate: () => void
}) {
  const questions = useMemo(
    () => buildQuiz(graph, report, seed),
    // `report` already changes when the graph structure changes. Coordinates do not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report, seed],
  )
  const [picks, setPicks] = useState<Partial<Record<string, Letter>>>({})
  const answered = questions.filter((question) => picks[question.id] !== undefined).length
  const correctCount = questions.filter((question) => picks[question.id] === question.correctId).length

  return (
    <section className="space-y-3 rounded-2xl border border-violet-300/25 bg-violet-400/[0.04] p-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium text-slate-50">Simulator interactiv de grile BAC</h4>
          <p className="mt-0.5 text-[12px] font-medium text-violet-100">Testează-te pe acest graf!</p>
        </div>
        {answered > 0 ? (
          <p className="font-mono text-[11px] text-slate-300">
            Corecte: {correctCount} / {questions.length}
          </p>
        ) : null}
      </div>

      <ol className="space-y-3">
        {questions.map((question, index) => {
          const picked = picks[question.id]
          const revealed = picked !== undefined
          return (
            <li key={question.id} className="rounded-xl border border-white/10 bg-black/25 p-2.5">
              <p className="text-[12px] leading-relaxed font-medium text-slate-100">
                <span className="mr-1.5 font-mono text-violet-200">Q{index + 1}.</span>
                {question.prompt}
              </p>
              <div className="mt-2 grid gap-1.5" role="group" aria-label={question.prompt}>
                {question.options.map((option) => {
                  const isCorrect = option.id === question.correctId
                  const isPicked = option.id === picked
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={revealed}
                      onClick={() => {
                        setPicks((current) => {
                          if (current[question.id]) return current
                          return { ...current, [question.id]: option.id }
                        })
                      }}
                      className={clsx(
                        'flex items-start gap-2 rounded-lg border px-2 py-1.5 text-left text-[12px] leading-snug transition',
                        !revealed && 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-violet-300/40 hover:bg-violet-400/10',
                        revealed && isCorrect && 'border-emerald-300/50 bg-emerald-400/15 text-emerald-50',
                        revealed && isPicked && !isCorrect && 'border-rose-300/50 bg-rose-400/15 text-rose-50',
                        revealed && !isCorrect && !isPicked && 'border-white/5 bg-white/[0.02] text-slate-500',
                      )}
                    >
                      <span className="font-mono font-semibold">{option.id}.</span>
                      <span>{option.text}</span>
                    </button>
                  )
                })}
              </div>
              {revealed ? (
                <div aria-live="polite" className="mt-2 space-y-1">
                  <p className={picked === question.correctId ? 'text-[12px] font-semibold text-emerald-200' : 'text-[12px] font-semibold text-rose-200'}>
                    {picked === question.correctId ? 'Corect ✓' : `Greșit ✗ · răspunsul corect este ${question.correctId}`}
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-300">{question.explanation}</p>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        onClick={onRegenerate}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-violet-300/40 bg-violet-400/15 px-3 text-[11px] font-semibold text-violet-50 transition hover:bg-violet-400/25"
      >
        <RefreshCw size={12} />
        Regenerează Întrebări pe Graful Curent
      </button>
    </section>
  )
}

function VerdictCard({
  title,
  verdict,
  children,
}: {
  title: string
  verdict: Verdict
  children: ReactNode
}) {
  return (
    <article
      className={clsx(
        'min-w-0 rounded-2xl border p-2.5',
        verdict === 'yes' && 'border-emerald-300/30 bg-emerald-400/[0.06]',
        verdict === 'no' && 'border-rose-300/30 bg-rose-400/[0.05]',
        verdict === 'open' && 'border-amber-300/30 bg-amber-400/[0.06]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h5 className="text-[12px] font-semibold text-slate-50">{title}</h5>
        <span
          className={clsx(
            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide',
            verdict === 'yes' && 'border-emerald-300/40 bg-emerald-400/20 text-emerald-50',
            verdict === 'no' && 'border-rose-300/40 bg-rose-400/20 text-rose-50',
            verdict === 'open' && 'border-amber-300/40 bg-amber-400/20 text-amber-50',
          )}
        >
          {verdict === 'yes' ? 'DA ✓' : verdict === 'no' ? 'NU ✗' : 'NEDECIS'}
        </span>
      </div>
      <div className="mt-1.5 space-y-1.5 text-[11px] leading-relaxed text-slate-300">{children}</div>
    </article>
  )
}

function Condition({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1">
      <span>{label}</span>
      <span className={ok ? 'font-semibold text-emerald-200' : 'font-semibold text-rose-200'}>{ok ? 'DA ✓' : 'NU ✗'}</span>
    </li>
  )
}

function FormulaRow({ label, formula, note }: { label: string; formula: string; note?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-2.5 py-2">
      <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">{label}</p>
      <p className="mt-1 font-mono text-[12px] leading-relaxed break-words text-cyan-50">{formula}</p>
      {note ? <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{note}</p> : null}
    </div>
  )
}

function AnimateButton({
  algorithm,
  label,
}: {
  algorithm: 'eulerian' | 'hamiltonian' | 'bipartite'
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => {
        const store = useAlgorithmStore.getState()
        if (store.selectedAlgorithm !== algorithm) store.setAlgorithm(algorithm)
        store.generateAndStart()
        store.play()
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300/40 bg-indigo-400/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-50 transition hover:bg-indigo-400/25"
    >
      <Play size={12} />
      {label}
    </button>
  )
}

function buildQuiz(graph: GraphStateData, report: BacGraphReport, seed: number): QuizQuestion[] {
  const rng = makeRng(seed + 1)
  return [questionOne(report, rng), questionMeasure(graph, report, rng), questionFacts(report, rng), questionTraversal(graph, report, rng)]
}

function questionOne(report: BacGraphReport, rng: () => number): QuizQuestion {
  if (rng() < 0.5) return questionComplete(report, rng)
  if (report.edgesToRemoveForSpanningTree === null) return questionConnect(report, rng)
  return questionSpanning(report, rng)
}

function questionComplete(report: BacGraphReport, rng: () => number): QuizQuestion {
  const correct = report.edgesNeededForComplete
  const noun = report.isDirected ? 'arce' : 'muchii'
  const formula = report.isDirected ? 'n(n - 1)' : 'n(n - 1) / 2'
  return numericQuestion(
    'q1',
    `Câte ${noun} lipsesc pentru ca graful curent cu n = ${report.n} noduri și m = ${report.m} ${noun} să devină graf complet?`,
    correct,
    [correct + 1, correct + 2, report.m, report.maxPossibleEdges, Math.max(0, report.n - 1), report.minEdgesToConnect],
    `${formula} = ${report.maxPossibleEdges}. ${report.isCompleteExplanation}`,
    rng,
  )
}

function questionConnect(report: BacGraphReport, rng: () => number): QuizQuestion {
  const correct = report.minEdgesToConnect
  const scope = report.isDirected ? 'pe suportul neorientat' : 'între componente'
  return numericQuestion(
    'q1',
    `Câte muchii trebuie adăugate ${scope} pentru ca graful curent cu n = ${report.n} noduri, m = ${report.m} muchii și nrc = ${report.connectedComponentsCount} să devină conex?`,
    correct,
    [correct + 1, correct + 2, report.connectedComponentsCount, report.m, report.edgesNeededForComplete, Math.max(0, report.n - 1 - report.m)],
    `nrc - 1 = ${report.connectedComponentsCount} - 1 = ${correct}. ${report.minEdgesToConnectExplanation}`,
    rng,
  )
}

function questionSpanning(report: BacGraphReport, rng: () => number): QuizQuestion {
  const correct = report.edgesToRemoveForSpanningTree ?? 0
  const arithmetic = report.m - report.n + 1
  const formula =
    arithmetic === correct ? `m - n + 1 = ${report.m} - ${report.n} + 1 = ${correct}. ` : ''
  const kind = report.isDirected ? 'slab conex' : 'conex'
  return numericQuestion(
    'q1',
    `Câte muchii trebuie eliminate pentru ca graful ${kind} cu n = ${report.n} noduri și m = ${report.m} muchii să devină arbore parțial?`,
    correct,
    [correct + 1, correct + 2, Math.max(0, correct - 1), report.m, Math.max(0, report.n - 1), report.edgesNeededForComplete],
    `${formula}${report.spanningTreeExplanation}`,
    rng,
  )
}

function questionMeasure(graph: GraphStateData, report: BacGraphReport, rng: () => number): QuizQuestion {
  const mode = Math.floor(rng() * 4)
  if (mode === 1) {
    return numericQuestion(
      'q2',
      'Care este gradul maxim al grafului de pe ecran?',
      report.maxDegree,
      [report.maxDegree + 1, Math.max(0, report.maxDegree - 1), report.n - 1, report.m, report.pendantNodes.length, report.sumOfDegrees],
      `Gradul maxim este ${report.maxDegree}, atins de ${formatSet(report.maxDegreeNodes)}. Șirul gradelor este (${list(report.degreeSequence)}).`,
      rng,
    )
  }
  if (mode === 2) {
    const count = report.pendantNodes.length
    return numericQuestion(
      'q2',
      'Câte noduri terminale (d(x) = 1) are graful de pe ecran?',
      count,
      [count + 1, count + 2, report.isolatedNodes.length, report.n, report.maxDegree, report.m],
      `Nodurile terminale sunt ${formatSet(report.pendantNodes)}. Sunt ${count}. Nodurile izolate sunt ${formatSet(report.isolatedNodes)}.`,
      rng,
    )
  }
  if (mode === 3) {
    const sum = adjacencySum(graph)
    return numericQuestion(
      'q2',
      'Care este suma tuturor elementelor din matricea de adiacență a grafului de pe ecran?',
      sum,
      [sum + 1, Math.max(0, sum - 1), report.m, report.sumOfDegrees, report.n, report.maxPossibleEdges],
      matrixSumExplanation(graph, report, sum),
      rng,
    )
  }
  return numericQuestion(
    'q2',
    'Care este suma tuturor gradelor, ∑ d(i), pentru graful de pe ecran?',
    report.sumOfDegrees,
    [report.sumOfDegrees + 1, Math.max(0, report.sumOfDegrees - 1), report.m, report.n, report.maxDegree, report.maxPossibleEdges],
    report.sumOfDegreesExplanation,
    rng,
  )
}

function questionFacts(report: BacGraphReport, rng: () => number): QuizQuestion {
  const all = claimsFor(report)
  const trues = all.filter((claim) => claim.holds)
  const falses = all.filter((claim) => !claim.holds)
  const preferred = trues.filter((claim) => claim.kind === 'property')
  const pool = preferred.length > 0 ? preferred : trues
  const correct = pool[Math.floor(rng() * pool.length)]
  const prompt = 'Care dintre următoarele afirmații despre graful curent (eulerian, conex, bipartit, arbore) este ADEVĂRATĂ?'
  if (!correct) {
    return {
      id: 'q3',
      prompt,
      ...deal(`Graful are ${report.n} noduri și ${report.m} muchii.`, [`Graful are ${report.n + 2} noduri.`, `m = ${report.m + 4}.`, `nrc = ${report.connectedComponentsCount + 3}.`], rng),
      explanation: `Pe ecran, n = ${report.n} și m = ${report.m}.`,
    }
  }
  const fillers = [
    `Graful are ${report.n + 1} noduri.`,
    `Graful are ${report.m + 3} ${report.isDirected ? 'arce' : 'muchii'}.`,
    `Suma gradelor este ${report.sumOfDegrees + 5}.`,
    `nrc = ${report.connectedComponentsCount + 2}.`,
  ]
  const wrongs = [...shuffle(falses, rng).map((claim) => claim.text), ...fillers].filter((text) => text !== correct.text)
  return {
    id: 'q3',
    prompt,
    ...deal(correct.text, wrongs, rng),
    explanation: `${correct.text} ${correct.why}`,
  }
}

function questionTraversal(graph: GraphStateData, report: BacGraphReport, rng: () => number): QuizQuestion {
  const kind: TraversalKind = rng() < 0.5 ? 'bfs' : 'dfs'
  const name = kind === 'bfs' ? 'BFS' : 'DFS'
  const order = report.n === 0 ? [] : printedOrder(graph, kind)
  const third = order[2]
  if (third !== undefined) {
    return numericQuestion(
      'q4',
      `În parcurgerea ${name} pornind din nodul 1, cu vecinii în ordine crescătoare, care este al 3-lea nod afișat?`,
      third,
      [order[0] ?? 1, order[1] ?? 2, order[3] ?? report.n, 1, report.n, third + 1],
      `Ordinea afișată de ${name}(1) este ${order.join(' ')}. Al 3-lea nod este ${third}. Vecinii fiecărui nod sunt luați în ordine crescătoare.`,
      rng,
    )
  }
  const printed = order.length === 0 ? 'niciun nod' : order.join(' ')
  return numericQuestion(
    'q4',
    `În parcurgerea ${name} pornind din nodul 1, cu vecinii în ordine crescătoare, câte noduri sunt afișate?`,
    order.length,
    [order.length + 1, order.length + 2, 3, report.n, 1, report.m],
    order.length === 0
      ? `${name} nu afișează niciun nod: graful nu are noduri.`
      : `${name}(1) afișează ${printed}. Sunt ${order.length} ${order.length === 1 ? 'nod' : 'noduri'}, deci lista are mai puțin de 3 poziții.`,
    rng,
  )
}

function claimsFor(report: BacGraphReport): Claim[] {
  const edgeNoun = report.isDirected ? 'arce' : 'muchii'
  const connected = report.isDirected ? 'Graful este tare conex.' : 'Graful este conex.'
  const claims: Claim[] = [
    { kind: 'property', text: connected, holds: report.n > 0 && report.isConnected, why: report.connectivityExplanation },
    { kind: 'property', text: 'Graful este arbore.', holds: report.isTree, why: report.treeExplanation },
    { kind: 'property', text: 'Graful este eulerian.', holds: report.isEulerian, why: report.eulerianExplanation },
    { kind: 'property', text: 'Graful este bipartit.', holds: report.isBipartite, why: report.bipartiteExplanation },
    {
      kind: 'property',
      text: report.isDirected ? 'Graful este complet orientat.' : `Graful este complet (K_${report.n}).`,
      holds: report.isComplete,
      why: report.isCompleteExplanation,
    },
    { kind: 'property', text: 'Graful este aciclic.', holds: report.isAcyclic, why: report.acyclicExplanation },
    {
      kind: 'count',
      text: `Graful are ${report.n} noduri și ${report.m} ${edgeNoun}.`,
      holds: true,
      why: `Pe ecran, n = ${report.n} și m = ${report.m}.`,
    },
  ]
  if (report.hamiltonianDetermined) {
    claims.push({
      kind: 'property',
      text: 'Graful este hamiltonian.',
      holds: report.isHamiltonian,
      why: report.hamiltonianExplanation,
    })
  }
  return claims
}

function numericQuestion(
  id: string,
  prompt: string,
  correct: number,
  candidates: readonly number[],
  explanation: string,
  rng: () => number,
): QuizQuestion {
  return {
    id,
    prompt,
    explanation,
    ...deal(formatCount(correct), numberWrongs(correct, candidates), rng),
  }
}

function numberWrongs(correct: number, candidates: readonly number[]): string[] {
  const wrongs: string[] = []
  const seen = new Set<string>([formatCount(correct)])
  const pool = candidates.filter((value) => Number.isFinite(value) && value >= 0)
  let bump = 1
  while (wrongs.length < 6 && bump < 40) {
    const raw = pool.length > 0 ? pool.shift() : correct + bump
    bump += 1
    if (raw === undefined || !Number.isFinite(raw) || raw < 0) continue
    const text = formatCount(raw)
    if (seen.has(text)) continue
    seen.add(text)
    wrongs.push(text)
  }
  return wrongs
}

function deal(correct: string, wrongs: readonly string[], rng: () => number): { options: QuizOption[]; correctId: Letter } {
  const padded = padThree(correct, wrongs)
  const order = shuffle([0, 1, 2, 3], rng)
  const texts = [correct, padded[0], padded[1], padded[2]]
  const options: QuizOption[] = []
  let correctId: Letter = 'A'
  for (let slot = 0; slot < 4; slot += 1) {
    const source = order[slot] ?? 0
    const id = LETTERS[slot] ?? 'A'
    options.push({ id, text: texts[source] ?? correct })
    if (source === 0) correctId = id
  }
  return { options, correctId }
}

function padThree(correct: string, wrongs: readonly string[]): [string, string, string] {
  const picked: string[] = []
  const seen = new Set<string>([correct])
  for (const wrong of wrongs) {
    if (seen.has(wrong)) continue
    seen.add(wrong)
    picked.push(wrong)
    if (picked.length === 3) break
  }
  let salt = 1
  while (picked.length < 3) {
    const filler = `altă valoare ${salt}`
    salt += 1
    if (seen.has(filler)) continue
    seen.add(filler)
    picked.push(filler)
  }
  return [picked[0] ?? 'altă valoare 1', picked[1] ?? 'altă valoare 2', picked[2] ?? 'altă valoare 3']
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const next = items.slice()
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1))
    const left = next[index]
    const right = next[swap]
    if (left === undefined || right === undefined) continue
    next[index] = right
    next[swap] = left
  }
  return next
}

function makeRng(seed: number): () => number {
  let state = Math.imul(seed + 1, 0x9e3779b1)
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1)
    state ^= state + Math.imul(state ^ (state >>> 7), 0x6d2b79f5)
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296
  }
}

function printedOrder(graph: GraphStateData, kind: TraversalKind): number[] {
  const steps = kind === 'bfs' ? runBFS(graph, 1) : runDFS(graph, 1)
  return steps[steps.length - 1]?.outputOrder ?? []
}

function adjacencySum(graph: GraphStateData): number {
  const matrix = toAdjacencyMatrix(graph)
  let sum = 0
  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex]
    if (!row) continue
    for (let column = 1; column < row.length; column += 1) {
      const value = row[column] ?? 0
      if (Number.isFinite(value)) sum += value
    }
  }
  return sum
}

function matrixSumExplanation(graph: GraphStateData, report: BacGraphReport, sum: number): string {
  const head = `Suma elementelor din a[1..${report.n}][1..${report.n}] este ${formatCount(sum)}.`
  if (graph.isWeighted) {
    return `${head} Matricea este ponderată, deci suma adună costurile din celule.`
  }
  if (graph.isDirected && sum === report.m) {
    return `${head} Fiecare arc ocupă o celulă cu valoarea 1, deci suma este m = ${report.m}.`
  }
  if (!graph.isDirected && sum === report.sumOfDegrees) {
    return `${head} Fiecare muchie este scrisă în a[i][j] și în a[j][i], deci suma este 2m = ${report.sumOfDegrees}.`
  }
  return head
}

function degreeCondition(report: BacGraphReport): string {
  if (report.isDirected) {
    if (report.eulerianViolators.length === 0) return 'd+(x) = d-(x) pentru fiecare nod.'
    return `d+(x) = d-(x) nu ține pentru nodurile ${formatSet(report.eulerianViolators)}.`
  }
  if (report.eulerianViolators.length === 0) return 'd(x) % 2 == 0 pentru fiecare nod: toate gradele sunt pare.'
  if (report.eulerianViolators.length === 1) {
    return `d(x) % 2 == 0 nu ține: nodul ${String(report.eulerianViolators[0])} are grad impar.`
  }
  return `d(x) % 2 == 0 nu ține: nodurile ${formatSet(report.eulerianViolators)} au grad impar.`
}

function hamiltonVerdict(report: BacGraphReport): Verdict {
  if (report.isHamiltonian) return 'yes'
  if (!report.hamiltonianDetermined) return 'open'
  return 'no'
}

function completeRatio(report: BacGraphReport): string {
  if (report.maxPossibleEdges === 0) return `m = ${report.m}, iar numărul maxim de muchii este 0.`
  if (report.isDirected) return `m / [n(n-1)] = ${report.m} / ${report.maxPossibleEdges}`
  return `m / [n(n-1)/2] = ${report.m} / ${report.maxPossibleEdges}`
}

function maxEdgesFormula(report: BacGraphReport): string {
  if (report.isDirected) return `n(n-1) = ${report.n}*(${report.n}-1) = ${report.maxPossibleEdges}`
  return `n(n-1)/2 = ${report.n}*(${report.n}-1)/2 = ${report.maxPossibleEdges}`
}

function formatSubsetCount(n: number): string {
  if (n <= 0) return '2^n - 1 = 2^0 - 1 = 0'
  if (n > 64) return `2^n - 1 = 2^${n} - 1`
  const value = (1n << BigInt(n)) - 1n
  return `2^n - 1 = 2^${n} - 1 = ${value.toString()}`
}

function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (Number.isInteger(value)) return String(value)
  return String(Math.round(value * 1000) / 1000)
}

function formatSet(ids: readonly number[]): string {
  return ids.length === 0 ? '∅' : `{${ids.join(', ')}}`
}

function list(values: readonly number[]): string {
  return values.length === 0 ? '—' : values.join(', ')
}

function edgeWord(count: number): string {
  return count === 1 ? 'muchie' : 'muchii'
}

function arcWord(count: number): string {
  return count === 1 ? 'arc' : 'arce'
}

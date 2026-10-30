import { clsx } from 'clsx'
import { Check, Copy } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { compileBacProgram, cppListing } from '../../core/algorithms/cppProgram'
import type { AlgorithmStep } from '../../core/algorithms/types'
import { graphSize } from '../../core/representations'
import { useAlgorithmStore } from '../../store/useAlgorithmStore'
import { useGraphStore } from '../../store/useGraphStore'

const CONTROL = new Set([
  'void',
  'if',
  'else',
  'for',
  'while',
  'return',
  'break',
  'continue',
  'const',
  'struct',
  'using',
  'namespace',
])

const TYPES = new Set(['int', 'ifstream', 'bool', 'char', 'double', 'float'])

type TokenKind = 'keyword' | 'type' | 'comment' | 'string' | 'number' | 'array' | 'text'

interface Token {
  kind: TokenKind
  text: string
}

export function CppDebuggerPanel() {
  const nodes = useGraphStore((state) => state.nodes)
  const edges = useGraphStore((state) => state.edges)
  const isDirected = useGraphStore((state) => state.isDirected)
  const algorithm = useAlgorithmStore((state) => state.selectedAlgorithm)
  const steps = useAlgorithmStore((state) => state.steps)
  const currentStepIndex = useAlgorithmStore((state) => state.currentStepIndex)
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'error'>('idle')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)

  const listing = useMemo(() => cppListing(algorithm, isDirected), [algorithm, isDirected])
  const lines = useMemo(() => listing.source.split('\n'), [listing.source])
  const step = currentStepIndex >= 0 ? steps[currentStepIndex] : undefined
  const activeLine = step && step.cppLine >= 1 && step.cppLine <= lines.length ? step.cppLine : 0
  const shownStep = currentStepIndex + 1

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = window.setTimeout(() => setCopyState('idle'), 1600)
    return () => window.clearTimeout(timer)
  }, [copyState])

  useEffect(() => {
    const scroller = scrollerRef.current
    const row = activeRef.current
    if (!scroller || !row) return
    const next = row.offsetTop - scroller.clientHeight / 2 + row.clientHeight / 2
    scroller.scrollTo({ top: Math.max(0, next), behavior: 'smooth' })
  }, [activeLine, listing.source])

  async function copyProgram() {
    const graphState = useGraphStore.getState()
    const algorithmState = useAlgorithmStore.getState()
    const program = compileBacProgram({
      algorithm: algorithmState.selectedAlgorithm,
      graph: {
        nodes: graphState.nodes,
        edges: graphState.edges,
        isDirected: graphState.isDirected,
        isWeighted: graphState.isWeighted,
      },
      startNode: algorithmState.startNode,
      targetNode: algorithmState.targetNode,
    })
    try {
      await copyText(program)
      setCopyState('done')
    } catch {
      setCopyState('error')
    }
  }

  const n = graphSize(nodes)
  const activeEdge = step?.activeEdgeId ? edges.find((edge) => edge.id === step.activeEdgeId) : undefined
  const watch = step ? inlineWatch(step, shownStep) : ''

  return (
    <div role="tabpanel" id="bac-panel-cpp" aria-labelledby="bac-tab-cpp" className="flex min-h-full flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[13px] font-semibold text-cyan-100">{listing.fileName}</p>
          <p className="mt-1 text-[11px] text-slate-300">Complexitate Timp: {listing.time}</p>
          <p className="text-[11px] text-slate-400">Memorie: {listing.memory}</p>
        </div>
        <button
          type="button"
          onClick={() => void copyProgram()}
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/15 px-2.5 py-1.5 text-left text-[11px] font-semibold text-amber-50 transition hover:bg-amber-400/25"
        >
          {copyState === 'done' ? <Check size={13} /> : <Copy size={13} />}
          {copyState === 'done'
            ? 'Copiat'
            : copyState === 'error'
              ? 'Eroare clipboard'
              : 'Copiază Codul C++ (Gata de CodeBlocks/BAC)'}
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Evidențierea urmează <span className="font-mono text-slate-300">cppLine</span> din listingul 1..{lines.length}.
        Programul copiat adaugă <span className="font-mono">#include</span>, citirea din{' '}
        <span className="font-mono">bac.in</span> și datele grafului curent.
      </p>

      <div
        ref={scrollerRef}
        className="relative max-h-[32rem] overflow-auto rounded-2xl border border-white/10 bg-black/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
        aria-label="Cod C++"
      >
        <div className="min-w-max py-1">
          {lines.map((line, index) => {
            const lineNumber = index + 1
            const active = lineNumber === activeLine
            return (
              <div
                key={lineNumber}
                ref={active ? activeRef : undefined}
                aria-current={active ? 'true' : undefined}
                className={clsx(
                  'flex items-center gap-2 px-2 py-px',
                  active &&
                    'bg-cyan-400/10 shadow-[inset_3px_0_0_#fde047,0_0_22px_rgba(34,211,238,0.22)]',
                )}
              >
                <span className="w-3 shrink-0 text-center text-[11px] text-amber-300" aria-hidden="true">
                  {active ? '▶' : ''}
                </span>
                <span className="w-7 shrink-0 text-right font-mono text-[11px] text-slate-500 tabular-nums">
                  {lineNumber}
                </span>
                <code className="whitespace-pre font-mono text-[12px] leading-5">
                  {tokenizeLine(line).map((token, tokenIndex) => (
                    <span key={tokenIndex} className={tokenClass(token.kind)}>
                      {token.text}
                    </span>
                  ))}
                  {line.length === 0 ? ' ' : null}
                </code>
                {active ? (
                  <span className="ml-2 shrink-0 rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] text-amber-50">
                    {watch}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5" aria-label="Valori variabile C++">
        <h3 className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">Valori variabile C++</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <WatchChip label="n" value={String(n)} />
          <WatchChip label="m" value={String(edges.length)} />
          <WatchChip label="x" value={step?.activeNodeId !== null && step?.activeNodeId !== undefined ? String(step.activeNodeId) : '—'} />
          <WatchChip label="cost" value={activeEdge ? String(activeEdge.weight) : '—'} />
          <WatchChip label="cout" value={formatCout(step)} wide />
        </div>
      </section>
    </div>
  )
}

function WatchChip({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <p
      className={clsx(
        'rounded-xl border border-white/10 bg-black/30 px-2 py-1',
        wide ? 'min-w-0 flex-1 basis-full sm:basis-auto' : '',
      )}
    >
      <span className="block text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">{label}</span>
      <span className="font-mono text-[12px] text-cyan-50">{value}</span>
    </p>
  )
}

function inlineWatch(step: AlgorithmStep, shownStep: number): string {
  const bits: string[] = []
  if (step.activeNodeId !== null) bits.push(`nod curent = ${step.activeNodeId}`)
  if (step.queue && step.queue.dr >= 1) bits.push(`st = ${step.queue.st}, dr = ${step.queue.dr}`)
  if (step.stack && step.stack.length > 0) bits.push(`vf = ${step.stack.length}`)
  if (step.royFloydState) {
    bits.push(`k = ${step.royFloydState.k}, i = ${step.royFloydState.i}, j = ${step.royFloydState.j}`)
  }
  if (step.totalCost !== undefined) bits.push(`cost = ${formatCost(step.totalCost)}`)
  if (bits.length === 0) return `// Pasul ${shownStep}: ${step.title}`
  return `// ${bits.join(' | ')}`
}

function formatCout(step: AlgorithmStep | undefined): string {
  if (!step || step.outputOrder.length === 0) return '—'
  return step.outputOrder.join(' ')
}

function formatCost(value: number): string {
  if (!Number.isFinite(value)) return '∞'
  if (Number.isInteger(value)) return String(value)
  return String(Math.round(value * 1000) / 1000)
}

function tokenClass(kind: TokenKind): string {
  switch (kind) {
    case 'keyword':
      return 'text-violet-300'
    case 'type':
      return 'text-cyan-300'
    case 'comment':
      return 'text-slate-500 italic'
    case 'string':
      return 'text-emerald-300'
    case 'number':
      return 'text-amber-200'
    case 'array':
      return 'text-fuchsia-200'
    case 'text':
      return 'text-slate-200'
  }
}

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  while (index < line.length) {
    if (line.startsWith('//', index)) {
      tokens.push({ kind: 'comment', text: line.slice(index) })
      break
    }
    const character = line[index] ?? ''
    if (character === '"') {
      let end = index + 1
      while (end < line.length && line[end] !== '"') {
        if (line[end] === '\\') end += 1
        end += 1
      }
      if (end < line.length) end += 1
      tokens.push({ kind: 'string', text: line.slice(index, end) })
      index = end
      continue
    }
    if (character === ' ' || character === '\t') {
      let end = index + 1
      while (end < line.length && (line[end] === ' ' || line[end] === '\t')) end += 1
      tokens.push({ kind: 'text', text: line.slice(index, end) })
      index = end
      continue
    }
    if (isDigit(character)) {
      let end = index + 1
      while (end < line.length && isDigit(line[end] ?? '')) end += 1
      tokens.push({ kind: 'number', text: line.slice(index, end) })
      index = end
      continue
    }
    if (isIdentStart(character)) {
      let end = index + 1
      while (end < line.length && isIdentPart(line[end] ?? '')) end += 1
      const word = line.slice(index, end)
      let look = end
      while (look < line.length && (line[look] === ' ' || line[look] === '\t')) look += 1
      const kind: TokenKind = TYPES.has(word)
        ? 'type'
        : CONTROL.has(word)
          ? 'keyword'
          : line[look] === '['
            ? 'array'
            : 'text'
      tokens.push({ kind, text: word })
      index = end
      continue
    }
    tokens.push({ kind: 'text', text: character })
    index += 1
  }
  return tokens
}

function isDigit(character: string): boolean {
  return character >= '0' && character <= '9'
}

function isIdentStart(character: string): boolean {
  return (character >= 'A' && character <= 'Z') || (character >= 'a' && character <= 'z') || character === '_'
}

function isIdentPart(character: string): boolean {
  return isIdentStart(character) || isDigit(character)
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // The document can be unfocused while the player is running.
    }
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', 'true')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  document.body.appendChild(area)
  area.select()
  const copied = document.execCommand('copy')
  area.remove()
  if (!copied) throw new Error('copy failed')
}

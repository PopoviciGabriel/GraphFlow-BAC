import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface HelpShortcutsModalProps {
  open: boolean
  onClose: () => void
}

interface ShortcutRow {
  keys: string
  action: string
}

interface CheatRow {
  term: string
  definition: ReactNode
}

const CANVAS_SHORTCUTS: readonly ShortcutRow[] = [
  { keys: 'Dublu-click pe ecran', action: 'Adaugă nod nou (N+1)' },
  { keys: 'Shift + Drag între noduri', action: 'Trage muchie rapid' },
  { keys: 'V / N / E / D', action: 'Mod Selectare / Nod / Muchie / Ștergere' },
  {
    keys: 'Delete / Backspace',
    action: 'Șterge nodul sau muchia selectată (cu renumerotare automată 1..N)',
  },
  { keys: 'Ctrl + Z / Ctrl + Y', action: 'Undo / Redo' },
  { keys: 'Scroll / Drag pe fundal', action: 'Zoom & Pan' },
]

const PLAYER_SHORTCUTS: readonly ShortcutRow[] = [
  { keys: 'Space', action: 'Rulează / Pauză animație' },
  { keys: '→ / ←', action: 'Pas Înainte / Pas Înapoi în timp (Time-Travel Debugging)' },
  { keys: 'Esc', action: 'Oprește execuția și revine la editare' },
]

const CHEAT_SHEET: readonly CheatRow[] = [
  {
    term: 'Grad intern / extern',
    definition: (
      <>
        Într-un graf orientat, <Formula>d⁻(x)</Formula> numără arcele care intră în x, iar <Formula>d⁺(x)</Formula> pe
        cele care ies. Într-un graf neorientat există un singur grad <Formula>d(x)</Formula>: muchiile incidente, o
        buclă contând de două ori. Σ <Formula>d(x)</Formula> = 2m, iar pentru un graf orientat Σ <Formula>d⁻(x)</Formula>{' '}
        = Σ <Formula>d⁺(x)</Formula> = m.
      </>
    ),
  },
  {
    term: 'Graf conex vs. tare conex',
    definition:
      'Un graf neorientat este conex dacă între orice două noduri există un lanț (o singură componentă conexă). Un graf orientat este tare conex dacă între orice două noduri există drum în ambele sensuri. Componentele tare conexe se obțin prin Plus-Minus.',
  },
  {
    term: 'Condiția de arbore',
    definition: (
      <>
        Un graf neorientat este arbore dacă este conex și aciclic. Echivalent: este conex și <Formula>m = n − 1</Formula>.
        Atunci există exact un lanț între orice două noduri.
      </>
    ),
  },
  {
    term: 'Teorema lui Euler',
    definition: (
      <>
        Un graf neorientat conex, în care nodurile izolate nu contează, admite ciclu eulerian dacă și numai dacă{' '}
        <Formula>d(x)</Formula> este par pentru orice nod x. Un graf orientat slab conex admite circuit eulerian dacă{' '}
        <Formula>d⁺(x) = d⁻(x)</Formula> pentru orice x.
      </>
    ),
  },
  {
    term: 'Teorema lui Dirac',
    definition: (
      <>
        Dacă graful este simplu și neorientat, are n ≥ 3 și <Formula>d(x) ≥ n/2</Formula> pentru orice nod x, atunci
        graful este hamiltonian. Condiția este suficientă, nu și necesară.
      </>
    ),
  },
  {
    term: 'Formula lui Cayley',
    definition: (
      <>
        Numărul de arbori etichetați distincți cu n noduri este <Formula>n<sup>n−2</sup></Formula>.
      </>
    ),
  },
]

export function HelpShortcutsModal({ open, onClose }: HelpShortcutsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#090d16]/75 p-3 backdrop-blur-sm sm:p-6"
      data-graphflow-overlay="help"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-shortcuts-title"
        tabIndex={-1}
        className="flex max-h-[min(880px,calc(100vh-1.5rem))] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c1220]/95 text-slate-100 shadow-[0_30px_80px_rgba(0,0,0,0.55)] outline-none"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 id="help-shortcuts-title" className="text-base font-semibold tracking-wide text-slate-50">
              Ajutor & Scurtături
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Canvas, player și formulele care apar la Subiectul I și II. Apasă din nou <Kbd>?</Kbd> sau Esc pentru a
              închide.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide ajutorul"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X size={15} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="grid gap-3 md:grid-cols-2">
            <ShortcutColumn title="Scurtături Canvas & Editare" rows={CANVAS_SHORTCUTS} />
            <ShortcutColumn title="Scurtături Player Algoritmi" rows={PLAYER_SHORTCUTS} />
          </div>

          <section className="overflow-hidden rounded-2xl border border-amber-300/20 bg-amber-400/[0.04]">
            <header className="border-b border-white/10 px-3 py-2.5">
              <h3 className="text-[11px] font-semibold tracking-[0.14em] text-amber-100 uppercase">
                Sinteza de Aur pentru BAC (Subiectul I & II)
              </h3>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left text-[12px]">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] tracking-[0.12em] text-slate-500 uppercase">
                    <th className="w-[11.5rem] px-3 py-2 font-semibold">Noțiune</th>
                    <th className="px-3 py-2 font-semibold">Definiție</th>
                  </tr>
                </thead>
                <tbody>
                  {CHEAT_SHEET.map((row) => (
                    <tr key={row.term} className="border-b border-white/5 last:border-b-0">
                      <th className="px-3 py-2.5 align-top font-medium text-slate-100">{row.term}</th>
                      <td className="px-3 py-2.5 leading-relaxed text-slate-300">{row.definition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ShortcutColumn({ title, rows }: { title: string; rows: readonly ShortcutRow[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <h3 className="border-b border-white/10 px-3 py-2.5 text-[11px] font-semibold tracking-[0.14em] text-cyan-100 uppercase">
        {title}
      </h3>
      <ul className="divide-y divide-white/5">
        {rows.map((row) => (
          <li key={row.keys} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[11.5rem_minmax(0,1fr)] sm:items-start sm:gap-3">
            <Kbd>{row.keys}</Kbd>
            <p className="text-[12px] leading-relaxed text-slate-300">{row.action}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex w-fit max-w-full items-center rounded-lg border border-white/10 bg-black/30 px-2 py-1 font-mono text-[11px] font-medium text-cyan-100">
      {children}
    </kbd>
  )
}

function Formula({ children }: { children: ReactNode }) {
  return <span className="font-mono text-amber-100">{children}</span>
}

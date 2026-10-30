import { clsx } from 'clsx'
import {
  CircleDot,
  Eraser,
  Eye,
  EyeOff,
  GitBranch,
  LayoutGrid,
  MousePointer2,
  Plus,
  Redo2,
  RotateCcw,
  Spline,
  Trash,
  Undo2,
  Waypoints,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { GraphLayoutType, InteractionMode } from '../../store/useGraphStore'
import { useGraphStore } from '../../store/useGraphStore'

interface CanvasToolbarProps {
  showDegrees: boolean
  onToggleDegrees: () => void
  onApplyLayout: (type: GraphLayoutType) => void
}

const MODES: { mode: InteractionMode; label: string; shortcut: string; icon: ReactNode }[] = [
  { mode: 'select', label: 'Select', shortcut: 'V', icon: <MousePointer2 size={15} /> },
  { mode: 'addNode', label: 'Node', shortcut: 'N', icon: <Plus size={15} /> },
  { mode: 'addEdge', label: 'Edge', shortcut: 'E', icon: <Spline size={15} /> },
  { mode: 'delete', label: 'Delete', shortcut: 'D', icon: <Trash size={15} /> },
]

export function CanvasToolbar({ showDegrees, onToggleDegrees, onApplyLayout }: CanvasToolbarProps) {
  const interactionMode = useGraphStore((state) => state.interactionMode)
  const isDirected = useGraphStore((state) => state.isDirected)
  const isWeighted = useGraphStore((state) => state.isWeighted)
  const canUndo = useGraphStore((state) => state.past.length > 0)
  const canRedo = useGraphStore((state) => state.future.length > 0)
  const setInteractionMode = useGraphStore((state) => state.setInteractionMode)
  const setDirected = useGraphStore((state) => state.setDirected)
  const setWeighted = useGraphStore((state) => state.setWeighted)
  const undo = useGraphStore((state) => state.undo)
  const redo = useGraphStore((state) => state.redo)
  const clearGraph = useGraphStore((state) => state.clearGraph)
  const resetToInitial = useGraphStore((state) => state.resetToInitial)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#0c1220]/80 p-1.5 shadow-[0_16px_50px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="flex items-center gap-1">
          {MODES.map((item) => (
            <ToolbarButton
              key={item.mode}
              active={interactionMode === item.mode}
              tone={item.mode}
              title={modeTitle(item.mode, item.shortcut)}
              onClick={() => setInteractionMode(item.mode)}
            >
              {item.icon}
              <span>{item.label}</span>
              <kbd className="rounded bg-white/5 px-1 text-[10px] text-slate-500">{item.shortcut}</kbd>
            </ToolbarButton>
          ))}
        </div>

        <Divider />

        <Segment
          value={isDirected ? 'directed' : 'undirected'}
          options={[
            { id: 'undirected', label: 'Neorientat' },
            { id: 'directed', label: 'Orientat' },
          ]}
          onChange={(id) => setDirected(id === 'directed')}
        />
        <Segment
          value={isWeighted ? 'weighted' : 'plain'}
          options={[
            { id: 'plain', label: 'Neponderat' },
            { id: 'weighted', label: 'Ponderat' },
          ]}
          onChange={(id) => setWeighted(id === 'weighted')}
        />

        <Divider />

        <ToolbarButton title="Circular layout" onClick={() => onApplyLayout('circular')}>
          <CircleDot size={15} />
          <span>Circular</span>
        </ToolbarButton>
        <ToolbarButton title="Force-directed layout (untangle)" onClick={() => onApplyLayout('force')}>
          <Waypoints size={15} />
          <span>Untangle</span>
        </ToolbarButton>
        <ToolbarButton title="Grid layout" onClick={() => onApplyLayout('grid')}>
          <LayoutGrid size={15} />
          <span>Grid</span>
        </ToolbarButton>
        <ToolbarButton title="Arbore (Ierarhic)" onClick={() => onApplyLayout('tree')}>
          <GitBranch size={15} />
          <span>Arbore (Ierarhic)</span>
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
          <Undo2 size={15} />
          <span>Undo</span>
        </ToolbarButton>
        <ToolbarButton title="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo}>
          <Redo2 size={15} />
          <span>Redo</span>
        </ToolbarButton>
        <ToolbarButton
          title={showDegrees ? 'Hide degrees' : 'Show degrees on nodes'}
          active={showDegrees}
          tone="select"
          onClick={onToggleDegrees}
        >
          {showDegrees ? <EyeOff size={15} /> : <Eye size={15} />}
          <span>Degrees</span>
        </ToolbarButton>
        <ToolbarButton title="Revino la graful implicit cu 6 noduri" onClick={resetToInitial}>
          <RotateCcw size={15} />
          <span>Resetează la Inițial</span>
        </ToolbarButton>
        <ToolbarButton title="Clear canvas" onClick={clearGraph} danger>
          <Eraser size={15} />
          <span>Clear</span>
        </ToolbarButton>
      </div>
    </div>
  )
}

function modeTitle(mode: InteractionMode, shortcut: string): string {
  if (mode === 'select') return `Select / Move (${shortcut})`
  if (mode === 'addNode') return `Add Node (${shortcut})`
  if (mode === 'addEdge') return `Add Edge (${shortcut})`
  return `Delete (${shortcut})`
}

function Divider() {
  return <span className="mx-0.5 hidden h-6 w-px bg-white/10 sm:block" aria-hidden="true" />
}

function ToolbarButton({
  active = false,
  tone = 'select',
  danger = false,
  disabled = false,
  title,
  onClick,
  children,
}: {
  active?: boolean
  tone?: InteractionMode
  danger?: boolean
  disabled?: boolean
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition disabled:pointer-events-none disabled:opacity-35',
        active && tone === 'select' && 'bg-cyan-400/15 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.45)]',
        active && tone === 'addNode' && 'bg-emerald-400/15 text-emerald-50 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.45)]',
        active && tone === 'addEdge' && 'bg-indigo-400/15 text-indigo-50 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.5)]',
        active && tone === 'delete' && 'bg-rose-400/15 text-rose-50 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.5)]',
        !active && !danger && 'text-slate-300 hover:bg-white/10 hover:text-white',
        danger && 'text-rose-200/90 hover:bg-rose-400/10',
      )}
    >
      {children}
    </button>
  )
}

function Segment({
  value,
  options,
  onChange,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (id: string) => void
}) {
  return (
    <div className="flex h-8 items-center rounded-xl bg-white/[0.04] p-0.5">
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={clsx(
              'h-7 rounded-[10px] px-2.5 text-xs font-medium transition',
              active ? 'bg-white/10 text-slate-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

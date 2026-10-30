import { Scan } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AlgorithmId, AlgorithmStep, EdgeVisualState, NodeVisualState } from '../../core/algorithms/types'
import { computeNodeDegrees } from '../../core/representations'
import type { GraphNode, NodeDegrees } from '../../core/types'
import { useAlgorithmStore } from '../../store/useAlgorithmStore'
import type { GraphLayoutType } from '../../store/useGraphStore'
import { useGraphStore } from '../../store/useGraphStore'
import { CanvasToolbar } from './CanvasToolbar'
import {
  NODE_RADIUS,
  buildRenderedEdges,
  clientToWorld,
  degreeBadgeBox,
  findEdgeBetween,
  findEdgeNear,
  findNodeNear,
  fitGraph,
  formatWeight,
  hitsDegreeBadge,
  hitsWeightBadge,
  weightBadgeBox,
  worldToScreen,
  zoomAt,
  type Point,
  type RenderedEdge,
  type ViewTransform,
} from './geometry'

interface PanDrag {
  kind: 'pan'
  pointerId: number
  lastX: number
  lastY: number
  moved: boolean
}

interface NodeDrag {
  kind: 'node'
  pointerId: number
  nodeId: number
  offsetX: number
  offsetY: number
  historyArmed: boolean
}

interface EdgeDrag {
  kind: 'edge'
  pointerId: number
  sourceId: number
  moved: boolean
  originX: number
  originY: number
  hoverId: number | null
}

type DragSession = PanDrag | NodeDrag | EdgeDrag

interface PressState {
  x: number
  y: number
  worldX: number
  worldY: number
  emptyAdd: boolean
  moved: boolean
}

interface DraftEdge {
  sourceId: number
  x: number
  y: number
  hoverId: number | null
}

interface WeightEditorState {
  edgeId: string
}

type Hit =
  | { type: 'node'; node: GraphNode }
  | { type: 'edge'; figure: RenderedEdge }
  | { type: 'badge'; figure: RenderedEdge }
  | { type: 'empty' }

export function GraphCanvas() {
  const nodes = useGraphStore((state) => state.nodes)
  const edges = useGraphStore((state) => state.edges)
  const isDirected = useGraphStore((state) => state.isDirected)
  const isWeighted = useGraphStore((state) => state.isWeighted)
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const selectedEdgeId = useGraphStore((state) => state.selectedEdgeId)
  const interactionMode = useGraphStore((state) => state.interactionMode)
  const layoutEpoch = useGraphStore((state) => state.layoutEpoch)
  const selectedAlgorithm = useAlgorithmStore((state) => state.selectedAlgorithm)
  const algorithmSteps = useAlgorithmStore((state) => state.steps)
  const currentStepIndex = useAlgorithmStore((state) => state.currentStepIndex)
  const algorithmStep = currentStepIndex >= 0 ? algorithmSteps[currentStepIndex] : undefined

  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 })
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [showDegrees, setShowDegrees] = useState(false)
  const [panning, setPanning] = useState(false)
  const [draftEdge, setDraftEdge] = useState<DraftEdge | null>(null)
  const [armedSourceId, setArmedSourceId] = useState<number | null>(null)
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null)
  const [weightEditor, setWeightEditor] = useState<WeightEditorState | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const viewRef = useRef(view)
  const dragRef = useRef<DragSession | null>(null)
  const pressRef = useRef<PressState | null>(null)
  const armedRef = useRef<number | null>(null)
  const fittedRef = useRef(false)
  const layoutEpochRef = useRef(layoutEpoch)
  const lastAddRef = useRef({ time: 0, x: 0, y: 0 })

  viewRef.current = view
  armedRef.current = armedSourceId

  const rendered = useMemo(
    () => buildRenderedEdges(nodes, edges, isDirected),
    [nodes, edges, isDirected],
  )
  const degrees = useMemo(
    () => computeNodeDegrees({ nodes, edges, isDirected, isWeighted }),
    [nodes, edges, isDirected, isWeighted],
  )

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const measure = () => {
      const bounds = svg.getBoundingClientRect()
      setViewport({ width: bounds.width, height: bounds.height })
      if (fittedRef.current || bounds.width < 40 || bounds.height < 40) return
      fittedRef.current = true
      setView(fitGraph(useGraphStore.getState().nodes, bounds.width, bounds.height))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (layoutEpochRef.current === layoutEpoch) return
    layoutEpochRef.current = layoutEpoch
    const svg = svgRef.current
    if (!svg) return
    const bounds = svg.getBoundingClientRect()
    if (bounds.width < 40 || bounds.height < 40) return
    setView(fitGraph(useGraphStore.getState().nodes, bounds.width, bounds.height))
  }, [layoutEpoch])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const bounds = svg.getBoundingClientRect()
      const cursor = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
      const current = viewRef.current
      const delta =
        event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * bounds.height : event.deltaY
      setView(zoomAt(current, cursor, current.scale * Math.exp(-delta * 0.0015)))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('[data-graphflow-overlay]')) return
      if (isEditableTarget(event.target)) return
      const key = event.key.toLowerCase()
      if (event.metaKey || event.ctrlKey) {
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault()
          useGraphStore.getState().undo()
        } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
          event.preventDefault()
          useGraphStore.getState().redo()
        }
        return
      }
      if (event.altKey || event.repeat) return
      const store = useGraphStore.getState()
      if (key === 'v') store.setInteractionMode('select')
      else if (key === 'n') store.setInteractionMode('addNode')
      else if (key === 'e') store.setInteractionMode('addEdge')
      else if (key === 'd') store.setInteractionMode('delete')
      else if (key === 'delete' || key === 'backspace') {
        event.preventDefault()
        if (store.selectedNodeId !== null) store.removeNode(store.selectedNodeId)
        else if (store.selectedEdgeId) store.removeEdge(store.selectedEdgeId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (interactionMode !== 'addEdge') setArmedSourceId(null)
  }, [interactionMode])

  useEffect(() => {
    if (armedSourceId !== null && !nodes.some((node) => node.id === armedSourceId)) {
      setArmedSourceId(null)
    }
  }, [armedSourceId, nodes])

  useEffect(() => {
    if (weightEditor && !edges.some((edge) => edge.id === weightEditor.edgeId)) {
      setWeightEditor(null)
    }
  }, [edges, weightEditor])

  const hitTest = (world: Point): Hit => {
    const scale = viewRef.current.scale
    const node = findNodeNear(nodes, world, NODE_RADIUS + 4 / scale)
    if (node) return { type: 'node', node }
    if (isWeighted) {
      const badge = rendered.find((figure) => hitsWeightBadge(figure, world))
      if (badge) return { type: 'badge', figure: badge }
    }
    if (showDegrees) {
      const labeled = nodes.find((node) =>
        hitsDegreeBadge(node, world, degreeLabel(degrees[node.id], isDirected)),
      )
      if (labeled) return { type: 'node', node: labeled }
    }
    const edgeHit = findEdgeNear(rendered, world, Math.max(7, 9 / scale))
    if (edgeHit) return { type: 'edge', figure: edgeHit }
    return { type: 'empty' }
  }

  const addNodeAt = (x: number, y: number) => {
    const now = performance.now()
    const previous = lastAddRef.current
    if (now - previous.time < 280 && Math.hypot(x - previous.x, y - previous.y) < 8) return
    lastAddRef.current = { time: now, x, y }
    useGraphStore.getState().addNode(x, y)
  }

  const createEdge = (source: number, target: number) => {
    const store = useGraphStore.getState()
    const existing = findEdgeBetween(store.edges, source, target, store.isDirected)
    if (existing) {
      store.setSelectedEdgeId(existing.id)
      return
    }
    store.addOrToggleEdge(source, target, 1)
  }

  const fitToScreen = () => {
    const svg = svgRef.current
    if (!svg) return
    const bounds = svg.getBoundingClientRect()
    setView(fitGraph(useGraphStore.getState().nodes, bounds.width, bounds.height))
  }

  const applyLayout = (type: GraphLayoutType) => {
    const svg = svgRef.current
    if (!svg) return
    const bounds = svg.getBoundingClientRect()
    const rootId = useAlgorithmStore.getState().startNode
    useGraphStore
      .getState()
      .applyLayout(type, Math.max(bounds.width, 320), Math.max(bounds.height, 320), rootId)
    setView(fitGraph(useGraphStore.getState().nodes, bounds.width, bounds.height))
    setArmedSourceId(null)
    setDraftEdge(null)
  }

  const openWeightEditor = (figure: RenderedEdge) => {
    useGraphStore.getState().setSelectedEdgeId(figure.edge.id)
    setWeightEditor({ edgeId: figure.edge.id })
  }

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button === 2) return
    if (event.button === 1) event.preventDefault()
    const world = pointerWorld(event)
    if (!world) return
    const hit = hitTest(world)
    const panModifier = event.button === 1

    if (panModifier) {
      beginPan(event)
      return
    }
    if (event.button !== 0) return

    if (hit.type === 'badge') {
      openWeightEditor(hit.figure)
      return
    }

    if (hit.type === 'node') {
      const store = useGraphStore.getState()
      if (store.interactionMode === 'delete' && !event.shiftKey) {
        store.removeNode(hit.node.id)
        return
      }
      if (event.shiftKey || store.interactionMode === 'addEdge') {
        store.setSelectedNodeId(hit.node.id)
        beginEdge(event, hit.node.id, world)
        return
      }
      store.setSelectedNodeId(hit.node.id)
      beginNode(event, hit.node, world)
      return
    }

    if (hit.type === 'edge') {
      const store = useGraphStore.getState()
      if (store.interactionMode === 'delete') {
        store.removeEdge(hit.figure.edge.id)
        return
      }
      store.setSelectedEdgeId(hit.figure.edge.id)
      return
    }

    const mode = useGraphStore.getState().interactionMode
    if (mode === 'select') {
      beginPan(event)
      return
    }
    if (mode === 'addNode') {
      pressRef.current = {
        x: event.clientX,
        y: event.clientY,
        worldX: world.x,
        worldY: world.y,
        emptyAdd: true,
        moved: false,
      }
      return
    }
    if (mode === 'addEdge') setArmedSourceId(null)
    pressRef.current = null
  }

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const world = pointerWorld(event)
    if (!world) return
    const press = pressRef.current
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 4) press.moved = true

    const drag = dragRef.current
    if (!drag) {
      if (armedRef.current !== null) setCursorWorld(world)
      return
    }

    if (drag.kind === 'pan') {
      const dx = event.clientX - drag.lastX
      const dy = event.clientY - drag.lastY
      if (dx !== 0 || dy !== 0) drag.moved = true
      drag.lastX = event.clientX
      drag.lastY = event.clientY
      setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }))
      return
    }

    if (drag.kind === 'node') {
      const store = useGraphStore.getState()
      const node = store.nodes.find((item) => item.id === drag.nodeId)
      if (!node) return
      const x = world.x - drag.offsetX
      const y = world.y - drag.offsetY
      if (node.x === x && node.y === y) return
      store.updateNodePosition(drag.nodeId, x, y, !drag.historyArmed)
      drag.historyArmed = true
      return
    }

    if (Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) > 4) drag.moved = true
    const hover = findNodeNear(
      useGraphStore.getState().nodes,
      world,
      NODE_RADIUS + 16 / viewRef.current.scale,
    )
    drag.hoverId = hover?.id ?? null
    setDraftEdge({
      sourceId: drag.sourceId,
      x: hover ? hover.x : world.x,
      y: hover ? hover.y : world.y,
      hoverId: hover?.id ?? null,
    })
  }

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    setPanning(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // The pointer was already released.
      }
    }

    if (!drag) {
      const press = pressRef.current
      pressRef.current = null
      if (press?.emptyAdd && !press.moved && event.button === 0) addNodeAt(press.worldX, press.worldY)
      return
    }
    pressRef.current = null

    if (drag.kind === 'pan') {
      if (!drag.moved && event.button === 0) {
        const store = useGraphStore.getState()
        store.setSelectedNodeId(null)
        store.setSelectedEdgeId(null)
      }
      return
    }

    if (drag.kind === 'node') return

    const hoverId = drag.hoverId
    if (hoverId !== null && (drag.moved || hoverId !== drag.sourceId)) {
      createEdge(drag.sourceId, hoverId)
      setArmedSourceId(null)
    } else if (!drag.moved && useGraphStore.getState().interactionMode === 'addEdge') {
      const armed = armedRef.current
      if (armed !== null && armed !== drag.sourceId) {
        createEdge(armed, drag.sourceId)
        setArmedSourceId(null)
      } else {
        setArmedSourceId(drag.sourceId)
        const world = pointerWorld(event)
        if (world) setCursorWorld(world)
      }
    }
    setDraftEdge(null)
  }

  const onPointerCancel = () => {
    dragRef.current = null
    pressRef.current = null
    setPanning(false)
    setDraftEdge(null)
  }

  const onDoubleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const world = pointerWorld(event)
    if (!world) return
    const hit = hitTest(world)
    if (hit.type === 'badge' || (hit.type === 'edge' && isWeighted)) {
      openWeightEditor(hit.figure)
      return
    }
    if (hit.type !== 'empty') return
    if (useGraphStore.getState().interactionMode === 'addNode') return
    addNodeAt(world.x, world.y)
  }

  const pointerWorld = (event: { clientX: number; clientY: number }): Point | null => {
    const svg = svgRef.current
    if (!svg) return null
    return clientToWorld(event.clientX, event.clientY, svg.getBoundingClientRect(), viewRef.current)
  }

  const beginPan = (event: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = {
      kind: 'pan',
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    }
    setPanning(true)
    capturePointer(event)
  }

  const beginNode = (event: React.PointerEvent<SVGSVGElement>, node: GraphNode, world: Point) => {
    dragRef.current = {
      kind: 'node',
      pointerId: event.pointerId,
      nodeId: node.id,
      offsetX: world.x - node.x,
      offsetY: world.y - node.y,
      historyArmed: false,
    }
    setWeightEditor(null)
    capturePointer(event)
  }

  const beginEdge = (event: React.PointerEvent<SVGSVGElement>, sourceId: number, world: Point) => {
    dragRef.current = {
      kind: 'edge',
      pointerId: event.pointerId,
      sourceId,
      moved: false,
      originX: event.clientX,
      originY: event.clientY,
      hoverId: null,
    }
    setDraftEdge({ sourceId, x: world.x, y: world.y, hoverId: null })
    setWeightEditor(null)
    capturePointer(event)
  }

  const spacing = 28 * view.scale
  const dotX = ((view.x % spacing) + spacing) % spacing
  const dotY = ((view.y % spacing) + spacing) % spacing
  const draftSource = draftEdge ? nodes.find((node) => node.id === draftEdge.sourceId) : undefined
  const armedSource = !draftEdge && armedSourceId !== null ? nodes.find((node) => node.id === armedSourceId) : undefined
  const armedHover =
    armedSource && cursorWorld
      ? findNodeNear(
          nodes.filter((node) => node.id !== armedSource.id),
          cursorWorld,
          NODE_RADIUS + 16 / view.scale,
        )
      : null
  const editorFigure = weightEditor ? rendered.find((figure) => figure.edge.id === weightEditor.edgeId) : undefined
  const editorScreen = editorFigure ? worldToScreen(editorFigure.label, view) : null
  const cursorClass = panning
    ? 'cursor-grabbing'
    : interactionMode === 'addNode' || interactionMode === 'addEdge'
      ? 'cursor-crosshair'
      : interactionMode === 'delete'
        ? 'cursor-pointer'
        : 'cursor-default'

  return (
    <div className="relative h-full min-h-0 w-full">
      <svg
        ref={svgRef}
        data-graphflow-canvas=""
        className={`absolute inset-0 h-full w-full touch-none ${cursorClass}`}
        role="application"
        aria-label="Interactive graph canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onDoubleClick={onDoubleClick}
        onMouseDown={(event) => {
          if (event.button === 1) event.preventDefault()
        }}
        onAuxClick={(event) => event.preventDefault()}
      >
        <defs>
          <pattern id="gf-dots" width={spacing} height={spacing} patternUnits="userSpaceOnUse" x={dotX} y={dotY}>
            <circle cx="1.1" cy="1.1" r="1.15" fill="rgba(148, 163, 184, 0.42)" />
          </pattern>
          <ArrowHead id="gf-arrow" color="#67e8f9" />
          <ArrowHead id="gf-arrow-active" color="#6ee7b7" />
          <ArrowHead id="gf-arrow-tree" color="#34d399" />
          <ArrowHead id="gf-arrow-hot" color="#fde047" />
          <ArrowHead id="gf-arrow-alert" color="#fb7185" />
          <filter id="gf-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="#090d16" />
        <rect width="100%" height="100%" fill="url(#gf-dots)" />

        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`} pointerEvents="none">
          {rendered.map((figure) => {
            const selected = figure.edge.id === selectedEdgeId
            const text = formatWeight(figure.edge.weight)
            const badge = weightBadgeBox(figure.label, text)
            const paint = algorithmStep ? edgePaint(algorithmStep.edgeStates[figure.edge.id] ?? 'default') : null
            const stroke = paint ? paint.stroke : selected ? '#6ee7b7' : 'rgba(103, 232, 249, 0.88)'
            const width = paint ? paint.width : selected ? 3.3 : 2.15
            const marker = figure.directed
              ? `url(#${paint ? paint.markerId : selected ? 'gf-arrow-active' : 'gf-arrow'})`
              : undefined
            return (
              <g
                key={figure.edge.id}
                role="button"
                aria-label={`Edge ${figure.edge.source} to ${figure.edge.target}`}
                pointerEvents="auto"
                opacity={paint?.opacity ?? 1}
              >
                {paint?.glow ? (
                  <path
                    d={figure.path}
                    fill="none"
                    stroke={paint.glow}
                    strokeWidth={width + 3.2}
                    strokeLinecap="round"
                    opacity={0.4}
                  />
                ) : null}
                <path
                  d={figure.path}
                  fill="none"
                  className={paint?.flow ? 'gf-edge-flow' : undefined}
                  stroke={stroke}
                  strokeWidth={width}
                  strokeLinecap="round"
                  strokeDasharray={paint?.flow ? '8 6' : undefined}
                  markerEnd={marker}
                />
                {isWeighted ? (
                  <g>
                    <rect
                      x={badge.x}
                      y={badge.y}
                      width={badge.width}
                      height={badge.height}
                      rx="10"
                      fill="#090d16"
                      stroke="rgba(196, 181, 253, 0.55)"
                    />
                    <text
                      x={figure.label.x}
                      y={figure.label.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#ddd6fe"
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="Segoe UI, ui-sans-serif, system-ui, sans-serif"
                    >
                      {text}
                    </text>
                  </g>
                ) : null}
              </g>
            )
          })}

          {nodes.map((node) => {
            const degree = degrees[node.id]
            const idleTone = nodeTone(node.id === selectedNodeId, showDegrees, degree)
            const paint: NodePaint = algorithmStep
              ? resolveNodePaint(
                  selectedAlgorithm,
                  algorithmStep.nodeStates[node.id] ?? 'default',
                  algorithmStep.viz[node.id] ?? 0,
                )
              : {
                  fill: '#0b1220',
                  stroke: idleTone.stroke,
                  halo: idleTone.halo,
                  strokeWidth: node.id === selectedNodeId ? 2.6 : 1.75,
                  ring: null,
                  pulse: false,
                }
            const caption = algorithmStep ? nodeCaption(selectedAlgorithm, algorithmStep, node.id) : null
            const snapTargetId = draftEdge?.hoverId ?? armedHover?.id ?? null
            const armed = node.id === armedSourceId || node.id === snapTargetId
            const label = degreeLabel(degree, isDirected)
            const badge = degreeBadgeBox(node, label)
            return (
              <g
                key={node.id}
                role="button"
                aria-label={caption ? `Node ${node.label}, ${caption}` : `Node ${node.label}`}
                pointerEvents="auto"
              >
                {armed ? (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS + 7}
                    fill="none"
                    stroke="#a5f3fc"
                    strokeWidth="1.6"
                    strokeDasharray="4 3"
                  />
                ) : null}
                {algorithmStep && node.id === selectedNodeId ? (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS + (paint.pulse ? 16 : 12)}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity="0.5"
                    strokeWidth="1.15"
                    strokeDasharray="3 3"
                  />
                ) : null}
                {paint.pulse && paint.ring ? (
                  <circle
                    className="gf-pulse-ring"
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS + 11}
                    fill="none"
                    stroke={paint.ring}
                    strokeWidth="3"
                  />
                ) : null}
                {paint.ring && !paint.pulse ? (
                  <>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={NODE_RADIUS + 8}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="2.4"
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={NODE_RADIUS + 12}
                      fill="none"
                      stroke={paint.ring}
                      strokeWidth="2.6"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.9))' }}
                    />
                  </>
                ) : null}
                <circle cx={node.x} cy={node.y} r={NODE_RADIUS + 6} fill={paint.halo} />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS}
                  fill={paint.fill}
                  stroke={paint.stroke}
                  strokeWidth={paint.strokeWidth}
                />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#f8fafc"
                  fontSize="14"
                  fontWeight="650"
                  fontFamily="Segoe UI, ui-sans-serif, system-ui, sans-serif"
                >
                  {node.label}
                </text>
                {caption ? (
                  <NodeCaption
                    x={node.x}
                    y={node.y}
                    text={caption}
                    stroke={paint.stroke}
                    below={false}
                  />
                ) : null}
                {showDegrees ? (
                  <g>
                    <rect
                      x={badge.x}
                      y={badge.y}
                      width={badge.width}
                      height={badge.height}
                      rx="9"
                      fill="#090d16"
                      stroke={paint.stroke}
                      strokeOpacity="0.7"
                    />
                    <text
                      x={badge.x + badge.width / 2}
                      y={badge.y + badge.height / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={paint.stroke}
                      fontSize="10"
                      fontWeight="650"
                      fontFamily="Segoe UI, ui-sans-serif, system-ui, sans-serif"
                    >
                      {label}
                    </text>
                  </g>
                ) : null}
              </g>
            )
          })}

          {draftSource && draftEdge ? (
            <PreviewLink source={draftSource} end={{ x: draftEdge.x, y: draftEdge.y }} snapped={draftEdge.hoverId !== null} />
          ) : null}
          {armedSource && cursorWorld ? (
            <PreviewLink
              source={armedSource}
              end={armedHover ? { x: armedHover.x, y: armedHover.y } : cursorWorld}
              snapped={armedHover !== null}
            />
          ) : null}
        </g>
      </svg>

      {nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-center text-sm text-slate-400 backdrop-blur-md">
            Double-click to add node 1. Press N, then click, to place the next vertices.
          </p>
        </div>
      ) : null}

      {editorFigure && editorScreen ? (
        <WeightPopover
          edgeId={editorFigure.edge.id}
          left={clamp(editorScreen.x, 56, Math.max(56, viewport.width - 56))}
          top={editorScreen.y}
          above={editorScreen.y > 88}
          initial={formatWeight(editorFigure.edge.weight)}
          onClose={() => setWeightEditor(null)}
        />
      ) : null}

      {algorithmStep ? (
        <AlgorithmLegend
          algorithm={selectedAlgorithm}
          title={algorithmStep.title}
          explanation={algorithmStep.explanation}
          verdict={algorithmStep.summaryVerdict}
          totalCost={algorithmStep.totalCost}
        />
      ) : null}

      <CanvasToolbar
        showDegrees={showDegrees}
        onToggleDegrees={() => setShowDegrees((current) => !current)}
        onApplyLayout={applyLayout}
      />

      <div className="absolute right-3 bottom-3 z-20 flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0c1220]/80 p-1 pr-1 pl-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <span className="min-w-12 text-center text-xs font-medium text-slate-300 tabular-nums">
          {Math.round(view.scale * 100)}%
        </span>
        <button
          type="button"
          title="Reset view / fit to screen"
          onClick={fitToScreen}
          className="flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-slate-200 hover:bg-white/10"
        >
          <Scan size={15} />
          Fit
        </button>
      </div>
    </div>
  )
}

function ArrowHead({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 12 12"
      refX="11.15"
      refY="6"
      markerWidth="11"
      markerHeight="11"
      orient="auto"
      markerUnits="userSpaceOnUse"
    >
      <path d="M 0.4 0.7 L 11.15 6 L 0.4 11.3 Z" fill={color} />
    </marker>
  )
}

interface NodePaint {
  fill: string
  stroke: string
  halo: string
  strokeWidth: number
  ring: string | null
  pulse: boolean
}

interface EdgePaint {
  stroke: string
  width: number
  opacity: number
  markerId: string
  flow: boolean
  glow: string | null
}

const NODE_PAINT: Record<NodeVisualState, NodePaint> = {
  default: {
    fill: '#0b1220',
    stroke: 'rgba(103, 232, 249, 0.55)',
    halo: 'rgba(34, 211, 238, 0.08)',
    strokeWidth: 1.7,
    ring: null,
    pulse: false,
  },
  current: {
    fill: '#082f49',
    stroke: '#67e8f9',
    halo: 'rgba(34, 211, 238, 0.28)',
    strokeWidth: 2.8,
    ring: '#fbbf24',
    pulse: true,
  },
  frontier: {
    fill: '#1e1b4b',
    stroke: '#a5b4fc',
    halo: 'rgba(129, 140, 248, 0.34)',
    strokeWidth: 2.5,
    ring: null,
    pulse: false,
  },
  visited: {
    fill: '#047857',
    stroke: '#6ee7b7',
    halo: 'rgba(52, 211, 153, 0.3)',
    strokeWidth: 2.4,
    ring: null,
    pulse: false,
  },
  path: {
    fill: '#134e4a',
    stroke: '#2dd4bf',
    halo: 'rgba(45, 212, 191, 0.3)',
    strokeWidth: 2.4,
    ring: null,
    pulse: false,
  },
  conflict: {
    fill: '#9f1239',
    stroke: '#fb7185',
    halo: 'rgba(244, 63, 94, 0.42)',
    strokeWidth: 2.8,
    ring: '#fb7185',
    pulse: true,
  },
  comp_1: {
    fill: '#155e75',
    stroke: '#22d3ee',
    halo: 'rgba(34, 211, 238, 0.34)',
    strokeWidth: 2.6,
    ring: null,
    pulse: false,
  },
  comp_2: {
    fill: '#047857',
    stroke: '#34d399',
    halo: 'rgba(52, 211, 153, 0.34)',
    strokeWidth: 2.6,
    ring: null,
    pulse: false,
  },
  comp_3: {
    fill: '#5b21b6',
    stroke: '#c4b5fd',
    halo: 'rgba(167, 139, 250, 0.36)',
    strokeWidth: 2.6,
    ring: null,
    pulse: false,
  },
  comp_4: {
    fill: '#b45309',
    stroke: '#fbbf24',
    halo: 'rgba(251, 191, 36, 0.36)',
    strokeWidth: 2.6,
    ring: null,
    pulse: false,
  },
  comp_5: {
    fill: '#be123c',
    stroke: '#fb7185',
    halo: 'rgba(251, 113, 133, 0.36)',
    strokeWidth: 2.6,
    ring: null,
    pulse: false,
  },
  set_A: {
    fill: '#1d4ed8',
    stroke: '#93c5fd',
    halo: 'rgba(96, 165, 250, 0.38)',
    strokeWidth: 2.7,
    ring: null,
    pulse: false,
  },
  set_B: {
    fill: '#c2410c',
    stroke: '#fdba74',
    halo: 'rgba(251, 146, 60, 0.38)',
    strokeWidth: 2.7,
    ring: null,
    pulse: false,
  },
}

function resolveNodePaint(algorithm: AlgorithmId, state: NodeVisualState, viz: number): NodePaint {
  if (algorithm === 'bipartite' && state !== 'conflict' && (viz === 1 || viz === 2)) {
    const colored = viz === 1 ? NODE_PAINT.set_A : NODE_PAINT.set_B
    if (state === 'current') return { ...colored, pulse: true, ring: '#fbbf24' }
    return colored
  }
  if ((algorithm === 'dijkstra' || algorithm === 'prim') && state === 'path') {
    return {
      ...NODE_PAINT.path,
      fill: '#14532d',
      stroke: '#34d399',
      halo: 'rgba(52, 211, 153, 0.5)',
      strokeWidth: 3.4,
      ring: '#fbbf24',
      pulse: false,
    }
  }
  return NODE_PAINT[state]
}

function edgePaint(state: EdgeVisualState): EdgePaint {
  switch (state) {
    case 'active':
      return { stroke: '#67e8f9', width: 4, opacity: 1, markerId: 'gf-arrow-hot', flow: true, glow: '#fde047' }
    case 'tree':
      return { stroke: '#34d399', width: 3.5, opacity: 1, markerId: 'gf-arrow-tree', flow: false, glow: '#34d399' }
    case 'back_edge':
    case 'cycle':
      return { stroke: '#fb7185', width: 4.2, opacity: 1, markerId: 'gf-arrow-alert', flow: false, glow: '#fb7185' }
    case 'discarded':
      return { stroke: '#67e8f9', width: 1.6, opacity: 0.25, markerId: 'gf-arrow', flow: false, glow: null }
    default:
      return {
        stroke: 'rgba(103, 232, 249, 0.88)',
        width: 2.15,
        opacity: 1,
        markerId: 'gf-arrow',
        flow: false,
        glow: null,
      }
  }
}

function nodeCaption(algorithm: AlgorithmId, step: AlgorithmStep, nodeId: number): string | null {
  if (algorithm === 'bfs') {
    const distance = step.dist[nodeId]
    if (distance === null || distance === undefined) return null
    const parent = step.tata[nodeId] ?? 0
    return `d=${distance} · t=${parent}`
  }
  if (algorithm === 'connected_components') {
    const component = step.viz[nodeId] ?? 0
    if (component <= 0) return null
    return `comp=${component}`
  }
  if (algorithm === 'bipartite') {
    const color = step.viz[nodeId] ?? 0
    if (color === 1) return 'A (1)'
    if (color === 2) return 'B (2)'
    return null
  }
  if (algorithm === 'dijkstra' || algorithm === 'prim') {
    const distance = step.dist[nodeId]
    if (distance === null || distance === undefined) return 'd=∞'
    return `d=${distance} | t=${step.tata[nodeId] ?? 0}`
  }
  if (algorithm === 'kruskal') {
    const component = step.viz[nodeId] ?? 0
    if (component <= 0) return null
    return `comp=${component}`
  }
  if (algorithm === 'rooted_tree') {
    const level = step.dist[nodeId]
    if (level === null || level === undefined) return null
    const role = step.viz[nodeId] ?? 0
    if (role === 3) return `niv=${level} (Rădăcină)`
    if (role === 2) return `niv=${level} (Frunză)`
    return `niv=${level}`
  }
  if (algorithm === 'eulerian') {
    const degree = step.dist[nodeId]
    if (degree === null || degree === undefined) return null
    return `d=${degree}`
  }
  if (algorithm === 'hamiltonian') {
    const degree = step.dist[nodeId]
    const placed = (step.viz[nodeId] ?? 0) === 1
    if ((degree === null || degree === undefined) && !placed) return null
    if (degree === null || degree === undefined) return 'viz=1'
    return placed ? `d=${degree} · viz=1` : `d=${degree}`
  }
  if (algorithm === 'roy_floyd' && step.royFloydState) {
    const { k, i, j } = step.royFloydState
    const parts: string[] = []
    if (nodeId === k && k > 0) parts.push('k (intermediar)')
    if (nodeId === i && i > 0) parts.push('i (sursă)')
    if (nodeId === j && j > 0) parts.push('j (dest)')
    if (parts.length > 0) return parts.join(' · ')
  }
  return null
}

function NodeCaption({
  x,
  y,
  text,
  stroke,
  below,
}: {
  x: number
  y: number
  text: string
  stroke: string
  below: boolean
}) {
  const width = Math.max(52, text.length * 6.6 + 18)
  const height = 18
  const left = x - width / 2
  const top = below ? y + NODE_RADIUS + 8 : y - NODE_RADIUS - height - 8
  return (
    <g pointerEvents="none">
      <rect x={left} y={top} width={width} height={height} rx={8} fill="#090d16" stroke={stroke} strokeWidth="1.2" />
      <text
        x={x}
        y={top + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#f8fafc"
        fontSize="10"
        fontWeight="650"
        fontFamily="Segoe UI, ui-sans-serif, system-ui, sans-serif"
      >
        {text}
      </text>
    </g>
  )
}

function legendFor(algorithm: AlgorithmId): { label: string; color: string }[] {
  switch (algorithm) {
    case 'bfs':
      return [
        { label: 'Curent', color: '#67e8f9' },
        { label: 'În coadă', color: '#a5b4fc' },
        { label: 'Traseu', color: '#2dd4bf' },
        { label: 'Vizitat', color: '#34d399' },
        { label: 'Arbore', color: '#34d399' },
        { label: 'Muchie activă', color: '#fde047' },
        { label: 'Ignorată', color: 'rgba(103, 232, 249, 0.45)' },
      ]
    case 'dfs':
      return [
        { label: 'Curent', color: '#67e8f9' },
        { label: 'Pe stivă', color: '#2dd4bf' },
        { label: 'Vizitat', color: '#34d399' },
        { label: 'Arbore', color: '#34d399' },
        { label: 'Întoarcere', color: '#fb7185' },
        { label: 'Ignorată', color: 'rgba(103, 232, 249, 0.45)' },
      ]
    case 'connected_components':
      return [
        { label: 'Curent', color: '#67e8f9' },
        { label: 'Comp. 1', color: '#22d3ee' },
        { label: 'Comp. 2', color: '#34d399' },
        { label: 'Comp. 3', color: '#c4b5fd' },
        { label: 'Comp. 4', color: '#fbbf24' },
        { label: 'Comp. 5', color: '#fb7185' },
      ]
    case 'cycle_detection':
      return [
        { label: 'Curent', color: '#67e8f9' },
        { label: 'Conflict', color: '#fb7185' },
        { label: 'Ciclu', color: '#fb7185' },
        { label: 'Vizitat', color: '#34d399' },
      ]
    case 'bipartite':
      return [
        { label: 'Mulțimea A', color: '#60a5fa' },
        { label: 'Mulțimea B', color: '#fb923c' },
        { label: 'Curent', color: '#fbbf24' },
        { label: 'Conflict', color: '#fb7185' },
      ]
    case 'dijkstra':
      return [
        { label: 'Selectat', color: '#67e8f9' },
        { label: 'Distanță provizorie', color: '#a5b4fc' },
        { label: 'Distanță finală', color: '#34d399' },
        { label: 'Drum minim', color: '#fbbf24' },
        { label: 'Relaxare', color: '#fde047' },
      ]
    case 'roy_floyd':
      return [
        { label: 'Intermediar k', color: '#67e8f9' },
        { label: 'Perechea (i, j)', color: '#a5b4fc' },
        { label: 'Ciclu negativ', color: '#fb7185' },
      ]
    case 'kruskal':
      return [
        { label: 'Se verifică', color: '#fde047' },
        { label: 'Acceptată', color: '#34d399' },
        { label: 'Respinsă', color: 'rgba(103, 232, 249, 0.45)' },
      ]
    case 'prim':
      return [
        { label: 'În APM', color: '#34d399' },
        { label: 'Frontieră', color: '#a5b4fc' },
        { label: 'Muchie candidat', color: '#fde047' },
        { label: 'Muchie de arbore', color: '#34d399' },
      ]
    case 'rooted_tree':
      return [
        { label: 'Rădăcină', color: '#67e8f9' },
        { label: 'Nod intern', color: '#34d399' },
        { label: 'Frunză', color: '#c4b5fd' },
        { label: 'În coadă', color: '#a5b4fc' },
        { label: 'Ciclu', color: '#fb7185' },
      ]
    case 'eulerian':
      return [
        { label: 'Grad par', color: '#34d399' },
        { label: 'Grad impar', color: '#fb7185' },
        { label: 'Muchie curentă', color: '#fde047' },
        { label: 'Ciclu eulerian', color: '#fb7185' },
      ]
    case 'hamiltonian':
      return [
        { label: 'Pe ciclu (viz = 1)', color: '#2dd4bf' },
        { label: 'Dirac eșuează', color: '#fb7185' },
        { label: 'Muchie de ciclu', color: '#fb7185' },
        { label: 'Închidere', color: '#fde047' },
      ]
  }
}

function formatTotalCost(value: number): string {
  if (!Number.isFinite(value)) return '∞'
  if (Number.isInteger(value)) return String(value)
  return String(Math.round(value * 1000) / 1000)
}

function AlgorithmLegend({
  algorithm,
  title,
  explanation,
  verdict,
  totalCost,
}: {
  algorithm: AlgorithmId
  title: string
  explanation: string
  verdict?: string
  totalCost?: number
}) {
  const negative = verdict ? /NU este|Ciclu detectat/i.test(verdict) : false
  return (
    <section
      aria-label="Legenda algoritmului"
      className="absolute bottom-3 left-3 z-20 flex max-h-48 w-[min(17.5rem,calc(100%-8.5rem))] flex-col gap-1.5 overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1220]/85 p-2.5 shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
    >
      {totalCost !== undefined ? (
        <p className="inline-flex w-fit items-center rounded-full border border-emerald-300/50 bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-50 shadow-[0_0_18px_rgba(52,211,153,0.45)]">
          Cost Total: {formatTotalCost(totalCost)}
        </p>
      ) : null}
      <div className="min-h-0">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-cyan-200/80 uppercase">Pas curent</p>
        <h2 className="text-sm font-semibold text-slate-50">{title}</h2>
        <p className="mt-1 text-[11px] leading-relaxed break-words text-slate-300">{explanation}</p>
      </div>
      {verdict && !explanation.toLowerCase().includes(verdict.toLowerCase()) ? (
        <p
          className={`rounded-lg border px-2 py-1 text-[11px] leading-relaxed font-medium ${
            negative
              ? 'border-rose-300/30 bg-rose-400/10 text-rose-100'
              : 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100'
          }`}
        >
          {verdict}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {legendFor(algorithm).map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-200"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  )
}

function PreviewLink({ source, end, snapped }: { source: GraphNode; end: Point; snapped: boolean }) {
  const length = Math.hypot(end.x - source.x, end.y - source.y) || 1
  const ux = (end.x - source.x) / length
  const uy = (end.y - source.y) / length
  const trimEnd = snapped ? NODE_RADIUS : 0
  if (length <= NODE_RADIUS + trimEnd + 2) return null
  const x1 = source.x + ux * NODE_RADIUS
  const y1 = source.y + uy * NODE_RADIUS
  const x2 = end.x - ux * trimEnd
  const y2 = end.y - uy * trimEnd
  return (
    <g filter="url(#gf-glow)">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(165, 243, 252, 0.35)" strokeWidth="8" strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#a5f3fc" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  )
}

function WeightPopover({
  edgeId,
  left,
  top,
  above,
  initial,
  onClose,
}: {
  edgeId: string
  left: number
  top: number
  above: boolean
  initial: string
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  const finished = useRef(false)

  const commit = (save: boolean) => {
    if (finished.current) return
    finished.current = true
    if (save) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) useGraphStore.getState().updateEdgeWeight(edgeId, parsed)
    }
    onClose()
  }

  return (
    <form
      className="absolute z-30"
      style={{
        left,
        top,
        transform: above ? 'translate(-50%, calc(-100% - 8px))' : 'translate(-50%, 12px)',
      }}
      onSubmit={(event) => {
        event.preventDefault()
        commit(true)
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <input
        autoFocus
        aria-label="Edge weight"
        inputMode="decimal"
        value={value}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => commit(true)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') {
            event.preventDefault()
            commit(true)
          } else if (event.key === 'Escape') {
            event.preventDefault()
            commit(false)
          }
        }}
        className="w-24 rounded-xl border border-violet-300/40 bg-[#090d16] px-2.5 py-1.5 text-center text-sm font-medium text-violet-100 shadow-[0_10px_30px_rgba(0,0,0,0.45)] outline-none focus:ring-2 focus:ring-violet-300/40"
      />
    </form>
  )
}

function nodeTone(
  selected: boolean,
  showDegrees: boolean,
  degree: NodeDegrees | undefined,
): { stroke: string; halo: string } {
  if (selected) return { stroke: '#67e8f9', halo: 'rgba(34, 211, 238, 0.2)' }
  if (showDegrees && degree?.isIsolated) return { stroke: '#fbbf24', halo: 'rgba(251, 191, 36, 0.18)' }
  if (showDegrees && degree?.isPendant) return { stroke: '#34d399', halo: 'rgba(52, 211, 153, 0.18)' }
  return { stroke: '#22d3ee', halo: 'rgba(34, 211, 238, 0.1)' }
}

function degreeLabel(degree: NodeDegrees | undefined, isDirected: boolean): string {
  const incoming = degree?.inDegree ?? 0
  const outgoing = degree?.outDegree ?? 0
  const total = degree?.degree ?? 0
  return isDirected ? `d⁺=${outgoing} | d⁻=${incoming}` : `d=${total}`
}

function capturePointer(event: React.PointerEvent<SVGSVGElement>) {
  try {
    event.currentTarget.setPointerCapture(event.pointerId)
  } catch {
    // Some pointer streams cannot be captured. Move and up events still bubble.
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

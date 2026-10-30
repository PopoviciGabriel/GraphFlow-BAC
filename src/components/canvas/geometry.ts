import { edgeKey } from '../../core/representations'
import type { GraphEdge, GraphNode } from '../../core/types'

export const NODE_RADIUS = 24

export interface Point {
  x: number
  y: number
}

export interface ViewTransform {
  x: number
  y: number
  scale: number
}

export interface RenderedEdge {
  edge: GraphEdge
  path: string
  label: Point
  samples: Point[]
  directed: boolean
}

export function clientToWorld(clientX: number, clientY: number, bounds: DOMRect, view: ViewTransform): Point {
  return {
    x: (clientX - bounds.left - view.x) / view.scale,
    y: (clientY - bounds.top - view.y) / view.scale,
  }
}

export function worldToScreen(point: Point, view: ViewTransform): Point {
  return {
    x: point.x * view.scale + view.x,
    y: point.y * view.scale + view.y,
  }
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function clampScale(scale: number): number {
  return Math.min(4, Math.max(0.2, scale))
}

/** Zoom while keeping the world point under the cursor fixed. */
export function zoomAt(view: ViewTransform, cursor: Point, nextScale: number): ViewTransform {
  const scale = clampScale(nextScale)
  const worldX = (cursor.x - view.x) / view.scale
  const worldY = (cursor.y - view.y) / view.scale
  return {
    scale,
    x: cursor.x - worldX * scale,
    y: cursor.y - worldY * scale,
  }
}

export function fitGraph(nodes: GraphNode[], width: number, height: number): ViewTransform {
  if (width < 20 || height < 20) return { x: 0, y: 0, scale: 1 }
  if (nodes.length === 0) return { x: 48, y: 88, scale: 1 }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    minX = Math.min(minX, node.x - NODE_RADIUS - 36)
    minY = Math.min(minY, node.y - NODE_RADIUS - 36)
    maxX = Math.max(maxX, node.x + NODE_RADIUS + 72)
    maxY = Math.max(maxY, node.y + NODE_RADIUS + 28)
  }

  const boundsWidth = Math.max(maxX - minX, 1)
  const boundsHeight = Math.max(maxY - minY, 1)
  const paddingX = 72
  const paddingTop = 92
  const paddingBottom = 56
  const availableWidth = Math.max(width - paddingX * 2, 1)
  const availableHeight = Math.max(height - paddingTop - paddingBottom, 1)
  const scale = clampScale(Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight, 1.75))
  return {
    scale,
    x: paddingX + (availableWidth - boundsWidth * scale) / 2 - minX * scale,
    y: paddingTop + (availableHeight - boundsHeight * scale) / 2 - minY * scale,
  }
}

export function formatWeight(weight: number): string {
  if (!Number.isFinite(weight)) return '0'
  if (Number.isInteger(weight)) return String(weight)
  return String(Math.round(weight * 1000) / 1000)
}

export function findEdgeBetween(
  edges: GraphEdge[],
  source: number,
  target: number,
  isDirected: boolean,
): GraphEdge | undefined {
  const key = edgeKey(source, target, isDirected)
  return edges.find((edge) => edgeKey(edge.source, edge.target, isDirected) === key)
}

export function buildRenderedEdges(
  nodes: GraphNode[],
  edges: GraphEdge[],
  isDirected: boolean,
): RenderedEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const pairKeys = new Set(edges.map((edge) => `${edge.source}->${edge.target}`))
  const rendered: RenderedEdge[] = []

  for (const edge of edges) {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)
    if (!source || !target) continue
    const bidirectional =
      isDirected &&
      edge.source !== edge.target &&
      pairKeys.has(`${edge.target}->${edge.source}`)
    rendered.push(renderEdge(edge, source, target, isDirected, bidirectional))
  }

  return rendered
}

export function findNodeNear(nodes: GraphNode[], point: Point, radius: number): GraphNode | null {
  let found: GraphNode | null = null
  let best = radius
  for (const node of nodes) {
    const gap = distance(point, node)
    if (gap <= best) {
      best = gap
      found = node
    }
  }
  return found
}

export interface BadgeBox {
  x: number
  y: number
  width: number
  height: number
}

export function degreeBadgeBox(node: GraphNode, label: string): BadgeBox {
  const width = Math.max(40, label.length * 6.6 + 16)
  return {
    x: node.x + NODE_RADIUS + 6,
    y: node.y - NODE_RADIUS - 6,
    width,
    height: 18,
  }
}

export function weightBadgeBox(label: Point, text: string): BadgeBox {
  const width = Math.max(28, text.length * 7.4 + 16)
  return { x: label.x - width / 2, y: label.y - 10, width, height: 20 }
}

export function hitsDegreeBadge(node: GraphNode, point: Point, label: string): boolean {
  return hitsBox(degreeBadgeBox(node, label), point, 3)
}

export function hitsWeightBadge(figure: RenderedEdge, point: Point): boolean {
  return hitsBox(weightBadgeBox(figure.label, formatWeight(figure.edge.weight)), point, 4)
}

function hitsBox(box: BadgeBox, point: Point, padding: number): boolean {
  return (
    point.x >= box.x - padding &&
    point.x <= box.x + box.width + padding &&
    point.y >= box.y - padding &&
    point.y <= box.y + box.height + padding
  )
}

export function findEdgeNear(figures: RenderedEdge[], point: Point, threshold: number): RenderedEdge | null {
  let found: RenderedEdge | null = null
  let best = threshold
  for (const figure of figures) {
    const gap = distanceToPolyline(point, figure.samples)
    if (gap <= best) {
      best = gap
      found = figure
    }
  }
  return found
}

function renderEdge(
  edge: GraphEdge,
  source: GraphNode,
  target: GraphNode,
  isDirected: boolean,
  bidirectional: boolean,
): RenderedEdge {
  if (source.id === target.id) {
    return renderSelfLoop(edge, source, isDirected)
  }

  if (!isDirected) {
    const start = { x: source.x, y: source.y }
    const end = { x: target.x, y: target.y }
    return {
      edge,
      path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
      label: offsetMidpoint(start, end),
      samples: [start, end],
      directed: false,
    }
  }

  if (!bidirectional) {
    const start = pointOnCircle(source, target, NODE_RADIUS)
    const end = pointOnCircle(target, source, NODE_RADIUS)
    return {
      edge,
      path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
      label: offsetMidpoint(start, end),
      samples: [start, end],
      directed: true,
    }
  }

  const dx = target.x - source.x
  const dy = target.y - source.y
  const length = Math.hypot(dx, dy) || 1
  const bend = Math.max(32, Math.min(78, length * 0.24))
  const mid = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 }
  const control = {
    x: mid.x + (-dy / length) * bend,
    y: mid.y + (dx / length) * bend,
  }
  const start = pointOnCircle(source, control, NODE_RADIUS)
  const end = pointOnCircle(target, control, NODE_RADIUS)
  const samples = sampleQuadratic(start, control, end, 24)
  return {
    edge,
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    label: samples[12] ?? quadraticPoint(start, control, end, 0.5),
    samples,
    directed: true,
  }
}

function renderSelfLoop(edge: GraphEdge, node: GraphNode, isDirected: boolean): RenderedEdge {
  const start = {
    x: node.x + NODE_RADIUS * Math.cos(-0.55),
    y: node.y + NODE_RADIUS * Math.sin(-0.55),
  }
  const end = {
    x: node.x + NODE_RADIUS * Math.cos(-2.55),
    y: node.y + NODE_RADIUS * Math.sin(-2.55),
  }
  const controlA = { x: node.x + 58, y: node.y - 74 }
  const controlB = { x: node.x - 42, y: node.y - 78 }
  const samples = sampleCubic(start, controlA, controlB, end, 28)
  return {
    edge,
    path: `M ${start.x} ${start.y} C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${end.x} ${end.y}`,
    label: samples[8] ?? { x: node.x + 8, y: node.y - 70 },
    samples,
    directed: isDirected,
  }
}

/** Point on `center`'s circumference in the direction of `toward`. Distance is exactly `radius`. */
function pointOnCircle(center: Point, toward: Point, radius: number): Point {
  const unit = unitVector(toward.x - center.x, toward.y - center.y)
  return { x: center.x + unit.x * radius, y: center.y + unit.y * radius }
}

function offsetMidpoint(start: Point, end: Point): Point {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy) || 1
  const along = 0.58
  const amount = Math.min(20, Math.max(12, length * 0.045))
  return {
    x: start.x + dx * along + (-dy / length) * amount,
    y: start.y + dy * along + (dx / length) * amount,
  }
}

function unitVector(x: number, y: number): Point {
  const length = Math.hypot(x, y) || 1
  return { x: x / length, y: y / length }
}

function quadraticPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const inverse = 1 - t
  return {
    x: inverse * inverse * p0.x + 2 * inverse * t * p1.x + t * t * p2.x,
    y: inverse * inverse * p0.y + 2 * inverse * t * p1.y + t * t * p2.y,
  }
}

function sampleQuadratic(p0: Point, p1: Point, p2: Point, steps: number): Point[] {
  const samples: Point[] = []
  for (let step = 0; step <= steps; step += 1) samples.push(quadraticPoint(p0, p1, p2, step / steps))
  return samples
}

function sampleCubic(p0: Point, p1: Point, p2: Point, p3: Point, steps: number): Point[] {
  const samples: Point[] = []
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps
    const inverse = 1 - t
    samples.push({
      x:
        inverse * inverse * inverse * p0.x +
        3 * inverse * inverse * t * p1.x +
        3 * inverse * t * t * p2.x +
        t * t * t * p3.x,
      y:
        inverse * inverse * inverse * p0.y +
        3 * inverse * inverse * t * p1.y +
        3 * inverse * t * t * p2.y +
        t * t * t * p3.y,
    })
  }
  return samples
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return distance(point, start)
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
  return distance(point, { x: start.x + dx * t, y: start.y + dy * t })
}

function distanceToPolyline(point: Point, samples: Point[]): number {
  let best = Infinity
  for (let index = 1; index < samples.length; index += 1) {
    const start = samples[index - 1]
    const end = samples[index]
    if (!start || !end) continue
    best = Math.min(best, distanceToSegment(point, start, end))
  }
  return best
}

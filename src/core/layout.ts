import type { GraphNode, GraphStateData } from './types'

export const DEFAULT_CANVAS_WIDTH = 960
export const DEFAULT_CANVAS_HEIGHT = 640

function sanitizeSize(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return (min + max) / 2
  return Math.min(max, Math.max(min, value))
}

/**
 * Places nodes on a circle, node 1 at the top, then clockwise by id.
 * Input order is preserved so callers can zip results with the original array.
 */
export function applyCircularLayout(
  nodes: GraphNode[],
  width: number,
  height: number,
): GraphNode[] {
  const safeWidth = sanitizeSize(width, DEFAULT_CANVAS_WIDTH)
  const safeHeight = sanitizeSize(height, DEFAULT_CANVAS_HEIGHT)
  const ordered = [...nodes].sort((left, right) => left.id - right.id)
  const count = ordered.length
  const centerX = safeWidth / 2
  const centerY = safeHeight / 2
  const radius = count <= 1 ? 0 : Math.max(32, Math.min(safeWidth, safeHeight) / 2 - 64)
  const positionById = new Map<number, { x: number; y: number }>()

  for (let index = 0; index < ordered.length; index += 1) {
    const node = ordered[index]
    if (!node || positionById.has(node.id)) continue
    if (count === 1) {
      positionById.set(node.id, { x: centerX, y: centerY })
      continue
    }
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / count
    positionById.set(node.id, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    })
  }

  return nodes.map((node) => {
    const position = positionById.get(node.id)
    return position ? { ...node, x: position.x, y: position.y } : { ...node }
  })
}

/**
 * Fruchterman–Reingold spring-electrical layout.
 * Repulsion acts between every pair, attraction along each unique link,
 * and a light pull toward the canvas center keeps disconnected pieces together.
 */
export function applyForceDirectedLayout(
  graph: GraphStateData,
  width: number,
  height: number,
  iterations = 300,
): GraphNode[] {
  const safeWidth = sanitizeSize(width, DEFAULT_CANVAS_WIDTH)
  const safeHeight = sanitizeSize(height, DEFAULT_CANVAS_HEIGHT)
  const sourceNodes = graph.nodes
  const count = sourceNodes.length
  if (count === 0) return []
  if (count === 1) {
    const only = sourceNodes[0]
    if (!only) return []
    return [{ ...only, x: safeWidth / 2, y: safeHeight / 2 }]
  }

  const seeded = isCollapsed(sourceNodes)
    ? applyCircularLayout(sourceNodes, safeWidth, safeHeight)
    : sourceNodes.map((node) => ({ ...node }))

  const positions = seeded.map((node) => ({ x: node.x, y: node.y }))
  const displacement = positions.map(() => ({ x: 0, y: 0 }))
  const indexById = new Map<number, number>()
  seeded.forEach((node, index) => {
    if (!indexById.has(node.id)) indexById.set(node.id, index)
  })

  const area = safeWidth * safeHeight
  const idealLength = Math.sqrt(area / count)
  const steps = Number.isFinite(iterations) ? Math.max(0, Math.floor(iterations)) : 300
  const initialTemperature = Math.min(safeWidth, safeHeight) / 8
  const centerX = safeWidth / 2
  const centerY = safeHeight / 2

  for (let step = 0; step < steps; step += 1) {
    const temperature = initialTemperature * (1 - step / Math.max(steps, 1))

    for (let index = 0; index < count; index += 1) {
      const current = displacement[index]
      if (!current) continue
      current.x = 0
      current.y = 0
    }

    for (let i = 0; i < count; i += 1) {
      for (let j = i + 1; j < count; j += 1) {
        const left = positions[i]
        const right = positions[j]
        const leftDisp = displacement[i]
        const rightDisp = displacement[j]
        if (!left || !right || !leftDisp || !rightDisp) continue

        let dx = left.x - right.x
        let dy = left.y - right.y
        let distance = Math.hypot(dx, dy)
        if (distance < 1e-4) {
          const angle = (i + 1) * 2.399963229728653
          dx = Math.cos(angle) * 0.01
          dy = Math.sin(angle) * 0.01
          distance = 0.01
        }

        const force = (idealLength * idealLength) / distance
        const ux = dx / distance
        const uy = dy / distance
        leftDisp.x += ux * force
        leftDisp.y += uy * force
        rightDisp.x -= ux * force
        rightDisp.y -= uy * force
      }
    }

    const attracted = new Set<string>()
    for (const edge of graph.edges) {
      const i = indexById.get(edge.source)
      const j = indexById.get(edge.target)
      if (i === undefined || j === undefined || i === j) continue
      const linkKey = i < j ? `${i}:${j}` : `${j}:${i}`
      if (attracted.has(linkKey)) continue
      attracted.add(linkKey)

      const left = positions[i]
      const right = positions[j]
      const leftDisp = displacement[i]
      const rightDisp = displacement[j]
      if (!left || !right || !leftDisp || !rightDisp) continue

      const dx = left.x - right.x
      const dy = left.y - right.y
      const distance = Math.hypot(dx, dy) || 0.01
      const force = (distance * distance) / idealLength
      const ux = dx / distance
      const uy = dy / distance
      leftDisp.x -= ux * force
      leftDisp.y -= uy * force
      rightDisp.x += ux * force
      rightDisp.y += uy * force
    }

    for (let index = 0; index < count; index += 1) {
      const point = positions[index]
      const delta = displacement[index]
      if (!point || !delta) continue
      delta.x += (centerX - point.x) * 0.04
      delta.y += (centerY - point.y) * 0.04
      const distance = Math.hypot(delta.x, delta.y) || 0.01
      const limited = Math.min(distance, Math.max(temperature, 0))
      point.x += (delta.x / distance) * limited
      point.y += (delta.y / distance) * limited
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        point.x = centerX
        point.y = centerY
      }
    }
  }

  fitInsideCanvas(positions, safeWidth, safeHeight)

  return sourceNodes.map((node, index) => {
    const point = positions[index]
    return point ? { ...node, x: point.x, y: point.y } : { ...node }
  })
}

export function applyGridLayout(
  nodes: GraphNode[],
  width: number,
  height: number,
): GraphNode[] {
  const safeWidth = sanitizeSize(width, DEFAULT_CANVAS_WIDTH)
  const safeHeight = sanitizeSize(height, DEFAULT_CANVAS_HEIGHT)
  const ordered = [...nodes].sort((left, right) => left.id - right.id)
  const count = ordered.length
  const positionById = new Map<number, { x: number; y: number }>()

  if (count > 0) {
    const columns = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / columns)
    const padding = Math.min(56, Math.min(safeWidth, safeHeight) / 8)
    const usableWidth = Math.max(safeWidth - padding * 2, 1)
    const usableHeight = Math.max(safeHeight - padding * 2, 1)
    const xStep = columns === 1 ? 0 : usableWidth / (columns - 1)
    const yStep = rows === 1 ? 0 : usableHeight / (rows - 1)

    for (let index = 0; index < ordered.length; index += 1) {
      const node = ordered[index]
      if (!node || positionById.has(node.id)) continue
      const column = index % columns
      const row = Math.floor(index / columns)
      positionById.set(node.id, {
        x: columns === 1 ? safeWidth / 2 : padding + column * xStep,
        y: rows === 1 ? safeHeight / 2 : padding + row * yStep,
      })
    }
  }

  return nodes.map((node) => {
    const position = positionById.get(node.id)
    return position ? { ...node, x: position.x, y: position.y } : { ...node }
  })
}

/**
 * Hierarchical layout rooted at `rootId` (falling back to 1, then the smallest id).
 * A BFS tree is drawn top-down: each parent sits on the average of its children,
 * so tree edges do not cross. Nodes the root cannot reach sit on a bottom row.
 */
export function applyTreeLayout(
  graph: GraphStateData,
  rootId: number,
  width: number,
  height: number,
): GraphNode[] {
  const safeWidth = sanitizeSize(width, DEFAULT_CANVAS_WIDTH)
  const safeHeight = sanitizeSize(height, DEFAULT_CANVAS_HEIGHT)
  const ordered = [...graph.nodes].sort((left, right) => left.id - right.id)
  const unique: GraphNode[] = []
  const ids = new Set<number>()
  for (const node of ordered) {
    if (ids.has(node.id)) continue
    ids.add(node.id)
    unique.push(node)
  }
  if (unique.length === 0) return graph.nodes.map((node) => ({ ...node }))

  const fallback = unique[0]
  const resolvedRoot = ids.has(rootId) ? rootId : ids.has(1) ? 1 : fallback ? fallback.id : 1
  const neighbors = new Map<number, number[]>()
  for (const node of unique) neighbors.set(node.id, [])
  for (const edge of graph.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.source === edge.target) continue
    const forward = neighbors.get(edge.source)
    const backward = neighbors.get(edge.target)
    if (forward && !forward.includes(edge.target)) forward.push(edge.target)
    if (backward && !backward.includes(edge.source)) backward.push(edge.source)
  }
  for (const list of neighbors.values()) list.sort((left, right) => left - right)

  const level = new Map<number, number>()
  const children = new Map<number, number[]>()
  const queue = [resolvedRoot]
  level.set(resolvedRoot, 0)
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head]
    if (current === undefined) continue
    const kids: number[] = []
    for (const next of neighbors.get(current) ?? []) {
      if (level.has(next)) continue
      level.set(next, (level.get(current) ?? 0) + 1)
      queue.push(next)
      kids.push(next)
    }
    children.set(current, kids)
  }

  const slot = new Map<number, number>()
  let cursor = 0
  const place = (id: number): number => {
    const kids = children.get(id) ?? []
    if (kids.length === 0) {
      const here = cursor
      cursor += 1
      slot.set(id, here)
      return here
    }
    let sum = 0
    for (const child of kids) sum += place(child)
    const here = sum / kids.length
    slot.set(id, here)
    return here
  }
  place(resolvedRoot)

  const orphans = unique.map((node) => node.id).filter((id) => !level.has(id))
  const maxLevel = Math.max(0, ...level.values())
  const layerCount = orphans.length > 0 ? maxLevel + 2 : maxLevel + 1
  const paddingX = Math.min(72, safeWidth * 0.08)
  const paddingTop = Math.min(78, Math.max(36, safeHeight * 0.14))
  const paddingBottom = Math.min(64, Math.max(28, safeHeight * 0.1))
  const usableWidth = Math.max(safeWidth - paddingX * 2, 1)
  const usableHeight = Math.max(safeHeight - paddingTop - paddingBottom, 1)
  const yStep = layerCount <= 1 ? 0 : usableHeight / (layerCount - 1)
  const maxSlot = Math.max(0, cursor - 1)
  const xForSlot = (value: number) => (maxSlot === 0 ? safeWidth / 2 : paddingX + (value / maxSlot) * usableWidth)

  const positionById = new Map<number, { x: number; y: number }>()
  for (const [id, depth] of level) {
    positionById.set(id, {
      x: xForSlot(slot.get(id) ?? 0),
      y: paddingTop + depth * yStep,
    })
  }
  if (orphans.length > 0) {
    const y = paddingTop + (layerCount - 1) * yStep
    orphans.forEach((id, index) => {
      const x = orphans.length === 1 ? safeWidth / 2 : paddingX + (index / (orphans.length - 1)) * usableWidth
      positionById.set(id, { x, y })
    })
  }

  return graph.nodes.map((node) => {
    const position = positionById.get(node.id)
    return position ? { ...node, x: position.x, y: position.y } : { ...node }
  })
}

function fitInsideCanvas(
  positions: { x: number; y: number }[],
  width: number,
  height: number,
): void {
  if (positions.length === 0) return
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of positions) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  const padding = Math.min(56, Math.min(width, height) / 6)
  const boundsWidth = Math.max(maxX - minX, 1)
  const boundsHeight = Math.max(maxY - minY, 1)
  const innerWidth = Math.max(width - padding * 2, 1)
  const innerHeight = Math.max(height - padding * 2, 1)
  const scale = Math.min(innerWidth / boundsWidth, innerHeight / boundsHeight)
  const offsetX = padding + (innerWidth - boundsWidth * scale) / 2
  const offsetY = padding + (innerHeight - boundsHeight * scale) / 2

  for (const point of positions) {
    point.x = clamp(offsetX + (point.x - minX) * scale, 0, width)
    point.y = clamp(offsetY + (point.y - minY) * scale, 0, height)
  }
}

function isCollapsed(nodes: GraphNode[]): boolean {
  const first = nodes[0]
  if (!first) return false
  return nodes.every(
    (node) => Math.abs(node.x - first.x) < 1 && Math.abs(node.y - first.y) < 1,
  )
}

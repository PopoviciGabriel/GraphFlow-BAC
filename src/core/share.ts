/**
 * Compact graph encoding for localStorage and for `#g=` share links.
 * No React. Node ids stay `1..N`.
 */
import { edgeKey } from './representations'
import type { GraphEdge, GraphNode, GraphStateData } from './types'

export const GRAPH_STORAGE_KEY = 'graphflow_bac_state'

const MAX_NODES = 400
const MAX_EDGES = 8000
const MAX_COORDINATE = 1_000_000
const MAX_WEIGHT = 1_000_000
const MAX_HASH_LENGTH = 100_000
const MAX_STORAGE_LENGTH = 1_500_000

interface CompactGraph {
  v: 1
  d: 0 | 1
  w: 0 | 1
  n: [number, number][]
  e: [number, number, number][]
}

export function encodeGraphToUrlHash(graph: GraphStateData): string {
  const payload = compactGraph(graph)
  return `#g=${encodeBase64Url(JSON.stringify(payload))}`
}

export function decodeGraphFromUrlHash(hash: string): GraphStateData | null {
  const encoded = payloadFromHash(hash)
  if (encoded === null) return null
  const json = decodeBase64Url(encoded)
  if (json === null) return null
  try {
    return graphFromUnknown(JSON.parse(json))
  } catch {
    return null
  }
}

export function buildGraphShareUrl(graph: GraphStateData, pageUrl: string): string {
  const hash = encodeGraphToUrlHash(graph)
  try {
    const url = new URL(pageUrl)
    url.hash = hash.slice(1)
    return url.toString()
  } catch {
    const base = pageUrl.split('#')[0] ?? ''
    return `${base}${hash}`
  }
}

export function serializeGraphForStorage(graph: GraphStateData): string {
  const nodes = [...graph.nodes]
    .sort((left, right) => left.id - right.id)
    .map((node) => ({
      id: node.id,
      label: node.label,
      x: node.x,
      y: node.y,
    }))
  const edges = [...graph.edges]
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
    }))
    .sort((left, right) => left.source - right.source || left.target - right.target || left.weight - right.weight)
  return JSON.stringify({
    v: 1,
    nodes,
    edges,
    isDirected: graph.isDirected,
    isWeighted: graph.isWeighted,
  })
}

export function parseStoredGraph(raw: string): GraphStateData | null {
  if (raw.length === 0 || raw.length > MAX_STORAGE_LENGTH) return null
  try {
    return graphFromUnknown(JSON.parse(raw))
  } catch {
    return null
  }
}

function compactGraph(graph: GraphStateData): CompactGraph {
  const nodes = [...graph.nodes].sort((left, right) => left.id - right.id)
  const edges = [...graph.edges].sort(
    (left, right) => left.source - right.source || left.target - right.target || left.weight - right.weight,
  )
  return {
    v: 1,
    d: graph.isDirected ? 1 : 0,
    w: graph.isWeighted ? 1 : 0,
    n: nodes.map((node) => [roundTo(node.x, 100), roundTo(node.y, 100)]),
    e: edges.map((edge) => [edge.source, edge.target, roundTo(edge.weight, 10_000)]),
  }
}

function graphFromUnknown(value: unknown): GraphStateData | null {
  if (!isRecord(value)) return null
  if ('v' in value && value.v !== 1) return null
  if (Array.isArray(value.n) && Array.isArray(value.e)) return graphFromCompact(value)
  if (Array.isArray(value.nodes) && Array.isArray(value.edges)) return graphFromStorage(value)
  return null
}

function graphFromCompact(value: Record<string, unknown>): GraphStateData | null {
  const isDirected = readFlag(value.d)
  const isWeighted = readFlag(value.w)
  if (isDirected === null || isWeighted === null || !Array.isArray(value.n) || !Array.isArray(value.e)) return null
  if (value.n.length > MAX_NODES || value.e.length > MAX_EDGES) return null

  const points: { id: number; label: string; x: number; y: number }[] = []
  for (let index = 0; index < value.n.length; index += 1) {
    const pair = readNumberPair(value.n[index])
    if (pair === null) return null
    const id = index + 1
    points.push({ id, label: String(id), x: pair[0], y: pair[1] })
  }

  const triples: { source: number; target: number; weight: number }[] = []
  for (const item of value.e) {
    const triple = readNumberTriple(item)
    if (triple === null) return null
    triples.push({ source: triple[0], target: triple[1], weight: triple[2] })
  }
  return assembleGraph(points, triples, isDirected, isWeighted)
}

function graphFromStorage(value: Record<string, unknown>): GraphStateData | null {
  const isDirected = readFlag(value.isDirected)
  const isWeighted = readFlag(value.isWeighted)
  if (isDirected === null || isWeighted === null || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return null
  }
  if (value.nodes.length > MAX_NODES || value.edges.length > MAX_EDGES) return null

  const points: { id: number; label: string; x: number; y: number }[] = []
  for (const item of value.nodes) {
    if (!isRecord(item)) return null
    const x = finiteNumber(item.x)
    const y = finiteNumber(item.y)
    if (typeof item.id !== 'number' || x === null || y === null) return null
    points.push({ id: item.id, label: readLabel(item.label, item.id), x, y })
  }

  const triples: { source: number; target: number; weight: number }[] = []
  for (const item of value.edges) {
    if (!isRecord(item)) return null
    if (typeof item.source !== 'number' || typeof item.target !== 'number') return null
    const weight = item.weight === undefined ? 1 : finiteNumber(item.weight)
    if (weight === null) return null
    triples.push({ source: item.source, target: item.target, weight })
  }
  return assembleGraph(points, triples, isDirected, isWeighted)
}

function assembleGraph(
  points: readonly { id: number; label: string; x: number; y: number }[],
  triples: readonly { source: number; target: number; weight: number }[],
  isDirected: boolean,
  isWeighted: boolean,
): GraphStateData | null {
  const count = points.length
  if (count > MAX_NODES || triples.length > MAX_EDGES) return null
  const seenNodes = new Set<number>()
  const nodes: GraphNode[] = []
  for (const point of points) {
    if (!Number.isInteger(point.id) || point.id < 1 || point.id > count || seenNodes.has(point.id)) return null
    if (!inCoordinateRange(point.x) || !inCoordinateRange(point.y)) return null
    seenNodes.add(point.id)
    nodes.push({
      id: point.id,
      label: readLabel(point.label, point.id),
      x: point.x,
      y: point.y,
    })
  }
  if (seenNodes.size !== count) return null
  for (let id = 1; id <= count; id += 1) {
    if (!seenNodes.has(id)) return null
  }
  nodes.sort((left, right) => left.id - right.id)

  const seenEdges = new Set<string>()
  const edges: GraphEdge[] = []
  for (const triple of triples) {
    if (!Number.isInteger(triple.source) || !Number.isInteger(triple.target)) return null
    if (triple.source < 1 || triple.target < 1 || triple.source > count || triple.target > count) return null
    if (!Number.isFinite(triple.weight) || Math.abs(triple.weight) > MAX_WEIGHT) return null
    const id = edgeKey(triple.source, triple.target, isDirected)
    if (seenEdges.has(id)) continue
    seenEdges.add(id)
    edges.push({
      id,
      source: triple.source,
      target: triple.target,
      weight: triple.weight,
    })
  }
  return { nodes, edges, isDirected, isWeighted }
}

function payloadFromHash(hash: string): string | null {
  const trimmed = hash.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_HASH_LENGTH) return null
  const marker = '#g='
  const index = trimmed.lastIndexOf(marker)
  let raw: string | null = null
  if (index >= 0) raw = trimmed.slice(index + marker.length)
  else if (trimmed.startsWith('g=')) raw = trimmed.slice(2)
  if (raw === null) return null
  const cut = raw.split(/[&#\s]/)[0] ?? ''
  if (cut.length === 0) return null
  try {
    return decodeURIComponent(cut)
  } catch {
    return cut
  }
}

function encodeBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

function roundTo(value: number, scale: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * scale) / scale
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

function readFlag(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 0) return false
  if (value === 1) return true
  return null
}

function readLabel(value: unknown, id: number): string {
  if (typeof value !== 'string') return String(id)
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 32 || /[\u0000-\u001F]/.test(trimmed)) return String(id)
  return trimmed
}

function readNumberPair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null
  const x = finiteNumber(value[0])
  const y = finiteNumber(value[1])
  if (x === null || y === null) return null
  return [x, y]
}

function readNumberTriple(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length < 3) return null
  const source = finiteNumber(value[0])
  const target = finiteNumber(value[1])
  const weight = finiteNumber(value[2])
  if (source === null || target === null || weight === null) return null
  return [source, target, weight]
}

function inCoordinateRange(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

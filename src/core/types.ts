export type GraphMode = 'undirected' | 'directed'

/** Romanian BAC nodes are numbered from 1 to N with no gaps. */
export interface GraphNode {
  id: number
  label: string
  x: number
  y: number
}

export interface GraphEdge {
  id: string
  source: number
  target: number
  weight: number
}

export interface NodeDegrees {
  nodeId: number
  degree: number
  inDegree: number
  outDegree: number
  isIsolated: boolean
  isPendant: boolean
}

export interface GraphStateData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  isDirected: boolean
  isWeighted: boolean
}

export type CanvasMediaType = 'image' | 'video' | 'audio' | 'document' | 'placeholder'

export type CanvasNode = {
  id: string
  type: CanvasMediaType
  title: string
  url?: string
  localPath?: string
  mimeType?: string
  fileName?: string
  x: number
  y: number
  width: number
  height: number
  prompt: string
  sourcePrompt?: string
  note: string
  selected?: boolean
  generation?: {
    operation?: 'generate' | 'enhance' | 'split' | 'video'
    model?: string
    quality?: string
    aspectRatio?: string
    detailLevel?: string
    duration?: number
    status?: 'idle' | 'queued' | 'running' | 'done' | 'error'
    error?: string
    lastRunAt?: string
  }
}

export type CanvasEdgeType = 'derivative' | 'reference' | 'variation' | 'animation' | 'frame' | 'context'

export type CanvasEdge = {
  id: string
  from: string
  to: string
  type: CanvasEdgeType
  label?: string
}

export type CanvasGroup = {
  id: string
  name: string
  nodeIds: string[]
  x: number
  y: number
  width: number
  height: number
  strokeColor: string
  fillColor: string
  pinned?: boolean
}

export type CanvasTray = {
  id: string
  name: string
  color: string
  nodeIds: string[]
}

export type CanvasSpace = {
  id: string
  name: string
  color: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  groups: CanvasGroup[]
  trays: CanvasTray[]
  viewport: {
    panX: number
    panY: number
    zoom: number
  }
}

export type CanvasData = {
  version: 1
  activeSpaceId: string
  spaces: CanvasSpace[]
}

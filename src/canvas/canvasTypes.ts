/** Media kinds a canvas node can represent in the PixVerse planning graph. */
export type CanvasMediaType = 'image' | 'video' | 'audio' | 'document' | 'placeholder'

/** A draggable canvas item that can hold media, prompt text, notes, references, and generation settings. */
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
  inputRefs?: Array<{
    id: string
    title: string
    type: CanvasMediaType
    url?: string
    localPath?: string
    fileName?: string
  }>
  videoCrop?: {
    start: number
    end: number
  }
  frameTime?: number
  marker?: 'master' | 'alternative'
  selected?: boolean
  pinnedOnly?: boolean
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

/** Semantic connection types used to decide how references flow into PixVerse and Theo. */
export type CanvasEdgeType = 'derivative' | 'reference' | 'variation' | 'animation' | 'frame' | 'context'

/** A directed connection between nodes or from a group into a node. */
export type CanvasEdge = {
  id: string
  from: string
  to: string
  type: CanvasEdgeType
  label?: string
  fromGroup?: boolean
  points?: { x: number; y: number }[]
}

/** A colored box that moves/resizes a set of nodes and can act as a multi-reference source. */
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

/** A pinned reference tray such as Actors, Locations, Props, Styles, or Master Shots. */
export type CanvasTray = {
  id: string
  name: string
  color: string
  nodeIds: string[]
}

/** One independent canvas board with its own nodes, edges, groups, trays, and viewport. */
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

/** Persisted payload saved to localStorage and /api/canvas-mode. */
export type CanvasData = {
  version: 1
  activeSpaceId: string
  spaces: CanvasSpace[]
}

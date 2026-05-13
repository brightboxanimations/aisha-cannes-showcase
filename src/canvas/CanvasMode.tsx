import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent, MouseEvent, WheelEvent } from 'react'
import { buildAgentSystemInstruction, refinePrompt, rememberAgentExchange, sendToGeminiWithImages } from '../gemini-agent'
import type { CanvasData, CanvasEdgeType, CanvasMediaType, CanvasNode, CanvasSpace } from './canvasTypes'
import './CanvasMode.css'

const STORAGE_KEY = 'aisha-canvas-mode-v1'
const CANVAS_API = '/api/canvas-mode'

/** Creates stable-enough client ids for canvas nodes, edges, groups, spaces, and pinned copies. */
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`

/** Default pinned trays that behave like reusable actor/location/prop/style bins. */
const defaultTrays = [
  { id: 'tray-actors', name: 'Actors', color: '#60a5fa', nodeIds: [] },
  { id: 'tray-locations', name: 'Locations', color: '#34d399', nodeIds: [] },
  { id: 'tray-props', name: 'Props', color: '#f472b6', nodeIds: [] },
  { id: 'tray-styles', name: 'Styles', color: '#f8d978', nodeIds: [] },
  { id: 'tray-master-shots', name: 'Master Shots', color: '#a78bfa', nodeIds: [] },
]

/** Preset colors for group boxes and their translucent fills. */
const groupSwatches = [
  '#f8d978',
  '#60a5fa',
  '#34d399',
  '#f472b6',
  '#a78bfa',
  '#fb7185',
  '#38bdf8',
  '#fb923c',
  '#e879f9',
  '#f1f5f9',
]

/** Image models exposed in Canvas generation controls and forwarded to the PixVerse backend route. */
const imageModels = [
  { id: 'gemini-3.1-flash', name: 'Nano Banana 2', quality: '2160p', detailLevel: '' },
  { id: 'gemini-3.0', name: 'Nano Banana Pro', quality: '1440p', detailLevel: '' },
  { id: 'gpt-image-2.0', name: 'GPT-2 Medium', quality: '1440p', detailLevel: 'medium' },
  { id: 'seedream-4.5', name: 'SeedReam 4.5', quality: '2160p', detailLevel: '' },
  { id: 'seedream-5.0-lite', name: 'SeedReam 5 Lite', quality: '1440p', detailLevel: '' },
]

/** Video models exposed in Canvas generation controls and forwarded to the PixVerse backend route. */
const videoModels = [
  { id: 'seedance-2.0-standard', name: 'Seedance 2.0 Standard', qualities: ['720p', '1080p'], durations: [5, 10, 15] },
  { id: 'happyhorse-1.0', name: 'Happy Horse', qualities: ['720p', '1080p'], durations: [5, 10, 15] },
  { id: 'v6', name: 'PixVerse 6', qualities: ['720p', '1080p'], durations: [5, 10, 15] },
  { id: 'pixverse-c1', name: 'PixVerse C1', qualities: ['720p', '1080p'], durations: [5, 10, 15] },
  { id: 'grok-imagine', name: 'Grok', qualities: ['720p'], durations: [5, 10, 15] },
  { id: 'kling-3.0-standard', name: 'Kling 3.0 Standard', qualities: ['720p', '1080p'], durations: [5, 10] },
  { id: 'kling-o3-standard', name: 'Kling O3 Standard', qualities: ['720p', '1080p'], durations: [5, 10] },
]

/** Edge types whose upstream media should be collected as generation references. */
const generationInputEdgeTypes: CanvasEdgeType[] = ['reference', 'derivative', 'animation', 'context', 'frame', 'variation']

/** Files attached only to Theo's Canvas chat rather than placed as graph nodes. */
type AgentAttachment = {
  id: string
  name: string
  type: string
  url?: string
  text?: string
}

/** Store tabs available in the Canvas Theo panel. */
type CanvasStoreKind = 'skills' | 'prompts'

/** Skill/prompt card format imported from the existing skills store. */
type CanvasStoreItem = {
  id: string
  name: string
  description?: string
  fullText?: string
  text?: string
  promptBase?: string
  iconIdx?: number
}

/** Click-to-connect mode used by older connector interactions and context menus. */
type LinkMode = { from: string; type: CanvasEdgeType; label: string } | null
/** Pending connector menu shown after dragging a connector onto another node. */
type PendingConnection = { from: string; to: string; x: number; y: number; fromGroup?: boolean } | null
/** Pending creation menu shown after dragging a connector into empty canvas space. */
type PendingNodeConnection = { from: string; x: number; y: number; worldX: number; worldY: number; fromGroup?: boolean } | null
/** Live connector preview while dragging from a node or group. */
type ConnectorDrag = { from: string; x: number; y: number; fromGroup?: boolean } | null
/** Shift/group-tool selection rectangle in world coordinates. */
type Marquee = { startX: number; startY: number; x: number; y: number } | null
/** Resize handles shown on selected group boxes. */
type GroupResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
type GroupResize = {
  id: string
  handle: GroupResizeHandle
  startX: number
  startY: number
  groupX: number
  groupY: number
  groupWidth: number
  groupHeight: number
} | null
/** Multi-node selection made from the marquee before grouping, deleting, or downloading. */
type MultiSelection = { x: number; y: number; width: number; height: number; nodeIds: string[] } | null
/** Cursor tools armed from the context menu. */
type CanvasTool = 'group' | 'scissors' | 'master' | 'node' | null
/** Active drag state for an editable bend point on an edge. */
type EdgePointDrag = { edgeId: string; index: number } | null

/** SVG icon pool used by compact Skills/Prompts cards in Theo's Canvas panel. */
const canvasStoreIcons = [
  { color: '#d4af37', d: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { color: '#409cff', d: 'M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83' },
  { color: '#9c40ff', d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
  { color: '#40ff9c', d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
  { color: '#ff9c40', d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z' },
  { color: '#ff4090', d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
  { color: '#40ffff', d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22V15' },
  { color: '#ffc840', d: 'M12 3v18M3 12h18M7.5 7.5l9 9M16.5 7.5l-9 9' },
  { color: '#a0ff40', d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3' },
  { color: '#ff6040', d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8' },
]

/** Built-in prompt templates available even before user-created prompt files exist. */
const canvasBuiltinPrompts: CanvasStoreItem[] = [
  {
    id: 'bp-cinematic-grid',
    name: '2x2 Cinematic Grid',
    description: '4-panel premium 3D animated grid',
    text: 'premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric morning light, little tiny dust motes, in soft sunrays soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look\n\nCreate 2x2 cinematic grid with 4 panels with 3d animated scenes in each one:\n\nPanel 1: [character action, emotions, interaction. Camera/shot type. Light, background details]\nPanel 2: [describe]\nPanel 3: [describe]\nPanel 4: [describe]\n\nEnvironment: [describe main features]\n\nStyle: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric morning light, soft depth of field, expressive animated 3D eyes, realistic textures, detailed clear emotional staging, high-quality 4K animated movie look',
    iconIdx: 0,
  },
  {
    id: 'bp-room-projections',
    name: '4 Room Projections',
    description: 'Same room from 4 camera angles',
    text: 'Show exact same room in four projections - 2x2 grid:\n\nPanel 1: Camera facing front. [describe wall, furniture, door, window]\nPanel 2: Camera close up facing left wall. [describe details]\nPanel 3: Top down view of the entire room. [describe layout]\nPanel 4: Camera angle from one side towards opposite wall. [describe perspective]\n\nAll panels must show SAME room, only camera angles change.\n\nStyle: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric light, expressive animated 3D eyes, realistic textures, high-quality 4K animated movie look',
    iconIdx: 1,
  },
  {
    id: 'bp-quality-improve',
    name: 'Quality Improve',
    description: 'Enhance quality preserving composition',
    text: 'Use exact @img1 but improve quality of characters and resolution. Do not change camera angle, composition, architecture or objects. Characters remain in same poses, all objects in same places. Camera same angle as @img1 only improve quality.\n\nStyle: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric morning light, soft depth of field, expressive animated 3D eyes, realistic textures, detailed clear emotional staging, high-quality 4K animated movie look',
    iconIdx: 2,
  },
]

/** Creates one independent canvas workspace with default trays and viewport. */
function createSpace(index = 1): CanvasSpace {
  return {
    id: makeId('space'),
    name: `Space ${index}`,
    color: '#60a5fa',
    nodes: [],
    edges: [],
    groups: [],
    trays: structuredClone(defaultTrays),
    viewport: { panX: 120, panY: 120, zoom: 1 },
  }
}

/** Builds the first persisted Canvas payload when local and server storage are empty. */
function createInitialData(): CanvasData {
  const first = createSpace(1)
  first.name = 'Act 1 Canvas'
  return { version: 1, activeSpaceId: first.id, spaces: [first] }
}

/** Migrates older saved data so tray references become pinned-only copies and media nodes stay 16:9. */
function normalizePinnedTrayCopies(data: CanvasData): CanvasData {
  const next = structuredClone(data)
  next.spaces.forEach(space => {
    space.nodes.forEach(node => {
      if (node.type === 'image' || node.type === 'video' || node.type === 'placeholder') {
        const width = Math.max(260, node.width || 320)
        node.width = width
        node.height = Math.round(width * 9 / 16)
      }
    })
    space.trays.forEach(tray => {
      tray.nodeIds = tray.nodeIds.map(nodeId => {
        const node = space.nodes.find(item => item.id === nodeId)
        if (!node || node.pinnedOnly) return nodeId
        const pinnedId = makeId('pinned')
        space.nodes.push({
          ...structuredClone(node),
          id: pinnedId,
          pinnedOnly: true,
        })
        return pinnedId
      })
    })
  })
  return next
}

/** Maps uploaded files to Canvas node types used by preview and generation logic. */
function mediaTypeFromFile(file: File): CanvasMediaType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type === 'application/pdf' || /\.(pdf|docx?)$/i.test(file.name)) return 'document'
  return 'placeholder'
}

/** Returns the default visual size for new nodes of a given media type. */
function nodeSize(type: CanvasMediaType) {
  if (type === 'image' || type === 'video' || type === 'placeholder') return { width: 320, height: 180 }
  if (type === 'audio') return { width: 280, height: 150 }
  if (type === 'document') return { width: 260, height: 180 }
  return { width: 320, height: 180 }
}

/** Returns the base color for each semantic edge type. */
function edgeColor(type: string) {
  if (type === 'reference') return '#f8d978'
  if (type === 'variation') return '#fb7185'
  if (type === 'animation') return '#38bdf8'
  if (type === 'frame') return '#34d399'
  if (type === 'context') return '#c084fc'
  return 'rgba(226, 232, 240, 0.58)'
}

/** Applies display overrides such as green continuation-video links. */
function edgeDisplayColor(type: CanvasEdgeType, label?: string) {
  if (type === 'animation' && label === 'CONT VIDEO') return '#34d399'
  return edgeColor(type)
}

/** Calculates a node center in canvas world coordinates. */
function centerOf(node: CanvasNode) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 }
}

/** Builds the SVG path for either a smooth edge or a hand-shaped multi-point edge. */
function edgePath(a: { x: number; y: number }, b: { x: number; y: number }, points: { x: number; y: number }[] = []) {
  if (points.length) {
    return `M ${a.x} ${a.y} ${points.map(point => `L ${point.x} ${point.y}`).join(' ')} L ${b.x} ${b.y}`
  }
  const midX = (a.x + b.x) / 2
  return `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`
}

/** Checks whether a node belongs inside a group based on its center point. */
function nodeCenterInsideGroup(node: CanvasNode, group: { x: number; y: number; width: number; height: number }) {
  const centerX = node.x + node.width / 2
  const centerY = node.y + node.height / 2
  return centerX >= group.x && centerX <= group.x + group.width && centerY >= group.y && centerY <= group.y + group.height
}

/** Summarizes the media mix inside a group for compact group labels. */
function groupMediaSummary(nodes: CanvasNode[]) {
  const counts = nodes.reduce<Record<string, number>>((acc, node) => {
    const label = node.type === 'placeholder' ? 'empty' : node.type
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {})
  return Object.entries(counts)
    .map(([type, count]) => `${count} ${type}${count === 1 ? '' : type === 'audio' ? '' : 's'}`)
    .join(' · ')
}

/** True when a node has image/video media that can be sent as a PixVerse or Theo reference. */
function isMediaReferenceNode(node?: CanvasNode) {
  return !!node?.url && (node.type === 'image' || node.type === 'video')
}

/** De-duplicates media reference nodes while preserving first-seen order. */
function uniqueMediaNodes(nodes: CanvasNode[]) {
  return Array.from(new Map(nodes.filter(isMediaReferenceNode).map(node => [node.id, node])).values())
}

/** Reads the snapshot of references saved on a generated node at run time. */
function savedInputRefNodes(node?: CanvasNode) {
  return ((node?.inputRefs || []) as CanvasNode[]).filter(isMediaReferenceNode)
}

/** Collects all media-bearing nodes from a group so a group can feed a generation edge. */
function groupMediaNodes(space: CanvasSpace, groupId: string) {
  const group = space.groups.find(item => item.id === groupId)
  if (!group) return []
  return uniqueMediaNodes(group.nodeIds.map(nodeId => space.nodes.find(node => node.id === nodeId)).filter(Boolean) as CanvasNode[])
}

/** Recursively resolves all upstream media references that should travel into PixVerse or Theo. */
function collectInputNodes(space: CanvasSpace, nodeId: string, includeSource = false, seen = new Set<string>()) {
  if (seen.has(nodeId)) return []
  seen.add(nodeId)
  const nodes: CanvasNode[] = []
  const source = space.nodes.find(item => item.id === nodeId)
  if (includeSource && isMediaReferenceNode(source)) nodes.push(source!)
  if (includeSource) nodes.push(...savedInputRefNodes(source))

  space.edges
    .filter(edge => edge.to === nodeId && generationInputEdgeTypes.includes(edge.type))
    .forEach(edge => {
      if (edge.fromGroup) {
        nodes.push(...groupMediaNodes(space, edge.from))
        return
      }
      const input = space.nodes.find(item => item.id === edge.from)
      if (edge.type === 'reference' || edge.type === 'context') {
        if (isMediaReferenceNode(input)) nodes.push(input!)
        return
      }
      if (edge.type === 'variation') {
        nodes.push(...savedInputRefNodes(input))
        nodes.push(...collectInputNodes(space, edge.from, false, seen))
        return
      }
      if (edge.type === 'derivative' || edge.type === 'animation' || edge.type === 'frame') {
        if (isMediaReferenceNode(input)) nodes.push(input!)
        nodes.push(...savedInputRefNodes(input))
        nodes.push(...collectInputNodes(space, edge.from, false, seen))
      }
    })

  return uniqueMediaNodes(nodes)
}

/** Returns the exact connector anchor on a node side. */
function portPoint(node: CanvasNode, side: string) {
  if (side === 'left') return { x: node.x, y: node.y + node.height / 2 }
  if (side === 'top') return { x: node.x + node.width / 2, y: node.y }
  if (side === 'bottom') return { x: node.x + node.width / 2, y: node.y + node.height }
  return { x: node.x + node.width, y: node.y + node.height / 2 }
}

/** Default image generation settings for new image-like nodes. */
function defaultGeneration() {
  return {
    operation: 'generate' as const,
    model: imageModels[0].id,
    quality: imageModels[0].quality,
    aspectRatio: '16:9',
    detailLevel: '',
    status: 'idle' as const,
  }
}

/** Chooses image or video generation defaults based on node type. */
function defaultGenerationForType(type: CanvasMediaType) {
  if (type === 'video') {
    return {
      operation: 'video' as const,
      model: videoModels[0].id,
      quality: videoModels[0].qualities[0],
      aspectRatio: '16:9',
      detailLevel: '',
      duration: 5,
      status: 'idle' as const,
    }
  }
  return defaultGeneration()
}

/** Converts model ids into human-readable labels for status messages and controls. */
function shortModelName(model?: string) {
  return imageModels.find(item => item.id === model)?.name || videoModels.find(item => item.id === model)?.name || model || 'Model'
}

/** Formats video frame times for small node badges. */
function formatSeconds(value = 0) {
  if (!Number.isFinite(value)) return '0:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

/** Distinguishes prompt blueprint cards from skill cards in the shared store payload. */
function isPromptStoreItem(item: CanvasStoreItem) {
  return item.id.startsWith('prompt-') || item.id.startsWith('bp-') || Boolean(item.text && !item.promptBase)
}

/** Returns the best available text body for a skill or prompt card. */
function storeItemText(item: CanvasStoreItem) {
  return item.fullText || item.text || item.promptBase || item.description || ''
}

/** Selects a deterministic card icon and accent color. */
function iconForStoreItem(item: CanvasStoreItem, index = 0) {
  return canvasStoreIcons[(item.iconIdx ?? index) % canvasStoreIcons.length]
}

/** Main PixVerse Canvas workspace: graph editor, generation control surface, pinned trays, and Theo side panel. */
export function CanvasMode({ onBack }: { onBack: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const refFileRef = useRef<HTMLInputElement>(null)
  const nodeFileRef = useRef<HTMLInputElement>(null)
  const trayFileRef = useRef<HTMLInputElement>(null)
  const agentFileRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<number | null>(null)
  const loadedServerDataRef = useRef(false)
  const [data, setData] = useState<CanvasData>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      return raw ? normalizePinnedTrayCopies(JSON.parse(raw) as CanvasData) : createInitialData()
    } catch {
      return createInitialData()
    }
  })
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number; nodeX?: number; nodeY?: number; panX?: number; panY?: number } | null>(null)
  const [panning, setPanning] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; worldX: number; worldY: number } | null>(null)
  const [agentTab, setAgentTab] = useState<'agent' | 'skills' | 'prompts' | 'tasks'>('agent')
  const [agentDraft, setAgentDraft] = useState('')
  const [linkMode, setLinkMode] = useState<LinkMode>(null)
  const [statusLine, setStatusLine] = useState('Canvas ready')
  const [noteAttachOpen, setNoteAttachOpen] = useState(false)
  const [noteSettingsOpen, setNoteSettingsOpen] = useState(false)
  const [noteSkillsOpen, setNoteSkillsOpen] = useState(false)
  const [noteAiEnhancing, setNoteAiEnhancing] = useState(false)
  const [activeJobs, setActiveJobs] = useState(0)
  const [pendingConnection, setPendingConnection] = useState<PendingConnection>(null)
  const [pendingNodeConnection, setPendingNodeConnection] = useState<PendingNodeConnection>(null)
  const [connectorDrag, setConnectorDrag] = useState<ConnectorDrag>(null)
  const [nodeUploadTargetId, setNodeUploadTargetId] = useState<string | null>(null)
  const [expandedTrayId, setExpandedTrayId] = useState<string | null>(null)
  const [agentOpen, setAgentOpen] = useState(true)
  const [marquee, setMarquee] = useState<Marquee>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [trayUploadTargetId, setTrayUploadTargetId] = useState<string | null>(null)
  const [agentMessages, setAgentMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([])
  const [agentLoading, setAgentLoading] = useState(false)
  const [playingVideoIds, setPlayingVideoIds] = useState<Set<string>>(() => new Set())
  const [unmutedVideoIds, setUnmutedVideoIds] = useState<Set<string>>(() => new Set())
  const [videoProgress, setVideoProgress] = useState<Record<string, { current: number; duration: number }>>({})
  const [agentAttachments, setAgentAttachments] = useState<AgentAttachment[]>([])
  const [alternativeMenuNodeId, setAlternativeMenuNodeId] = useState<string | null>(null)
  const [resizingGroup, setResizingGroup] = useState<GroupResize>(null)
  const [multiSelection, setMultiSelection] = useState<MultiSelection>(null)
  const [edgeSnapCandidate, setEdgeSnapCandidate] = useState<string | null>(null)
  const [canvasTool, setCanvasTool] = useState<CanvasTool>(null)
  const [draggingEdgePoint, setDraggingEdgePoint] = useState<EdgePointDrag>(null)
  const [toolCursor, setToolCursor] = useState<{ x: number; y: number } | null>(null)
  const [canvasStoreItems, setCanvasStoreItems] = useState<CanvasStoreItem[]>([])
  const [selectedCanvasSkillIds, setSelectedCanvasSkillIds] = useState<string[]>([])
  const [selectedCanvasPromptIds, setSelectedCanvasPromptIds] = useState<string[]>([])
  const [canvasStoreOpen, setCanvasStoreOpen] = useState<CanvasStoreKind | null>(null)
  const [canvasStorePage, setCanvasStorePage] = useState(0)
  const [canvasStoreEditingId, setCanvasStoreEditingId] = useState<string | null>(null)
  const [canvasStoreDraftTitle, setCanvasStoreDraftTitle] = useState('')
  const [canvasStoreDraftText, setCanvasStoreDraftText] = useState('')
  const [canvasStoreHelperMessages, setCanvasStoreHelperMessages] = useState<Record<CanvasStoreKind, { role: 'user' | 'model'; text: string }[]>>({ skills: [], prompts: [] })

  const activeSpace = data.spaces.find(space => space.id === data.activeSpaceId) || data.spaces[0]
  const selectedNode = activeSpace.nodes.find(node => node.id === selectedNodeId) || null
  const selectedGeneration = (selectedNode?.generation || defaultGeneration()) as NonNullable<CanvasNode['generation']>
  const selectedGroup = activeSpace.groups.find(group => group.id === selectedGroupId) || null
  const selectedRefNodes = selectedNode ? collectInputNodes(activeSpace, selectedNode.id, false) : []
  const displayedRefNodes = selectedNode ? collectInputNodes(activeSpace, selectedNode.id, true) : []
  const groupToolArmed = canvasTool === 'group'
  const canvasSkillItems = useMemo(() => canvasStoreItems.filter(item => !isPromptStoreItem(item)), [canvasStoreItems])
  const canvasPromptItems = useMemo(() => {
    const savedPrompts = canvasStoreItems.filter(isPromptStoreItem)
    const savedIds = new Set(savedPrompts.map(item => item.id))
    return [...canvasBuiltinPrompts.filter(item => !savedIds.has(item.id)), ...savedPrompts]
  }, [canvasStoreItems])
  const selectedCanvasSkills = canvasSkillItems.filter(item => selectedCanvasSkillIds.includes(item.id))
  const selectedCanvasPrompts = canvasPromptItems.filter(item => selectedCanvasPromptIds.includes(item.id))

  useEffect(() => {
    setData(current => normalizePinnedTrayCopies(current))
  }, [])

  useEffect(() => {
    fetch('/api/skills/list')
      .then(response => response.json())
      .then(payload => setCanvasStoreItems(Array.isArray(payload.skills) ? payload.skills : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!loadedServerDataRef.current) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      fetch(CANVAS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(() => {
        // localStorage remains the fallback when the dev API is unavailable.
      })
    }, 420)
  }, [data])

  useEffect(() => {
    let cancelled = false
    let serverHadData = false
    fetch(CANVAS_API)
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (cancelled || !payload?.spaces?.length) return
        serverHadData = true
        setData(normalizePinnedTrayCopies(payload as CanvasData))
      })
      .catch(() => {
        // Existing browser save is enough if the API has not been restarted yet.
      })
      .finally(() => {
        loadedServerDataRef.current = true
        if (!cancelled && !serverHadData) {
          fetch(CANVAS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }).catch(() => {})
        }
      })
    return () => {
      cancelled = true
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLinkMode(null)
        setContextMenu(null)
        setPendingConnection(null)
        setPendingNodeConnection(null)
        setConnectorDrag(null)
        setNoteAttachOpen(false)
        setNoteSettingsOpen(false)
        setNoteSkillsOpen(false)
        setAlternativeMenuNodeId(null)
        setMultiSelection(null)
        setEdgeSnapCandidate(null)
        setCanvasTool(null)
        setDraggingEdgePoint(null)
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        if (selectedNodeId) deleteNode(selectedNodeId)
        else if (selectedGroupId) deleteGroup(selectedGroupId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedNodeId, selectedGroupId, activeSpace.id])

  /** Applies immutable updates to the active space so React and persistence both see a fresh object graph. */
  const updateActiveSpace = (mutate: (space: CanvasSpace) => void) => {
    setData(current => {
      const next = structuredClone(current)
      const space = next.spaces.find(item => item.id === next.activeSpaceId)
      if (space) mutate(space)
      return next
    })
  }

  /** Toggles context-menu tools such as scissors, master marker, node-point placement, and grouping. */
  const activateCanvasTool = (tool: CanvasTool) => {
    const next = canvasTool === tool ? null : tool
    setCanvasTool(next)
    setMultiSelection(null)
    setStatusLine(next ? `${next === 'node' ? 'Doodle point' : next} tool active` : 'Canvas tool reset')
  }

  /** Clears any armed cursor tool and returns the canvas to normal select/pan behavior. */
  const resetCanvasTool = () => {
    setCanvasTool(null)
    setStatusLine('Canvas tool reset')
  }

  /** Converts browser screen coordinates into pan/zoom-adjusted canvas world coordinates. */
  const screenToWorld = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left - activeSpace.viewport.panX) / activeSpace.viewport.zoom,
      y: (clientY - rect.top - activeSpace.viewport.panY) / activeSpace.viewport.zoom,
    }
  }

  /** Zooms around a screen anchor so the point under the cursor stays visually stable. */
  const setZoomAt = (nextZoom: number, clientX?: number, clientY?: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    const oldZoom = activeSpace.viewport.zoom
    const zoom = Math.min(3, Math.max(0.16, nextZoom))
    const anchorX = clientX !== undefined && rect ? clientX - rect.left : (rect?.width || window.innerWidth) / 2
    const anchorY = clientY !== undefined && rect ? clientY - rect.top : (rect?.height || window.innerHeight) / 2
    const worldX = (anchorX - activeSpace.viewport.panX) / oldZoom
    const worldY = (anchorY - activeSpace.viewport.panY) / oldZoom
    updateActiveSpace(space => {
      space.viewport.zoom = zoom
      space.viewport.panX = anchorX - worldX * zoom
      space.viewport.panY = anchorY - worldY * zoom
    })
  }

  /** Convenience wrapper for toolbar zoom controls centered on the viewport. */
  const zoomBy = (factor: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    setZoomAt(activeSpace.viewport.zoom * factor, rect ? rect.left + rect.width / 2 : undefined, rect ? rect.top + rect.height / 2 : undefined)
  }

  /** Creates a canvas node, fills missing defaults, inserts it into the active space, and selects it. */
  const addNode = (partial: Partial<CanvasNode> & { type: CanvasMediaType; title: string }, x: number, y: number) => {
    const size = nodeSize(partial.type)
    const node: CanvasNode = {
      id: makeId('node'),
      type: partial.type,
      title: partial.title,
      x,
      y,
      width: partial.width || size.width,
      height: partial.height || size.height,
      prompt: partial.prompt || '',
      sourcePrompt: partial.sourcePrompt || partial.prompt || '',
      note: partial.note || '',
      url: partial.url,
      localPath: partial.localPath,
      mimeType: partial.mimeType,
      fileName: partial.fileName,
      frameTime: partial.frameTime,
      inputRefs: partial.inputRefs,
      pinnedOnly: partial.pinnedOnly,
      generation: partial.generation || defaultGenerationForType(partial.type),
    }
    updateActiveSpace(space => {
      space.nodes.push(node)
    })
    setSelectedNodeId(node.id)
    return node.id
  }

  /** Mutates a single node through updateActiveSpace so all graph side effects stay centralized. */
  const updateNode = (nodeId: string, mutate: (node: CanvasNode) => void) => {
    updateActiveSpace(space => {
      const node = space.nodes.find(item => item.id === nodeId)
      if (node) mutate(node)
    })
  }

  /** Adds a semantic connection and upgrades empty placeholders when the edge implies image/video output. */
  const addEdge = (from: string, to: string, type: CanvasEdgeType, label?: string) => {
    if (from === to) return
    updateActiveSpace(space => {
      const exists = space.edges.some(edge => edge.from === from && edge.to === to && edge.type === type)
      if (exists) return
      const edgeLabel = type === 'reference' && (!label || label === 'ref')
        ? `ref ${space.edges.filter(edge => edge.to === to && edge.type === 'reference').length + 1}`
        : label
      space.edges.push({ id: makeId('edge'), from, to, type, label: edgeLabel })
      const target = space.nodes.find(node => node.id === to)
      const source = space.nodes.find(node => node.id === from)
      if (target && !target.url && target.type === 'placeholder') {
        if (type === 'animation') {
          target.type = 'video'
          target.title = target.title === 'Empty media' ? 'New video' : target.title
          target.generation = defaultGenerationForType('video')
        } else if (type === 'derivative' || type === 'variation') {
          target.type = 'image'
          target.title = target.title === 'Empty media' ? 'New image' : target.title
          target.generation = defaultGenerationForType('image')
        }
      }
      if (target && !target.url && source && !target.prompt && (type === 'animation' || type === 'derivative' || type === 'variation')) {
        target.prompt = source.prompt || source.sourcePrompt || ''
        target.sourcePrompt = source.sourcePrompt || source.prompt || ''
      }
    })
  }

  /** Finalizes a connector-drag menu choice for node-to-node or group-to-node links. */
  const createConnection = (from: string, to: string, type: CanvasEdgeType) => {
    const labels: Record<CanvasEdgeType, string> = {
      derivative: 'derive',
      reference: 'ref',
      variation: 'var',
      animation: 'animate',
      frame: 'frame',
      context: 'context',
    }
    if (pendingConnection?.fromGroup) {
      const group = activeSpace.groups.find(item => item.id === from)
      if (group) {
        updateActiveSpace(space => {
          const exists = space.edges.some(edge => edge.fromGroup && edge.from === from && edge.to === to && edge.type === type)
          if (exists) return
          const edgeLabel = type === 'reference' && labels[type] === 'ref'
            ? `ref ${space.edges.filter(edge => edge.to === to && edge.type === 'reference').length + 1}`
            : labels[type]
          space.edges.push({ id: makeId('edge'), from, to, type, label: edgeLabel, fromGroup: true })
          const target = space.nodes.find(node => node.id === to)
          if (target && !target.url && target.type === 'placeholder') {
            if (type === 'animation') {
              target.type = 'video'
              target.title = target.title === 'Empty media' ? 'New video' : target.title
              target.generation = defaultGenerationForType('video')
            } else if (type === 'derivative' || type === 'variation') {
              target.type = 'image'
              target.title = target.title === 'Empty media' ? 'New image' : target.title
              target.generation = defaultGenerationForType('image')
            }
          }
        })
      }
      setStatusLine(`${group?.name || 'Group'} ${labels[type]} link created`)
    } else {
      addEdge(from, to, type, labels[type])
      setStatusLine(`${labels[type]} link created`)
    }
    setPendingConnection(null)
    setConnectorDrag(null)
  }

  /** Adds a timestamp query to local asset URLs so regenerated media refreshes immediately. */
  const cacheBustUrl = (url?: string) => {
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url
    return `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
  }

  /** Returns unique upstream media URLs for a node's PixVerse reference attachments. */
  const getReferenceUrls = (nodeId: string, includeSource = false) => {
    return Array.from(new Set(collectInputNodes(activeSpace, nodeId, includeSource).map(node => node.url).filter(Boolean) as string[]))
  }

  /** Returns debug metadata for upstream references, useful when checking why PixVerse saw certain images. */
  const getReferenceDebug = (nodeId: string, includeSource = false) => {
    return collectInputNodes(activeSpace, nodeId, includeSource).map(node => ({
      id: node.id,
      title: node.title,
      type: node.type,
      url: node.url,
      localPath: node.localPath,
    }))
  }

  /** Canvas-local alias for recursive input collection used by generation and Theo. */
  const getInputNodes = (nodeId: string, includeSource = false) => {
    return collectInputNodes(activeSpace, nodeId, includeSource)
  }

  /** Freezes current input references onto a generated node so later graph edits do not erase provenance. */
  const snapshotInputRefs = (nodeId: string, includeSource = false) => {
    return getInputNodes(nodeId, includeSource).slice(0, 8).map(node => ({
      id: node.id,
      title: node.title,
      type: node.type,
      url: node.url,
      localPath: node.localPath,
      fileName: node.fileName,
    }))
  }

  /** Uploads media into the storyboard asset folder, falling back to a temporary preview if the API is down. */
  const uploadStoryboardFile = async (file: File) => {
    const fallback = { url: URL.createObjectURL(file), fileName: file.name, mimeType: file.type }
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch('/api/storyboard/upload', { method: 'POST', body: formData })
      const uploaded = await response.json()
      if (!response.ok || uploaded.error || !uploaded.url) throw new Error(uploaded.error || 'Upload failed')
      return uploaded as { url: string; localPath?: string; mimeType?: string; fileName?: string }
    } catch {
      setStatusLine('Upload API unavailable; using temporary preview only. Restart the Vite dev server before sending this reference to PixVerse.')
      return fallback
    }
  }

  /** Uploads a dropped file and creates a positioned canvas node for it. */
  const uploadFile = async (file: File, worldX: number, worldY: number) => {
    const uploaded = await uploadStoryboardFile(file)
    const nodeId = addNode({
      type: mediaTypeFromFile(file),
      title: file.name,
      url: cacheBustUrl(uploaded.url) || URL.createObjectURL(file),
      localPath: uploaded.localPath,
      mimeType: uploaded.mimeType || file.type,
      fileName: uploaded.fileName || file.name,
    }, worldX, worldY)
    return nodeId
  }

  /** Uploads a file directly into a pinned tray as a reusable reference instead of a canvas node. */
  const uploadFileToTray = async (file: File, trayId: string) => {
    const uploaded = await uploadStoryboardFile(file)
    const type = mediaTypeFromFile(file)
    const size = nodeSize(type)
    const nodeId = makeId('pinned')
    const node: CanvasNode = {
      id: nodeId,
      type,
      title: file.name,
      url: cacheBustUrl(uploaded.url) || URL.createObjectURL(file),
      localPath: uploaded.localPath,
      mimeType: uploaded.mimeType || file.type,
      fileName: uploaded.fileName || file.name,
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      prompt: '',
      sourcePrompt: '',
      note: '',
      pinnedOnly: true,
      generation: defaultGenerationForType(type),
    }
    updateActiveSpace(space => {
      const tray = space.trays.find(item => item.id === trayId)
      if (!tray) return
      space.nodes.push(node)
      tray.nodeIds.push(nodeId)
    })
    setExpandedTrayId(trayId)
    setStatusLine(`${file.name} added to ${activeSpace.trays.find(tray => tray.id === trayId)?.name || 'tray'}`)
    return nodeId
  }

  /** Replaces an empty/existing node's media while preserving its graph position and links. */
  const uploadFileIntoNode = async (file: File, targetId: string) => {
    const uploaded = await uploadStoryboardFile(file)
    const nextType = mediaTypeFromFile(file)
    updateNode(targetId, node => {
      node.type = nextType
      node.title = file.name
      node.url = cacheBustUrl(uploaded.url) || URL.createObjectURL(file)
      node.localPath = uploaded.localPath
      node.mimeType = uploaded.mimeType || file.type
      node.fileName = uploaded.fileName || file.name
      node.generation = node.generation || defaultGenerationForType(nextType)
    })
    setSelectedNodeId(targetId)
    setStatusLine(`${file.name} loaded into node`)
  }

  /** Drops one or more files beside a target and connects them as numbered reference edges. */
  const attachReferenceFilesToNode = async (files: File[], targetId: string) => {
    const target = activeSpace.nodes.find(node => node.id === targetId)
    const baseX = target ? target.x - 340 : screenToWorld(window.innerWidth / 2, window.innerHeight / 2).x
    const baseY = target ? target.y : screenToWorld(window.innerWidth / 2, window.innerHeight / 2).y
    for (let index = 0; index < files.length; index += 1) {
      const refId = await uploadFile(files[index], baseX, baseY + index * 42)
      addEdge(refId, targetId, 'reference', 'ref')
    }
    setStatusLine(`${files.length} reference${files.length === 1 ? '' : 's'} attached`)
  }

  /** Handles canvas-level drops from files or pinned tray references. */
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const trayNodeId = event.dataTransfer.getData('application/x-canvas-tray-node')
    const trayId = event.dataTransfer.getData('application/x-canvas-tray-id')
    const world = screenToWorld(event.clientX, event.clientY)
    if (trayNodeId) {
      const placedId = duplicateTrayNodeToCanvas(trayNodeId, world.x, world.y)
      if (trayId) {
        updateActiveSpace(space => {
          const tray = space.trays.find(item => item.id === trayId)
          if (tray) tray.nodeIds = tray.nodeIds.filter(id => id !== trayNodeId)
          const pinned = space.nodes.find(node => node.id === trayNodeId && node.pinnedOnly)
          if (pinned) space.nodes = space.nodes.filter(node => node.id !== trayNodeId)
        })
        setStatusLine('Reference unpinned to canvas')
      }
      if (placedId) setSelectedNodeId(placedId)
      return
    }
    Array.from(event.dataTransfer.files).forEach((file, index) => {
      uploadFile(file, world.x + index * 36, world.y + index * 36)
    })
  }

  /** Handles trackpad/mouse wheel zooming with a gentler curve than browser default zoom. */
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const normalizedDelta = Math.max(-80, Math.min(80, event.deltaY))
    const sensitivity = event.ctrlKey ? 0.00105 : 0.00072
    setZoomAt(activeSpace.viewport.zoom * Math.exp(-normalizedDelta * sensitivity), event.clientX, event.clientY)
  }

  /** Starts panning, marquee selection, or tool-specific stage behavior from empty canvas space. */
  const handleStageMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('.canvas-node, .canvas-topbar, .canvas-space-tabs, .canvas-pinned-trays, .canvas-tray-panel, .canvas-context-menu, .canvas-connection-menu, .canvas-prompt-dock, .canvas-note-composer, .canvas-link-banner')) return
    setContextMenu(null)
    setMultiSelection(null)
    setPendingConnection(null)
    setPendingNodeConnection(null)
    setNoteAttachOpen(false)
    setNoteSettingsOpen(false)
    setNoteSkillsOpen(false)
    setSelectedNodeId(null)
    setSelectedGroupId(null)
    if (event.shiftKey || groupToolArmed) {
      const world = screenToWorld(event.clientX, event.clientY)
      setMarquee({ startX: world.x, startY: world.y, x: world.x, y: world.y })
      return
    }
    if (canvasTool === 'scissors' || canvasTool === 'master' || canvasTool === 'node') return
    setPanning(true)
    setDragStart({ x: event.clientX, y: event.clientY, panX: activeSpace.viewport.panX, panY: activeSpace.viewport.panY })
  }

  /** Drives all live pointer interactions: panning, dragging, group resize, edge shaping, and custom cursors. */
  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (canvasTool) {
      const rect = stageRef.current?.getBoundingClientRect()
      setToolCursor(rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null)
    }
    if (draggingEdgePoint) {
      const world = screenToWorld(event.clientX, event.clientY)
      updateActiveSpace(space => {
        const edge = space.edges.find(item => item.id === draggingEdgePoint.edgeId)
        if (!edge?.points?.[draggingEdgePoint.index]) return
        edge.points[draggingEdgePoint.index] = world
      })
      return
    }
    if (connectorDrag) {
      const world = screenToWorld(event.clientX, event.clientY)
      setConnectorDrag(current => current ? { ...current, x: world.x, y: world.y } : current)
      return
    }
    if (marquee) {
      const world = screenToWorld(event.clientX, event.clientY)
      setMarquee(current => current ? { ...current, x: world.x, y: world.y } : current)
      return
    }
    if (draggingNodeId && dragStart) {
      const dx = (event.clientX - dragStart.x) / activeSpace.viewport.zoom
      const dy = (event.clientY - dragStart.y) / activeSpace.viewport.zoom
      updateActiveSpace(space => {
        const node = space.nodes.find(item => item.id === draggingNodeId)
        if (!node || dragStart.nodeX === undefined || dragStart.nodeY === undefined) return
        node.x = dragStart.nodeX + dx
        node.y = dragStart.nodeY + dy
      })
      const target = document.elementFromPoint(event.clientX, event.clientY)
      const edgeEl = target?.closest?.('[data-edge-id]') as HTMLElement | null
      setEdgeSnapCandidate(edgeEl?.dataset.edgeId || null)
      return
    }
    if (resizingGroup) {
      const dx = (event.clientX - resizingGroup.startX) / activeSpace.viewport.zoom
      const dy = (event.clientY - resizingGroup.startY) / activeSpace.viewport.zoom
      updateActiveSpace(space => {
        const group = space.groups.find(item => item.id === resizingGroup.id)
        if (!group) return
        let x = resizingGroup.groupX
        let y = resizingGroup.groupY
        let width = resizingGroup.groupWidth
        let height = resizingGroup.groupHeight
        if (resizingGroup.handle.includes('e')) width = resizingGroup.groupWidth + dx
        if (resizingGroup.handle.includes('s')) height = resizingGroup.groupHeight + dy
        if (resizingGroup.handle.includes('w')) {
          x = resizingGroup.groupX + dx
          width = resizingGroup.groupWidth - dx
        }
        if (resizingGroup.handle.includes('n')) {
          y = resizingGroup.groupY + dy
          height = resizingGroup.groupHeight - dy
        }
        group.x = Math.min(x, x + width - 120)
        group.y = Math.min(y, y + height - 90)
        group.width = Math.max(120, Math.abs(width))
        group.height = Math.max(90, Math.abs(height))
        space.nodes
          .filter(node => !node.pinnedOnly)
          .forEach(node => {
            const inside = nodeCenterInsideGroup(node, group)
            if (inside && !group.nodeIds.includes(node.id)) group.nodeIds.push(node.id)
            if (!inside && group.nodeIds.includes(node.id)) group.nodeIds = group.nodeIds.filter(id => id !== node.id)
          })
      })
      return
    }
    if (draggingGroupId && dragStart) {
      const dx = (event.clientX - dragStart.x) / activeSpace.viewport.zoom
      const dy = (event.clientY - dragStart.y) / activeSpace.viewport.zoom
      updateActiveSpace(space => {
        const group = space.groups.find(item => item.id === draggingGroupId)
        if (!group || dragStart.nodeX === undefined || dragStart.nodeY === undefined) return
        group.x = dragStart.nodeX + dx
        group.y = dragStart.nodeY + dy
        group.nodeIds.forEach(nodeId => {
          const node = space.nodes.find(item => item.id === nodeId)
          if (node) {
            node.x += dx - ((group as any)._lastDx || 0)
            node.y += dy - ((group as any)._lastDy || 0)
          }
        })
        ;(group as any)._lastDx = dx
        ;(group as any)._lastDy = dy
      })
      return
    }
    if (panning && dragStart) {
      updateActiveSpace(space => {
        space.viewport.panX = (dragStart.panX || 0) + event.clientX - dragStart.x
        space.viewport.panY = (dragStart.panY || 0) + event.clientY - dragStart.y
      })
    }
  }

  /** Commits the current pointer gesture and resolves drops onto nodes, edges, groups, or empty space. */
  const stopDragging = (event?: MouseEvent<HTMLDivElement>) => {
    if (marquee) {
      const x = Math.min(marquee.startX, marquee.x)
      const y = Math.min(marquee.startY, marquee.y)
      const width = Math.abs(marquee.x - marquee.startX)
      const height = Math.abs(marquee.y - marquee.startY)
      if (width > 40 && height > 40) {
        const nodeIds = canvasNodes
          .filter(node => node.x >= x && node.y >= y && node.x + node.width <= x + width && node.y + node.height <= y + height)
          .map(node => node.id)
        if (nodeIds.length) {
          setMultiSelection({ x, y, width, height, nodeIds })
          setStatusLine(`${nodeIds.length} selected`)
        }
      }
      setMarquee(null)
    }
    if (connectorDrag && event) {
      const target = document.elementFromPoint(event.clientX, event.clientY)
      const nodeEl = target?.closest?.('.canvas-node') as HTMLElement | null
      const to = nodeEl?.dataset.nodeId
      const world = screenToWorld(event.clientX, event.clientY)
      if (to && to !== connectorDrag.from) {
        setPendingConnection({
          from: connectorDrag.from,
          to,
          x: event.clientX - (stageRef.current?.getBoundingClientRect().left || 0),
          y: event.clientY - (stageRef.current?.getBoundingClientRect().top || 0),
          fromGroup: connectorDrag.fromGroup,
        })
      } else {
        setPendingNodeConnection({
          from: connectorDrag.from,
          x: event.clientX - (stageRef.current?.getBoundingClientRect().left || 0),
          y: event.clientY - (stageRef.current?.getBoundingClientRect().top || 0),
          worldX: world.x,
          worldY: world.y,
          fromGroup: connectorDrag.fromGroup,
        })
      }
      setConnectorDrag(null)
    }
    if (draggingNodeId) {
      const target = event ? document.elementFromPoint(event.clientX, event.clientY) : null
      const edgeEl = target?.closest?.('[data-edge-id]') as HTMLElement | null
      const nodeEl = target?.closest?.('.canvas-node') as HTMLElement | null
      const targetNodeId = nodeEl?.dataset.nodeId
      if (targetNodeId && targetNodeId !== draggingNodeId) {
        swapNodeMedia(draggingNodeId, targetNodeId)
      } else if (edgeEl?.dataset.edgeId) {
        insertExistingNodeOnEdge(edgeEl.dataset.edgeId, draggingNodeId)
      }
      updateActiveSpace(space => {
        const node = space.nodes.find(item => item.id === draggingNodeId)
        if (!node) return
        space.groups.forEach(group => {
          const inside = nodeCenterInsideGroup(node, group)
          if (inside && !group.nodeIds.includes(draggingNodeId)) group.nodeIds.push(draggingNodeId)
          if (!inside && group.nodeIds.includes(draggingNodeId)) group.nodeIds = group.nodeIds.filter(id => id !== draggingNodeId)
        })
      })
    }
    setDraggingNodeId(null)
    setDraggingGroupId(null)
    setResizingGroup(null)
    setDraggingEdgePoint(null)
    setEdgeSnapCandidate(null)
    updateActiveSpace(space => {
      space.groups.forEach(group => {
        delete (group as any)._lastDx
        delete (group as any)._lastDy
      })
    })
    setPanning(false)
    setDragStart(null)
    if (!canvasTool) setToolCursor(null)
  }

  /** Starts node selection/dragging or applies active tools such as master marking and marquee grouping. */
  const startNodeDrag = (event: MouseEvent<HTMLDivElement>, node: CanvasNode) => {
    event.stopPropagation()
    setContextMenu(null)
    setMultiSelection(null)
    if (canvasTool === 'master') {
      setNodeMarker(node.id, 'master')
      return
    }
    if (event.shiftKey || groupToolArmed) {
      const world = screenToWorld(event.clientX, event.clientY)
      setSelectedNodeId(null)
      setSelectedGroupId(null)
      setDraggingNodeId(null)
      setMarquee({ startX: world.x, startY: world.y, x: world.x, y: world.y })
      return
    }
    if (linkMode) {
      if (linkMode.from !== node.id) {
        addEdge(linkMode.from, node.id, linkMode.type, linkMode.label)
        setStatusLine(`${linkMode.label} link created`)
      }
      setLinkMode(null)
      setSelectedNodeId(node.id)
      return
    }
    setSelectedNodeId(node.id)
    setDraggingNodeId(node.id)
    setDragStart({ x: event.clientX, y: event.clientY, nodeX: node.x, nodeY: node.y })
  }

  /** Begins a live connector drag from a node output port. */
  const startConnectorDrag = (event: MouseEvent<HTMLButtonElement>, node: CanvasNode, side = 'right') => {
    event.preventDefault()
    event.stopPropagation()
    const start = portPoint(node, side)
    setSelectedNodeId(node.id)
    setPendingConnection(null)
    setPendingNodeConnection(null)
    setConnectorDrag({ from: node.id, x: start.x, y: start.y })
    setStatusLine('Drag the connector to another node')
  }

  /** Begins a live connector drag from a group box so all group media can act as references. */
  const startGroupConnectorDrag = (event: MouseEvent<HTMLButtonElement>, groupId: string) => {
    event.preventDefault()
    event.stopPropagation()
    const group = activeSpace.groups.find(item => item.id === groupId)
    if (!group) return
    setSelectedGroupId(group.id)
    setSelectedNodeId(null)
    setPendingConnection(null)
    setPendingNodeConnection(null)
    setConnectorDrag({ from: group.id, x: group.x + group.width, y: group.y + group.height / 2, fromGroup: true })
    setStatusLine('Drag the group connector to a target node')
  }

  /** Starts dragging a group and moves its member nodes as a unit. */
  const startGroupDrag = (event: MouseEvent<HTMLElement>, groupId: string) => {
    event.preventDefault()
    event.stopPropagation()
    const group = activeSpace.groups.find(item => item.id === groupId)
    if (!group) return
    setSelectedGroupId(group.id)
    setSelectedNodeId(null)
    setDraggingNodeId(null)
    setDraggingGroupId(group.id)
    updateActiveSpace(space => {
      const item = space.groups.find(g => g.id === group.id) as any
      if (item) {
        item._lastDx = 0
        item._lastDy = 0
      }
    })
    setDragStart({ x: event.clientX, y: event.clientY, nodeX: group.x, nodeY: group.y })
  }

  /** Starts resizing a group and recomputes membership based on node centers. */
  const startGroupResize = (event: MouseEvent<HTMLElement>, groupId: string, handle: GroupResizeHandle) => {
    event.preventDefault()
    event.stopPropagation()
    const group = activeSpace.groups.find(item => item.id === groupId)
    if (!group) return
    setSelectedGroupId(group.id)
    setSelectedNodeId(null)
    setDraggingNodeId(null)
    setDraggingGroupId(null)
    setResizingGroup({
      id: group.id,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      groupX: group.x,
      groupY: group.y,
      groupWidth: group.width,
      groupHeight: group.height,
    })
  }

  /** Creates an empty output/reference node, optionally already connected to a source node or group. */
  const addPlaceholder = (type: CanvasMediaType, x: number, y: number, sourceId?: string, edgeType?: CanvasEdgeType, edgeLabel?: string, fromGroup = false) => {
    const id = addNode({ type, title: type === 'placeholder' ? 'Empty media' : `New ${type}` }, x, y)
    if (sourceId) {
      const label = edgeLabel || (edgeType === 'reference' ? 'ref' : type === 'video' ? 'image to video' : edgeType || 'derivative')
      updateActiveSpace(space => {
        const finalType = edgeType || (type === 'video' ? 'animation' : 'derivative')
        const finalLabel = finalType === 'reference' && label === 'ref'
          ? `ref ${space.edges.filter(edge => edge.to === id && edge.type === 'reference').length + 1}`
          : label
        space.edges.push({
          id: makeId('edge'),
          from: sourceId,
          to: id,
          type: finalType,
          label: finalLabel,
          fromGroup,
        })
      })
    }
    return id
  }

  /** Converts a pending empty-space connector drop into a newly connected placeholder node. */
  const createConnectedNode = (type: CanvasMediaType, edgeType?: CanvasEdgeType) => {
    if (!pendingNodeConnection) return
    addPlaceholder(type, pendingNodeConnection.worldX, pendingNodeConnection.worldY, pendingNodeConnection.from, edgeType, undefined, !!pendingNodeConnection.fromGroup)
    setPendingNodeConnection(null)
  }

  /** Removes a node plus every edge, group membership, and tray membership that points at it. */
  const deleteNode = (nodeId: string) => {
    updateActiveSpace(space => {
      space.nodes = space.nodes.filter(node => node.id !== nodeId)
      space.edges = space.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId)
      space.groups.forEach(group => {
        group.nodeIds = group.nodeIds.filter(id => id !== nodeId)
      })
      space.trays.forEach(tray => {
        tray.nodeIds = tray.nodeIds.filter(id => id !== nodeId)
      })
    })
    if (selectedNodeId === nodeId) setSelectedNodeId(null)
  }

  /** Removes all incoming and outgoing links while leaving the node itself intact. */
  const disconnectNode = (nodeId: string) => {
    updateActiveSpace(space => {
      space.edges = space.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId)
    })
  }

  /** Duplicates a node as either an unlinked copy or a linked pink variation. */
  const duplicateNode = (nodeId: string, asVariation = false) => {
    const source = activeSpace.nodes.find(node => node.id === nodeId)
    if (!source) return
    const id = addNode({
      ...source,
      id: undefined,
      title: asVariation ? `${source.title} alt` : `${source.title} copy`,
    }, source.x + 70, source.y + 70)
    if (asVariation) addEdge(source.id, id, 'variation', 'alt')
    return id
  }

  /** Writes a completed image generation result back into an existing node. */
  const fillNodeWithImage = (nodeId: string, payload: { url: string; localPath?: string; fileName?: string }, title?: string) => {
    updateNode(nodeId, node => {
      node.type = 'image'
      node.url = cacheBustUrl(payload.url)
      node.localPath = payload.localPath
      node.fileName = payload.fileName || payload.url.split('/').pop() || node.fileName
      node.title = title || node.title || node.fileName || 'Generated image'
      node.sourcePrompt = node.sourcePrompt || node.prompt || ''
      node.generation = {
        ...(node.generation || defaultGeneration()),
        status: 'done',
        error: '',
        lastRunAt: new Date().toISOString(),
      }
    })
  }

  /** Calls the storyboard/PixVerse image route with prompt, model settings, and resolved reference images. */
  const callCanvasImageApi = async (node: CanvasNode, type: 'generate' | 'enhance', forceSourceAsReference = false) => {
    const generation = node.generation || defaultGeneration()
    const modelPreset = imageModels.find(item => item.id === generation.model)
    const prompt = node.prompt || node.note || (forceSourceAsReference ? 'Use exact @img1 as the source image. Improve quality, clarity, resolution, cinematic lighting, and details while preserving the same composition, camera angle, character identity, object positions, and overall design. Do not invent new characters or change the scene.' : '')
    const attachmentNodes = getInputNodes(node.id, type === 'generate' && (forceSourceAsReference || node.type === 'image')).slice(0, 8)
    const attachments = attachmentNodes.map(ref => ref.url).filter(Boolean)
    const response = await fetch('/api/tasks/edit-from-lightbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        shotId: node.id,
        actId: 'canvas',
        sceneId: activeSpace.id,
        mode: 'image',
        imageUrl: type === 'enhance' ? node.url : '',
        imagePath: type === 'enhance' ? node.localPath || '' : '',
        attachments,
        attachmentItems: attachmentNodes.map(ref => ({ url: ref.url, localPath: ref.localPath, title: ref.title })),
        note: prompt,
        model: generation.model || modelPreset?.id || imageModels[0].id,
        quality: generation.quality || modelPreset?.quality || imageModels[0].quality,
        aspectRatio: generation.aspectRatio || '16:9',
        detailLevel: generation.detailLevel || modelPreset?.detailLevel || undefined,
      }),
    })
    const payload = await response.json()
    if (!response.ok || payload.error) throw new Error(payload.error || 'Generation failed')
    return payload as { ok: boolean; url: string; localPath?: string }
  }

  /** Calls the storyboard/PixVerse video route and polls pending PixVerse jobs until local media is saved. */
  const callCanvasVideoApi = async (node: CanvasNode) => {
    const generation = (node.generation || defaultGenerationForType('video')) as NonNullable<CanvasNode['generation']>
    const prompt = node.prompt || node.note || ''
    const allReferenceUrls = getReferenceUrls(node.id, !!node.url)
    const referenceDebug = getReferenceDebug(node.id, !!node.url)
    const referenceUrl = node.url || allReferenceUrls[0] || ''
    const attachments = allReferenceUrls.filter(url => url !== referenceUrl)
    console.info('[canvas video refs]', {
      node: node.title,
      total: allReferenceUrls.length,
      primary: referenceUrl,
      attachments: attachments.length,
      refs: referenceDebug.map(ref => ref.title),
    })
    const response = await fetch('/api/tasks/edit-from-lightbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'video',
        shotId: node.id,
        actId: 'canvas',
        sceneId: activeSpace.id,
        mode: 'video',
        imageUrl: referenceUrl,
        imagePath: node.localPath || referenceDebug.find(ref => ref.url === referenceUrl)?.localPath || '',
        attachments,
        attachmentItems: referenceDebug.map(ref => ({ url: ref.url, localPath: ref.localPath, title: ref.title })),
        referenceDebug,
        note: prompt,
        model: generation.model || videoModels[0].id,
        quality: generation.quality || videoModels[0].qualities[0],
        aspectRatio: generation.aspectRatio || '16:9',
        duration: generation.duration || 5,
      }),
    })
    const payload = await response.json()
    if (!response.ok || payload.error) throw new Error(payload.error || 'Video generation failed')
    if (payload.pending && payload.jobId) {
      const started = Date.now()
      while (Date.now() - started < 20 * 60 * 1000) {
        await new Promise(resolve => window.setTimeout(resolve, 5000))
        const jobResponse = await fetch(`/api/tasks/video-job?id=${encodeURIComponent(payload.jobId)}`)
        const job = await jobResponse.json()
        if (job.status === 'done' && job.url) {
          return { ok: true, url: job.url, localPath: job.localPath, cliPrompt: job.cliPrompt || prompt }
        }
        if (job.status === 'error') throw new Error(job.error || 'Video generation failed')
      }
      throw new Error('Video generation timed out while waiting for PixVerse.')
    }
    return payload as { ok: boolean; url: string; localPath?: string; cliPrompt?: string }
  }

  /** Orchestrates image-to-video generation: chooses/creates target node, snapshots refs, and saves result. */
  const runVideoGeneration = async (nodeId: string) => {
    const source = activeSpace.nodes.find(node => node.id === nodeId)
    if (!source) return
    if (!(source.prompt || source.note)) {
      updateNode(source.id, node => {
        node.generation = { ...(node.generation || defaultGenerationForType('video')), status: 'error', error: 'Add a video prompt before running.' }
      })
      setStatusLine('Missing video prompt')
      return
    }
    const isContinuationFromFrame = activeSpace.edges.some(edge => edge.to === source.id && edge.type === 'frame')
    const targetId = !source.url && (source.type === 'placeholder' || source.type === 'video')
      ? source.id
      : addPlaceholder('video', source.x + source.width + 140, source.y, source.id, 'animation', isContinuationFromFrame ? 'CONT VIDEO' : 'image to video')
    const inputRefs = snapshotInputRefs(source.id, !!source.url)
    updateNode(targetId, node => {
      node.type = 'video'
      node.prompt = source.prompt
      node.sourcePrompt = source.prompt || source.sourcePrompt || ''
      node.inputRefs = inputRefs
      node.generation = {
        ...(source.generation || defaultGenerationForType('video')),
        operation: 'video',
        status: 'running',
        error: '',
      }
    })
    setStatusLine(`Generating video with ${shortModelName(source.generation?.model)}...`)
    setActiveJobs(count => count + 1)
    try {
      const payload = await callCanvasVideoApi(source)
      updateNode(targetId, node => {
        node.type = 'video'
        node.url = cacheBustUrl(payload.url)
        node.localPath = payload.localPath
        node.fileName = payload.url?.split('/').pop() || 'canvas-video.mp4'
        node.note = payload.cliPrompt || node.note
        node.generation = { ...(node.generation || defaultGenerationForType('video')), status: 'done', error: '', lastRunAt: new Date().toISOString() }
      })
      setSelectedNodeId(targetId)
      setStatusLine('Video generation complete')
    } catch (error) {
      updateNode(targetId, node => {
        node.generation = { ...(node.generation || defaultGenerationForType('video')), status: 'error', error: error instanceof Error ? error.message : String(error) }
      })
      setStatusLine(error instanceof Error ? error.message : 'Video generation failed')
    } finally {
      setActiveJobs(count => Math.max(0, count - 1))
    }
  }

  /** Orchestrates image generation/enhancement and keeps variation/master edges in the graph. */
  const runImageGeneration = async (nodeId: string, asVariation = false, forceEnhance = false) => {
    const source = activeSpace.nodes.find(node => node.id === nodeId)
    if (!source) return
    const hasRefs = getReferenceUrls(source.id, !!source.url).length > 0
    if (!(source.prompt || source.note || source.url || hasRefs)) {
      updateNode(source.id, node => {
        node.generation = { ...(node.generation || defaultGeneration()), status: 'error', error: 'Add a prompt or image before running.' }
      })
      setStatusLine('Missing prompt or source image')
      return
    }
    const fillSelected = !source.url && (source.type === 'placeholder' || source.type === 'image' || source.type === 'video')
    const generationType: 'generate' | 'enhance' = forceEnhance && source.type === 'image' && !!source.url && !asVariation ? 'enhance' : 'generate'
    const inputRefs = snapshotInputRefs(source.id, generationType === 'generate' && !!source.url && !asVariation)
    const targetId = fillSelected
      ? source.id
      : addNode({
          type: 'image',
          title: asVariation ? `Variant from ${source.title}` : `Generated from ${source.title}`,
          prompt: source.prompt,
          sourcePrompt: source.prompt || source.sourcePrompt || '',
          generation: { ...(source.generation || defaultGeneration()), status: 'queued' },
        }, source.x + source.width + 140, source.y + (asVariation ? 52 : 0))

    if (source.id !== targetId) {
      addEdge(source.id, targetId, asVariation ? 'variation' : 'derivative', asVariation ? 'variant' : 'generated')
      if (!asVariation) {
        activeSpace.edges
          .filter(edge => edge.to === source.id && edge.type === 'reference')
          .forEach(edge => addEdge(edge.from, targetId, 'reference', 'ref'))
      }
    }

    updateNode(targetId, node => {
      node.sourcePrompt = source.prompt || source.sourcePrompt || node.sourcePrompt || ''
      node.inputRefs = inputRefs
      node.generation = { ...(node.generation || defaultGeneration()), status: 'running', error: '', operation: generationType }
    })
    setStatusLine(`${generationType === 'enhance' ? 'Enhancing' : 'Generating'} with ${shortModelName(source.generation?.model)}...`)
    setActiveJobs(count => count + 1)
    try {
      const payload = await callCanvasImageApi(source, generationType, !!source.url && !asVariation)
      fillNodeWithImage(targetId, payload, asVariation ? `${source.title} variant` : payload.url.split('/').pop())
      setSelectedNodeId(targetId)
      setStatusLine('Generation complete')
    } catch (error) {
      updateNode(targetId, node => {
        node.generation = { ...(node.generation || defaultGeneration()), status: 'error', error: error instanceof Error ? error.message : String(error) }
      })
      setStatusLine(error instanceof Error ? error.message : 'Generation failed')
    } finally {
      setActiveJobs(count => Math.max(0, count - 1))
    }
  }

  /** Runs two sequential image variations from the same source node. */
  const runTwoVariants = async (nodeId: string) => {
    await runImageGeneration(nodeId, true)
    await runImageGeneration(nodeId, true)
  }

  /** Creates an empty pink variation node with inherited prompt/settings but without running generation yet. */
  const createVariationNode = (nodeId: string) => {
    const source = activeSpace.nodes.find(node => node.id === nodeId)
    if (!source) return
    const variantIndex = activeSpace.edges.filter(edge => edge.from === nodeId && edge.type === 'variation').length + 1
    const type: CanvasMediaType = source.type === 'video' ? 'video' : 'image'
    const size = nodeSize(type)
    const newId = addNode({
      type,
      title: `${source.title} var ${variantIndex}`,
      width: size.width,
      height: size.height,
      prompt: source.prompt || source.sourcePrompt || '',
      sourcePrompt: source.sourcePrompt || source.prompt || '',
      generation: { ...(source.generation || defaultGenerationForType(type)), operation: type === 'video' ? 'video' : 'generate', status: 'idle' },
    }, source.x + source.width + 150, source.y + (variantIndex - 1) * 62)
    addEdge(source.id, newId, 'variation', `var ${variantIndex}`)
    setSelectedNodeId(newId)
    setStatusLine(`Variation node ${variantIndex} created; prompt and inherited references are ready`)
    return newId
  }

  /** Converts an existing node into a variation sibling of another node. */
  const addExistingAlternative = (sourceId: string, alternativeId: string) => {
    if (sourceId === alternativeId) return
    const source = activeSpace.nodes.find(node => node.id === sourceId)
    const alternative = activeSpace.nodes.find(node => node.id === alternativeId)
    if (!source || !alternative) return
    updateActiveSpace(space => {
      const sourceNode = space.nodes.find(node => node.id === sourceId)
      const altNode = space.nodes.find(node => node.id === alternativeId)
      if (!sourceNode || !altNode) return
      const existing = space.edges.find(edge => edge.from === sourceId && edge.to === alternativeId)
      const variantIndex = space.edges.filter(edge => edge.from === sourceId && edge.type === 'variation').length + (existing?.type === 'variation' ? 0 : 1)
      if (existing) {
        existing.type = 'variation'
        existing.label = `var ${Math.max(1, variantIndex)}`
      } else {
        space.edges.push({
          id: makeId('edge'),
          from: sourceId,
          to: alternativeId,
          type: 'variation',
          label: `var ${Math.max(1, variantIndex)}`,
        })
      }
      if (!altNode.prompt) {
        altNode.prompt = sourceNode.prompt || sourceNode.sourcePrompt || ''
        altNode.sourcePrompt = sourceNode.sourcePrompt || sourceNode.prompt || ''
      }
    })
    setAlternativeMenuNodeId(null)
    setSelectedNodeId(alternativeId)
    setStatusLine(`${alternative.title} is now a pink variation of ${source.title}`)
  }

  /** Promotes one variation to the master flow and demotes the former master to a variation. */
  const makeMasterShot = (nodeId: string) => {
    const node = activeSpace.nodes.find(item => item.id === nodeId)
    const incomingVariation = activeSpace.edges.find(edge => edge.to === nodeId && edge.type === 'variation')
    if (!node || !incomingVariation) {
      setStatusLine('Select a variation node to make it the master')
      return
    }
    updateActiveSpace(space => {
      const siblingEdges = space.edges.filter(edge => edge.from === incomingVariation.from)
      siblingEdges.forEach(edge => {
        if (edge.to === nodeId) {
          edge.type = node.type === 'video' ? 'animation' : 'derivative'
          edge.label = 'master'
          return
        }
        if ((edge.type === 'derivative' || edge.type === 'animation') && edge.to !== nodeId) {
          edge.type = 'variation'
          edge.label = edge.label?.toLowerCase().startsWith('var') ? edge.label : `var ${siblingEdges.filter(item => item.type === 'variation').length + 1}`
        }
      })
    })
    setStatusLine(`${node.title} is now the master flow`)
  }

  /** Adds/removes visual master or alternative marker badges without changing graph semantics. */
  const setNodeMarker = (nodeId: string, marker: CanvasNode['marker']) => {
    updateNode(nodeId, node => {
      node.marker = node.marker === marker ? undefined : marker
    })
    setStatusLine(marker === 'master' ? 'Master frame marker toggled' : 'Alternative frame marker toggled')
  }

  /** Adds a hand-placed bend point to an edge for doodle-style routing. */
  const addEdgePoint = (edgeId: string, x: number, y: number) => {
    updateActiveSpace(space => {
      const edge = space.edges.find(item => item.id === edgeId)
      if (!edge) return
      edge.points = [...(edge.points || []), { x, y }]
    })
    setStatusLine('Doodle shaping point added')
  }

  /** Swaps media/prompt payloads between two nodes while leaving graph connections untouched. */
  const swapNodeMedia = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    updateActiveSpace(space => {
      const source = space.nodes.find(node => node.id === sourceId)
      const target = space.nodes.find(node => node.id === targetId)
      if (!source || !target) return
      const sourcePayload = {
        type: source.type,
        title: source.title,
        url: source.url,
        localPath: source.localPath,
        mimeType: source.mimeType,
        fileName: source.fileName,
        prompt: source.prompt,
        sourcePrompt: source.sourcePrompt,
        note: source.note,
        generation: structuredClone(source.generation),
      }
      source.type = target.type
      source.title = target.title
      source.url = target.url
      source.localPath = target.localPath
      source.mimeType = target.mimeType
      source.fileName = target.fileName
      source.prompt = target.prompt
      source.sourcePrompt = target.sourcePrompt
      source.note = target.note
      source.generation = structuredClone(target.generation)
      target.type = sourcePayload.type
      target.title = sourcePayload.title
      target.url = sourcePayload.url
      target.localPath = sourcePayload.localPath
      target.mimeType = sourcePayload.mimeType
      target.fileName = sourcePayload.fileName
      target.prompt = sourcePayload.prompt
      target.sourcePrompt = sourcePayload.sourcePrompt
      target.note = sourcePayload.note
      target.generation = sourcePayload.generation
    })
    setSelectedNodeId(targetId)
    setStatusLine('Node media swapped; connections stayed in place')
  }

  /** Removes a single connection, used by scissors tool and edge controls. */
  const deleteEdge = (edgeId: string) => {
    updateActiveSpace(space => {
      space.edges = space.edges.filter(edge => edge.id !== edgeId)
    })
    setStatusLine('Connection removed')
  }

  /** Splits an existing edge by inserting a new empty node between its source and target. */
  const insertPlaceholderOnEdge = (edgeId: string, type: CanvasMediaType = 'placeholder') => {
    const edge = activeSpace.edges.find(item => item.id === edgeId)
    if (!edge) return
    const from = edge.fromGroup ? null : activeSpace.nodes.find(node => node.id === edge.from)
    const fromGroup = edge.fromGroup ? activeSpace.groups.find(group => group.id === edge.from) : null
    const to = activeSpace.nodes.find(node => node.id === edge.to)
    if ((!from && !fromGroup) || !to) return
    const a = fromGroup ? { x: fromGroup.x + fromGroup.width, y: fromGroup.y + fromGroup.height / 2 } : centerOf(from!)
    const b = centerOf(to)
    const size = nodeSize(type)
    const newId = addNode({ type, title: type === 'placeholder' ? 'Between node' : `New ${type}` }, (a.x + b.x) / 2 - size.width / 2, (a.y + b.y) / 2 - size.height / 2)
    updateActiveSpace(space => {
      const original = space.edges.find(item => item.id === edgeId)
      if (!original) return
      space.edges = space.edges.filter(item => item.id !== edgeId)
      space.edges.push({ id: makeId('edge'), from: original.from, to: newId, type: original.type, label: original.label, fromGroup: original.fromGroup })
      space.edges.push({ id: makeId('edge'), from: newId, to: original.to, type: original.type, label: original.label })
    })
  }

  /** Splits an edge by uploading a dropped file and placing the new media node between endpoints. */
  const insertFileOnEdge = async (edgeId: string, file: File) => {
    const edge = activeSpace.edges.find(item => item.id === edgeId)
    if (!edge) return
    const from = edge.fromGroup ? null : activeSpace.nodes.find(node => node.id === edge.from)
    const fromGroup = edge.fromGroup ? activeSpace.groups.find(group => group.id === edge.from) : null
    const to = activeSpace.nodes.find(node => node.id === edge.to)
    if ((!from && !fromGroup) || !to) return
    const a = fromGroup ? { x: fromGroup.x + fromGroup.width, y: fromGroup.y + fromGroup.height / 2 } : centerOf(from!)
    const b = centerOf(to)
    const newId = await uploadFile(file, (a.x + b.x) / 2, (a.y + b.y) / 2)
    updateActiveSpace(space => {
      const original = space.edges.find(item => item.id === edgeId)
      if (!original) return
      space.edges = space.edges.filter(item => item.id !== edgeId)
      space.edges.push({ id: makeId('edge'), from: original.from, to: newId, type: original.type, label: original.label, fromGroup: original.fromGroup })
      space.edges.push({ id: makeId('edge'), from: newId, to: original.to, type: original.type, label: original.label })
    })
  }

  /** Rehomes an existing node into the middle of an edge and rewires the original connection. */
  const insertExistingNodeOnEdge = (edgeId: string, nodeId: string) => {
    const edge = activeSpace.edges.find(item => item.id === edgeId)
    if (!edge || edge.from === nodeId || edge.to === nodeId) return
    const from = edge.fromGroup ? null : activeSpace.nodes.find(node => node.id === edge.from)
    const fromGroup = edge.fromGroup ? activeSpace.groups.find(group => group.id === edge.from) : null
    const to = activeSpace.nodes.find(node => node.id === edge.to)
    const inserted = activeSpace.nodes.find(node => node.id === nodeId)
    if ((!from && !fromGroup) || !to || !inserted) return
    const a = fromGroup ? { x: fromGroup.x + fromGroup.width, y: fromGroup.y + fromGroup.height / 2 } : centerOf(from!)
    const b = centerOf(to)
    updateActiveSpace(space => {
      const original = space.edges.find(item => item.id === edgeId)
      const node = space.nodes.find(item => item.id === nodeId)
      if (!original || !node) return
      node.x = (a.x + b.x) / 2 - node.width / 2
      node.y = (a.y + b.y) / 2 - node.height / 2
      space.edges = space.edges.filter(item => item.id !== edgeId)
      space.edges.push({ id: makeId('edge'), from: original.from, to: nodeId, type: original.type, label: original.label, fromGroup: original.fromGroup })
      space.edges.push({ id: makeId('edge'), from: nodeId, to: original.to, type: original.type, label: original.label })
    })
    setSelectedNodeId(nodeId)
    setStatusLine('Node inserted between connection')
  }

  /** Sends a 2x2 grid image to the split API and creates four linked panel nodes. */
  const splitGridNode = async (nodeId: string) => {
    const source = activeSpace.nodes.find(node => node.id === nodeId)
    if (!source?.url) return
    updateNode(nodeId, node => {
      node.generation = { ...(node.generation || defaultGeneration()), status: 'running', operation: 'split', error: '' }
    })
    setStatusLine('Splitting grid...')
    setActiveJobs(count => count + 1)
    try {
      const response = await fetch('/api/skills/split-grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath: source.url, splitType: '2x2' }),
      })
      const payload = await response.json()
      if (!response.ok || payload.error) throw new Error(payload.error || 'Split failed')
      const panels = payload.panels || []
      panels.forEach((panel: any, index: number) => {
        const col = index % 2
        const row = Math.floor(index / 2)
        const id = addNode({
          type: 'image',
          title: `Panel ${row + 1}.${col + 1}`,
          url: panel.url,
          localPath: panel.localPath,
          fileName: panel.url?.split('/').pop(),
          prompt: source.prompt,
          sourcePrompt: source.sourcePrompt || source.prompt || '',
          generation: { ...(source.generation || defaultGeneration()), status: 'done', operation: 'split' },
        }, source.x + source.width + 120 + col * 300, source.y + row * 240)
        addEdge(source.id, id, 'frame', `P${index + 1}`)
      })
      updateNode(nodeId, node => {
        node.generation = { ...(node.generation || defaultGeneration()), status: 'done', operation: 'split', error: '', lastRunAt: new Date().toISOString() }
      })
      setStatusLine(`Split into ${panels.length} panels`)
    } catch (error) {
      updateNode(nodeId, node => {
        node.generation = { ...(node.generation || defaultGeneration()), status: 'error', error: error instanceof Error ? error.message : String(error) }
      })
      setStatusLine(error instanceof Error ? error.message : 'Split failed')
    } finally {
      setActiveJobs(count => Math.max(0, count - 1))
    }
  }

  /** Uses Theo/Gemini prompt refinement on the selected node while preserving connected reference context. */
  const improveSelectedPrompt = async () => {
    if (!selectedNode || !(selectedNode.prompt || '').trim()) return
    setNoteAiEnhancing(true)
    setStatusLine('Improving prompt...')
    try {
      const refs = selectedRefNodes.map((node, index) => `@img${index + 1} = ${node.title}`).join('\n')
      const result = await refinePrompt(
        selectedNode.prompt,
        `Improve this as a cinematic AI image generation prompt. Keep it standalone, detailed, and production-ready. Connected references:\n${refs}\nOutput ONLY the improved prompt text.`
      )
      if (result.text) {
        const cleaned = result.text.replace(/^(Here'?s?|OK|Sure|I'?ll|Let me|Now I|The refined|The enhanced|Here is|Certainly|Of course)[^\n]*\n+/i, '').trim()
        updateNode(selectedNode.id, node => { node.prompt = cleaned })
        setStatusLine('Prompt improved')
      } else if (result.error) {
        setStatusLine(result.error)
      }
    } catch (error) {
      setStatusLine(error instanceof Error ? error.message : 'Prompt improve failed')
    } finally {
      setNoteAiEnhancing(false)
    }
  }

  /** Selects a node and focuses the prompt/note composer for immediate editing. */
  const focusSelectedNote = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>('.canvas-note-composer textarea')?.focus()
    }, 0)
  }

  /** Restores a generated node's saved source prompt from itself or its parent edge. */
  const injectSourcePrompt = (nodeId: string) => {
    const node = activeSpace.nodes.find(item => item.id === nodeId)
    const parentEdge = activeSpace.edges.find(edge => edge.to === nodeId && (edge.type === 'derivative' || edge.type === 'variation' || edge.type === 'animation'))
    const parent = parentEdge ? activeSpace.nodes.find(item => item.id === parentEdge.from) : null
    const prompt = node?.sourcePrompt || node?.prompt || parent?.sourcePrompt || parent?.prompt || ''
    if (!prompt) {
      setStatusLine('No saved source prompt for this node yet')
      return
    }
    updateNode(nodeId, draft => { draft.prompt = prompt })
    setStatusLine('Source prompt injected')
  }

  /** Adds a new independent canvas space and switches the UI to it. */
  const addSpace = () => {
    setData(current => {
      const next = structuredClone(current)
      const space = createSpace(next.spaces.length + 1)
      next.spaces.push(space)
      next.activeSpaceId = space.id
      return next
    })
  }

  /** Creates a group box around every node fully enclosed by the marquee rectangle. */
  const createGroupFromMarquee = (selection: { x: number; y: number; width: number; height: number }) => {
    const nodeIds = canvasNodes
      .filter(node => node.x >= selection.x && node.y >= selection.y && node.x + node.width <= selection.x + selection.width && node.y + node.height <= selection.y + selection.height)
      .map(node => node.id)
    if (nodeIds.length < 2) {
      setStatusLine('Drag around at least two nodes to make a group')
      return
    }
    const pad = 26
    updateActiveSpace(space => {
      space.groups.push({
        id: makeId('group'),
        name: `Group ${space.groups.length + 1}`,
        nodeIds,
        x: selection.x - pad,
        y: selection.y - pad,
        width: selection.width + pad * 2,
        height: selection.height + pad * 2,
        strokeColor: '#f8d978',
        fillColor: 'rgba(248, 217, 120, 0.12)',
      })
    })
    setMultiSelection(null)
    setStatusLine(`${nodeIds.length} nodes grouped`)
  }

  /** Converts the current multi-selection overlay into a persistent group. */
  const createGroupFromSelection = () => {
    if (!multiSelection) return
    createGroupFromMarquee(multiSelection)
  }

  /** Deletes all nodes in the current multi-selection and cleans related graph references. */
  const deleteSelectedNodes = () => {
    if (!multiSelection) return
    updateActiveSpace(space => {
      const ids = new Set(multiSelection.nodeIds)
      space.nodes = space.nodes.filter(node => !ids.has(node.id))
      space.edges = space.edges.filter(edge => !ids.has(edge.from) && !ids.has(edge.to))
      space.groups.forEach(group => { group.nodeIds = group.nodeIds.filter(id => !ids.has(id)) })
      space.trays.forEach(tray => { tray.nodeIds = tray.nodeIds.filter(id => !ids.has(id)) })
    })
    setMultiSelection(null)
    setStatusLine('Selected nodes deleted')
  }

  /** Cuts every edge touching any node in the current multi-selection. */
  const disconnectSelectedNodes = () => {
    if (!multiSelection) return
    updateActiveSpace(space => {
      const ids = new Set(multiSelection.nodeIds)
      space.edges = space.edges.filter(edge => !ids.has(edge.from) && !ids.has(edge.to))
    })
    setStatusLine('Selected nodes disconnected')
  }

  /** Cuts only the edges that run between two selected nodes. */
  const cutInternalSelectedEdges = () => {
    if (!multiSelection) return
    updateActiveSpace(space => {
      const ids = new Set(multiSelection.nodeIds)
      space.edges = space.edges.filter(edge => !(ids.has(edge.from) && ids.has(edge.to)))
    })
    setStatusLine('Internal selected links cut')
  }

  /** Starts browser downloads for every selected node that has media. */
  const downloadSelectedNodes = () => {
    if (!multiSelection) return
    multiSelection.nodeIds
      .map(id => activeSpace.nodes.find(node => node.id === id))
      .filter(node => node?.url)
      .forEach(node => {
        const anchor = document.createElement('a')
        anchor.href = node!.url!
        anchor.download = node!.fileName || node!.title || 'canvas-media'
        anchor.target = '_blank'
        anchor.click()
      })
    setStatusLine('Selected downloads started')
  }

  /** Removes a group shell and any group-originating edges without deleting its member nodes. */
  const deleteGroup = (groupId: string) => {
    updateActiveSpace(space => {
      space.groups = space.groups.filter(group => group.id !== groupId)
      space.edges = space.edges.filter(edge => !(edge.fromGroup && edge.from === groupId))
    })
    if (selectedGroupId === groupId) setSelectedGroupId(null)
  }

  /** Updates a group's stroke and translucent fill from the color swatch menu. */
  const setGroupColor = (groupId: string, color: string) => {
    updateActiveSpace(space => {
      const group = space.groups.find(item => item.id === groupId)
      if (!group) return
      group.strokeColor = color
      group.fillColor = `${color}26`
    })
  }

  /** Returns media URLs from all nodes inside a group for group-based reference actions. */
  const groupReferenceUrls = (groupId: string) => {
    const group = activeSpace.groups.find(item => item.id === groupId)
    if (!group) return []
    return group.nodeIds
      .map(nodeId => activeSpace.nodes.find(node => node.id === nodeId)?.url)
      .filter(Boolean) as string[]
  }

  const canvasNodes = activeSpace.nodes.filter(node => !node.pinnedOnly)
  const nodeById = useMemo(() => new Map(activeSpace.nodes.map(node => [node.id, node])), [activeSpace.nodes])
  const expandedTray = expandedTrayId ? activeSpace.trays.find(tray => tray.id === expandedTrayId) : null
  const selectedIsVideo = selectedGeneration.operation === 'video' || (selectedNode?.type === 'video' && selectedGeneration.operation !== 'generate')
  const selectedOutputType: CanvasMediaType = selectedIsVideo ? 'video' : selectedNode?.type || 'placeholder'
  const selectedVideoModel = videoModels.find(model => model.id === selectedGeneration.model) || videoModels[0]
  /** Computes user-facing edge labels, including numbered refs based on each target node. */
  const edgeLabelForDisplay = (edgeId: string) => {
    const edge = activeSpace.edges.find(item => item.id === edgeId)
    if (!edge) return ''
    if (edge.type === 'reference' && (!edge.label || edge.label === 'ref')) {
      const refs = activeSpace.edges.filter(item => item.to === edge.to && item.type === 'reference')
      return `ref ${refs.findIndex(item => item.id === edge.id) + 1}`
    }
    return edge.label || ''
  }

  /** Closes composer popovers so attachment/settings/skills menus do not overlap. */
  const closeNotePopovers = () => {
    setNoteAttachOpen(false)
    setNoteSettingsOpen(false)
    setNoteSkillsOpen(false)
  }

  /** Pins a node into a tray, duplicating it as pinned-only when it came from the canvas. */
  const addNodeToTray = (trayId: string, nodeId: string) => {
    let pinnedId = nodeId
    const source = activeSpace.nodes.find(node => node.id === nodeId)
    if (source && !source.pinnedOnly) {
      pinnedId = makeId('pinned')
      updateActiveSpace(space => {
        const freshSource = space.nodes.find(node => node.id === nodeId)
        const tray = space.trays.find(item => item.id === trayId)
        if (!freshSource || !tray) return
        space.nodes.push({
          ...structuredClone(freshSource),
          id: pinnedId,
          title: freshSource.title,
          pinnedOnly: true,
          x: freshSource.x,
          y: freshSource.y,
        })
        if (!tray.nodeIds.includes(pinnedId)) tray.nodeIds.push(pinnedId)
      })
      setStatusLine('Reference duplicated into pinned tray')
      return
    }
    updateActiveSpace(space => {
      const tray = space.trays.find(item => item.id === trayId)
      if (tray && !tray.nodeIds.includes(pinnedId)) tray.nodeIds.push(pinnedId)
    })
    setStatusLine('Reference stored in tray')
  }

  /** Places a pinned tray reference back onto the canvas as an editable normal node. */
  const duplicateTrayNodeToCanvas = (nodeId: string, x?: number, y?: number) => {
    const source = activeSpace.nodes.find(node => node.id === nodeId)
    if (!source) return
    return addNode({
      ...source,
      id: undefined,
      title: source.title,
      pinnedOnly: false,
      generation: source.generation || defaultGenerationForType(source.type),
    }, x ?? screenToWorld(window.innerWidth / 2, window.innerHeight / 2).x, y ?? screenToWorld(window.innerWidth / 2, window.innerHeight / 2).y)
  }

  /** Opens the hidden file input that replaces media inside a specific node. */
  const openNodeUpload = (nodeId: string) => {
    setNodeUploadTargetId(nodeId)
    nodeFileRef.current?.click()
  }

  /** Opens the hidden file input that adds media directly into a pinned tray. */
  const openTrayUpload = (trayId: string) => {
    setTrayUploadTargetId(trayId)
    trayFileRef.current?.click()
  }

  /** Tracks which video nodes are currently playing for button state and progress updates. */
  const setVideoPlaying = (nodeId: string, isPlaying: boolean) => {
    setPlayingVideoIds(current => {
      const next = new Set(current)
      if (isPlaying) next.add(nodeId)
      else next.delete(nodeId)
      return next
    })
  }

  /** Plays or pauses a video node without selecting/dragging the node underneath. */
  const toggleNodeVideo = async (event: MouseEvent<HTMLButtonElement>, nodeId: string) => {
    event.preventDefault()
    event.stopPropagation()
    const video = stageRef.current?.querySelector<HTMLVideoElement>(`video[data-node-video-id="${nodeId}"]`)
    if (!video) {
      setStatusLine('Video player is not ready yet')
      return
    }
    try {
      if (video.paused) {
        await video.play()
        setVideoPlaying(nodeId, true)
      } else {
        video.pause()
        setVideoPlaying(nodeId, false)
      }
    } catch (error) {
      setStatusLine(error instanceof Error ? error.message : 'Video playback failed')
    }
  }

  /** Toggles mute state for one video node and stores the result in UI state. */
  const toggleNodeVideoMute = (event: MouseEvent<HTMLButtonElement>, nodeId: string) => {
    event.preventDefault()
    event.stopPropagation()
    const video = stageRef.current?.querySelector<HTMLVideoElement>(`video[data-node-video-id="${nodeId}"]`)
    if (!video) return
    video.muted = !video.muted
    if (!video.muted && video.volume < 0.15) video.volume = 0.75
    setUnmutedVideoIds(current => {
      const next = new Set(current)
      if (video.muted) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  /** Samples current video playback time and duration for trim controls and badges. */
  const updateVideoProgress = (nodeId: string) => {
    const video = stageRef.current?.querySelector<HTMLVideoElement>(`video[data-node-video-id="${nodeId}"]`)
    if (!video) return
    setVideoProgress(current => ({
      ...current,
      [nodeId]: { current: video.currentTime || 0, duration: video.duration || 0 },
    }))
  }

  /** Updates start/end trim points while keeping them inside the loaded video duration. */
  const setVideoCrop = (nodeId: string, key: 'start' | 'end', value: number) => {
    const duration = videoProgress[nodeId]?.duration || 0
    updateNode(nodeId, node => {
      const current = node.videoCrop || { start: 0, end: duration || 0 }
      const next = { ...current, [key]: value }
      if (duration) {
        next.start = Math.max(0, Math.min(next.start, Math.max(0, duration - 0.1)))
        next.end = Math.max(next.start + 0.1, Math.min(next.end || duration, duration))
      }
      node.videoCrop = next
    })
  }

  /** Clears video trim metadata and returns extraction to the full clip. */
  const resetVideoCrop = (nodeId: string) => {
    updateNode(nodeId, node => {
      delete node.videoCrop
    })
    setStatusLine('Video trim reset')
  }

  /** Captures the current/trimmed video frame, uploads it, and links it as a frame image node. */
  const extractFrameFromVideo = async (nodeId: string) => {
    const source = activeSpace.nodes.find(node => node.id === nodeId)
    const video = stageRef.current?.querySelector<HTMLVideoElement>(`video[data-node-video-id="${nodeId}"]`)
    if (!source?.url || !video) {
      setStatusLine('Video frame is not ready yet')
      return
    }
    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720
    if (!width || !height) {
      setStatusLine('Play or load the video once before extracting a frame')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    try {
      const crop = source.videoCrop
      if (crop && Number.isFinite(crop.start) && Number.isFinite(crop.end)) {
        const clampedTime = Math.min(crop.end, Math.max(crop.start, video.currentTime || crop.start))
        if (Math.abs((video.currentTime || 0) - clampedTime) > 0.04) {
          await new Promise<void>(resolve => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked)
              resolve()
            }
            video.addEventListener('seeked', onSeeked)
            video.currentTime = clampedTime
          })
        }
      }
      ctx.drawImage(video, 0, 0, width, height)
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Could not capture frame')
      const frameTime = Number.isFinite(video.currentTime) ? video.currentTime : 0
      const frameLabel = formatSeconds(frameTime)
      const frameSeconds = Math.round(frameTime).toString().padStart(2, '0')
      const file = new File([blob], `${source.title.replace(/\W+/g, '-').slice(0, 42) || 'video'}-frame-${frameSeconds}s.png`, { type: 'image/png' })
      const previewUrl = URL.createObjectURL(file)
      const formData = new FormData()
      formData.append('file', file)
      let uploaded: { url?: string; localPath?: string; mimeType?: string; fileName?: string } = {}
      try {
        const response = await fetch('/api/storyboard/upload', { method: 'POST', body: formData })
        uploaded = await response.json()
      } catch {
        uploaded = { fileName: file.name, mimeType: file.type }
      }
      const frameId = addNode({
        type: 'image',
        title: `${source.title} frame ${frameLabel}`,
        url: previewUrl,
        localPath: uploaded.localPath,
        mimeType: uploaded.mimeType || file.type,
        fileName: uploaded.fileName || file.name,
        frameTime,
        prompt: source.prompt,
        sourcePrompt: source.sourcePrompt || source.prompt || '',
        generation: { ...defaultGeneration(), operation: 'generate', status: 'done' },
      }, source.x + source.width + 120, source.y + 18)
      if (uploaded.url) {
        window.setTimeout(() => {
          updateNode(frameId, node => {
            if (node.url === previewUrl) node.url = cacheBustUrl(uploaded.url)
          })
        }, 900)
      }
      addEdge(source.id, frameId, 'frame', 'frame')
      setStatusLine('Current video frame extracted')
    } catch (error) {
      setStatusLine(error instanceof Error ? error.message : 'Frame extraction failed')
    }
  }

  /** Loads available skills/prompts from the shared Skills Store API for the Canvas Theo panel. */
  const loadCanvasStoreItems = async () => {
    try {
      const response = await fetch('/api/skills/list')
      const payload = await response.json()
      setCanvasStoreItems(Array.isArray(payload.skills) ? payload.skills : [])
    } catch {
      setStatusLine('Skills store unavailable')
    }
  }

  /** Opens the full Skills or Prompts picker/editor modal and refreshes its backing store. */
  const openCanvasStore = async (kind: CanvasStoreKind) => {
    setCanvasStoreOpen(kind)
    setCanvasStorePage(0)
    setCanvasStoreEditingId(null)
    setCanvasStoreDraftTitle('')
    setCanvasStoreDraftText('')
    await loadCanvasStoreItems()
  }

  /** Pins or unpins one skill/prompt so Theo receives it in future Canvas branch messages. */
  const toggleCanvasStoreItem = (kind: CanvasStoreKind, item: CanvasStoreItem) => {
    const setter = kind === 'skills' ? setSelectedCanvasSkillIds : setSelectedCanvasPromptIds
    setter(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])
  }

  /** Starts a blank custom skill/prompt draft in the store modal. */
  const startCanvasStoreCreate = () => {
    setCanvasStoreEditingId('__new__')
    setCanvasStoreDraftTitle('')
    setCanvasStoreDraftText('')
  }

  /** Loads a skill/prompt body into the store modal editor, including markdown-backed skills. */
  const startCanvasStoreEdit = async (item: CanvasStoreItem) => {
    setCanvasStoreEditingId(item.id)
    setCanvasStoreDraftTitle(item.name)
    if (item.id.startsWith('bp-')) {
      setCanvasStoreDraftText(storeItemText(item))
      return
    }
    try {
      const response = await fetch('/api/skills/read-md', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      const payload = await response.json()
      setCanvasStoreDraftText(payload.content || storeItemText(item))
    } catch {
      setCanvasStoreDraftText(storeItemText(item))
    }
  }

  /** Saves a custom skill/prompt via the shared Skills Store API and pins it to Canvas Theo. */
  const saveCanvasStoreDraft = async () => {
    const kind = canvasStoreOpen || 'skills'
    const title = canvasStoreDraftTitle.trim()
    const text = canvasStoreDraftText.trim()
    if (!title || !text) return
    const source = [...canvasStoreItems, ...canvasBuiltinPrompts].find(item => item.id === canvasStoreEditingId)
    const canOverwrite = source && !source.id.startsWith('bp-')
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40)
    const saved: CanvasStoreItem = {
      ...(canOverwrite ? source : {}),
      id: canOverwrite ? source.id : `${kind === 'prompts' ? 'prompt' : 'skill'}-${slug || 'custom'}-${Date.now()}`,
      name: title,
      description: text.substring(0, 200),
      fullText: text,
      text: kind === 'prompts' ? text : undefined,
      iconIdx: source?.iconIdx ?? Math.floor(Math.random() * canvasStoreIcons.length),
    }
    const response = await fetch('/api/skills/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saved),
    })
    if (!response.ok) {
      setStatusLine('Save failed')
      return
    }
    setCanvasStoreItems(current => {
      const without = current.filter(item => item.id !== saved.id)
      return [...without, saved]
    })
    if (kind === 'skills') setSelectedCanvasSkillIds(current => Array.from(new Set([...current.filter(id => id !== canvasStoreEditingId), saved.id])))
    if (kind === 'prompts') setSelectedCanvasPromptIds(current => Array.from(new Set([...current.filter(id => id !== canvasStoreEditingId), saved.id])))
    setCanvasStoreEditingId(null)
    setCanvasStoreDraftTitle('')
    setCanvasStoreDraftText('')
    setStatusLine(`${kind === 'skills' ? 'Skill' : 'Prompt'} saved`)
  }

  /** Reads full text for a selected skill/prompt before adding it to Theo's message context. */
  const readCanvasStoreItem = async (item: CanvasStoreItem) => {
    if (item.id.startsWith('bp-')) return storeItemText(item)
    try {
      const response = await fetch('/api/skills/read-md', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      const payload = await response.json()
      return payload.content || storeItemText(item)
    } catch {
      return storeItemText(item)
    }
  }

  /** Turns a Theo branch answer into a new editable skill/prompt draft. */
  const useTheoHelperAsStoreDraft = (kind: CanvasStoreKind, text: string) => {
    setCanvasStoreOpen(kind)
    setCanvasStoreEditingId('__new__')
    setCanvasStoreDraftTitle(kind === 'skills' ? 'Theo Skill Draft' : 'Theo Prompt Draft')
    setCanvasStoreDraftText(text)
  }

  /** Starts browser speech recognition and appends the transcript into Theo's compose box. */
  const startAgentDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setStatusLine('Microphone dictation is not available in this browser')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript
      if (transcript) setAgentDraft(current => `${current}${current ? ' ' : ''}${transcript}`)
    }
    recognition.onerror = () => setStatusLine('Microphone dictation failed')
    recognition.start()
    setStatusLine('Listening...')
  }

  /** Sends a Canvas-aware Theo message, preserving branch history while including images, memory, skills, and prompts. */
  const sendAgentMessage = async () => {
    const text = agentDraft.trim()
    if (!text || agentLoading) return
    const branchKind: CanvasStoreKind | null = agentTab === 'skills' || agentTab === 'prompts' ? agentTab : null
    const branchMessages = branchKind ? canvasStoreHelperMessages[branchKind] : agentMessages
    const agentContextNodes = selectedGroup
      ? selectedGroup.nodeIds.map(nodeId => activeSpace.nodes.find(node => node.id === nodeId)).filter(Boolean) as CanvasNode[]
      : selectedNode
        ? getInputNodes(selectedNode.id, true)
        : []
    const agentImageUrls = [
      ...agentContextNodes.filter(node => node.type === 'image' && node.url).map(node => node.url as string),
      ...agentAttachments.filter(file => file.url && file.type.startsWith('image/')).map(file => file.url as string),
    ]
    const selectedStoreContext = await Promise.all([
      ...selectedCanvasSkills.map(async item => `Selected skill "${item.name}":\n${(await readCanvasStoreItem(item)).slice(0, 6000)}`),
      ...selectedCanvasPrompts.map(async item => `Selected prompt blueprint "${item.name}":\n${(await readCanvasStoreItem(item)).slice(0, 6000)}`),
    ])
    const branchInstruction = branchKind === 'skills'
      ? 'This is the Skills conversation branch. Help the user build or improve reusable skills. If a skill is selected, treat it as active context and ask/answer as if building on that skill.'
      : branchKind === 'prompts'
        ? 'This is the Prompts conversation branch. Help the user build or improve reusable prompt blueprints. If a prompt is selected, treat it as active context and ask/answer as if building on that prompt.'
        : ''
    const context = [
      branchInstruction,
      `Active canvas space: ${activeSpace.name}`,
      `Nodes: ${activeSpace.nodes.length}; connections: ${activeSpace.edges.length}; groups: ${activeSpace.groups.length}`,
      selectedNode ? `Selected node: ${selectedNode.title} (${selectedNode.type}); prompt: ${selectedNode.prompt || selectedNode.note || 'empty'}; connected inputs: ${agentContextNodes.map(node => `${node.title} (${node.type})`).join(', ') || 'none'}` : 'Selected node: none',
      selectedGroup ? `Selected group: ${selectedGroup.name}; nodes: ${selectedGroup.nodeIds.length}` : '',
      selectedStoreContext.length ? `Theo must reference and follow these selected Skills/Prompts:\n${selectedStoreContext.join('\n\n')}` : '',
      agentAttachments.length ? `Theo-only attachments:\n${agentAttachments.map(file => `- ${file.name} (${file.type})${file.text ? `:\n${file.text.slice(0, 5000)}` : ''}`).join('\n')}` : '',
    ].filter(Boolean).join('\n')
    const nextUser = { role: 'user' as const, text }
    if (branchKind) {
      setCanvasStoreHelperMessages(messages => ({ ...messages, [branchKind]: [...messages[branchKind], nextUser] }))
    } else {
      setAgentMessages(messages => [...messages, nextUser])
    }
    setAgentDraft('')
    setAgentLoading(true)
    try {
      const history = branchMessages.map(message => ({ role: message.role, parts: [{ text: message.text }] }))
      const systemInstruction = await buildAgentSystemInstruction(text)
      const userMessage = `${text}\n\nCanvas context:\n${context}`
      const result = await sendToGeminiWithImages(userMessage, agentImageUrls, history, systemInstruction)
      const nextModel = { role: 'model' as const, text: result.text || result.error || 'No response.' }
      if (branchKind) {
        setCanvasStoreHelperMessages(messages => ({ ...messages, [branchKind]: [...messages[branchKind], nextModel] }))
      } else {
        setAgentMessages(messages => [...messages, nextModel])
      }
      if (!result.error && result.text) rememberAgentExchange(userMessage, result.text)
      setStatusLine(result.error ? result.error : 'Gemini replied')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini failed'
      const nextModel = { role: 'model' as const, text: message }
      if (branchKind) {
        setCanvasStoreHelperMessages(messages => ({ ...messages, [branchKind]: [...messages[branchKind], nextModel] }))
      } else {
        setAgentMessages(messages => [...messages, nextModel])
      }
      setStatusLine(message)
    } finally {
      setAgentLoading(false)
    }
  }

  /** Renders a selectable skill/prompt card for compact side panel rows and full modal grids. */
  const renderCanvasStoreCard = (kind: CanvasStoreKind, item: CanvasStoreItem, index: number, compact = false) => {
    const selectedIds = kind === 'skills' ? selectedCanvasSkillIds : selectedCanvasPromptIds
    const isSelected = selectedIds.includes(item.id)
    const icon = iconForStoreItem(item, index)
    return (
      <button
        key={item.id}
        className={`canvas-store-card ${compact ? 'compact' : ''} ${isSelected ? 'is-selected' : ''}`}
        type="button"
        onClick={() => toggleCanvasStoreItem(kind, item)}
        style={{ '--store-accent': icon.color } as CSSProperties}
        title={item.name}
      >
        <span className="canvas-store-check">✓</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={icon.d} />
        </svg>
        <strong>{item.name}</strong>
        {!compact && <small>{item.description || storeItemText(item).slice(0, 120)}</small>}
      </button>
    )
  }

  /** Renders the Skills/Prompts branch inside Theo's panel with pinned cards and isolated messages. */
  const renderCanvasAgentStorePanel = (kind: CanvasStoreKind) => {
    const items = kind === 'skills' ? canvasSkillItems : canvasPromptItems
    const selectedItems = kind === 'skills' ? selectedCanvasSkills : selectedCanvasPrompts
    const selectedIds = new Set(selectedItems.map(item => item.id))
    const previewItems = [...selectedItems, ...items.filter(item => !selectedIds.has(item.id))].slice(0, 3)
    const branchMessages = canvasStoreHelperMessages[kind]
    return (
      <div className="canvas-agent-store-panel">
        <div className="canvas-agent-store-heading">
          <strong>{kind === 'skills' ? 'Pinned Skills' : 'Pinned Prompts'}</strong>
          <span>{selectedItems.length ? `${selectedItems.length} selected` : 'Theo will use selected cards'}</span>
        </div>
        <div className="canvas-agent-store-grid">
          {previewItems.map((item, index) => renderCanvasStoreCard(kind, item, index, true))}
          <button className="canvas-store-add-card" type="button" onClick={() => openCanvasStore(kind)}>
            <span>＋</span>
          </button>
        </div>
        <div className="canvas-store-helper">
          <div className="canvas-store-helper-head">
            <strong>{kind === 'skills' ? 'Skills Branch' : 'Prompts Branch'}</strong>
            <span>{selectedItems.length ? 'selected context active' : 'separate from main chat'}</span>
          </div>
          {branchMessages.length > 0 && (
            <div className="canvas-store-helper-feed canvas-branch-feed">
              {branchMessages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`canvas-store-helper-message ${message.role}`}>
                  <strong>{message.role === 'user' ? 'You' : 'Theo'}</strong>
                  <p>{message.text}</p>
                  {message.role === 'model' && (
                    <button type="button" onClick={() => useTheoHelperAsStoreDraft(kind, message.text)}>Use as draft</button>
                  )}
                </div>
              ))}
            </div>
          )}
          {agentLoading && agentTab === kind && <div className="canvas-store-helper-message model"><strong>Theo</strong><p>Thinking...</p></div>}
        </div>
      </div>
    )
  }

  /** Renders the full store picker/editor modal shared by Skills and Prompt Blueprints. */
  const renderCanvasStoreModal = () => {
    if (!canvasStoreOpen) return null
    const kind = canvasStoreOpen
    const items = kind === 'skills' ? canvasSkillItems : canvasPromptItems
    const pageSize = 6
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
    const page = Math.min(canvasStorePage, totalPages - 1)
    const pageItems = items.slice(page * pageSize, page * pageSize + pageSize)
    return (
      <div className="canvas-store-modal-backdrop" onClick={() => setCanvasStoreOpen(null)}>
        <div className="canvas-store-modal" onClick={(event) => event.stopPropagation()}>
          <div className="canvas-store-modal-header">
            <div>
              <h2>{kind === 'skills' ? 'Skills Store' : 'Prompt Blueprints'}</h2>
              <p>{items.length} available · Canvas Theo panel</p>
            </div>
            <button type="button" onClick={() => setCanvasStoreOpen(null)} aria-label="Close">×</button>
          </div>
          <div className="canvas-store-modal-body">
            <div className="canvas-store-modal-toolbar">
              <span>{kind === 'skills' ? 'Select skills for Theo to follow' : 'Select prompt blueprints for Theo to reference'}</span>
              {totalPages > 1 && (
                <div className="canvas-store-page-dots" aria-label={`${kind === 'skills' ? 'Skills' : 'Prompts'} page`}>
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={index === page ? 'is-active' : ''}
                      onClick={() => setCanvasStorePage(index)}
                      aria-label={`Go to page ${index + 1}`}
                    />
                  ))}
                </div>
              )}
              <button type="button" onClick={startCanvasStoreCreate}>＋ New {kind === 'skills' ? 'Skill' : 'Prompt'}</button>
            </div>
            <div className="canvas-store-modal-grid">
              {pageItems.map((item, index) => (
                <div className="canvas-store-card-wrap" key={item.id}>
                  {renderCanvasStoreCard(kind, item, page * pageSize + index)}
                  <button className="canvas-store-edit" type="button" onClick={() => startCanvasStoreEdit(item)} title="Edit">✎</button>
                </div>
              ))}
              <button className="canvas-store-add-card full" type="button" onClick={startCanvasStoreCreate}>
                <span>＋</span>
                <small>Create Custom</small>
              </button>
            </div>
            {totalPages > 1 && (
              <div className="canvas-store-pages">
                <button type="button" disabled={page === 0} onClick={() => setCanvasStorePage(Math.max(0, page - 1))}>‹</button>
                <span>{page + 1} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages - 1} onClick={() => setCanvasStorePage(Math.min(totalPages - 1, page + 1))}>›</button>
              </div>
            )}
            {canvasStoreEditingId && (
              <div className="canvas-store-editor">
                <div className="canvas-store-editor-title">
                  <strong>{canvasStoreEditingId === '__new__' ? `Create ${kind === 'skills' ? 'Skill' : 'Prompt'}` : `Edit ${kind === 'skills' ? 'Skill' : 'Prompt'}`}</strong>
                  <button type="button" onClick={() => { setCanvasStoreEditingId(null); setCanvasStoreDraftTitle(''); setCanvasStoreDraftText('') }}>Cancel</button>
                </div>
                <input value={canvasStoreDraftTitle} onChange={event => setCanvasStoreDraftTitle(event.target.value)} placeholder={`${kind === 'skills' ? 'Skill' : 'Prompt'} title`} />
                <textarea value={canvasStoreDraftText} onChange={event => setCanvasStoreDraftText(event.target.value)} placeholder={kind === 'skills' ? 'Step-by-step instructions for Theo...' : 'Prompt blueprint text...'} />
                <button type="button" disabled={!canvasStoreDraftTitle.trim() || !canvasStoreDraftText.trim()} onClick={saveCanvasStoreDraft}>Save and Pin</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`canvas-mode ${agentOpen ? '' : 'agent-collapsed'}`}>
      <div
        ref={stageRef}
        className={`canvas-stage ${panning ? 'is-dragging' : ''} ${canvasTool ? `is-tool-${canvasTool}` : ''}`}
        onContextMenu={(event) => {
          event.preventDefault()
          const world = screenToWorld(event.clientX, event.clientY)
          setContextMenu({ x: event.clientX - (stageRef.current?.getBoundingClientRect().left || 0), y: event.clientY - (stageRef.current?.getBoundingClientRect().top || 0), worldX: world.x, worldY: world.y })
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={(event) => {
          stopDragging(event)
          setToolCursor(null)
        }}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest('.canvas-node, .canvas-group-box, .canvas-edge-controls, .canvas-edge-point, .canvas-topbar, .canvas-space-tabs, .canvas-pinned-trays, .canvas-tray-panel, .canvas-context-menu, .canvas-connection-menu, .canvas-prompt-dock, .canvas-note-composer')) return
          resetCanvasTool()
        }}
        onWheel={handleWheel}
      >
        <div
          className="canvas-grid"
          style={{
            backgroundSize: `${24 * activeSpace.viewport.zoom}px ${24 * activeSpace.viewport.zoom}px`,
            backgroundPosition: `${activeSpace.viewport.panX}px ${activeSpace.viewport.panY}px`,
          }}
        />

        <div className="canvas-topbar">
          <button className="canvas-back canvas-storyboard-button" onClick={onBack} title="FILM STORYBOARD" type="button" aria-label="Open FILM STORYBOARD">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <path d="M10 26h44v26H10z" />
              <path d="M12 12l38-6 4 14-38 7z" />
              <path d="M20 11l9 14M32 9l9 14M44 7l8 13" />
              <path d="M18 33h10M36 33h10" />
              <circle cx="23" cy="44" r="4" />
              <circle cx="43" cy="44" r="4" />
              <path d="M27 44h12" />
            </svg>
            <span>FILM STORYBOARD</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={(event) => {
              const world = screenToWorld(window.innerWidth / 2, window.innerHeight / 2)
              Array.from(event.target.files || []).forEach((file, index) => uploadFile(file, world.x + index * 36, world.y + index * 36))
              event.currentTarget.value = ''
            }}
          />
          <input
            ref={nodeFileRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file && nodeUploadTargetId) uploadFileIntoNode(file, nodeUploadTargetId)
              setNodeUploadTargetId(null)
              event.currentTarget.value = ''
            }}
          />
          <input
            ref={trayFileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={(event) => {
              const files = Array.from(event.target.files || [])
              if (trayUploadTargetId) files.forEach(file => uploadFileToTray(file, trayUploadTargetId))
              setTrayUploadTargetId(null)
              event.currentTarget.value = ''
            }}
          />
          <input
            ref={agentFileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.md,.json,.csv"
            style={{ display: 'none' }}
            onChange={async (event) => {
              const files = Array.from(event.target.files || [])
              const attachments = await Promise.all(files.map(async file => {
                const attachment: AgentAttachment = {
                  id: makeId('agent-file'),
                  name: file.name,
                  type: file.type || 'file',
                  url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
                }
                if (/^(text\/|application\/json|application\/csv)/.test(file.type) || /\.(txt|md|json|csv)$/i.test(file.name)) {
                  attachment.text = await file.text()
                }
                return attachment
              }))
              setAgentAttachments(current => [...current, ...attachments])
              if (attachments.length) setStatusLine(`${attachments.length} file${attachments.length === 1 ? '' : 's'} attached to Theo`)
              event.currentTarget.value = ''
            }}
          />
        </div>

        {linkMode && (
          <div className="canvas-link-banner">
            Click a target node to create a {linkMode.label} link. Press Escape or click here to cancel.
            <button type="button" onClick={() => setLinkMode(null)}>Cancel</button>
          </div>
        )}

        <div className="canvas-space-tabs">
          {data.spaces.map(space => (
            <button
              key={space.id}
              className={`canvas-space-tab ${space.id === activeSpace.id ? 'is-active' : ''}`}
              onClick={() => setData(current => ({ ...current, activeSpaceId: space.id }))}
              type="button"
            >
              {space.name}
            </button>
          ))}
          <button className="canvas-space-tab" onClick={addSpace} type="button">＋ Add space</button>
        </div>

        <div className="canvas-pinned-trays">
          {activeSpace.trays.map((tray, index) => (
            <button
              key={tray.id}
              className={`canvas-tray-tab ${expandedTrayId === tray.id || (!expandedTrayId && index === 0) ? 'is-active' : ''}`}
              style={{ borderColor: `${tray.color}55` }}
              onClick={() => setExpandedTrayId(expandedTrayId === tray.id ? null : tray.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const canvasNodeId = event.dataTransfer.getData('application/x-canvas-node')
                if (canvasNodeId) {
                  addNodeToTray(tray.id, canvasNodeId)
                } else {
                  Array.from(event.dataTransfer.files).forEach(file => uploadFileToTray(file, tray.id))
                }
                setExpandedTrayId(tray.id)
              }}
              type="button"
            >
              {tray.name}
            </button>
          ))}
          <div className="canvas-zoom-control" aria-label="Canvas zoom controls">
            <button onClick={() => zoomBy(0.88)} type="button" aria-label="Zoom out">−</button>
            <input
              type="range"
              min="16"
              max="300"
              step="1"
              value={Math.round(activeSpace.viewport.zoom * 100)}
              onChange={(event) => setZoomAt(Number(event.target.value) / 100)}
              aria-label="Zoom level"
            />
            <button onClick={() => zoomBy(1.14)} type="button" aria-label="Zoom in">＋</button>
            <button className="canvas-zoom-reset" onClick={() => setZoomAt(1)} type="button">{Math.round(activeSpace.viewport.zoom * 100)}%</button>
            <button
              className={`canvas-group-tool ${groupToolArmed ? 'is-active' : ''}`}
              onClick={() => activateCanvasTool('group')}
              type="button"
              title="Group tool: drag an area over nodes"
              aria-label="Toggle group selection tool"
            >
              ▣
            </button>
          </div>
        </div>

        {expandedTray && (
          <div
            className="canvas-tray-panel"
            style={{ borderColor: `${expandedTray.color}44` }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const canvasNodeId = event.dataTransfer.getData('application/x-canvas-node')
              if (canvasNodeId) {
                addNodeToTray(expandedTray.id, canvasNodeId)
                return
              }
              Array.from(event.dataTransfer.files).forEach(file => uploadFileToTray(file, expandedTray.id))
            }}
          >
            <button className="canvas-popover-close" onClick={() => setExpandedTrayId(null)} type="button" aria-label="Close">×</button>
            <div className="canvas-tray-panel-header">
              <strong>{expandedTray.name}</strong>
              <span>Drop files here, click Add reference, or store selected node.</span>
              {selectedNode && <button type="button" onClick={() => addNodeToTray(expandedTray.id, selectedNode.id)}>Store selected</button>}
            </div>
            <div className="canvas-tray-panel-grid">
              <button className="canvas-tray-add" type="button" onClick={() => openTrayUpload(expandedTray.id)}>
                <span>＋</span>
                <small>Add reference</small>
              </button>
              {expandedTray.nodeIds.map(nodeId => activeSpace.nodes.find(node => node.id === nodeId)).filter(Boolean).map(node => (
                <div key={node!.id} className="canvas-tray-item">
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/x-canvas-tray-node', node!.id)
                      event.dataTransfer.setData('application/x-canvas-tray-id', expandedTray.id)
                      event.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() => duplicateTrayNodeToCanvas(node!.id)}
                    title={`Place ${node!.title} on canvas`}
                  >
                    {node!.url && node!.type === 'image' ? <img src={node!.url} alt="" /> : <span>{node!.type}</span>}
                    <small>{node!.title}</small>
                  </button>
                  <button className="canvas-tray-delete" type="button" title="Remove from tray" onClick={() => updateActiveSpace(space => {
                    const tray = space.trays.find(item => item.id === expandedTray.id)
                    if (tray) tray.nodeIds = tray.nodeIds.filter(id => id !== node!.id)
                    const pinned = space.nodes.find(item => item.id === node!.id && item.pinnedOnly)
                    if (pinned) space.nodes = space.nodes.filter(item => item.id !== node!.id)
                  })}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className="canvas-world"
          style={{ transform: `translate(${activeSpace.viewport.panX}px, ${activeSpace.viewport.panY}px) scale(${activeSpace.viewport.zoom})` }}
        >
          {activeSpace.groups.map(group => {
            const groupNodes = group.nodeIds.map(nodeId => activeSpace.nodes.find(node => node.id === nodeId)).filter(Boolean) as CanvasNode[]
            return (
            <div
              key={group.id}
              className={`canvas-group-box ${group.id === selectedGroupId ? 'is-selected' : ''}`}
              style={{ left: group.x, top: group.y, width: group.width, height: group.height, borderColor: group.strokeColor, background: group.fillColor }}
              onMouseDown={(event) => {
                event.stopPropagation()
                setSelectedGroupId(group.id)
                setSelectedNodeId(null)
              }}
            >
              {(['n', 's', 'e', 'w'] as GroupResizeHandle[]).map(handle => (
                <span
                  key={handle}
                  className={`canvas-group-rim ${handle}`}
                  onMouseDown={(event) => startGroupDrag(event, group.id)}
                  title="Drag group"
                />
              ))}
              {(['nw', 'ne', 'sw', 'se'] as GroupResizeHandle[]).map(handle => (
                <span
                  key={handle}
                  className={`canvas-group-resize ${handle}`}
                  onMouseDown={(event) => startGroupResize(event, group.id, handle)}
                  title="Resize group"
                />
              ))}
              <button className="canvas-group-move" type="button" onMouseDown={(event) => startGroupDrag(event, group.id)} title="Drag group">
                move
              </button>
              <div className="canvas-group-count">{groupMediaSummary(groupNodes) || 'empty group'}</div>
              <input
                value={group.name}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateActiveSpace(space => {
                  const item = space.groups.find(g => g.id === group.id)
                  if (item) item.name = event.target.value
                })}
              />
              <button type="button" onMouseDown={(event) => event.stopPropagation()} onClick={() => deleteGroup(group.id)}>×</button>
              {group.id === selectedGroupId && (
                <div className="canvas-group-colors" onMouseDown={(event) => event.stopPropagation()}>
                  {groupSwatches.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={group.strokeColor === color ? 'is-active' : ''}
                      style={{ background: color }}
                      aria-label={`Set group color ${color}`}
                      onClick={() => setGroupColor(group.id, color)}
                    />
                  ))}
                </div>
              )}
              <button
                className="canvas-group-port"
                type="button"
                title={`Drag group noodle: ${groupReferenceUrls(group.id).length} refs in group`}
                onMouseDown={(event) => startGroupConnectorDrag(event, group.id)}
              />
            </div>
          )})}

          <svg className="canvas-edge-layer">
            {activeSpace.edges.map(edge => {
              const from = edge.fromGroup ? null : nodeById.get(edge.from)
              const fromGroup = edge.fromGroup ? activeSpace.groups.find(group => group.id === edge.from) : null
              const to = nodeById.get(edge.to)
              if ((!from && !fromGroup) || !to) return null
              const a = fromGroup
                ? { x: fromGroup.x + fromGroup.width, y: fromGroup.y + fromGroup.height / 2 }
                : centerOf(from!)
              const b = centerOf(to)
              const d = edgePath(a, b, edge.points)
              return (
                <g key={edge.id}>
                  <path className="canvas-edge-hit" data-edge-id={edge.id} d={d} />
                  <path
                    className="canvas-edge-tool-hit"
                    data-edge-id={edge.id}
                    d={d}
                    onClick={(event) => {
                      if (canvasTool !== 'scissors' && canvasTool !== 'node') return
                      event.preventDefault()
                      event.stopPropagation()
                      if (canvasTool === 'scissors') {
                        deleteEdge(edge.id)
                        return
                      }
                      const world = screenToWorld(event.clientX, event.clientY)
                      addEdgePoint(edge.id, world.x, world.y)
                    }}
                  />
                  <path className={`canvas-edge-path ${edge.type} ${edge.id === edgeSnapCandidate ? 'is-snap-target' : ''} ${edge.fromGroup ? 'group-edge' : ''} ${edge.label === 'CONT VIDEO' ? 'continuation' : ''} ${edge.type === 'variation' && ((from?.type === 'video') || to.type === 'video') ? 'video-variation' : ''}`} d={d} stroke={edgeDisplayColor(edge.type, edge.label)} />
                  {edgeLabelForDisplay(edge.id) && (
                    <text className="canvas-edge-label" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 8} fill={edgeDisplayColor(edge.type, edge.label)}>
                      {edgeLabelForDisplay(edge.id)}
                    </text>
                  )}
                </g>
              )
            })}
            {connectorDrag && (() => {
              const fromNode = nodeById.get(connectorDrag.from)
              const fromGroup = activeSpace.groups.find(group => group.id === connectorDrag.from)
              if (!fromNode && !fromGroup) return null
              const a = fromGroup
                ? { x: fromGroup.x + fromGroup.width, y: fromGroup.y + fromGroup.height / 2 }
                : { x: fromNode!.x + fromNode!.width, y: fromNode!.y + fromNode!.height / 2 }
              const b = { x: connectorDrag.x, y: connectorDrag.y }
              const d = edgePath(a, b)
              return <path className="canvas-edge-path draft" d={d} stroke="#f8d978" />
            })()}
          </svg>

          {activeSpace.edges.map(edge => {
            const from = edge.fromGroup ? null : nodeById.get(edge.from)
            const fromGroup = edge.fromGroup ? activeSpace.groups.find(group => group.id === edge.from) : null
            const to = nodeById.get(edge.to)
            if ((!from && !fromGroup) || !to) return null
            const a = fromGroup
              ? { x: fromGroup.x + fromGroup.width, y: fromGroup.y + fromGroup.height / 2 }
              : centerOf(from!)
            const b = centerOf(to)
            const x = (a.x + b.x) / 2
            const y = (a.y + b.y) / 2
            return (
              <div
                key={`controls-${edge.id}`}
                data-edge-id={edge.id}
                className="canvas-edge-controls"
                style={{ left: x, top: y }}
                onClick={(event) => {
                  if (canvasTool !== 'scissors' && canvasTool !== 'node') return
                  event.preventDefault()
                  event.stopPropagation()
                  if (canvasTool === 'scissors') {
                    deleteEdge(edge.id)
                    return
                  }
                  const world = screenToWorld(event.clientX, event.clientY)
                  addEdgePoint(edge.id, world.x, world.y)
                }}
                onDoubleClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  const world = screenToWorld(event.clientX, event.clientY)
                  addEdgePoint(edge.id, world.x, world.y)
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  const droppedNodeId = event.dataTransfer.getData('application/x-canvas-node')
                  if (droppedNodeId) {
                    insertExistingNodeOnEdge(edge.id, droppedNodeId)
                    return
                  }
                  const file = event.dataTransfer.files?.[0]
                  if (file) insertFileOnEdge(edge.id, file)
                }}
              >
                <button type="button" title="Insert node between" onClick={() => insertPlaceholderOnEdge(edge.id)}>＋</button>
                <button type="button" title="Add pipe shaping point" onClick={(event) => {
                  const rect = (event.currentTarget.closest('.canvas-edge-controls') as HTMLElement | null)?.getBoundingClientRect()
                  const world = rect ? screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2) : { x, y }
                  addEdgePoint(edge.id, world.x, world.y)
                }}>•</button>
                <button type="button" title="Cut connection" onClick={() => deleteEdge(edge.id)}>✂</button>
              </div>
            )
          })}

          {activeSpace.edges.flatMap(edge => (edge.points || []).map((point, index) => (
            <button
              key={`point-${edge.id}-${index}`}
              className="canvas-edge-point"
              style={{ left: point.x, top: point.y }}
              type="button"
              title="Drag pipe point"
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setDraggingEdgePoint({ edgeId: edge.id, index })
              }}
              onDoubleClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                updateActiveSpace(space => {
                  const item = space.edges.find(candidate => candidate.id === edge.id)
                  if (item?.points) item.points = item.points.filter((_, pointIndex) => pointIndex !== index)
                })
              }}
            />
          )))}

          {marquee && (
            <div
              className="canvas-marquee"
              style={{
                left: Math.min(marquee.startX, marquee.x),
                top: Math.min(marquee.startY, marquee.y),
                width: Math.abs(marquee.x - marquee.startX),
                height: Math.abs(marquee.y - marquee.startY),
              }}
            />
          )}

          {multiSelection && (
            <>
              <div
                className="canvas-selection-frame"
                style={{ left: multiSelection.x, top: multiSelection.y, width: multiSelection.width, height: multiSelection.height }}
              />
              <div
                className="canvas-selection-menu"
                style={{ left: multiSelection.x + multiSelection.width / 2, top: multiSelection.y - 52 }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button type="button" onClick={createGroupFromSelection} title="Group selected">▣ <span>Group</span></button>
                <button type="button" onClick={deleteSelectedNodes} title="Delete selected">⌫ <span>Delete</span></button>
                <button type="button" onClick={disconnectSelectedNodes} title="Disconnect all selected">✂ <span>Disconnect</span></button>
                <button type="button" onClick={cutInternalSelectedEdges} title="Cut selected internal links">╳ <span>Cut links</span></button>
                <button type="button" onClick={downloadSelectedNodes} title="Download selected">⇩ <span>Download</span></button>
              </div>
            </>
          )}

          {canvasNodes.map(node => {
            const isReference = activeSpace.edges.some(edge => edge.from === node.id && edge.type === 'reference')
            const status = node.generation?.status
            return (
            <div
              key={node.id}
              data-node-id={node.id}
              className={`canvas-node ${node.type} ${node.id === selectedNodeId ? 'is-selected' : ''} ${node.id === draggingNodeId ? 'is-dragging-node' : ''} ${node.marker ? `is-marker-${node.marker}` : ''} ${isReference ? 'is-reference' : ''} ${status ? `is-${status}` : ''}`}
              style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
              onMouseDown={(event) => startNodeDrag(event, node)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                event.stopPropagation()
                const world = screenToWorld(event.clientX, event.clientY)
                const draggedNodeId = event.dataTransfer.getData('application/x-canvas-node')
                if (draggedNodeId) {
                  swapNodeMedia(draggedNodeId, node.id)
                  return
                }
                const files = Array.from(event.dataTransfer.files)
                if (!files.length) return
                if (!node.url && (node.type === 'placeholder' || node.type === 'image' || node.type === 'video' || node.type === 'audio' || node.type === 'document')) {
                  uploadFileIntoNode(files[0], node.id)
                  files.slice(1).forEach(async (file, index) => {
                    const refId = await uploadFile(file, world.x - 320 - index * 22, world.y + index * 22)
                    addEdge(refId, node.id, 'reference', 'ref')
                  })
                } else {
                  files.forEach(async (file, index) => {
                    const refId = await uploadFile(file, world.x - 320 - index * 22, world.y + index * 22)
                    addEdge(refId, node.id, 'reference', 'ref')
                  })
                }
              }}
              onContextMenu={(event) => {
                event.preventDefault()
                event.stopPropagation()
                const world = screenToWorld(event.clientX, event.clientY)
                setSelectedNodeId(node.id)
                setContextMenu({ x: event.clientX - (stageRef.current?.getBoundingClientRect().left || 0), y: event.clientY - (stageRef.current?.getBoundingClientRect().top || 0), worldX: world.x, worldY: world.y })
              }}
            >
              {isReference && <div className="canvas-node-badge">REF</div>}
              {typeof node.frameTime === 'number' && <div className="canvas-frame-time-tag">{formatSeconds(node.frameTime)}</div>}
              {status && ['queued', 'running', 'error'].includes(status) && <div className={`canvas-node-status ${status}`}>{status}</div>}
              {node.url && (node.type === 'image' || node.type === 'video') && (
                <div className="canvas-alt-picker" onMouseDown={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setAlternativeMenuNodeId(alternativeMenuNodeId === node.id ? null : node.id)
                    }}
                    title="Choose an existing media node as a pink variation"
                  >
                    var
                  </button>
                  {alternativeMenuNodeId === node.id && (
                    <div className="canvas-alt-menu">
                      <strong>Set existing as variation</strong>
                      {canvasNodes
                        .filter(candidate => candidate.id !== node.id && candidate.url && (candidate.type === 'image' || candidate.type === 'video'))
                        .map(candidate => (
                          <button key={candidate.id} type="button" onClick={() => addExistingAlternative(node.id, candidate.id)}>
                            {candidate.type === 'image' ? <img src={candidate.url} alt="" /> : <span>video</span>}
                            <small>{candidate.title}</small>
                          </button>
                        ))}
                      {canvasNodes.filter(candidate => candidate.id !== node.id && candidate.url && (candidate.type === 'image' || candidate.type === 'video')).length === 0 && <p>No other media nodes yet.</p>}
                    </div>
                  )}
                </div>
              )}
              {(['right', 'left', 'top', 'bottom'] as const).map(side => (
                <button
                  key={side}
                  className={`canvas-connector-port ${side}`}
                  onMouseDown={(event) => startConnectorDrag(event, node, side)}
                  title={`Drag connector from ${side}`}
                  type="button"
                />
              ))}
              {node.id === selectedNodeId && (
                <>
                  <div className="canvas-floating-tools left">
                    <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); duplicateNode(node.id) }} title="Duplicate node" type="button">⧉</button>
                    <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); runImageGeneration(node.id) }} title="Enhance" type="button">✧</button>
                    {node.type === 'video'
                      ? <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); extractFrameFromVideo(node.id) }} title="Extract current frame" type="button">▣</button>
                      : <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); splitGridNode(node.id) }} title="Split grid" type="button">▦</button>}
                  </div>
                  <div className="canvas-floating-tools right">
                    <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setStatusLine('Add to scene will connect to Film Storyboard in the next pass') }} title="Add to scene" type="button">☆</button>
                    <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); node.type === 'video' ? setStatusLine('Use the trim handles on the video player, then extract a frame') : focusSelectedNote(node.id) }} title={node.type === 'video' ? 'Crop / trim video' : 'Prompt'} type="button">{node.type === 'video' ? '⌗' : '✎'}</button>
                    <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); deleteNode(node.id) }} title="Delete" type="button" aria-label="Delete">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7" /></svg>
                    </button>
                  </div>
                </>
              )}
              <div
                className={`canvas-node-media ${!node.url ? 'is-empty-media' : ''}`}
                draggable={false}
                onDoubleClick={(event) => {
                  if (!node.url) {
                    event.stopPropagation()
                    openNodeUpload(node.id)
                  }
                }}
              >
                {node.type === 'image' && node.url ? <img src={node.url} alt={node.title} draggable={false} /> : null}
                {node.type === 'video' && node.url ? (
                  <>
                    <video
                      data-node-video-id={node.id}
                      src={node.url}
                      muted={!unmutedVideoIds.has(node.id)}
                      playsInline
                      onPlay={() => setVideoPlaying(node.id, true)}
                      onPause={() => setVideoPlaying(node.id, false)}
                      onEnded={() => setVideoPlaying(node.id, false)}
                      onLoadedMetadata={() => updateVideoProgress(node.id)}
                      onTimeUpdate={() => updateVideoProgress(node.id)}
                    />
                    <div className="canvas-video-controls" onMouseDown={(event) => event.stopPropagation()}>
                      <button type="button" onClick={(event) => toggleNodeVideo(event, node.id)}>
                        {playingVideoIds.has(node.id) ? 'Ⅱ' : '▶'}
                      </button>
                      <button type="button" onClick={(event) => toggleNodeVideoMute(event, node.id)}>
                        {unmutedVideoIds.has(node.id)
                          ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 8c1.3 1.1 1.9 2.4 1.9 4s-.6 2.9-1.9 4" /></svg>
                          : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l4 6M21 9l-4 6" /></svg>}
                      </button>
                      <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); extractFrameFromVideo(node.id) }}>
                        Frame
                      </button>
                      <div className="canvas-video-time">
                        <span>{formatSeconds(videoProgress[node.id]?.current || 0)}</span>
                        <span>{formatSeconds(videoProgress[node.id]?.duration || 0)}</span>
                      </div>
                      <div className="canvas-video-progress">
                        <span style={{ width: `${Math.min(100, ((videoProgress[node.id]?.current || 0) / Math.max(0.01, videoProgress[node.id]?.duration || 0.01)) * 100)}%` }} />
                      </div>
                      <div className="canvas-video-trim">
                        <input
                          type="range"
                          min="0"
                          max={Math.max(0.1, videoProgress[node.id]?.duration || 0.1)}
                          step="0.05"
                          value={node.videoCrop?.start ?? 0}
                          onChange={(event) => setVideoCrop(node.id, 'start', Number(event.target.value))}
                          aria-label="Trim start"
                        />
                        <input
                          type="range"
                          min="0"
                          max={Math.max(0.1, videoProgress[node.id]?.duration || 0.1)}
                          step="0.05"
                          value={node.videoCrop?.end ?? videoProgress[node.id]?.duration ?? 0}
                          onChange={(event) => setVideoCrop(node.id, 'end', Number(event.target.value))}
                          aria-label="Trim end"
                        />
                      </div>
                    </div>
                  </>
                ) : null}
                {node.type === 'audio' ? <div className="canvas-node-placeholder">♪<br />Audio / music</div> : null}
                {node.type === 'document' ? <div className="canvas-node-placeholder">▤<br />PDF / DOCX context</div> : null}
                {(node.type === 'placeholder' || (!node.url && node.type !== 'audio' && node.type !== 'document')) ? <div className="canvas-node-placeholder">＋<br />Double-click to upload<br />or generate here</div> : null}
              </div>
              <div className="canvas-node-footer">
                <span
                  className="canvas-node-title"
                  draggable
                  onDragStart={(event) => {
                    event.stopPropagation()
                    event.dataTransfer.setData('application/x-canvas-node', node.id)
                    event.dataTransfer.effectAllowed = 'copy'
                  }}
                  title="Drag this title into a reference tray"
                >
                  {node.title}
                </span>
                <span className="canvas-node-type-pill">{node.type}</span>
              </div>
            </div>
            )
          })}
        </div>

        {canvasTool && toolCursor && (
          <div
            className={`canvas-tool-cursor ${canvasTool}`}
            style={{ left: toolCursor.x, top: toolCursor.y }}
            aria-hidden="true"
          />
        )}

        {canvasNodes.length === 0 && (
          <div className="canvas-empty-hint">
            <strong>Full Canvas Mode</strong>
            <p>Drop images, videos, music, PDFs, or DOCX files here. Use right click to add placeholders. Pinch or two-finger scroll to zoom, drag empty canvas to pan.</p>
          </div>
        )}

        <div className={`canvas-status-floating ${statusLine.includes('failed') || statusLine.includes('Missing') || statusLine.includes('error') ? 'is-error' : ''}`}>
          {activeJobs > 0 ? `${activeJobs} active generation${activeJobs === 1 ? '' : 's'} · ` : ''}{statusLine}
        </div>

        {contextMenu && (
          <div className="canvas-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <div className="canvas-context-tools">
              <button className={canvasTool === 'group' ? 'is-active' : ''} type="button" title="Group selection tool" onClick={() => {
                activateCanvasTool('group')
                setContextMenu(null)
              }}>▣</button>
              <button className={canvasTool === 'scissors' ? 'is-active' : ''} type="button" title="Scissors tool" onClick={() => {
                activateCanvasTool('scissors')
                setContextMenu(null)
              }}>✂</button>
              <button className={canvasTool === 'master' ? 'is-active' : ''} type="button" title="Master marker tool" onClick={() => {
                activateCanvasTool('master')
                setContextMenu(null)
              }}>M</button>
              <button className={canvasTool === 'node' ? 'is-active' : ''} type="button" title="Doodle point tool" onClick={() => {
                activateCanvasTool('node')
                setContextMenu(null)
              }}>•</button>
            </div>
            <button type="button" onClick={() => { addPlaceholder('image', contextMenu.worldX, contextMenu.worldY); setContextMenu(null) }}>Add image placeholder</button>
            <button type="button" onClick={() => { addPlaceholder('video', contextMenu.worldX, contextMenu.worldY); setContextMenu(null) }}>Add video placeholder</button>
            <button type="button" onClick={() => { addPlaceholder('document', contextMenu.worldX, contextMenu.worldY); setContextMenu(null) }}>Add PDF/DOCX node</button>
            <button type="button" onClick={() => { addSpace(); setContextMenu(null) }}>Add new space</button>
            {selectedNode && <button type="button" onClick={() => { duplicateNode(selectedNode.id); setContextMenu(null) }}>Duplicate selected</button>}
            {selectedNode && <button type="button" onClick={() => { createVariationNode(selectedNode.id); setContextMenu(null) }}>Create pink variation node</button>}
            {selectedNode?.url && <button type="button" onClick={() => { setNodeMarker(selectedNode.id, 'alternative'); setContextMenu(null) }}>Mark selected as alternative</button>}
            {selectedNode && activeSpace.edges.some(edge => edge.to === selectedNode.id && edge.type === 'variation') && <button type="button" onClick={() => { makeMasterShot(selectedNode.id); setContextMenu(null) }}>Make variation the flow master</button>}
            {selectedNode?.type !== 'video' && selectedNode && <button type="button" onClick={() => { runTwoVariants(selectedNode.id); setContextMenu(null) }}>Generate two pink variations</button>}
            {selectedNode && <button type="button" onClick={() => { setNodeMarker(selectedNode.id, 'master'); setContextMenu(null) }}>Mark selected as master</button>}
            {selectedNode && <button type="button" onClick={() => { runImageGeneration(selectedNode.id); setContextMenu(null) }}>Run selected node</button>}
            {selectedNode?.type === 'image' && <button type="button" onClick={() => { splitGridNode(selectedNode.id); setContextMenu(null) }}>Split selected 2×2</button>}
            {selectedNode?.type === 'video' && selectedNode.videoCrop && <button type="button" onClick={() => { resetVideoCrop(selectedNode.id); setContextMenu(null) }}>Reset video trim</button>}
            {selectedNode && <button type="button" onClick={() => { setLinkMode({ from: selectedNode.id, type: 'reference', label: 'ref' }); setContextMenu(null) }}>Use selected as reference...</button>}
            {selectedNode && expandedTray && <button type="button" onClick={() => { addNodeToTray(expandedTray.id, selectedNode.id); setContextMenu(null) }}>Store selected in {expandedTray.name}</button>}
            {selectedNode && <button type="button" onClick={() => { disconnectNode(selectedNode.id); setContextMenu(null) }}>Disconnect selected</button>}
          </div>
        )}

        {pendingConnection && (
          <div className="canvas-connection-menu" style={{ left: pendingConnection.x, top: pendingConnection.y }}>
            <button className="canvas-popover-close" onClick={() => setPendingConnection(null)} type="button" aria-label="Close">×</button>
            <strong>Connect as</strong>
            <button type="button" onClick={() => createConnection(pendingConnection.from, pendingConnection.to, 'derivative')}>Derivative image</button>
            <button type="button" onClick={() => createConnection(pendingConnection.from, pendingConnection.to, 'reference')}>Reference</button>
            <button type="button" onClick={() => createConnection(pendingConnection.from, pendingConnection.to, 'variation')}>Pink variant</button>
            <button type="button" onClick={() => createConnection(pendingConnection.from, pendingConnection.to, 'animation')}>Animation / image to video</button>
            <button type="button" onClick={() => createConnection(pendingConnection.from, pendingConnection.to, 'frame')}>Extracted frame / panel</button>
            <button type="button" onClick={() => createConnection(pendingConnection.from, pendingConnection.to, 'context')}>Scene context</button>
            <button className="is-muted" type="button" onClick={() => setPendingConnection(null)}>Cancel</button>
          </div>
        )}

        {pendingNodeConnection && (
          <div className="canvas-connection-menu create-node" style={{ left: pendingNodeConnection.x, top: pendingNodeConnection.y }}>
            <button className="canvas-popover-close" onClick={() => setPendingNodeConnection(null)} type="button" aria-label="Close">×</button>
            <strong>Create connected node</strong>
            <button type="button" onClick={() => createConnectedNode('image', 'derivative')}>Image container</button>
            <button type="button" onClick={() => createConnectedNode('video', 'animation')}>Video container</button>
            <button type="button" onClick={() => {
              const from = pendingNodeConnection.from
              createConnectedNode(!pendingNodeConnection.fromGroup && nodeById.get(from)?.type === 'video' ? 'video' : 'image', 'variation')
            }}>Pink variation container</button>
            <button type="button" onClick={() => createConnectedNode('document', 'context')}>Text / PDF context</button>
            <button type="button" onClick={() => createConnectedNode('placeholder', 'reference')}>Reference placeholder</button>
            <button type="button" onClick={() => createConnectedNode('audio', 'context')}>Music / speech node</button>
            <button className="is-muted" type="button" onClick={() => setPendingNodeConnection(null)}>Cancel</button>
          </div>
        )}

        {selectedNode && (
          <div className="canvas-note-composer">
            {(noteAttachOpen || noteSettingsOpen || noteSkillsOpen) && <button className="canvas-popover-backdrop" type="button" aria-label="Close popups" onClick={closeNotePopovers} />}
            <textarea
              value={selectedNode.prompt}
              onChange={(event) => updateNode(selectedNode.id, node => { node.prompt = event.target.value })}
              placeholder="Leave an iteration note..."
              rows={4}
            />
            <button className="canvas-note-reset" onClick={() => injectSourcePrompt(selectedNode.id)} title="Inject saved source prompt" type="button">↻</button>
            <div className="canvas-note-title">
              <input
                value={selectedNode.title}
                onChange={(event) => updateNode(selectedNode.id, node => { node.title = event.target.value })}
                aria-label="Selected node title"
              />
              <select
                value={selectedOutputType}
                onChange={(event) => updateNode(selectedNode.id, node => {
                  const nextType = event.target.value as CanvasMediaType
                  if (!node.url || node.type === 'placeholder') {
                    node.type = nextType
                  }
                  node.generation = {
                    ...defaultGenerationForType(nextType),
                    ...(node.generation || {}),
                    model: nextType === 'video' && !videoModels.some(model => model.id === node.generation?.model) ? videoModels[0].id : nextType !== 'video' && !imageModels.some(model => model.id === node.generation?.model) ? imageModels[0].id : node.generation?.model,
                    quality: nextType === 'video' && !['720p', '1080p'].includes(node.generation?.quality || '') ? videoModels[0].qualities[0] : nextType !== 'video' && ['720p', '1080p'].includes(node.generation?.quality || '') ? imageModels[0].quality : node.generation?.quality,
                    operation: nextType === 'video' ? 'video' : 'generate',
                  }
                })}
                aria-label="Selected node media type"
                title="Change node type without deleting connections"
              >
                <option value="image">image</option>
                <option value="video">video</option>
                <option value="audio">audio</option>
                <option value="document">document</option>
                <option value="placeholder">placeholder</option>
              </select>
              <span>{displayedRefNodes.length}/8 refs</span>
              {activeJobs > 0 && <strong>{activeJobs} generating</strong>}
              {selectedNode.generation?.error && <em>{selectedNode.generation.error}</em>}
            </div>
            <div className="canvas-note-toolbar">
              <input
                ref={refFileRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={(event) => {
                  const files = Array.from(event.target.files || []).slice(0, Math.max(0, 8 - selectedRefNodes.length))
                  if (files.length) attachReferenceFilesToNode(files, selectedNode.id)
                  event.currentTarget.value = ''
                }}
              />
              <button className={noteAttachOpen ? 'is-active' : ''} onClick={() => { setNoteAttachOpen(!noteAttachOpen); setNoteSettingsOpen(false); setNoteSkillsOpen(false) }} title="Attach reference images" type="button">⌕</button>
              <button className={noteAiEnhancing ? 'is-active' : ''} disabled={noteAiEnhancing || !selectedNode.prompt.trim()} onClick={improveSelectedPrompt} title="AI enhance prompt" type="button">{noteAiEnhancing ? '⏳' : '✧'}</button>
              <button className={noteSkillsOpen ? 'is-active' : ''} onClick={() => { setNoteSkillsOpen(!noteSkillsOpen); setNoteAttachOpen(false); setNoteSettingsOpen(false) }} title="Skills / prompt templates" type="button">▤</button>
              <button className={noteSettingsOpen ? 'is-active' : ''} onClick={() => { setNoteSettingsOpen(!noteSettingsOpen); setNoteAttachOpen(false); setNoteSkillsOpen(false) }} title="Generation settings" type="button">⚙</button>
              <div className="canvas-note-refs">
                {displayedRefNodes.map((node, index) => (
                  <button key={node.id} type="button" title={node.title} onClick={() => setSelectedNodeId(node.id)}>
                    {node.url && node.type === 'image' ? <img src={node.url} alt="" /> : <span>{node.type[0].toUpperCase()}</span>}
                    <small>{index + 1}</small>
                  </button>
                ))}
                {displayedRefNodes.length === 0 && <span>{displayedRefNodes.length}/8 · {activeJobs > 0 ? `${activeJobs} generating` : 'ready'}</span>}
              </div>
              <button className="canvas-note-ok" onClick={() => selectedIsVideo ? runVideoGeneration(selectedNode.id) : runImageGeneration(selectedNode.id)} title={selectedIsVideo ? 'Run video generation' : 'Run image generation / enhance selected'} type="button">✓</button>
            </div>
            {noteAttachOpen && (
              <div className="canvas-note-popover attach">
                <button className="canvas-popover-close" onClick={() => setNoteAttachOpen(false)} type="button" aria-label="Close">×</button>
                <strong>Attach references</strong>
                <p>Upload files or drag files directly onto the selected node.</p>
                <button type="button" onClick={() => refFileRef.current?.click()}>Upload reference files</button>
              </div>
            )}
            {noteSkillsOpen && (
              <div className="canvas-note-popover skills">
                <button className="canvas-popover-close" onClick={() => setNoteSkillsOpen(false)} type="button" aria-label="Close">×</button>
                <strong>Skills / prompts</strong>
                <button type="button" onClick={() => updateNode(selectedNode.id, node => { node.prompt = `${node.prompt}\n\nCreate 2x2 grid with 4 panels with 3d animated scenes in each one:`.trim() })}>Inject 2×2 grid line</button>
                <button type="button" onClick={() => updateNode(selectedNode.id, node => { node.prompt = `${node.prompt}\n\nAll panels must be consistent between each other as to backgrounds, positioning and characters.`.trim() })}>Inject consistency tag</button>
              </div>
            )}
            {noteSettingsOpen && (
              <div className="canvas-note-popover settings">
                <button className="canvas-popover-close" onClick={() => setNoteSettingsOpen(false)} type="button" aria-label="Close">×</button>
                <strong>{selectedIsVideo ? 'Video Model' : 'Image Model'}</strong>
                <div className="canvas-model-card-list">
                  {(selectedIsVideo ? videoModels : imageModels).map(model => {
                    const quality = 'qualities' in model ? model.qualities[0] : model.quality
                    const isActive = selectedGeneration.model === model.id
                    return (
                      <button
                        key={model.id}
                        className={isActive ? 'is-active' : ''}
                        type="button"
                        onClick={() => updateNode(selectedNode.id, node => {
                          node.generation = {
                            ...(node.generation || defaultGenerationForType(selectedIsVideo ? 'video' : selectedNode.type)),
                            model: model.id,
                            quality,
                            detailLevel: 'detailLevel' in model ? model.detailLevel : '',
                            operation: selectedIsVideo ? 'video' : 'generate',
                            duration: selectedIsVideo ? (node.generation?.duration || 5) : node.generation?.duration,
                          }
                        })}
                      >
                        <span>{model.name}</span>
                        <small>{quality.replace('2160p', '4K').replace('1440p', '2K')}</small>
                      </button>
                    )
                  })}
                </div>
                <div className="canvas-settings-row">
                  {['16:9', '9:16', '1:1', '4:3'].map(ar => (
                    <button key={ar} className={selectedGeneration.aspectRatio === ar ? 'is-active' : ''} onClick={() => updateNode(selectedNode.id, node => { node.generation = { ...(node.generation || defaultGeneration()), aspectRatio: ar } })} type="button">{ar}</button>
                  ))}
                </div>
                {selectedIsVideo && (
                  <>
                    <div className="canvas-settings-row">
                      {selectedVideoModel.qualities.map(q => (
                        <button key={q} className={selectedGeneration.quality === q ? 'is-active' : ''} onClick={() => updateNode(selectedNode.id, node => { node.generation = { ...(node.generation || defaultGenerationForType('video')), quality: q } })} type="button">{q}</button>
                      ))}
                    </div>
                    <div className="canvas-settings-row">
                      {selectedVideoModel.durations.map(duration => (
                        <button key={duration} className={(selectedGeneration.duration || 5) === duration ? 'is-active' : ''} onClick={() => updateNode(selectedNode.id, node => { node.generation = { ...(node.generation || defaultGenerationForType('video')), duration } })} type="button">{duration}s</button>
                      ))}
                    </div>
                  </>
                )}
                <p>{selectedIsVideo ? `PixVerse CLI: create video, ${selectedGeneration.aspectRatio || '16:9'}, ${selectedGeneration.quality || selectedVideoModel.qualities[0]}, ${selectedGeneration.duration || 5}s.` : 'Image models match Film Storyboard lightbox settings.'}</p>
              </div>
            )}
            <div className="canvas-note-counter">{selectedNode.prompt.length}/5000 · {activeJobs > 0 ? `${activeJobs} images generating` : '0 active generations'}</div>
            </div>
        )}
      </div>

      <button className="canvas-agent-toggle" type="button" onClick={() => setAgentOpen(!agentOpen)}>{agentOpen ? 'Hide Gemini' : 'Open Gemini'}</button>
      {agentOpen && <aside className="canvas-agent-panel">
        <div className="canvas-agent-top">
          <strong>Theo Canvas Agent</strong>
          <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
            Isolated panel. Ready for selected nodes, groups, skills, prompts, tasks.
          </div>
          <div className="canvas-agent-tabs">
            {(['agent', 'skills', 'prompts', 'tasks'] as const).map(tab => (
              <button key={tab} className={`canvas-agent-tab ${agentTab === tab ? 'is-active' : ''}`} onClick={() => setAgentTab(tab)} type="button">{tab}</button>
            ))}
          </div>
        </div>
        <div className="canvas-agent-feed">
          {agentTab === 'agent' && (
            <>
              {agentMessages.length === 0 && (
                <>
                  <p>Gemini sees a compact summary of the selected node, references, groups, and graph count.</p>
                  <p>Selected context: {selectedNode ? selectedNode.title : 'nothing selected'}</p>
                  <p>Visible images sent: {selectedNode ? getInputNodes(selectedNode.id, true).filter(node => node.type === 'image' && node.url).length : 0}</p>
                  <p>Graph: {activeSpace.nodes.length} nodes, {activeSpace.edges.length} links.</p>
                </>
              )}
              {agentMessages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`canvas-agent-message ${message.role}`}>
                  <strong>{message.role === 'user' ? 'You' : 'Theo'}</strong>
                  <p>{message.text}</p>
                </div>
              ))}
              {agentLoading && <div className="canvas-agent-message model"><strong>Theo</strong><p>Thinking...</p></div>}
            </>
          )}
          {agentTab === 'skills' && renderCanvasAgentStorePanel('skills')}
          {agentTab === 'prompts' && renderCanvasAgentStorePanel('prompts')}
          {agentTab === 'tasks' && (
            <div className="canvas-task-list">
              {activeSpace.nodes.filter(node => node.generation?.status && node.generation.status !== 'idle').length === 0 && <p>No canvas generation tasks yet.</p>}
              {activeSpace.nodes.filter(node => node.generation?.status && node.generation.status !== 'idle').map(node => (
                <button key={node.id} type="button" onClick={() => setSelectedNodeId(node.id)}>
                  <span>{node.generation?.status}</span>
                  <strong>{node.title}</strong>
                  <small>{node.generation?.operation || 'generate'} · {shortModelName(node.generation?.model)}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="canvas-agent-compose">
          {agentAttachments.length > 0 && (
            <div className="canvas-agent-attachments">
              {agentAttachments.map(file => (
                <button key={file.id} type="button" title={file.name} onClick={() => setAgentAttachments(current => current.filter(item => item.id !== file.id))}>
                  {file.url ? <img src={file.url} alt="" /> : <span>{file.name.split('.').pop()?.slice(0, 4) || 'file'}</span>}
                  <small>{file.name}</small>
                  <b>×</b>
                </button>
              ))}
            </div>
          )}
          <textarea
            value={agentDraft}
            onChange={event => setAgentDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                sendAgentMessage()
              }
            }}
            placeholder={
              agentTab === 'skills'
                ? selectedCanvasSkills.length
                  ? 'Ask Theo to build on the selected skill...'
                  : 'Ask Theo to build a new skill...'
                : agentTab === 'prompts'
                  ? selectedCanvasPrompts.length
                    ? 'Ask Theo to build on the selected prompt...'
                    : 'Ask Theo to build a new prompt...'
                  : 'Ask Theo about the selected canvas context...'
            }
            rows={5}
          />
          <div className="canvas-agent-actions">
            <button type="button" className="icon" onClick={startAgentDictation} title="Microphone dictation" aria-label="Microphone dictation">◉</button>
            <button type="button" className="icon" onClick={() => agentFileRef.current?.click()} title="Attach files for Theo" aria-label="Attach files for Theo">⌕</button>
            <button type="button" disabled={agentLoading || !agentDraft.trim()} onClick={sendAgentMessage}>
              {agentLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </aside>}
      {renderCanvasStoreModal()}
    </div>
  )
}

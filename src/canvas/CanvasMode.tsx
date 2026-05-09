import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, MouseEvent, WheelEvent } from 'react'
import { refinePrompt } from '../gemini-agent'
import type { CanvasData, CanvasEdgeType, CanvasMediaType, CanvasNode, CanvasSpace } from './canvasTypes'
import './CanvasMode.css'

const STORAGE_KEY = 'aisha-canvas-mode-v1'

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`

const defaultTrays = [
  { id: 'tray-actors', name: 'Actors', color: '#60a5fa', nodeIds: [] },
  { id: 'tray-locations', name: 'Locations', color: '#34d399', nodeIds: [] },
  { id: 'tray-props', name: 'Props', color: '#f472b6', nodeIds: [] },
  { id: 'tray-styles', name: 'Styles', color: '#f8d978', nodeIds: [] },
  { id: 'tray-master-shots', name: 'Master Shots', color: '#a78bfa', nodeIds: [] },
]

const imageModels = [
  { id: 'gemini-3.1-flash', name: 'Nano Banana 2', quality: '2160p', detailLevel: '' },
  { id: 'gemini-3.0', name: 'Nano Banana Pro', quality: '1440p', detailLevel: '' },
  { id: 'gpt-image-2.0', name: 'GPT-2 Medium', quality: '1440p', detailLevel: 'medium' },
]

type LinkMode = { from: string; type: CanvasEdgeType; label: string } | null

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

function createInitialData(): CanvasData {
  const first = createSpace(1)
  first.name = 'Act 1 Canvas'
  return { version: 1, activeSpaceId: first.id, spaces: [first] }
}

function mediaTypeFromFile(file: File): CanvasMediaType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type === 'application/pdf' || /\.(pdf|docx?)$/i.test(file.name)) return 'document'
  return 'placeholder'
}

function nodeSize(type: CanvasMediaType) {
  if (type === 'video') return { width: 320, height: 230 }
  if (type === 'audio') return { width: 280, height: 150 }
  if (type === 'document') return { width: 260, height: 180 }
  return { width: 280, height: 210 }
}

function edgeColor(type: string) {
  if (type === 'reference') return '#f8d978'
  if (type === 'variation') return '#fb7185'
  if (type === 'animation') return '#38bdf8'
  if (type === 'frame') return '#fb923c'
  if (type === 'context') return '#c084fc'
  return 'rgba(226, 232, 240, 0.58)'
}

function centerOf(node: CanvasNode) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 }
}

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

function shortModelName(model?: string) {
  return imageModels.find(item => item.id === model)?.name || model || 'Model'
}

export function CanvasMode({ onBack }: { onBack: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const refFileRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState<CanvasData>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) as CanvasData : createInitialData()
    } catch {
      return createInitialData()
    }
  })
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
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

  const activeSpace = data.spaces.find(space => space.id === data.activeSpaceId) || data.spaces[0]
  const selectedNode = activeSpace.nodes.find(node => node.id === selectedNodeId) || null
  const selectedGeneration = selectedNode?.generation || defaultGeneration()
  const selectedRefNodes = selectedNode
    ? activeSpace.edges
      .filter(edge => edge.to === selectedNode.id && edge.type === 'reference')
      .map(edge => activeSpace.nodes.find(node => node.id === edge.from))
      .filter(Boolean) as CanvasNode[]
    : []

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLinkMode(null)
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const updateActiveSpace = (mutate: (space: CanvasSpace) => void) => {
    setData(current => {
      const next = structuredClone(current)
      const space = next.spaces.find(item => item.id === next.activeSpaceId)
      if (space) mutate(space)
      return next
    })
  }

  const screenToWorld = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left - activeSpace.viewport.panX) / activeSpace.viewport.zoom,
      y: (clientY - rect.top - activeSpace.viewport.panY) / activeSpace.viewport.zoom,
    }
  }

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

  const zoomBy = (factor: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    setZoomAt(activeSpace.viewport.zoom * factor, rect ? rect.left + rect.width / 2 : undefined, rect ? rect.top + rect.height / 2 : undefined)
  }

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
      note: partial.note || '',
      url: partial.url,
      localPath: partial.localPath,
      mimeType: partial.mimeType,
      fileName: partial.fileName,
      generation: partial.generation || defaultGeneration(),
    }
    updateActiveSpace(space => {
      space.nodes.push(node)
    })
    setSelectedNodeId(node.id)
    return node.id
  }

  const updateNode = (nodeId: string, mutate: (node: CanvasNode) => void) => {
    updateActiveSpace(space => {
      const node = space.nodes.find(item => item.id === nodeId)
      if (node) mutate(node)
    })
  }

  const addEdge = (from: string, to: string, type: CanvasEdgeType, label?: string) => {
    if (from === to) return
    updateActiveSpace(space => {
      const exists = space.edges.some(edge => edge.from === from && edge.to === to && edge.type === type)
      if (exists) return
      space.edges.push({ id: makeId('edge'), from, to, type, label })
    })
  }

  const getReferenceUrls = (nodeId: string, includeSource = false) => {
    const urls: string[] = []
    const node = activeSpace.nodes.find(item => item.id === nodeId)
    if (includeSource && node?.url && (node.type === 'image' || node.type === 'video')) urls.push(node.url)
    activeSpace.edges
      .filter(edge => edge.to === nodeId && edge.type === 'reference')
      .forEach(edge => {
        const refNode = activeSpace.nodes.find(item => item.id === edge.from)
        if (refNode?.url) urls.push(refNode.url)
      })
    return Array.from(new Set(urls))
  }

  const uploadFile = async (file: File, worldX: number, worldY: number) => {
    const formData = new FormData()
    formData.append('file', file)
    let uploaded: { url?: string; localPath?: string; mimeType?: string; fileName?: string } = {}
    try {
      const response = await fetch('/api/storyboard/upload', { method: 'POST', body: formData })
      uploaded = await response.json()
    } catch {
      uploaded = { url: URL.createObjectURL(file), fileName: file.name, mimeType: file.type }
    }
    const nodeId = addNode({
      type: mediaTypeFromFile(file),
      title: file.name,
      url: uploaded.url || URL.createObjectURL(file),
      localPath: uploaded.localPath,
      mimeType: uploaded.mimeType || file.type,
      fileName: uploaded.fileName || file.name,
    }, worldX, worldY)
    return nodeId
  }

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

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const world = screenToWorld(event.clientX, event.clientY)
    Array.from(event.dataTransfer.files).forEach((file, index) => {
      uploadFile(file, world.x + index * 36, world.y + index * 36)
    })
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const normalizedDelta = Math.max(-80, Math.min(80, event.deltaY))
    const sensitivity = event.ctrlKey ? 0.00105 : 0.00072
    setZoomAt(activeSpace.viewport.zoom * Math.exp(-normalizedDelta * sensitivity), event.clientX, event.clientY)
  }

  const handleStageMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('.canvas-node, .canvas-topbar, .canvas-space-tabs, .canvas-pinned-trays, .canvas-context-menu, .canvas-prompt-dock, .canvas-note-composer, .canvas-link-banner')) return
    setContextMenu(null)
    setSelectedNodeId(null)
    setPanning(true)
    setDragStart({ x: event.clientX, y: event.clientY, panX: activeSpace.viewport.panX, panY: activeSpace.viewport.panY })
  }

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (draggingNodeId && dragStart) {
      const dx = (event.clientX - dragStart.x) / activeSpace.viewport.zoom
      const dy = (event.clientY - dragStart.y) / activeSpace.viewport.zoom
      updateActiveSpace(space => {
        const node = space.nodes.find(item => item.id === draggingNodeId)
        if (!node || dragStart.nodeX === undefined || dragStart.nodeY === undefined) return
        node.x = dragStart.nodeX + dx
        node.y = dragStart.nodeY + dy
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

  const stopDragging = () => {
    setDraggingNodeId(null)
    setPanning(false)
    setDragStart(null)
  }

  const startNodeDrag = (event: MouseEvent<HTMLDivElement>, node: CanvasNode) => {
    event.stopPropagation()
    setContextMenu(null)
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

  const addPlaceholder = (type: CanvasMediaType, x: number, y: number, sourceId?: string) => {
    const id = addNode({ type, title: type === 'placeholder' ? 'Empty media' : `New ${type}` }, x, y)
    if (sourceId) {
      updateActiveSpace(space => {
        space.edges.push({
          id: makeId('edge'),
          from: sourceId,
          to: id,
          type: type === 'video' ? 'animation' : 'derivative',
          label: type === 'video' ? 'image to video' : 'derivative',
        })
      })
    }
    return id
  }

  const deleteNode = (nodeId: string) => {
    updateActiveSpace(space => {
      space.nodes = space.nodes.filter(node => node.id !== nodeId)
      space.edges = space.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId)
    })
    if (selectedNodeId === nodeId) setSelectedNodeId(null)
  }

  const disconnectNode = (nodeId: string) => {
    updateActiveSpace(space => {
      space.edges = space.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId)
    })
  }

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

  const fillNodeWithImage = (nodeId: string, payload: { url: string; localPath?: string; fileName?: string }, title?: string) => {
    updateNode(nodeId, node => {
      node.type = 'image'
      node.url = payload.url
      node.localPath = payload.localPath
      node.fileName = payload.fileName || payload.url.split('/').pop() || node.fileName
      node.title = title || node.title || node.fileName || 'Generated image'
      node.generation = {
        ...(node.generation || defaultGeneration()),
        status: 'done',
        error: '',
        lastRunAt: new Date().toISOString(),
      }
    })
  }

  const callCanvasImageApi = async (node: CanvasNode, type: 'generate' | 'enhance') => {
    const generation = node.generation || defaultGeneration()
    const modelPreset = imageModels.find(item => item.id === generation.model)
    const prompt = node.prompt || node.note || ''
    const attachments = type === 'generate' ? getReferenceUrls(node.id, node.type === 'image') : getReferenceUrls(node.id)
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
        attachments,
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

  const runImageGeneration = async (nodeId: string, asVariation = false) => {
    const source = activeSpace.nodes.find(node => node.id === nodeId)
    if (!source) return
    if (!(source.prompt || source.note || source.url)) {
      updateNode(source.id, node => {
        node.generation = { ...(node.generation || defaultGeneration()), status: 'error', error: 'Add a prompt or image before running.' }
      })
      setStatusLine('Missing prompt or source image')
      return
    }
    const generationType = source.type === 'image' && !asVariation ? 'enhance' : 'generate'
    const targetId = source.type === 'placeholder'
      ? source.id
      : addNode({
          type: 'placeholder',
          title: asVariation ? `Variant from ${source.title}` : `Generated from ${source.title}`,
          prompt: source.prompt,
          generation: { ...(source.generation || defaultGeneration()), status: 'queued' },
        }, source.x + source.width + 140, source.y + (asVariation ? 52 : 0))

    if (source.id !== targetId) {
      addEdge(source.id, targetId, asVariation ? 'variation' : 'derivative', asVariation ? 'variant' : 'generated')
      activeSpace.edges
        .filter(edge => edge.to === source.id && edge.type === 'reference')
        .forEach(edge => addEdge(edge.from, targetId, 'reference', 'ref'))
    }

    updateNode(targetId, node => {
      node.generation = { ...(node.generation || defaultGeneration()), status: 'running', error: '', operation: generationType }
    })
    setStatusLine(`${generationType === 'enhance' ? 'Enhancing' : 'Generating'} with ${shortModelName(source.generation?.model)}...`)
    setActiveJobs(count => count + 1)
    try {
      const payload = await callCanvasImageApi(source, generationType)
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

  const runTwoVariants = async (nodeId: string) => {
    await runImageGeneration(nodeId, true)
    await runImageGeneration(nodeId, true)
  }

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

  const focusSelectedNote = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>('.canvas-note-composer textarea')?.focus()
    }, 0)
  }

  const addSpace = () => {
    setData(current => {
      const next = structuredClone(current)
      const space = createSpace(next.spaces.length + 1)
      next.spaces.push(space)
      next.activeSpaceId = space.id
      return next
    })
  }

  const nodeById = useMemo(() => new Map(activeSpace.nodes.map(node => [node.id, node])), [activeSpace.nodes])

  return (
    <div className="canvas-mode">
      <div
        ref={stageRef}
        className={`canvas-stage ${panning ? 'is-dragging' : ''}`}
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
        onMouseLeave={stopDragging}
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
          <button className="canvas-chip" onClick={() => fileRef.current?.click()} type="button">＋ Upload media</button>
          <button className="canvas-chip" onClick={() => addPlaceholder('placeholder', screenToWorld(window.innerWidth / 2, window.innerHeight / 2).x, screenToWorld(window.innerWidth / 2, window.innerHeight / 2).y)} type="button">Empty node</button>
          <span className={`canvas-chip canvas-status-chip ${statusLine.includes('failed') || statusLine.includes('Missing') ? 'is-error' : ''}`}>{statusLine}</span>
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
            <button className="canvas-zoom-reset" onClick={() => setZoomAt(1)} type="button">100%</button>
          </div>
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
              className={`canvas-tray-tab ${index === 0 ? 'is-active' : ''}`}
              style={{ borderColor: `${tray.color}55` }}
              type="button"
            >
              {tray.name}
            </button>
          ))}
        </div>

        <div
          className="canvas-world"
          style={{ transform: `translate(${activeSpace.viewport.panX}px, ${activeSpace.viewport.panY}px) scale(${activeSpace.viewport.zoom})` }}
        >
          <svg className="canvas-edge-layer">
            {activeSpace.edges.map(edge => {
              const from = nodeById.get(edge.from)
              const to = nodeById.get(edge.to)
              if (!from || !to) return null
              const a = centerOf(from)
              const b = centerOf(to)
              const midX = (a.x + b.x) / 2
              const d = `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`
              return (
                <g key={edge.id}>
                  <path className={`canvas-edge-path ${edge.type}`} d={d} stroke={edgeColor(edge.type)} />
                  {edge.label && (
                    <text className="canvas-edge-label" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 8} fill={edgeColor(edge.type)}>
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {activeSpace.nodes.map(node => {
            const isReference = activeSpace.edges.some(edge => edge.from === node.id && edge.type === 'reference')
            const status = node.generation?.status
            return (
            <div
              key={node.id}
              className={`canvas-node ${node.type} ${node.id === selectedNodeId ? 'is-selected' : ''} ${isReference ? 'is-reference' : ''} ${status ? `is-${status}` : ''}`}
              style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
              onMouseDown={(event) => startNodeDrag(event, node)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                event.stopPropagation()
                const world = screenToWorld(event.clientX, event.clientY)
                Array.from(event.dataTransfer.files).forEach(async (file, index) => {
                  const refId = await uploadFile(file, world.x - 320 - index * 22, world.y + index * 22)
                  addEdge(refId, node.id, 'reference', 'ref')
                })
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
              {status && status !== 'idle' && <div className={`canvas-node-status ${status}`}>{status}</div>}
              {node.id === selectedNodeId && (
                <>
                  <div className="canvas-floating-tools left">
                    <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); duplicateNode(node.id) }} title="Crop / duplicate working copy" type="button">⌗</button>
                    <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); runImageGeneration(node.id) }} title="Enhance" type="button">✧</button>
                    <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); splitGridNode(node.id) }} title="Split grid" type="button">▦</button>
                  </div>
                  <div className="canvas-floating-tools right">
                    <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setStatusLine('Add to scene will connect to Film Storyboard in the next pass') }} title="Add to scene" type="button">☆</button>
                    <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); focusSelectedNote(node.id) }} title="Note / prompt" type="button">✎</button>
                    <button onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); deleteNode(node.id) }} title="Delete" type="button">⌫</button>
                  </div>
                </>
              )}
              <div className="canvas-node-media">
                {node.type === 'image' && node.url ? <img src={node.url} alt={node.title} draggable={false} /> : null}
                {node.type === 'video' && node.url ? <video src={node.url} muted playsInline /> : null}
                {node.type === 'audio' ? <div className="canvas-node-placeholder">♪<br />Audio / music</div> : null}
                {node.type === 'document' ? <div className="canvas-node-placeholder">▤<br />PDF / DOCX context</div> : null}
                {(node.type === 'placeholder' || (!node.url && node.type !== 'audio' && node.type !== 'document')) ? <div className="canvas-node-placeholder">＋<br />Upload or generate media</div> : null}
              </div>
              <div className="canvas-node-footer">
                <span className="canvas-node-title">{node.title}</span>
                <div className="canvas-node-tools">
                  <button className="canvas-node-action" onClick={(event) => { event.stopPropagation(); setLinkMode({ from: node.id, type: 'derivative', label: 'derive' }); setStatusLine('Choose a target node for derivative link') }} title="Connect derivative" type="button">↗</button>
                  <button className="canvas-node-action" onClick={(event) => { event.stopPropagation(); setLinkMode({ from: node.id, type: 'reference', label: 'ref' }); setStatusLine('Choose a target node for reference link') }} title="Use as reference" type="button">◆</button>
                  <button className="canvas-node-action" onClick={(event) => { event.stopPropagation(); runImageGeneration(node.id, true) }} title="Generate variant" type="button">⧉</button>
                  <button className="canvas-node-action" onClick={(event) => { event.stopPropagation(); addPlaceholder('video', node.x + node.width + 120, node.y, node.id) }} title="Convert to video placeholder" type="button">▶</button>
                  <button className="canvas-node-action" onClick={(event) => { event.stopPropagation(); disconnectNode(node.id) }} title="Disconnect" type="button">⌁</button>
                  <button className="canvas-node-action" onClick={(event) => { event.stopPropagation(); deleteNode(node.id) }} title="Delete" type="button">×</button>
                </div>
              </div>
            </div>
            )
          })}
        </div>

        {activeSpace.nodes.length === 0 && (
          <div className="canvas-empty-hint">
            <strong>Full Canvas Mode</strong>
            <p>Drop images, videos, music, PDFs, or DOCX files here. Use right click to add placeholders. Pinch or two-finger scroll to zoom, drag empty canvas to pan.</p>
          </div>
        )}

        {contextMenu && (
          <div className="canvas-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button type="button" onClick={() => { addPlaceholder('image', contextMenu.worldX, contextMenu.worldY); setContextMenu(null) }}>Add image placeholder</button>
            <button type="button" onClick={() => { addPlaceholder('video', contextMenu.worldX, contextMenu.worldY); setContextMenu(null) }}>Add video placeholder</button>
            <button type="button" onClick={() => { addPlaceholder('document', contextMenu.worldX, contextMenu.worldY); setContextMenu(null) }}>Add PDF/DOCX node</button>
            <button type="button" onClick={() => { addSpace(); setContextMenu(null) }}>Add new space</button>
            {selectedNode && <button type="button" onClick={() => { duplicateNode(selectedNode.id); setContextMenu(null) }}>Duplicate selected</button>}
            {selectedNode && <button type="button" onClick={() => { runImageGeneration(selectedNode.id); setContextMenu(null) }}>Run selected node</button>}
            {selectedNode?.type === 'image' && <button type="button" onClick={() => { splitGridNode(selectedNode.id); setContextMenu(null) }}>Split selected 2×2</button>}
            {selectedNode && <button type="button" onClick={() => { setLinkMode({ from: selectedNode.id, type: 'reference', label: 'ref' }); setContextMenu(null) }}>Connect as reference...</button>}
            {selectedNode && <button type="button" onClick={() => { disconnectNode(selectedNode.id); setContextMenu(null) }}>Disconnect selected</button>}
          </div>
        )}

        {selectedNode && (
          <div className="canvas-note-composer">
            <textarea
              value={selectedNode.prompt}
              onChange={(event) => updateNode(selectedNode.id, node => { node.prompt = event.target.value })}
              placeholder="Leave an iteration note..."
              rows={4}
            />
            <button className="canvas-note-reset" onClick={() => updateNode(selectedNode.id, node => { node.prompt = '' })} title="Clear prompt" type="button">↻</button>
            <div className="canvas-note-title">
              <input
                value={selectedNode.title}
                onChange={(event) => updateNode(selectedNode.id, node => { node.title = event.target.value })}
                aria-label="Selected node title"
              />
              <span>{selectedNode.type}</span>
              <span>{selectedRefNodes.length}/8 refs</span>
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
                {selectedRefNodes.map((node, index) => (
                  <button key={node.id} type="button" title={node.title} onClick={() => setSelectedNodeId(node.id)}>
                    {node.url && node.type === 'image' ? <img src={node.url} alt="" /> : <span>{node.type[0].toUpperCase()}</span>}
                    <small>{index + 1}</small>
                  </button>
                ))}
                {selectedRefNodes.length === 0 && <span>{selectedRefNodes.length}/8 · {activeJobs > 0 ? `${activeJobs} generating` : 'ready'}</span>}
              </div>
              <button className="canvas-note-ok" onClick={() => runImageGeneration(selectedNode.id)} title="Run generation" type="button">✓</button>
            </div>
            {noteAttachOpen && (
              <div className="canvas-note-popover attach">
                <strong>Attach references</strong>
                <p>Upload files or press ◆ on another node, then click this node.</p>
                <button type="button" onClick={() => refFileRef.current?.click()}>Upload reference files</button>
                <button type="button" onClick={() => setLinkMode({ from: selectedNode.id, type: 'reference', label: 'ref' })}>Use selected as reference source</button>
              </div>
            )}
            {noteSkillsOpen && (
              <div className="canvas-note-popover skills">
                <strong>Skills / prompts</strong>
                <button type="button" onClick={() => updateNode(selectedNode.id, node => { node.prompt = `${node.prompt}\n\nCreate 2x2 grid with 4 panels with 3d animated scenes in each one:`.trim() })}>Inject 2×2 grid line</button>
                <button type="button" onClick={() => updateNode(selectedNode.id, node => { node.prompt = `${node.prompt}\n\nAll panels must be consistent between each other as to backgrounds, positioning and characters.`.trim() })}>Inject consistency tag</button>
              </div>
            )}
            {noteSettingsOpen && (
              <div className="canvas-note-popover settings">
                <strong>Generation Models</strong>
                <select
                  value={selectedGeneration.model}
                  onChange={(event) => {
                    const preset = imageModels.find(item => item.id === event.target.value) || imageModels[0]
                    updateNode(selectedNode.id, node => {
                      node.generation = { ...(node.generation || defaultGeneration()), model: preset.id, quality: preset.quality, detailLevel: preset.detailLevel }
                    })
                  }}
                >
                  {imageModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                </select>
                <div className="canvas-settings-row">
                  {['16:9', '9:16', '1:1', '4:3'].map(ar => (
                    <button key={ar} className={selectedGeneration.aspectRatio === ar ? 'is-active' : ''} onClick={() => updateNode(selectedNode.id, node => { node.generation = { ...(node.generation || defaultGeneration()), aspectRatio: ar } })} type="button">{ar}</button>
                  ))}
                </div>
                <div className="canvas-settings-row">
                  {['2160p', '1440p', '1080p'].map(q => (
                    <button key={q} className={selectedGeneration.quality === q ? 'is-active' : ''} onClick={() => updateNode(selectedNode.id, node => { node.generation = { ...(node.generation || defaultGeneration()), quality: q } })} type="button">{q}</button>
                  ))}
                </div>
                <button type="button" onClick={() => runTwoVariants(selectedNode.id)}>Run 2 variants</button>
                {selectedNode.type === 'image' && <button type="button" onClick={() => splitGridNode(selectedNode.id)}>Split 2×2</button>}
              </div>
            )}
            <div className="canvas-note-counter">{selectedNode.prompt.length}/5000 · {activeJobs > 0 ? `${activeJobs} images generating` : '0 active generations'}</div>
            <button className="canvas-note-video" onClick={() => addPlaceholder('video', selectedNode.x + selectedNode.width + 120, selectedNode.y + 250, selectedNode.id)} title="Create video placeholder" type="button">▶</button>
            <button className="canvas-note-variant" onClick={() => runImageGeneration(selectedNode.id, true)} title="Generate variant" type="button">⧉</button>
            </div>
        )}
      </div>

      <aside className="canvas-agent-panel">
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
              <p>This chat is intentionally isolated from Director&apos;s Cut while Gemini is busy elsewhere.</p>
              <p>Selected context: {selectedNode ? selectedNode.title : 'nothing selected'}</p>
              <p>Graph: {activeSpace.nodes.length} nodes, {activeSpace.edges.length} links.</p>
              <p>Tip: press ◆ on one node, then click another node to attach it as a golden reference. Drop a file onto any node to auto-create a REF node.</p>
            </>
          )}
          {agentTab === 'skills' && <p>Canvas-owned Skills Store copy will plug in here next.</p>}
          {agentTab === 'prompts' && <p>Canvas-owned Prompt Store copy will plug in here next.</p>}
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
          <textarea value={agentDraft} onChange={event => setAgentDraft(event.target.value)} placeholder="Ask the canvas agent. This shell will later attach selected nodes and groups automatically." rows={5} />
          <div className="canvas-agent-actions">
            <button type="button" onClick={() => {
              if (!agentDraft.trim()) return
              const anchor = selectedNode || activeSpace.nodes[activeSpace.nodes.length - 1]
              const x = anchor ? anchor.x + anchor.width + 120 : screenToWorld(window.innerWidth / 2, window.innerHeight / 2).x
              const y = anchor ? anchor.y : screenToWorld(window.innerWidth / 2, window.innerHeight / 2).y
              const id = addNode({ type: 'placeholder', title: 'Prompt node', prompt: agentDraft }, x, y)
              if (anchor) addEdge(anchor.id, id, 'derivative', 'prompt')
              setAgentDraft('')
              setStatusLine('Prompt node created')
            }}>Create node</button>
            <button type="button" onClick={() => {
              if (!selectedNode || !agentDraft.trim()) return
              updateNode(selectedNode.id, node => { node.prompt = node.prompt ? `${node.prompt}\n\n${agentDraft}` : agentDraft })
              setAgentDraft('')
              setStatusLine('Prompt appended to selected node')
            }}>Append to selected</button>
          </div>
        </div>
      </aside>
    </div>
  )
}

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

const storyboardRoot = path.resolve(process.cwd(), 'public/assets/storyboard')
const storyboardUploads = path.join(storyboardRoot, 'uploads')
const storyboardDataFile = path.join(storyboardRoot, 'storyboard-data.json')

// Task system directories
const tasksRoot = path.join(storyboardRoot, 'tasks')
const tasksCurrentDir = path.join(tasksRoot, 'current')
const tasksArchivedDir = path.join(tasksRoot, 'archived')

function ensureStoryboardFolders() {
  fs.mkdirSync(storyboardUploads, { recursive: true })
  fs.mkdirSync(tasksCurrentDir, { recursive: true })
  fs.mkdirSync(tasksArchivedDir, { recursive: true })
  if (!fs.existsSync(storyboardDataFile)) {
    fs.writeFileSync(storyboardDataFile, JSON.stringify({ actors: ['Aisha', 'Dora', 'Niura', 'Altair', 'Djinn', 'Sharak'], locations: [], acts: [] }, null, 2))
  }
}

function collectBody(req: import('node:http').IncomingMessage) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function sendJson(res: import('node:http').ServerResponse, payload: unknown, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function isInsideStoryboard(filePath: string) {
  const relative = path.relative(storyboardRoot, filePath)
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

function safeFileName(fileName: string) {
  const ext = path.extname(fileName)
  const base = path.basename(fileName, ext).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'storyboard-media'
  return `${base}-${Date.now()}${ext.toLowerCase()}`
}

function parseMultipartFile(body: Buffer, boundary: string) {
  const boundaryBuffer = Buffer.from(`--${boundary}`)
  const parts: { headers: string; content: Buffer }[] = []
  let cursor = body.indexOf(boundaryBuffer)

  while (cursor !== -1) {
    const next = body.indexOf(boundaryBuffer, cursor + boundaryBuffer.length)
    if (next === -1) break
    let part = body.subarray(cursor + boundaryBuffer.length, next)
    if (part.subarray(0, 2).toString() === '\r\n') part = part.subarray(2)
    if (part.subarray(part.length - 2).toString() === '\r\n') part = part.subarray(0, part.length - 2)
    const split = part.indexOf(Buffer.from('\r\n\r\n'))
    if (split > -1) parts.push({ headers: part.subarray(0, split).toString(), content: part.subarray(split + 4) })
    cursor = next
  }

  const filePart = parts.find((part) => /name="file"/.test(part.headers))
  if (!filePart) return null
  const fileName = filePart.headers.match(/filename="([^"]+)"/)?.[1] || 'storyboard-media'
  const mimeType = filePart.headers.match(/Content-Type:\s*([^\r\n]+)/i)?.[1] || 'application/octet-stream'
  return { content: filePart.content, fileName, mimeType }
}

function pickByQuery<T extends { id?: string; title?: string }>(items: T[] = [], queryValue: string | null, fallbackIndex = 0) {
  if (!queryValue) return items[fallbackIndex]
  const normalized = queryValue.trim().toLowerCase()
  const numeric = Number(normalized.replace(/^(act|scene)\s*/i, ''))
  if (Number.isFinite(numeric) && numeric > 0) return items[numeric - 1] || items[fallbackIndex]
  return items.find((item) => item.id?.toLowerCase() === normalized || item.title?.toLowerCase() === normalized) || items[fallbackIndex]
}

function mediaPaths(media: { localPath?: string; url?: string }[] = []) {
  return media.map((item) => item.localPath || item.url).filter(Boolean)
}

function buildScenePacket(reqUrl = '') {
  const data = JSON.parse(fs.readFileSync(storyboardDataFile, 'utf8')) as any
  const url = new URL(reqUrl, 'http://localhost')
  const act = pickByQuery<any>(data.acts, url.searchParams.get('act'))
  const scene = pickByQuery<any>(act?.scenes, url.searchParams.get('scene'))
  const resourceRefs = scene?.resourceRefs || {}
  const resources = data.resources || { actors: [], locations: [], props: [] }
  const attachedResources = Object.fromEntries((['actors', 'locations', 'props'] as const).map((type) => {
    const ids = resourceRefs[type] || []
    return [type, (resources[type] || []).filter((resource: { id: string }) => ids.includes(resource.id))]
  }))

  return {
    storyboardDataFile,
    storyboardRoot,
    uploadsFolder: storyboardUploads,
    act,
    scene,
    attachedResources,
    selectedMediaPaths: {
      imageShots: (scene?.imageShots || []).map((shot: { title: string; media: { id: string; localPath?: string; url?: string }[]; selectedMediaId?: string }) => ({
        title: shot.title,
        paths: mediaPaths(shot.media.filter((item) => !shot.selectedMediaId || item.id === shot.selectedMediaId)),
      })),
      videoShots: (scene?.videoShots || []).map((shot: { title: string; media: { id: string; localPath?: string; url?: string }[]; selectedMediaId?: string }) => ({
        title: shot.title,
        paths: mediaPaths(shot.media.filter((item) => !shot.selectedMediaId || item.id === shot.selectedMediaId)),
      })),
    },
  }
}

function storyboardApiPlugin() {
  return {
    name: 'aisha-storyboard-api',
    configureServer(server: ViteDevServer) {
      ensureStoryboardFolders()

      server.middlewares.use('/api/storyboard/upload', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        const contentType = req.headers['content-type'] || ''
        const boundary = String(contentType).match(/boundary=(.+)$/)?.[1]
        if (!boundary) return sendJson(res, { error: 'Missing multipart boundary' }, 400)

        try {
          const body = await collectBody(req)
          const file = parseMultipartFile(body, boundary)
          if (!file) return sendJson(res, { error: 'No file field found' }, 400)
          const storedName = safeFileName(file.fileName)
          const storedPath = path.join(storyboardUploads, storedName)
          fs.writeFileSync(storedPath, file.content)
          sendJson(res, {
            fileName: file.fileName,
            mimeType: file.mimeType,
            localPath: storedPath,
            url: `/assets/storyboard/uploads/${storedName}`,
          })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Upload failed' }, 500)
        }
      })

      server.middlewares.use('/api/storyboard/reveal', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const payload = JSON.parse(body.toString() || '{}') as { path?: string }
          const targetPath = path.resolve(String(payload.path || ''))
          if (!isInsideStoryboard(targetPath) || !fs.existsSync(targetPath)) {
            return sendJson(res, { error: 'File is outside storyboard folder or does not exist' }, 400)
          }
          spawn('open', ['-R', targetPath], { detached: true, stdio: 'ignore' }).unref()
          sendJson(res, { ok: true, localPath: targetPath })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Reveal failed' }, 500)
        }
      })

      server.middlewares.use('/api/storyboard/scene', async (req, res) => {
        ensureStoryboardFolders()
        if (req.method !== 'GET') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          sendJson(res, buildScenePacket(req.url || ''))
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Scene packet failed' }, 500)
        }
      })

      server.middlewares.use('/api/storyboard', async (req, res) => {
        ensureStoryboardFolders()
        if (req.method === 'GET') {
          const data = fs.readFileSync(storyboardDataFile, 'utf8')
          res.setHeader('Content-Type', 'application/json')
          res.end(data)
          return
        }

        if (req.method === 'POST') {
          try {
            const body = await collectBody(req)
            const payload = JSON.parse(body.toString() || '{}')
            fs.writeFileSync(storyboardDataFile, JSON.stringify(payload, null, 2))
            sendJson(res, { ok: true, localPath: storyboardDataFile })
          } catch (error) {
            sendJson(res, { error: error instanceof Error ? error.message : 'Save failed' }, 500)
          }
          return
        }

        sendJson(res, { error: 'Method not allowed' }, 405)
      })

      // ═══════════════════════════════════════════
      // TASK SYSTEM API — Real file-based tasks
      // ═══════════════════════════════════════════

      // CREATE a new task → saves JSON to tasks/current/
      server.middlewares.use('/api/tasks/create', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const task = JSON.parse(body.toString() || '{}')
          if (!task.id) return sendJson(res, { error: 'Task must have an id' }, 400)
          const filePath = path.join(tasksCurrentDir, `${task.id}.json`)
          fs.writeFileSync(filePath, JSON.stringify(task, null, 2))
          sendJson(res, { ok: true, id: task.id, filePath })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Create failed' }, 500)
        }
      })

      // LIST all current tasks
      server.middlewares.use('/api/tasks/current', async (req, res) => {
        if (req.method !== 'GET') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const files = fs.readdirSync(tasksCurrentDir).filter(f => f.endsWith('.json'))
          const tasks = files.map(f => JSON.parse(fs.readFileSync(path.join(tasksCurrentDir, f), 'utf8')))
          sendJson(res, { tasks })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'List failed' }, 500)
        }
      })

      // POLL a specific task for updates (Theo writes images back into the JSON)
      server.middlewares.use('/api/tasks/poll', async (req, res) => {
        if (req.method !== 'GET') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const url = new URL(req.url || '', 'http://localhost')
          const taskId = url.searchParams.get('id')
          if (!taskId) return sendJson(res, { error: 'Missing task id' }, 400)
          const filePath = path.join(tasksCurrentDir, `${taskId}.json`)
          if (!fs.existsSync(filePath)) return sendJson(res, { error: 'Task not found', found: false }, 404)
          const task = JSON.parse(fs.readFileSync(filePath, 'utf8'))
          sendJson(res, { found: true, task })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Poll failed' }, 500)
        }
      })

      // UPDATE a task (e.g., request new pass, add notes)
      server.middlewares.use('/api/tasks/update', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const update = JSON.parse(body.toString() || '{}')
          if (!update.id) return sendJson(res, { error: 'Missing task id' }, 400)
          const filePath = path.join(tasksCurrentDir, `${update.id}.json`)
          if (!fs.existsSync(filePath)) return sendJson(res, { error: 'Task not found' }, 404)
          const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'))
          const merged = { ...existing, ...update, updatedAt: new Date().toISOString() }
          fs.writeFileSync(filePath, JSON.stringify(merged, null, 2))
          sendJson(res, { ok: true, task: merged })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Update failed' }, 500)
        }
      })

      // ARCHIVE a task → moves file from current/ to archived/
      server.middlewares.use('/api/tasks/archive', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { id } = JSON.parse(body.toString() || '{}')
          if (!id) return sendJson(res, { error: 'Missing task id' }, 400)
          const src = path.join(tasksCurrentDir, `${id}.json`)
          const dest = path.join(tasksArchivedDir, `${id}.json`)
          if (!fs.existsSync(src)) return sendJson(res, { error: 'Task not found in current' }, 404)
          // Update status before archiving
          const task = JSON.parse(fs.readFileSync(src, 'utf8'))
          task.status = 'archived'
          task.archivedAt = new Date().toISOString()
          fs.writeFileSync(dest, JSON.stringify(task, null, 2))
          fs.unlinkSync(src)
          sendJson(res, { ok: true, archivedPath: dest })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Archive failed' }, 500)
        }
      })

      // LIST archived tasks
      server.middlewares.use('/api/tasks/archived', async (req, res) => {
        if (req.method !== 'GET') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const files = fs.readdirSync(tasksArchivedDir).filter(f => f.endsWith('.json'))
          const tasks = files.map(f => JSON.parse(fs.readFileSync(path.join(tasksArchivedDir, f), 'utf8')))
          sendJson(res, { tasks })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'List archived failed' }, 500)
        }
      })

      // DOWNLOAD ZIP — bundles selected images into a single zip file
      server.middlewares.use('/api/tasks/download-zip', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { urls, name } = JSON.parse(body.toString() || '{}')
          if (!urls || !urls.length) return sendJson(res, { error: 'No URLs provided' }, 400)

          const { execSync } = require('child_process')
          const publicDir = path.join(process.cwd(), 'public')
          const tmpDir = path.join(process.cwd(), 'tmp', `zip-${Date.now()}`)
          fs.mkdirSync(tmpDir, { recursive: true })

          let fileCount = 0
          for (const url of urls) {
            const fullPath = path.join(publicDir, url.replace(/^\//, ''))
            if (fs.existsSync(fullPath)) {
              const destName = path.basename(fullPath)
              fs.copyFileSync(fullPath, path.join(tmpDir, destName))
              fileCount++
            }
          }

          if (fileCount === 0) return sendJson(res, { error: 'No files found' }, 404)

          const zipPath = path.join(process.cwd(), 'tmp', `${(name || 'images').replace(/[^a-z0-9]+/gi, '-')}-${Date.now()}.zip`)
          execSync(`cd "${tmpDir}" && zip -j "${zipPath}" *`, { timeout: 60000 })

          const zipData = fs.readFileSync(zipPath)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/zip')
          res.setHeader('Content-Disposition', `attachment; filename="${path.basename(zipPath)}"`)
          res.end(zipData)

          fs.rmSync(tmpDir, { recursive: true, force: true })
          fs.unlinkSync(zipPath)
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Zip failed' }, 500)
        }
      })

      // ═══════════════════════════════════════════
      // SKILLS API — Reusable skill definitions
      // ═══════════════════════════════════════════
      const skillsDir = path.join(storyboardRoot, 'skills')
      fs.mkdirSync(skillsDir, { recursive: true })

      // LIST all saved skills
      server.middlewares.use('/api/skills/list', async (req, res) => {
        if (req.method !== 'GET') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.json'))
          const skills = files.map(f => JSON.parse(fs.readFileSync(path.join(skillsDir, f), 'utf8')))
          sendJson(res, { skills })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'List skills failed' }, 500)
        }
      })

      // READ full .md file for a skill
      server.middlewares.use('/api/skills/read-md', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { id } = JSON.parse(body.toString() || '{}')
          const mdPath = path.join(skillsDir, `${id}.md`)
          if (fs.existsSync(mdPath)) {
            const content = fs.readFileSync(mdPath, 'utf8')
            sendJson(res, { content })
          } else {
            sendJson(res, { content: '' })
          }
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Read failed' }, 500)
        }
      })

      // ═══════════════════════════════════════════
      // GEMINI MEMORY SYSTEM
      // ═══════════════════════════════════════════
      const memoryDir = path.join(storyboardRoot, 'memory')
      fs.mkdirSync(memoryDir, { recursive: true })

      // LIST memories (default: last 3 days, ?days=N for custom, ?all=true for everything)
      server.middlewares.use('/api/memory/list', async (req, res) => {
        if (req.method !== 'GET') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const url = new URL(req.url || '', 'http://localhost')
          const showAll = url.searchParams.get('all') === 'true'
          const days = parseInt(url.searchParams.get('days') || '3', 10)
          const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.json')).sort().reverse()
          const cutoff = showAll ? 0 : Date.now() - days * 24 * 60 * 60 * 1000
          const memories = files.map(f => {
            const data = JSON.parse(fs.readFileSync(path.join(memoryDir, f), 'utf8'))
            return data
          }).filter(m => showAll || new Date(m.createdAt).getTime() > cutoff)
          sendJson(res, { memories })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'List memories failed' }, 500)
        }
      })

      // SEARCH memories by keyword (searches all time)
      server.middlewares.use('/api/memory/search', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { query } = JSON.parse(body.toString() || '{}')
          if (!query) return sendJson(res, { memories: [] })
          const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.json')).sort().reverse()
          const q = query.toLowerCase()
          const memories = files.map(f => JSON.parse(fs.readFileSync(path.join(memoryDir, f), 'utf8')))
            .filter((m: any) => (m.summary || '').toLowerCase().includes(q) || (m.topic || '').toLowerCase().includes(q))
          sendJson(res, { memories })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Search failed' }, 500)
        }
      })

      // SAVE a memory
      server.middlewares.use('/api/memory/save', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const memory = JSON.parse(body.toString() || '{}')
          if (!memory.id) memory.id = `mem-${Date.now()}`
          if (!memory.createdAt) memory.createdAt = new Date().toISOString()
          const filePath = path.join(memoryDir, `${memory.id}.json`)
          fs.writeFileSync(filePath, JSON.stringify(memory, null, 2))
          sendJson(res, { ok: true, memory })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Save memory failed' }, 500)
        }
      })

      // ═══════════════════════════════════════════
      // PDF DOCUMENTS API
      // ═══════════════════════════════════════════
      const docsDir = path.join(storyboardRoot, 'docs')
      fs.mkdirSync(docsDir, { recursive: true })
      const pinsFile = path.join(docsDir, '_pins.json')
      if (!fs.existsSync(pinsFile)) fs.writeFileSync(pinsFile, '[]')

      // LIST documents
      server.middlewares.use('/api/docs/list', async (req, res) => {
        if (req.method !== 'GET') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.pdf'))
          const pins: string[] = JSON.parse(fs.readFileSync(pinsFile, 'utf8') || '[]')
          const docs = files.map(f => ({
            name: f,
            size: fs.statSync(path.join(docsDir, f)).size,
            pinned: pins.includes(f),
            path: `/assets/storyboard/docs/${f}`
          }))
          sendJson(res, { docs })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'List docs failed' }, 500)
        }
      })

      // UPLOAD PDF (raw binary)
      server.middlewares.use('/api/docs/upload', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', () => {
            const buf = Buffer.concat(chunks)
            const filename = (req.headers['x-filename'] as string) || `doc-${Date.now()}.pdf`
            const filePath = path.join(docsDir, filename)
            fs.writeFileSync(filePath, buf)
            // Auto-pin new uploads
            const pins: string[] = JSON.parse(fs.readFileSync(pinsFile, 'utf8') || '[]')
            if (!pins.includes(filename)) { pins.push(filename); fs.writeFileSync(pinsFile, JSON.stringify(pins)) }
            sendJson(res, { ok: true, name: filename, path: `/assets/storyboard/docs/${filename}` })
          })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Upload failed' }, 500)
        }
      })

      // PIN/UNPIN document
      server.middlewares.use('/api/docs/pin', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { name, pinned } = JSON.parse(body.toString() || '{}')
          const pins: string[] = JSON.parse(fs.readFileSync(pinsFile, 'utf8') || '[]')
          if (pinned && !pins.includes(name)) pins.push(name)
          else if (!pinned) { const idx = pins.indexOf(name); if (idx > -1) pins.splice(idx, 1) }
          fs.writeFileSync(pinsFile, JSON.stringify(pins))
          sendJson(res, { ok: true })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Pin failed' }, 500)
        }
      })

      // SAVE a new skill (writes both .json and .md)
      server.middlewares.use('/api/skills/save', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const skill = JSON.parse(body.toString() || '{}')
          if (!skill.id) skill.id = `skill-${Date.now()}`
          // Save JSON
          const jsonPath = path.join(skillsDir, `${skill.id}.json`)
          fs.writeFileSync(jsonPath, JSON.stringify(skill, null, 2))
          // Also save .md with the full text if available
          if (skill.fullText || skill.description) {
            const mdContent = `# ${skill.name || 'Untitled Skill'}\n\n${skill.fullText || skill.description || ''}`
            const mdPath = path.join(skillsDir, `${skill.id}.md`)
            fs.writeFileSync(mdPath, mdContent)
          }
          sendJson(res, { ok: true, skill })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Save skill failed' }, 500)
        }
      })

      // DELETE a skill
      server.middlewares.use('/api/skills/delete', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { id } = JSON.parse(body.toString() || '{}')
          if (!id) return sendJson(res, { error: 'No skill id' }, 400)
          const jsonPath = path.join(skillsDir, `${id}.json`)
          const mdPath = path.join(skillsDir, `${id}.md`)
          if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath)
          if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath)
          sendJson(res, { ok: true })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Delete failed' }, 500)
        }
      })

      // SPLIT GRID — Batch: splits ALL images in ONE Python call (fast!)
      server.middlewares.use('/api/skills/split-grid-batch', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { images } = JSON.parse(body.toString() || '{}')
          if (!images || !images.length) return sendJson(res, { error: 'No images' }, 400)

          const { execFileSync } = require('child_process')
          const publicDir = path.join(process.cwd(), 'public')
          const batchScript = path.join(process.cwd(), 'tools', 'batch_split.py')
          
          const output = execFileSync('python3', [batchScript, publicDir, storyboardUploads], {
            input: JSON.stringify({ images }),
            timeout: 600000,
            maxBuffer: 50 * 1024 * 1024,
          }).toString()
          
          const panels = JSON.parse(output)
          const formattedPanels = panels.map((p: any) => ({
            id: `split-${p.imgId}-r${p.row}c${p.col}-${Date.now()}`,
            url: `/assets/storyboard/uploads/${p.outDir}/${p.filename}`,
            row: p.row, col: p.col, width: p.width, height: p.height,
            note: `Panel ${p.row},${p.col} (${p.width}x${p.height})`,
            selected: false, improve4k: false, splitGrid: false,
          }))

          sendJson(res, { ok: true, panels: formattedPanels, total: formattedPanels.length })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Batch split failed' }, 500)
        }
      })

      // SPLIT GRID — Single image (kept for compatibility)
      server.middlewares.use('/api/skills/split-grid', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { imagePath, splitType } = JSON.parse(body.toString() || '{}')
          if (!imagePath) return sendJson(res, { error: 'Missing imagePath' }, 400)
          const fullPath = imagePath.startsWith('/') ? path.join(process.cwd(), 'public', imagePath) : path.resolve(imagePath)
          if (!fs.existsSync(fullPath)) return sendJson(res, { error: `Image not found` }, 404)
          const outputDir = path.join(storyboardUploads, `split-${Date.now()}`)
          const toolPath = path.join(process.cwd(), 'tools', 'split_grid.py')
          const { execSync } = require('child_process')
          const result = JSON.parse(execSync(`python3 "${toolPath}" "${fullPath}" "${outputDir}" "${splitType || '2x2'}"`, { timeout: 30000 }).toString())
          if (!result.ok) return sendJson(res, { error: 'Split failed' }, 500)
          const panels = result.panels.map((p: any) => ({ url: `/assets/storyboard/uploads/${path.basename(outputDir)}/${p.filename}`, localPath: p.path, row: p.row, col: p.col, width: p.width, height: p.height }))
          sendJson(res, { ok: true, panels, sourceWidth: result.source.width, sourceHeight: result.source.height })
        } catch (error) { sendJson(res, { error: error instanceof Error ? error.message : 'Split grid failed' }, 500) }
      })

      // ENHANCE QUALITY — Sends images to PixVerse CLI for quality improvement
      // Runs entirely in the server — no external agent needed
      server.middlewares.use('/api/skills/enhance', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { imagePath, prompt, model, quality, aspectRatio } = JSON.parse(body.toString() || '{}')
          if (!imagePath) return sendJson(res, { error: 'Missing imagePath' }, 400)

          const fullPath = imagePath.startsWith('/') 
            ? path.join(process.cwd(), 'public', imagePath) 
            : path.resolve(imagePath)
          
          if (!fs.existsSync(fullPath)) return sendJson(res, { error: `Image not found` }, 404)

          const defaultPrompt = 'Use exact @img1 image 1 but improve quality of character(s), objects and resolution. Do not change camera angle, composition, architecture or objects. The characters should remain in same poses and all objects in the same places. Camera should remain same angle exact the same as @img1 only improve quality. Style: 3d animated movie, cinematic AAA level 3d animation'

          const args = [
            'npx', 'pixverse-cli', 'create', 'image',
            '--prompt', prompt || defaultPrompt,
            '--image', fullPath,
            '--model', model || 'seedream-4.5',
            '--quality', quality || '2160p',
            '--aspect-ratio', aspectRatio || '16:9',
            '--json',
          ]

          const { execSync } = require('child_process')
          const result = JSON.parse(execSync(args.join(' '), { timeout: 300000 }).toString())

          if (result.image_url) {
            // Download the enhanced image
            const outDir = path.join(storyboardUploads, `enhanced-${Date.now()}`)
            fs.mkdirSync(outDir, { recursive: true })
            const outName = `${(model || 'seedream-4.5').replace(/\./g, '-')}_${quality || '2160p'}.png`
            const outPath = path.join(outDir, outName)
            execSync(`curl -sL "${result.image_url}" -o "${outPath}"`)
            
            sendJson(res, { 
              ok: true, 
              url: `/assets/storyboard/uploads/${path.basename(outDir)}/${outName}`,
              model: model || 'seedream-4.5',
              quality: quality || '2160p',
              sourceAssetId: result.asset_id,
            })
          } else {
            sendJson(res, { error: 'No image returned from PixVerse' }, 500)
          }
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Enhance failed' }, 500)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), storyboardApiPlugin()],
})

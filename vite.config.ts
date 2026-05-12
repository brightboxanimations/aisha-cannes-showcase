import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

const storyboardRoot = path.resolve(process.cwd(), 'public/assets/storyboard')
const storyboardUploads = path.join(storyboardRoot, 'uploads')
const storyboardDataFile = path.join(storyboardRoot, 'storyboard-data.json')
const canvasModeDataFile = path.join(storyboardRoot, 'canvas-mode-data.json')
const videoJobsDir = path.join(storyboardRoot, 'video-jobs')

// Task system directories
const tasksRoot = path.join(storyboardRoot, 'tasks')
const tasksCurrentDir = path.join(tasksRoot, 'current')
const tasksArchivedDir = path.join(tasksRoot, 'archived')

function ensureStoryboardFolders() {
  fs.mkdirSync(storyboardUploads, { recursive: true })
  fs.mkdirSync(videoJobsDir, { recursive: true })
  fs.mkdirSync(tasksCurrentDir, { recursive: true })
  fs.mkdirSync(tasksArchivedDir, { recursive: true })
  if (!fs.existsSync(storyboardDataFile)) {
    fs.writeFileSync(storyboardDataFile, JSON.stringify({ actors: ['Aisha', 'Dora', 'Niura', 'Altair', 'Djinn', 'Sharak'], locations: [], acts: [] }, null, 2))
  }
  if (!fs.existsSync(canvasModeDataFile)) {
    fs.writeFileSync(canvasModeDataFile, JSON.stringify({ version: 1, activeSpaceId: '', spaces: [] }, null, 2))
  }
}

function videoJobFile(jobId: string) {
  return path.join(videoJobsDir, `${jobId.replace(/[^a-z0-9_-]+/gi, '-')}.json`)
}

function writeVideoJob(job: Record<string, unknown>) {
  fs.writeFileSync(videoJobFile(String(job.id || 'video-job')), JSON.stringify(job, null, 2))
}

function appendVideoJobToStoryboard(job: Record<string, any>, saved: { url: string; localPath: string }) {
  const actId = String(job.actId || '')
  const sceneId = String(job.sceneId || '')
  const shotId = String(job.shotId || '')
  const mode = String(job.mode || 'videos')
  if (!actId || !sceneId || !shotId || !fs.existsSync(storyboardDataFile)) return
  const data = JSON.parse(fs.readFileSync(storyboardDataFile, 'utf8'))
  const act = data.acts?.find((item: any) => item.id === actId)
  const scene = act?.scenes?.find((item: any) => item.id === sceneId)
  const shotsKey = mode === 'videos' ? 'videoShots' : mode === 'audio' ? 'audioShots' : 'imageShots'
  const shot = scene?.[shotsKey]?.find((item: any) => item.id === shotId)
  if (!shot) return
  shot.media = Array.isArray(shot.media) ? shot.media : []
  if (shot.media.some((media: any) => media.localPath === saved.localPath || media.url === saved.url)) return
  const media = {
    id: `media-${String(job.model || 'video').replace(/[^a-z0-9_-]+/gi, '-')}-${Date.now()}`,
    type: 'video',
    url: saved.url,
    fileName: path.basename(saved.localPath),
    localPath: saved.localPath,
    createdAt: new Date().toISOString(),
  }
  shot.media.push(media)
  shot.selectedMediaId = media.id
  if (typeof job.prompt === 'string' && job.prompt.trim()) shot.prompt = job.prompt
  fs.writeFileSync(storyboardDataFile, JSON.stringify(data, null, 2))
}

const resumingVideoJobs = new Set<string>()
const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function isCompletedPixVerseVideoPayload(payload: any) {
  const status = String(payload?.status || payload?.data?.status || payload?.video?.status || '').toLowerCase()
  const statusCode = payload?.status_code ?? payload?.data?.status_code ?? payload?.video?.status_code
  const hasPlayableUrl = Boolean(payload?.video_url || payload?.url || payload?.asset_url || payload?.output_url || payload?.video?.url || payload?.video?.asset_url || payload?.data?.video_url || payload?.data?.url || payload?.data?.video?.url || payload?.assets?.[0]?.url || payload?.outputs?.[0]?.url)
  return hasPlayableUrl || /completed|succeeded|success|done/.test(status) || statusCode === 1 || statusCode === 20
}

function getPixVerseVideoUrl(payload: any) {
  return [
    payload?.video_url,
    payload?.url,
    payload?.asset_url,
    payload?.output_url,
    payload?.video?.url,
    payload?.video?.asset_url,
    payload?.data?.video_url,
    payload?.data?.url,
    payload?.data?.video?.url,
    payload?.assets?.[0]?.url,
    payload?.outputs?.[0]?.url,
  ].find(Boolean)
}

function runPixVerseJson(command: string, timeout = 180000): Promise<any> {
  const { exec } = require('node:child_process')
  return new Promise((resolve, reject) => {
    exec(command, { timeout, cwd: process.cwd(), maxBuffer: 12 * 1024 * 1024 }, (err: any, stdout: string, stderr: string) => {
      if (err) return reject(new Error(stderr || err.message || String(err)))
      try { resolve(JSON.parse(stdout)) } catch { reject(new Error('Invalid PixVerse JSON: ' + stdout.slice(0, 260))) }
    })
  })
}

async function downloadRemoteVideoWithRetry(videoUrl: string, outPath: string, attempts = 30) {
  const { exec } = require('node:child_process')
  let lastError = ''
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
    } catch {
      // Best effort cleanup before retrying a possibly partial file.
    }
    try {
      await new Promise((resolve, reject) => {
        exec(
          `curl -fL --retry 2 --retry-delay 2 --retry-all-errors ${JSON.stringify(videoUrl)} -o ${JSON.stringify(outPath)}`,
          { timeout: 180000 },
          (err: any, _stdout: string, stderr: string) => err ? reject(new Error(stderr || err.message || String(err))) : resolve(null),
        )
      })
      const size = fs.existsSync(outPath) ? fs.statSync(outPath).size : 0
      if (size >= 100000) return
      lastError = `downloaded file was too small (${size} bytes)`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await waitMs(attempt < 4 ? 5000 : 10000)
  }
  throw new Error(`PixVerse completed the task, but the media URL was not downloadable after retries: ${lastError}`)
}

async function resumeVideoJob(job: Record<string, any>) {
  const jobId = String(job.id || '')
  const pixverseId = String(job.pixverseId || '')
  if (!jobId || !pixverseId || resumingVideoJobs.has(jobId)) return
  resumingVideoJobs.add(jobId)
  try {
    const completed = await runPixVerseJson(`npx pixverse-cli task wait ${JSON.stringify(pixverseId)} --type video --timeout 120 --json`, 180000)
    if (!isCompletedPixVerseVideoPayload(completed)) throw new Error('PixVerse video is not completed yet.')
    const videoUrl = getPixVerseVideoUrl(completed)
    if (!videoUrl) throw new Error('Completed PixVerse video did not include a video URL.')
    const outName = `video-${String(job.model || 'pixverse').replace(/\./g, '-')}-${Date.now()}.mp4`
    const outPath = path.join(storyboardUploads, outName)
    if (/^https?:\/\//i.test(String(videoUrl))) {
      await downloadRemoteVideoWithRetry(String(videoUrl), outPath)
    } else {
      const resolvedVideoPath = String(videoUrl).startsWith('/') ? path.join(path.resolve(process.cwd(), 'public'), String(videoUrl).replace(/^\//, '')) : path.resolve(String(videoUrl))
      if (fs.existsSync(resolvedVideoPath)) fs.copyFileSync(resolvedVideoPath, outPath)
      else throw new Error('Video returned but could not be resolved: ' + String(videoUrl))
    }
    const saved = { url: `/assets/storyboard/uploads/${outName}`, localPath: outPath }
    appendVideoJobToStoryboard(job, saved)
    writeVideoJob({
      ...job,
      status: 'done',
      completedAt: new Date().toISOString(),
      url: saved.url,
      localPath: saved.localPath,
      cliPrompt: job.prompt || '',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!/timed out/i.test(message)) {
      writeVideoJob({
        ...job,
        status: 'error',
        completedAt: new Date().toISOString(),
        error: message,
      })
    }
  } finally {
    resumingVideoJobs.delete(jobId)
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
      server.httpServer?.setTimeout(20 * 60 * 1000)
      server.httpServer?.on('connection', (socket) => socket.setTimeout(20 * 60 * 1000))

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

      server.middlewares.use('/api/tasks/video-job', async (req, res) => {
        if (req.method !== 'GET') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const url = new URL(req.url || '', 'http://localhost')
          const id = url.searchParams.get('id') || ''
          if (!id) return sendJson(res, { error: 'Missing job id' }, 400)
          const filePath = videoJobFile(id)
          if (!fs.existsSync(filePath)) return sendJson(res, { error: 'Video job not found' }, 404)
          const job = JSON.parse(fs.readFileSync(filePath, 'utf8'))
          if (job?.status === 'running' && job?.pixverseId) {
            resumeVideoJob(job).catch((error) => console.warn('[video-job] resume failed:', error instanceof Error ? error.message : String(error)))
          }
          return sendJson(res, job)
        } catch (error) {
          return sendJson(res, { error: error instanceof Error ? error.message : 'Video job poll failed' }, 500)
        }
      })

      server.middlewares.use('/api/canvas-mode', async (req, res) => {
        ensureStoryboardFolders()
        if (req.method === 'GET') {
          const data = fs.readFileSync(canvasModeDataFile, 'utf8')
          res.setHeader('Content-Type', 'application/json')
          res.end(data)
          return
        }

        if (req.method === 'POST') {
          try {
            const body = await collectBody(req)
            const payload = JSON.parse(body.toString() || '{}')
            fs.writeFileSync(canvasModeDataFile, JSON.stringify(payload, null, 2))
            sendJson(res, { ok: true, localPath: canvasModeDataFile })
          } catch (error) {
            sendJson(res, { error: error instanceof Error ? error.message : 'Canvas save failed' }, 500)
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

      // GENERATE PIXVERSE — Automates the CLI from the UI
      server.middlewares.use('/api/tasks/generate-pixverse', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { taskId, prompt, sceneHint, skillHint, model, quality, aspectRatio } = JSON.parse(body.toString() || '{}')

          if (!prompt) return sendJson(res, { error: 'Missing prompt' }, 400)

          // 1. Extract image paths from sceneHint
          const attachedPaths: string[] = []
          if (sceneHint) {
            // Full URL paths
            const matches = sceneHint.match(/\/assets\/storyboard\/[^\s|]+/g)
            if (matches) {
              matches.forEach((m: string) => {
                const fullPath = path.join(process.cwd(), 'public', m.replace(/[?#].*$/, ''))
                if (fs.existsSync(fullPath) && !attachedPaths.includes(fullPath)) attachedPaths.push(fullPath)
              })
            }
            // Bare filenames in brackets [filename.png]
            const bracketMatches = sceneHint.match(/\[([^\]]+\.(png|jpg|jpeg|webp))\]/gi)
            if (bracketMatches) {
              bracketMatches.forEach((bm: string) => {
                const filename = bm.replace(/^\[|\]$/g, '')
                const fullPath = path.join(process.cwd(), 'public', 'assets', 'storyboard', 'uploads', filename)
                if (fs.existsSync(fullPath) && !attachedPaths.includes(fullPath)) attachedPaths.push(fullPath)
              })
            }
          }

          // 2. Parse @imageX from prompt to establish order
          const imageRegex = /@image\d+\s*=\s*([^—\n]+)/g
          let match
          const orderedImages: string[] = []

          while ((match = imageRegex.exec(prompt)) !== null) {
            const requestedName = match[1].trim().toLowerCase()
            let bestMatch = ''
            for (const p of attachedPaths) {
              const basename = path.basename(p).toLowerCase()
              const cleanBase = basename.replace(/-\d{13}\.png$/, '')

              const simplifiedRequest = requestedName.replace(/[^a-z0-9]/g, '')
              const simplifiedBase = cleanBase.replace(/[^a-z0-9]/g, '')

              if (simplifiedBase && simplifiedRequest && (simplifiedBase.includes(simplifiedRequest) || simplifiedRequest.includes(simplifiedBase))) {
                bestMatch = p
                break
              }
            }
            if (bestMatch) {
              orderedImages.push(bestMatch)
            }
          }

          const { spawn } = require('node:child_process')
          const child = spawn('node', ['generate-pixverse.mjs', taskId, prompt, tasksCurrentDir, sceneHint || '', skillHint || ''], {
            detached: true,
            stdio: 'ignore',
            cwd: process.cwd()
          })
          child.unref()

          sendJson(res, { ok: true, message: 'PixVerse generation started in background' })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Generate failed' }, 500)
        }
      })

      // ═══════════════════════════════════════════
      // DOWNLOAD PIXVERSE — Agentic skill execution
      // ═══════════════════════════════════════════
      server.middlewares.use('/api/tasks/download-pixverse', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { taskId, prompt } = JSON.parse(body.toString() || '{}')

          if (!taskId || !prompt) return sendJson(res, { error: 'Missing taskId or prompt' }, 400)

          const { spawn } = require('node:child_process')
          // Spawn the node script detached
          const child = spawn('node', ['download-pixverse.mjs', taskId, prompt, tasksCurrentDir], {
            detached: true,
            stdio: 'ignore',
            cwd: process.cwd()
          })
          child.unref()

          sendJson(res, { ok: true, message: 'PixVerse download started in background' })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Download failed' }, 500)
        }
      })

      // ═══════════════════════════════════════════
      // IMPROVE PIXVERSE — Agentic skill execution
      // ═══════════════════════════════════════════
      server.middlewares.use('/api/tasks/improve-pixverse', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { taskId, imageId, imagePath, prompt } = JSON.parse(body.toString() || '{}')

          if (!taskId || !imagePath || !prompt) return sendJson(res, { error: 'Missing required fields' }, 400)

          const { spawn } = require('node:child_process')
          // Spawn the node script detached
          const child = spawn('node', ['improve-pixverse.mjs', taskId, imageId, imagePath, prompt, tasksCurrentDir], {
            detached: true,
            stdio: 'ignore',
            cwd: process.cwd()
          })
          child.unref()

          sendJson(res, { ok: true, message: 'PixVerse improvement started in background' })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Improve failed' }, 500)
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
          const files = fs.readdirSync(docsDir).filter(f => /\.(pdf|docx|pages)$/i.test(f))
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

      // BLUEPRINTS — Persist to disk
      const blueprintsPath = path.join(storyboardRoot, 'blueprints.json')
      const loadBlueprints = () => {
        try { return fs.existsSync(blueprintsPath) ? JSON.parse(fs.readFileSync(blueprintsPath, 'utf8')) : [] } catch { return [] }
      }
      const saveBlueprints = (bps: any[]) => fs.writeFileSync(blueprintsPath, JSON.stringify(bps, null, 2))

      server.middlewares.use('/api/blueprints/list', async (_req, res) => {
        sendJson(res, { blueprints: loadBlueprints() })
      })

      server.middlewares.use('/api/blueprints/save', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const bp = JSON.parse(body.toString() || '{}')
          if (!bp.id) return sendJson(res, { error: 'No blueprint id' }, 400)
          const all = loadBlueprints()
          all.unshift(bp)
          saveBlueprints(all)
          sendJson(res, { ok: true })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Save failed' }, 500)
        }
      })

      server.middlewares.use('/api/blueprints/delete', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { id } = JSON.parse(body.toString() || '{}')
          if (!id) return sendJson(res, { error: 'No blueprint id' }, 400)
          const all = loadBlueprints().filter((b: any) => b.id !== id)
          saveBlueprints(all)
          sendJson(res, { ok: true })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Delete failed' }, 500)
        }
      })

      // RUN BATCH — Handles multiple asynchronous edits (Splits, Improves, etc.)
      server.middlewares.use('/api/tasks/run-batch', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { taskId, activePassId, passes, payload } = JSON.parse(body.toString() || '{}')
          if (!taskId || !activePassId || !payload) return sendJson(res, { error: 'Missing required fields' }, 400)

          // Persist the passes first
          const taskPath = path.join(tasksCurrentDir, `${taskId}.json`)
          if (fs.existsSync(taskPath)) {
            const taskData = JSON.parse(fs.readFileSync(taskPath, 'utf8'))
            taskData.passes = passes
            taskData.activePassId = activePassId
            taskData.status = 'pass_working'
            taskData.updatedAt = new Date().toISOString()
            fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2))
          }

          // Write payload to scratch dir
          const publicDir = path.join(process.cwd(), 'public')
          const scratchDir = path.join(publicDir, 'assets', 'storyboard', 'scratch')
          if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true })
          const payloadPath = path.join(scratchDir, `batch-${taskId}.json`)
          fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2))

          const { spawn } = require('node:child_process')
          const child = spawn('node', ['run-batch.mjs', taskId, activePassId, tasksCurrentDir], {
            detached: true,
            stdio: 'ignore',
            cwd: process.cwd()
          })
          child.unref()

          sendJson(res, { ok: true, message: 'Batch processing started in background' })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Batch failed' }, 500)
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
      // ═══════════════════════════════════════════
      // LIGHTBOX EDIT — process edits from the storyboard expanded view
      // Receives: imageUrl, note?, attachments[], shotId, actId, sceneId, mode, type
      // Results are written back to the shot as new alternative media
      // ═══════════════════════════════════════════
      server.middlewares.use('/api/tasks/edit-from-lightbox', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { imageUrl, note, attachments, referenceDebug, shotId, actId, sceneId, mode, type, splitSize, model, quality, aspectRatio, detailLevel, duration } = JSON.parse(body.toString() || '{}')
          console.log('[edit-from-lightbox]', { type, model, shotId, imageUrl: imageUrl?.substring(0, 60), attachmentCount: (attachments || []).length, referenceCount: (referenceDebug || []).length, noteLen: (note || '').length, aspectRatio })
          if (!shotId) return sendJson(res, { error: 'Missing shotId' }, 400)

          const publicDir = path.join(process.cwd(), 'public')
          // Strip cache-busting query params (e.g. ?t=12345) from URLs before resolving as file paths.
          // Attachments can be app URLs (/assets/...), absolute local files (/Users/...), or remote URLs.
          const cleanUrl = (u: string) => u ? u.replace(/\?.*$/, '') : ''
          const resolveMediaPath = (u: string) => {
            const cleaned = cleanUrl(u || '')
            if (!cleaned) return ''
            if (/^https?:\/\//i.test(cleaned)) return cleaned
            if (path.isAbsolute(cleaned) && fs.existsSync(cleaned)) return cleaned
            if (cleaned.startsWith('/')) return path.join(publicDir, cleaned.replace(/^\/+/, ''))
            return path.resolve(cleaned)
          }
          const cleanedImageUrl = cleanUrl(imageUrl || '')
          const imagePath = cleanedImageUrl ? resolveMediaPath(cleanedImageUrl) : ''
          const cleanedAttachments = (attachments || []).map((u: string) => cleanUrl(u))

          if (type === 'split') {
            // Split grid — use existing tool
            const outputDir = path.join(storyboardUploads, `split-${Date.now()}`)
            const toolPath = path.join(process.cwd(), 'tools', 'split_grid.py')
            const { execSync } = require('child_process')
            try {
              const result = JSON.parse(execSync(`python3 "${toolPath}" "${imagePath}" "${outputDir}" "${splitSize || '2x2'}"`, { timeout: 30000 }).toString())
              if (result.ok) {
                const panels = result.panels.map((p: any) => ({
                  id: `media-split-${Date.now()}-r${p.row}c${p.col}`,
                  type: 'image',
                  url: `/assets/storyboard/uploads/${path.basename(outputDir)}/${p.filename}`,
                  fileName: p.filename,
                }))
                // Write panels back to storyboard data
                const data = JSON.parse(fs.readFileSync(storyboardDataFile, 'utf8'))
                const act = data.acts?.find((a: any) => a.id === actId)
                const scene = act?.scenes?.find((s: any) => s.id === sceneId)
                const shotsKey = mode === 'videos' ? 'videoShots' : 'imageShots'
                const shot = scene?.[shotsKey]?.find((s: any) => s.id === shotId)
                if (shot) {
                  shot.media = [...(shot.media || []), ...panels]
                  fs.writeFileSync(storyboardDataFile, JSON.stringify(data, null, 2))
                }
                return sendJson(res, { ok: true, panels, count: panels.length })
              }
            } catch (err) {
              return sendJson(res, { error: 'Split failed' }, 500)
            }
          }

          if (type === 'enhance') {
            const imagePaths = [imagePath, ...cleanedAttachments.map((u: string) => resolveMediaPath(u))]
            const defaultPrompt = 'Use exact @img1 but improve quality of character(s) and resolution. Do not change composition, camera angle or objects. Style: 3d animated movie, cinematic AAA level 3d animation'
            const imageArgs = imagePaths.length === 1 ? ['--image', `"${imagePaths[0]}"`] : ['--images', ...imagePaths.map(p => `"${p}"`)]
            const args = ['npx', 'pixverse-cli', 'create', 'image', '--prompt', JSON.stringify(note || defaultPrompt), ...imageArgs, '--model', model || 'seedream-4.5', '--quality', quality || '2160p', '--aspect-ratio', '16:9', '--json']
            try {
              const { exec } = require('child_process')
              const result: any = await new Promise((resolve, reject) => {
                exec(args.join(' '), { timeout: 300000, cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }, (err: any, stdout: string) => {
                  if (err) return reject(err)
                  try { resolve(JSON.parse(stdout)) } catch { reject(new Error('Invalid JSON: ' + stdout.substring(0, 200))) }
                })
              })
              if (result.image_url) {
                const outName = `enhanced-${(model || 'seedream').replace(/\./g, '-')}-${Date.now()}.png`
                const outPath = path.join(storyboardUploads, outName)
                await new Promise((resolve, reject) => {
                  exec(`curl -sL "${result.image_url}" -o "${outPath}"`, { timeout: 60000 }, (err: any) => err ? reject(err) : resolve(null))
                })
                return sendJson(res, { ok: true, url: `/assets/storyboard/uploads/${outName}`, localPath: outPath })
              }
              return sendJson(res, { error: 'No image returned' }, 500)
            } catch (err) {
              return sendJson(res, { error: 'Enhancement failed: ' + (err instanceof Error ? err.message : String(err)) }, 500)
            }
          }

          if (type === 'note') {
            const imagePaths = cleanedImageUrl ? [imagePath, ...cleanedAttachments.map((u: string) => resolveMediaPath(u))] : cleanedAttachments.map((u: string) => resolveMediaPath(u))
            const imageArgs = imagePaths.length === 1 ? ['--image', `"${imagePaths[0]}"`] : imagePaths.length > 1 ? ['--images', ...imagePaths.map(p => `"${p}"`)] : []
            const args = ['npx', 'pixverse-cli', 'create', 'image', '--prompt', JSON.stringify(note || ''), ...imageArgs, '--model', model || 'gemini-3.1-flash', '--quality', quality || '1440p', '--aspect-ratio', aspectRatio || '16:9', ...(detailLevel ? ['--detail-level', detailLevel] : []), '--json']
            console.log('[note] CLI cmd:', args.join(' ').substring(0, 200))
            try {
              console.log('[note] Executing async...')
              const { exec } = require('child_process')
              const result: any = await new Promise((resolve, reject) => {
                exec(args.join(' '), { timeout: 300000, cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }, (err: any, stdout: string, stderr: string) => {
                  if (err) return reject(err)
                  try { resolve(JSON.parse(stdout)) } catch { reject(new Error('Invalid JSON: ' + stdout.substring(0, 200))) }
                })
              })
              console.log('[note] Result:', JSON.stringify(result).substring(0, 200))
              if (result.image_url) {
                const outName = `note-edit-${Date.now()}.png`
                const outPath = path.join(storyboardUploads, outName)
                await new Promise((resolve, reject) => {
                  exec(`curl -sL "${result.image_url}" -o "${outPath}"`, { timeout: 60000 }, (err: any) => err ? reject(err) : resolve(null))
                })
                return sendJson(res, { ok: true, url: `/assets/storyboard/uploads/${outName}`, localPath: outPath })
              }
              return sendJson(res, { error: 'No image returned' }, 500)
            } catch (err) {
              console.error('[note] Error:', err instanceof Error ? err.message : String(err))
              return sendJson(res, { error: 'Note edit failed: ' + (err instanceof Error ? err.message : String(err)) }, 500)
            }
          }

          if (type === 'generate') {
            // Generate from scratch — no main image, just prompt + attachments
            const attachPaths = cleanedAttachments.map((u: string) => resolveMediaPath(u))
            const imageArgs = attachPaths.length === 1 ? ['--image', `"${attachPaths[0]}"`] : attachPaths.length > 1 ? ['--images', ...attachPaths.map(p => `"${p}"`)] : []
            const args = ['npx', 'pixverse-cli', 'create', 'image', '--prompt', JSON.stringify(note || ''), ...imageArgs, '--model', model || 'gemini-3.1-flash', '--quality', quality || '1440p', '--aspect-ratio', aspectRatio || '16:9', ...(detailLevel ? ['--detail-level', detailLevel] : []), '--json']
            console.log('[generate] CLI cmd:', args.join(' ').substring(0, 200))
            try {
              console.log('[generate] Executing async...')
              const { exec } = require('child_process')
              const result: any = await new Promise((resolve, reject) => {
                exec(args.join(' '), { timeout: 300000, cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }, (err: any, stdout: string, stderr: string) => {
                  if (err) return reject(err)
                  try { resolve(JSON.parse(stdout)) } catch { reject(new Error('Invalid JSON: ' + stdout.substring(0, 200))) }
                })
              })
              console.log('[generate] Result:', JSON.stringify(result).substring(0, 200))
              if (result.image_url) {
                const outName = `gen-${(model || 'seedream').replace(/\./g, '-')}-${Date.now()}.png`
                const outPath = path.join(storyboardUploads, outName)
                await new Promise((resolve, reject) => {
                  exec(`curl -sL "${result.image_url}" -o "${outPath}"`, { timeout: 60000 }, (err: any) => err ? reject(err) : resolve(null))
                })
                return sendJson(res, { ok: true, url: `/assets/storyboard/uploads/${outName}`, localPath: outPath })
              }
              return sendJson(res, { error: 'No image returned' }, 500)
            } catch (err) {
              console.error('[generate] Error:', err instanceof Error ? err.message : String(err))
              return sendJson(res, { error: 'Generation failed: ' + (err instanceof Error ? err.message : String(err)) }, 500)
            }
          }

          if (type === 'video') {
            const referencePaths = Array.from(new Set(
              (cleanedImageUrl ? [imagePath] : [])
                .concat(cleanedAttachments.map((u: string) => resolveMediaPath(u)))
                .filter(Boolean)
            ))
            const isVideoRef = (p: string) => /\.(mp4|mov|webm|m4v)$/i.test(p)
            const isImageRef = (p: string) => /\.(png|jpe?g|webp|gif|avif)$/i.test(p)
            const imageReferencePaths = referencePaths.filter((p: string) => isImageRef(p)).slice(0, 7)
            const videoReferencePaths = referencePaths.filter((p: string) => isVideoRef(p)).slice(0, 3)
            const usesMultiReferenceMode = imageReferencePaths.length + videoReferencePaths.length > 1 || videoReferencePaths.length > 0
            const requestedVideoModel = model || 'seedance-2.0-standard'
            // PixVerse CLI has separate video modes. `create video` accepts one
            // `--image`; true multi-reference work must use `create reference`.
            // Video refs inside reference mode are documented as seedance-2.0 only.
            const effectiveVideoModel = videoReferencePaths.length && !requestedVideoModel.includes('seedance-2.0')
              ? 'seedance-2.0-standard'
              : requestedVideoModel
            let usedImageReferencePaths = imageReferencePaths
            let usedVideoReferencePaths = videoReferencePaths
            const buildReferenceArgs = (imagePaths: string[], videoPaths: string[]) => [
              ...(imagePaths.length ? ['--images', ...imagePaths] : []),
              ...(videoPaths.length ? ['--videos', ...videoPaths] : []),
            ]
            const singleImageArgs = imageReferencePaths[0] ? ['--image', imageReferencePaths[0]] : []
            const videoDuration = Math.max(1, Math.min(15, Number(duration) || 5))
            const buildVideoArgs = (mode: 'video' | 'reference', inputArgs: string[], waitMode: 'wait' | 'no-wait' = 'wait') => [
              'npx', 'pixverse-cli', 'create', mode,
              '--prompt', String(note || ''),
              ...inputArgs,
              '--model', effectiveVideoModel,
              '--quality', quality || '720p',
              '--aspect-ratio', aspectRatio || '16:9',
              '--duration', String(videoDuration),
              ...(waitMode === 'wait' ? ['--timeout', '600'] : ['--no-wait']),
              '--json',
            ]
            try {
              const { exec, execFile } = require('child_process')
              const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
              const runVideoCli = (args: string[]) => new Promise((resolve, reject) => {
                console.log('[video] CLI cmd:', args.map((arg) => arg.includes(' ') ? JSON.stringify(arg) : arg).join(' ').substring(0, 520))
                execFile(args[0], args.slice(1), { timeout: 900000, cwd: process.cwd(), maxBuffer: 12 * 1024 * 1024 }, (err: any, stdout: string, stderr: string) => {
                  if (err) return reject(err)
                  try { resolve(JSON.parse(stdout)) } catch { reject(new Error('Invalid JSON: ' + stdout.substring(0, 300) + stderr.substring(0, 160))) }
                })
              })
              const runVideoCliWithRetry = async (args: string[], attempts = 3) => {
                let lastError: unknown
                for (let attempt = 1; attempt <= attempts; attempt += 1) {
                  try {
                    return await runVideoCli(args)
                  } catch (error) {
                    lastError = error
                    if (attempt < attempts) {
                      console.warn(`[video] Full multi-reference submit failed, retry ${attempt + 1}/${attempts}:`, error instanceof Error ? error.message : String(error))
                      await wait(attempt === 1 ? 10000 : 5000)
                    }
                  }
                }
                throw lastError
              }
              const pickVideoId = (payload: any) => [
                payload?.video_id,
                payload?.id,
                payload?.asset_id,
                payload?.data?.video_id,
                payload?.data?.id,
                payload?.video?.id,
                payload?.video?.video_id,
              ].find(Boolean)
              const isCompletedVideoPayload = (payload: any) => {
                const status = String(payload?.status || payload?.data?.status || payload?.video?.status || '').toLowerCase()
                const statusCode = payload?.status_code ?? payload?.data?.status_code ?? payload?.video?.status_code
                const hasPlayableUrl = Boolean(payload?.video_url || payload?.url || payload?.asset_url || payload?.output_url || payload?.video?.url || payload?.video?.asset_url || payload?.data?.video_url || payload?.data?.url || payload?.data?.video?.url || payload?.assets?.[0]?.url || payload?.outputs?.[0]?.url)
                return hasPlayableUrl || /completed|succeeded|success|done/.test(status) || statusCode === 1 || statusCode === 20
              }
              const getVideoUrl = (payload: any) => [
                payload?.video_url,
                payload?.url,
                payload?.asset_url,
                payload?.output_url,
                payload?.video?.url,
                payload?.video?.asset_url,
                payload?.data?.video_url,
                payload?.data?.url,
                payload?.data?.video?.url,
                payload?.assets?.[0]?.url,
                payload?.outputs?.[0]?.url,
              ].find(Boolean)
              const downloadRemoteVideoWithRetry = async (videoUrl: string, outPath: string, attempts = 30) => {
                let lastError = ''
                for (let attempt = 1; attempt <= attempts; attempt += 1) {
                  try {
                    if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
                  } catch {
                    // Best effort cleanup before retrying a possibly partial file.
                  }
                  try {
                    await new Promise((resolve, reject) => {
                      exec(
                        `curl -fL --retry 2 --retry-delay 2 --retry-all-errors ${JSON.stringify(videoUrl)} -o ${JSON.stringify(outPath)}`,
                        { timeout: 180000 },
                        (err: any, _stdout: string, stderr: string) => err ? reject(new Error(stderr || err.message || String(err))) : resolve(null),
                      )
                    })
                    const size = fs.existsSync(outPath) ? fs.statSync(outPath).size : 0
                    if (size >= 100000) return
                    lastError = `downloaded file was too small (${size} bytes)`
                  } catch (error) {
                    lastError = error instanceof Error ? error.message : String(error)
                  }
                  await wait(attempt < 4 ? 5000 : 10000)
                }
                throw new Error(`PixVerse completed the task, but the media URL was not downloadable after retries: ${lastError}`)
              }
              const saveCompletedVideoPayload = async (payload: any) => {
                if (!isCompletedVideoPayload(payload)) throw new Error('PixVerse video is not completed yet.')
                const videoUrl = getVideoUrl(payload)
                if (!videoUrl) throw new Error('Completed PixVerse video did not include a video URL.')
                const outName = `video-${effectiveVideoModel.replace(/\./g, '-')}-${Date.now()}.mp4`
                const outPath = path.join(storyboardUploads, outName)
                if (/^https?:\/\//i.test(videoUrl)) {
                  await downloadRemoteVideoWithRetry(String(videoUrl), outPath)
                } else {
                  const resolvedVideoPath = String(videoUrl).startsWith('/') ? path.join(publicDir, String(videoUrl).replace(/^\//, '')) : path.resolve(String(videoUrl))
                  if (fs.existsSync(resolvedVideoPath)) fs.copyFileSync(resolvedVideoPath, outPath)
                  else throw new Error('Video returned but could not be resolved: ' + String(videoUrl))
                }
                const size = fs.existsSync(outPath) ? fs.statSync(outPath).size : 0
                if (size < 100000) throw new Error(`Downloaded video is too small (${size} bytes), refusing placeholder/error file.`)
                return { url: `/assets/storyboard/uploads/${outName}`, localPath: outPath }
              }
              const pollExistingVideoTask = async (submittedId: string) => {
                const deadline = Date.now() + 18 * 60 * 1000
                let lastStatus: any = null
                while (Date.now() < deadline) {
                  try {
                    const waited: any = await runVideoCli([
                      'npx', 'pixverse-cli', 'task', 'wait', String(submittedId),
                      '--type', 'video',
                      '--timeout', '120',
                      '--json',
                    ])
                    lastStatus = waited
                    if (isCompletedVideoPayload(waited)) {
                      return waited
                    }
                  } catch (error) {
                    console.warn('[video] PixVerse task still pending:', error instanceof Error ? error.message : String(error))
                    try {
                      lastStatus = await runVideoCli([
                        'npx', 'pixverse-cli', 'task', 'status', String(submittedId),
                        '--type', 'video',
                        '--json',
                      ])
                      if (isCompletedVideoPayload(lastStatus)) {
                        return lastStatus
                      }
                    } catch {
                      // The next wait cycle is still the authoritative check.
                    }
                    await wait(5000)
                  }
                }
                throw new Error(`PixVerse task ${submittedId} did not complete before local timeout. Last status: ${JSON.stringify(lastStatus).slice(0, 240)}`)
              }
              let result: any
              if (usesMultiReferenceMode) {
                let referenceArgs = buildReferenceArgs(usedImageReferencePaths, usedVideoReferencePaths)
                if (!referenceArgs.length) {
                  return sendJson(res, { error: 'Multi-reference video requires at least one image reference or supported video reference.' }, 400)
                }
                console.log('[video] using PixVerse multi-reference mode', {
                  images: imageReferencePaths.length,
                  videos: videoReferencePaths.length,
                  requestedModel: requestedVideoModel,
                  model: effectiveVideoModel,
                })
                let submitted: any
                try {
                  submitted = await runVideoCli(buildVideoArgs('reference', referenceArgs, 'no-wait'))
                } catch (error) {
                  if (usedVideoReferencePaths.length && usedImageReferencePaths.length) {
                    console.warn('[video] Video reference submit failed; retrying with image references only:', error instanceof Error ? error.message : String(error))
                    usedVideoReferencePaths = []
                    referenceArgs = buildReferenceArgs(usedImageReferencePaths, usedVideoReferencePaths)
                    submitted = await runVideoCliWithRetry(buildVideoArgs('reference', referenceArgs, 'no-wait'), 2)
                  } else {
                    throw error
                  }
                }
                const submittedId = pickVideoId(submitted)
                if (!submittedId) return sendJson(res, { error: 'PixVerse did not return a video task id.' }, 500)
                const jobId = `pixverse-video-${submittedId}-${Date.now()}`
                const jobBase = {
                  id: jobId,
                  pixverseId: String(submittedId),
                  status: 'running',
                  model: effectiveVideoModel,
                  prompt: note || '',
                  promptLength: String(note || '').length,
                  promptPreview: String(note || '').slice(0, 280),
                  actId,
                  sceneId,
                  shotId,
                  mode,
                  references: {
                    images: usedImageReferencePaths,
                    videos: usedVideoReferencePaths,
                  },
                  createdAt: new Date().toISOString(),
                }
                writeVideoJob(jobBase)
                ;(async () => {
                  try {
                    const completed = await pollExistingVideoTask(String(submittedId))
                    const saved = await saveCompletedVideoPayload(completed)
                    appendVideoJobToStoryboard(jobBase, saved)
                    writeVideoJob({
                      ...jobBase,
                      status: 'done',
                      completedAt: new Date().toISOString(),
                      url: saved.url,
                      localPath: saved.localPath,
                      cliPrompt: note || '',
                    })
                  } catch (error) {
                    writeVideoJob({
                      ...jobBase,
                      status: 'error',
                      completedAt: new Date().toISOString(),
                      error: error instanceof Error ? error.message : String(error),
                    })
                  }
                })()
                return sendJson(res, { ok: true, pending: true, jobId, pixverseId: String(submittedId), cliPrompt: note || '' })
              } else {
                result = await runVideoCliWithRetry(buildVideoArgs('video', singleImageArgs), 3)
              }
              console.log('[video] Result:', JSON.stringify(result).substring(0, 240))
              const videoUrl = [
                result.video_url,
                result.url,
                result.asset_url,
                result.output_url,
                result.video?.url,
                result.video?.asset_url,
                result.data?.video_url,
                result.data?.url,
                result.data?.video?.url,
                result.assets?.[0]?.url,
                result.outputs?.[0]?.url,
              ].find(Boolean)
              if (videoUrl) {
                const outName = `video-${effectiveVideoModel.replace(/\./g, '-')}-${Date.now()}.mp4`
                const outPath = path.join(storyboardUploads, outName)
                if (/^https?:\/\//i.test(videoUrl)) {
                  await downloadRemoteVideoWithRetry(String(videoUrl), outPath)
                } else {
                  const resolvedVideoPath = String(videoUrl).startsWith('/') ? path.join(publicDir, String(videoUrl).replace(/^\//, '')) : path.resolve(String(videoUrl))
                  if (fs.existsSync(resolvedVideoPath)) fs.copyFileSync(resolvedVideoPath, outPath)
                  else return sendJson(res, { error: 'Video returned but could not be resolved: ' + String(videoUrl) }, 500)
                }
                return sendJson(res, { ok: true, url: `/assets/storyboard/uploads/${outName}`, localPath: outPath, cliPrompt: note || '' })
              }
              const findDownloadedVideo = (before: Set<string>) => fs.readdirSync(storyboardUploads)
                .filter(name => !before.has(name) && /\.(mp4|mov|webm)$/i.test(name))
                .sort((a, b) => fs.statSync(path.join(storyboardUploads, b)).mtimeMs - fs.statSync(path.join(storyboardUploads, a)).mtimeMs)[0]
              const downloadAsset = async (assetId: string) => {
                const before = new Set(fs.readdirSync(storyboardUploads))
                await new Promise((resolve, reject) => {
                  exec(`npx pixverse-cli asset download ${JSON.stringify(String(assetId))} --type video --dest ${JSON.stringify(storyboardUploads)} --json`, { timeout: 240000, cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024 }, (err: any) => err ? reject(err) : resolve(null))
                })
                return findDownloadedVideo(before)
              }
              const assetId = [
                result.asset_id,
                result.video_id,
                result.id,
                result.data?.asset_id,
                result.data?.video_id,
                result.video?.asset_id,
                result.video?.id,
                result.assets?.[0]?.asset_id,
                result.assets?.[0]?.id,
                result.data?.assets?.[0]?.asset_id,
                result.data?.assets?.[0]?.id,
              ].find(Boolean)
              if (assetId) {
                const downloaded = await downloadAsset(String(assetId))
                if (downloaded) return sendJson(res, { ok: true, url: `/assets/storyboard/uploads/${downloaded}`, localPath: path.join(storyboardUploads, downloaded), cliPrompt: note || '' })
              }
              try {
                const listed = await new Promise<any>((resolve, reject) => {
                  exec('npx pixverse-cli asset list --type video --limit 12 --json', { timeout: 90000, cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024 }, (err: any, stdout: string, stderr: string) => {
                    if (err) return reject(err)
                    try { resolve(JSON.parse(stdout)) } catch { reject(new Error('Invalid asset list JSON: ' + stdout.substring(0, 180) + stderr.substring(0, 120))) }
                  })
                })
                const assets = Array.isArray(listed) ? listed : (listed.assets || listed.data || listed.items || [])
                const newest = assets.find((asset: any) => asset?.asset_id || asset?.id || asset?.video_id)
                const newestId = newest?.asset_id || newest?.id || newest?.video_id
                if (newestId) {
                  const downloaded = await downloadAsset(String(newestId))
                  if (downloaded) return sendJson(res, { ok: true, url: `/assets/storyboard/uploads/${downloaded}`, localPath: path.join(storyboardUploads, downloaded), cliPrompt: note || '' })
                }
              } catch (listError) {
                console.warn('[video] Asset-list fallback failed:', listError instanceof Error ? listError.message : String(listError))
              }
              return sendJson(res, { error: 'No video returned from PixVerse CLI' }, 500)
            } catch (err) {
              console.error('[video] Error:', err instanceof Error ? err.message : String(err))
              return sendJson(res, { error: 'Video generation failed: ' + (err instanceof Error ? err.message : String(err)) }, 500)
            }
          }

          sendJson(res, { error: `Unknown type: ${type}` }, 400)
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Edit failed' }, 500)
        }
      })

      // ASSIGN ASSET — copy image to resources
      server.middlewares.use('/api/tasks/assign-asset', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, { error: 'Method not allowed' }, 405)
        try {
          const body = await collectBody(req)
          const { type, url, shotId, name } = JSON.parse(body.toString() || '{}')
          if (!url || !type) return sendJson(res, { error: 'Missing url or type' }, 400)

          const publicDir = path.join(process.cwd(), 'public')
          const srcPath = url.startsWith('/') ? path.join(publicDir, url) : path.resolve(url)
          if (!fs.existsSync(srcPath)) return sendJson(res, { error: 'Source not found' }, 404)

          // Copy to resources folder
          const resourceDir = path.join(storyboardUploads, type + 's')
          fs.mkdirSync(resourceDir, { recursive: true })
          const destName = `${type}-${name || Date.now()}-${path.basename(srcPath)}`
          const destPath = path.join(resourceDir, destName)
          fs.copyFileSync(srcPath, destPath)

          sendJson(res, { ok: true, url: `/assets/storyboard/uploads/${type}s/${destName}`, type })
        } catch (error) {
          sendJson(res, { error: error instanceof Error ? error.message : 'Assign failed' }, 500)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), storyboardApiPlugin()],
})

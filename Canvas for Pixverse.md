# Canvas for Pixverse

This document explains the Canvas module in the Aisha Cannes Showcase app. It is written for a developer who needs to maintain or extend the PixVerse Canvas without already knowing the project.

## Purpose

Canvas Mode is a visual production graph for building AI image/video workflows. It lets the user place references, prompts, generated outputs, video clips, frames, documents, and reusable pinned assets on an infinite canvas. Connections between nodes define how media and prompt context flow into PixVerse generation and into Theo, the Canvas agent.

The main implementation is:

- `src/canvas/CanvasMode.tsx` - React UI, graph editing, node/edge/group logic, generation calls, Theo panel.
- `src/canvas/CanvasMode.css` - Canvas visual layout, tool cursors, nodes, edges, trays, agent panel, store modal.
- `src/canvas/canvasTypes.ts` - Shared data model for nodes, edges, groups, trays, spaces, and persisted canvas data.
- `vite.config.ts` - Local API routes for persistence, uploads, Gemini proxy, memory, Skills Store, split grid, and PixVerse CLI calls.
- `src/gemini-agent.ts` - Theo/Gemini client helpers, memory context loading, memory saving, image-aware chat calls.

## Data Model

Canvas data is saved as a `CanvasData` object. It contains multiple `CanvasSpace` boards. Each space has nodes, edges, groups, trays, and its own pan/zoom viewport.

`CanvasNode` is the central unit. A node can be:

- `image` - still image input or generated image output.
- `video` - video input or PixVerse video output.
- `audio` - audio reference or future audio workflow node.
- `document` - PDF/text/reference document.
- `placeholder` - empty slot that can become image/video/document/audio after upload or generation.

Important node fields:

- `url` - browser-usable asset URL.
- `localPath` - local filesystem path used by PixVerse CLI.
- `prompt` - editable current prompt.
- `sourcePrompt` - prompt inherited from the parent/source generation.
- `note` - extra user note or saved CLI prompt.
- `inputRefs` - frozen snapshot of references used for a generation.
- `generation` - operation, model, quality, aspect ratio, detail level, duration, status, and errors.
- `marker` - visual marker such as `master` or `alternative`.
- `pinnedOnly` - true for tray-only references that should not render as normal canvas nodes.

`CanvasEdge` describes semantic flow:

- `reference` - yellow reference image/context edge, sent as reference media.
- `derivative` - generated image derived from a source.
- `variation` - pink alternate sibling.
- `animation` - image/video-to-video flow.
- `frame` - extracted frame or split panel.
- `context` - supporting document/media context.

`CanvasGroup` is a colored box around nodes. A group can move and resize its member nodes, and it can also connect into a target node so all media inside the group becomes a multi-reference source.

`CanvasTray` is a pinned reference row. Default trays are Actors, Locations, Props, Styles, and Master Shots. Trays store reusable node copies with `pinnedOnly: true`.

## Persistence

Canvas saves in two places:

- Browser localStorage under `aisha-canvas-mode-v1`.
- Server JSON at `public/assets/storyboard/canvas-mode-data.json` through `/api/canvas-mode`.

The module loads localStorage first for speed, then loads the server copy once. Any edit schedules an automatic save. The server copy is what survives browser changes and can be shared through the local/tunnel server.

Media uploads go to:

- `public/assets/storyboard/uploads/`

Memory files go to:

- `public/assets/storyboard/memory/`

Video job state goes to:

- `public/assets/storyboard/video-jobs/`

## Canvas Layout

The Canvas UI has:

- Topbar with back, add media, add empty slots, add space, zoom controls, active jobs, and status.
- Space tabs for multiple independent canvas boards.
- Left canvas stage with nodes, edges, groups, context menus, and pinned tray area.
- Right Theo Canvas Agent panel with Agent, Skills, Prompts, and Tasks tabs.
- Hidden file inputs for uploads into canvas, node replacement, tray upload, and Theo attachments.

The stage uses world coordinates. `screenToWorld` converts mouse positions through pan and zoom. Node positions, group boxes, edge points, and marquee rectangles are all stored in world coordinates.

## Nodes

Nodes are draggable boxes. Image/video/placeholder nodes default to 16:9. Audio and document nodes use smaller sizes. Nodes can be:

- Uploaded from drag/drop.
- Added as empty placeholders.
- Filled by dragging a file onto an empty node.
- Replaced by node upload.
- Duplicated.
- Turned into variations.
- Marked as master/alternative.
- Generated or enhanced through PixVerse.
- Used as references for another node.
- Added to pinned trays.

Video nodes include playback controls, mute controls, trim metadata, and frame extraction. Extracting a frame creates an image node connected with a `frame` edge.

## Edges And Reference Flow

Edges are not just visual lines. They control reference collection.

When a node is sent to PixVerse or Theo, `collectInputNodes` recursively walks incoming edges of types:

- `reference`
- `derivative`
- `animation`
- `context`
- `frame`
- `variation`

This lets generated outputs inherit upstream references. It also prevents duplicates. For variation edges, saved `inputRefs` are included so a generated variation remembers what references were used when it was created, even if the graph is edited later.

Reference edge labels are numbered per target node as `ref 1`, `ref 2`, etc. Animation continuation edges can display as `CONT VIDEO` in green.

Edges can be edited:

- Scissors tool cuts edges.
- Node tool adds bend points.
- Edge controls can insert a placeholder node.
- Files can be dropped onto an edge to create a node between two endpoints.
- Existing nodes can be dragged onto an edge to insert them into the flow.

## Groups

Groups are colored boxes that contain nodes by center point. They support:

- Marquee creation from two or more nodes.
- Dragging the group and all members.
- Resizing the group and recalculating membership.
- Color selection from swatches.
- Group connector drag into a target node.
- Group-to-node edges with `fromGroup: true`.

When a group is connected to a node, `groupMediaNodes` gathers all image/video media from the group. That makes group boxes useful for actor packs, location packs, prop packs, or multi-reference visual sets.

## Pinned Trays

Pinned trays are a fast reference library inside each canvas space. The default trays are Actors, Locations, Props, Styles, and Master Shots.

Adding a normal canvas node to a tray creates a pinned-only duplicate so the original remains on the canvas. Dragging a pinned item back onto the canvas creates a normal editable node. If the user drags the tray item itself out of the tray, the pinned source can be removed from the tray and placed into the canvas.

Pinned trays are useful for:

- Character reference locks.
- Recurring locations.
- Props and talismans.
- Style images.
- Master shots that should be reused across multiple generations.

## PixVerse Image Generation

Image generation is handled by Canvas functions that call `/api/tasks/edit-from-lightbox` in `vite.config.ts`.

Canvas prepares:

- Prompt text from `node.prompt` or `node.note`.
- Model settings from `node.generation`.
- Upstream image/video references from `collectInputNodes`.
- `inputRefs` snapshots for provenance.

Image operations:

- `generate` - creates a new image from prompt and references.
- `enhance` - improves an existing image while preserving composition.
- `split` - sends a 2x2 grid image to `/api/skills/split-grid` and creates four frame nodes.

The backend resolves local media paths, builds PixVerse CLI commands, downloads returned media into `public/assets/storyboard/uploads/`, and returns a local URL/path to Canvas.

Image model cards currently include:

- Nano Banana 2 - `gemini-3.1-flash`
- Nano Banana Pro - `gemini-3.0`
- GPT-2 Medium - `gpt-image-2.0`
- SeedReam 4.5 - `seedream-4.5`
- SeedReam 5 Lite - `seedream-5.0-lite`

## PixVerse Video Generation

Video generation also calls `/api/tasks/edit-from-lightbox`, with `type: video`.

Canvas prepares:

- Primary image/video reference.
- Additional reference attachments.
- Prompt.
- Video model, quality, aspect ratio, duration.
- Debug metadata listing which nodes became references.

The backend can run either:

- `pixverse-cli create video` for a simpler image-to-video job.
- `pixverse-cli create reference` for multi-reference jobs.

Multi-reference video jobs may return a pending PixVerse task id. In that case the backend writes a local video job file and Canvas polls `/api/tasks/video-job`. When complete, the video is downloaded locally and written into the target node.

Video model cards currently include:

- Seedance 2.0 Standard
- Happy Horse
- PixVerse 6
- PixVerse C1
- Grok
- Kling 3.0 Standard
- Kling O3 Standard

## Theo Canvas Agent

The Theo panel has four tabs:

- Agent - normal Canvas-aware conversation.
- Skills - separate branch for building or improving selected skills.
- Prompts - separate branch for building or improving selected prompt blueprints.
- Tasks - generation status list for running/queued/error jobs.

The Agent, Skills, and Prompts tabs keep separate message histories. A message sent while the Skills tab is active does not go into the main Agent history. The same is true for Prompts.

When sending a message, Canvas includes:

- Active canvas name.
- Node count, edge count, group count.
- Selected node title, type, prompt/note, and connected inputs.
- Selected group name and node count.
- Selected Skills and Prompts full text.
- Theo-only attachments.
- Image pixels from selected/connected image nodes and attached image files.
- Memory context from recent project memories.

The image-aware part is preserved through `sendToGeminiWithImages`. Memory is added to the system instruction, not as a replacement for image input.

After a successful response, `rememberAgentExchange` summarizes the exchange and stores a memory JSON file through `/api/memory/save`.

## Memory

Memory helpers live in `src/gemini-agent.ts`.

Memory behavior:

- Loads recent memories from `/api/memory/list`.
- Defaults to the last 3 days.
- Searches older memories with `/api/memory/search` if the user says things like "remember", "earlier", "previous", or "we did".
- Saves a summary after successful Theo responses.

Memory files are separate `mem-*.json` files under:

`public/assets/storyboard/memory/`

This is not currently a single daily diary file. It is a folder of timestamped summaries. The advantage is simple search and low risk of corrupting a single large diary file.

## Skills And Prompts

Canvas reuses the existing app Skills Store.

Relevant API routes:

- `/api/skills/list`
- `/api/skills/read-md`
- `/api/skills/save`

Canvas separates store cards into:

- Skills - usually markdown-style agent instructions.
- Prompt Blueprints - prompt templates and built-in PixVerse prompt formats.

Canvas has built-in prompt blueprints even before the store loads:

- 2x2 Cinematic Grid
- 4 Room Projections
- Quality Improve

Selecting a skill or prompt pins it to the Theo panel. Pinned cards appear as compact icons, three across plus an add card. When a message is sent, full selected skill/prompt text is loaded and included in Theo's context.

If Theo writes a useful skill or prompt, `Use as draft` opens the store editor with Theo's answer ready to save.

## Private Gemini API Key

The browser no longer contains the Gemini key. The frontend calls:

`/api/gemini/generate`

The Vite dev server route reads:

- `GEMINI_API_KEY`
- optional `GEMINI_MODEL`

from `.env.local` or environment variables, then forwards the request to Gemini. `.env.local` is ignored by git. `.env.example` documents the expected keys.

## Important Functions

Pure data and geometry:

- `makeId` - creates ids for graph entities.
- `createSpace` - creates an independent workspace.
- `createInitialData` - creates the first canvas payload.
- `normalizePinnedTrayCopies` - migrates old data and tray references.
- `mediaTypeFromFile` - maps files to node types.
- `nodeSize` - default node dimensions.
- `edgeColor` and `edgeDisplayColor` - semantic line colors.
- `centerOf`, `portPoint`, `edgePath` - geometry for nodes and edges.
- `nodeCenterInsideGroup` - group membership test.
- `groupMediaSummary` - compact group label.
- `isMediaReferenceNode`, `uniqueMediaNodes`, `savedInputRefNodes`, `groupMediaNodes`, `collectInputNodes` - reference resolution.
- `defaultGeneration`, `defaultGenerationForType` - generation settings.
- `shortModelName`, `formatSeconds` - UI labels.
- `isPromptStoreItem`, `storeItemText`, `iconForStoreItem` - Skills/Prompts card helpers.

Core state and viewport:

- `updateActiveSpace` - safe immutable update wrapper.
- `activateCanvasTool` and `resetCanvasTool` - scissors/master/node/group tool mode.
- `screenToWorld`, `setZoomAt`, `zoomBy` - pan/zoom math.
- `addNode`, `updateNode`, `deleteNode`, `disconnectNode`, `duplicateNode` - node CRUD.
- `addEdge`, `createConnection`, `deleteEdge`, `edgeLabelForDisplay` - edge CRUD and display.

Upload and placement:

- `uploadStoryboardFile` - uploads to storyboard assets.
- `uploadFile` - upload plus create node.
- `uploadFileToTray` - upload plus pin to tray.
- `uploadFileIntoNode` - replace/fill a node.
- `attachReferenceFilesToNode` - create reference nodes beside a target.
- `handleDrop` - canvas-level drop handler.

Pointer interactions:

- `handleWheel` - zoom with mouse/trackpad.
- `handleStageMouseDown` - start pan or marquee.
- `handleMouseMove` - live drag/resize/edge/cursor behavior.
- `stopDragging` - commit drag/drop outcomes.
- `startNodeDrag` - node drag/select/tool behavior.
- `startConnectorDrag` - node connector drag.
- `startGroupConnectorDrag` - group connector drag.
- `startGroupDrag` - group movement.
- `startGroupResize` - group resizing.

Generation:

- `callCanvasImageApi` - backend image generate/enhance call.
- `callCanvasVideoApi` - backend video generation and polling call.
- `runImageGeneration` - full image generation orchestration.
- `runVideoGeneration` - full video generation orchestration.
- `runTwoVariants` - sequential two-variant helper.
- `createVariationNode` - empty variation slot.
- `addExistingAlternative` - turn an existing node into a variation.
- `makeMasterShot` - promote variation to master flow.
- `fillNodeWithImage` - write image result to node.
- `splitGridNode` - split 2x2 image into panels.
- `improveSelectedPrompt` - refine selected prompt with Theo.

Graph editing:

- `addPlaceholder` and `createConnectedNode` - create connected empty nodes.
- `addEdgePoint` - add bend point.
- `insertPlaceholderOnEdge` - split edge with empty node.
- `insertFileOnEdge` - split edge with uploaded media.
- `insertExistingNodeOnEdge` - split edge with existing node.
- `swapNodeMedia` - swap payloads between two nodes.
- `setNodeMarker` - visual master/alternative marker.
- `injectSourcePrompt` - restore inherited prompt.

Groups and multi-selection:

- `createGroupFromMarquee`, `createGroupFromSelection` - group creation.
- `deleteSelectedNodes`, `disconnectSelectedNodes`, `cutInternalSelectedEdges`, `downloadSelectedNodes` - multi-selection actions.
- `deleteGroup`, `setGroupColor`, `groupReferenceUrls` - group maintenance.

Pinned trays:

- `addNodeToTray` - duplicate/pin a node into a tray.
- `duplicateTrayNodeToCanvas` - place a pinned reference on canvas.
- `openNodeUpload`, `openTrayUpload` - hidden file input triggers.

Video helpers:

- `setVideoPlaying`, `toggleNodeVideo`, `toggleNodeVideoMute` - playback UI.
- `updateVideoProgress` - progress state.
- `setVideoCrop`, `resetVideoCrop` - frame extraction trim.
- `extractFrameFromVideo` - video frame to linked image node.

Skills/Prompts/Theo:

- `loadCanvasStoreItems` - load store cards.
- `openCanvasStore` - open picker/editor modal.
- `toggleCanvasStoreItem` - pin/unpin selected skill/prompt.
- `startCanvasStoreCreate`, `startCanvasStoreEdit`, `saveCanvasStoreDraft`, `readCanvasStoreItem` - store editor flow.
- `useTheoHelperAsStoreDraft` - turn Theo answer into a draft.
- `startAgentDictation` - speech-to-text into compose box.
- `sendAgentMessage` - sends branch-aware image-aware memory-aware Theo message.
- `renderCanvasStoreCard`, `renderCanvasAgentStorePanel`, `renderCanvasStoreModal` - Skills/Prompts UI rendering.

## Extension Notes

When adding a new feature, decide which layer it belongs to:

1. Data model - add fields to `canvasTypes.ts`, update normalization if old saved files need migration.
2. Graph behavior - add helper functions near similar node/edge/group logic.
3. Generation behavior - extend `callCanvasImageApi`, `callCanvasVideoApi`, or backend `/api/tasks/edit-from-lightbox`.
4. Theo behavior - extend `sendAgentMessage` context or `gemini-agent.ts` memory/system instruction.
5. UI only - add CSS and JSX without changing data semantics.

Be careful with reference flow. If a feature affects what PixVerse sees, verify `collectInputNodes`, `snapshotInputRefs`, and backend `attachmentItems` together. Most surprising generation bugs come from references being present visually but not resolved into local paths for the CLI.

Be careful with server restarts. Changes to `vite.config.ts` require restarting the Vite dev server. Changes to React files hot-reload in the browser.

Be careful with `.env.local`. It is intentionally ignored and should not be committed. Use `.env.example` for documentation only.

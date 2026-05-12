# 2026-05-11 Showcase + Video Front Page Repair

## Completed

- Kept the Mac awake with `caffeinate` so remote phone access does not drop because of sleep.
- Replaced the public art gallery's large add-card with a small hover-style `+` button after the media grid.
- Removed the large "Replace media" and "Capture rounded frame" controls from the expanded gallery overlay.
- Added tiny hover overlay controls in the expanded gallery: `+` to replace/select media and `□` to capture a rounded frame.
- Added drag-and-drop replacement directly onto the expanded gallery media frame.
- Added a glassmorphism media picker for the public gallery with scene media plus Actors / Locations / Props tabs and an upload action.
- Made gallery act labels editable and persisted in localStorage.
- Made public section titles/copy editable and persisted in localStorage.
- Removed the default score description copy by making the score section copy blank/editable.
- Made merch campaign copy, subtitles, titles, and feature bullets editable.
- Made character category titles editable.
- Changed the character video-presentation tab so it displays only the editable character name and short role/note.
- Fixed storyboard video empty slots so double-clicking a video slot opens a video-aware creation lightbox, not the image-only placeholder.
- Fixed lightbox `+` creation in video mode so it creates a video target placeholder.
- Fixed video alternatives in the lightbox strip so video thumbnails render as videos instead of blank numbered boxes.
- Redesigned Actors / Locations / Props library cards as 16:9 horizontal cards with clearer Main / Sheet or Front / Views slots.
- Added multi-file upload and multi-file drag/drop support to resource cards without changing the saved storyboard schema.
- Opened the lightbox note / attach / model / submit toolbar for videos, not only images.
- Added video-specific lightbox controls for prompt notes, use-as-reference, delete, download, compare, and current-frame extraction.
- Extracted video frames are saved through the storyboard upload API and added back to the active video shot as media alternatives.
- Video prompt enhancement now describes video generation and media references instead of saying every reference is an image.
- Upgraded the moodboard canvas shell with a persistent editable board name.
- Moodboard images now upload through the storyboard upload API instead of temporary blob URLs, so they survive reloads.
- Added smoother wheel zoom plus explicit `- / slider / +` zoom controls.
- Added shift/meta multi-select, delete selected, and named color group frames around selected moodboard images.
- Fixed a backend storyboard mode typo: video split/update paths now check `mode === 'videos'`, matching the frontend data model.
- Confirmed PixVerse CLI exposes the needed commands: `pixverse create video` for single-reference video and `pixverse create reference` for multi-reference, including `--videos` references on Seedance 2.0.
- Corrected storyboard video model ids to match PixVerse CLI names: `v6`, `pixverse-c1`, `happyhorse-1.0`, `kling-3.0-standard`, `kling-o3-standard`, and `grok-imagine`.
- Added long-running PixVerse video job support for Seedance multi-reference/video-reference generations: the API now returns a local pending `jobId`, polls the same PixVerse id in the background, refuses placeholder/error downloads, and writes the real MP4 URL when complete.
- Updated storyboard and canvas video generation to poll pending video jobs and inject the finished MP4 into the selected slot/node.

## Verification

- `npx vite build` passed after the public front page repair.
- `npx vite build` passed after the resource-card redesign.
- `npx vite build` passed after the video lightbox toolbar/frame-extraction pass.
- `npx vite build` passed after the moodboard persistence/grouping shell pass.
- `npx vite build` passed after the backend video mode typo fix.
- `npx vite build` passed after the video model id and Seedance async job patches.
- Real 5-second video smoke tests passed for single-reference video models: PixVerse C1, HappyHorse 1.0, Kling 3.0 Standard, Kling O3 Standard, and Grok Imagine.
- Real 5-second Seedance multi-image reference test produced a valid MP4.
- Real 5-second Seedance multi-reference test with 5 image references plus 1 video reference now returns a pending job immediately, completes in the background, downloads a valid 2.7 MB MP4, and appends it to Act 1 / Scene 1 / Video 2.
- Restarted the dev server so the latest `vite.config.ts` API fix is active.
- Non-credit API sanity check against `/api/tasks/edit-from-lightbox` returns the expected validation error for missing `shotId`, confirming the route is alive without triggering generation.
- Restarted the dev server at `http://127.0.0.1:5173/`.

## 2026-05-11 follow-up pass

- Finished non-destructive video trim controls in the lightbox: start/end sliders, apply trim, reset, and split-at-current-time.
- Added video comparison mode support with a sync/manual toggle and video thumbnails rendering as videos in the comparison panel.
- Frame extraction now stores the source video URL and exact second, and extracted frames display a subtle green `00s frame` badge in storyboard and resource cards.
- Resource-card videos now support delete, trim, split, and frame extraction in their own Actor / Location / Prop card instead of trying to write into an empty storyboard shot.
- Resource data is normalized and saved on load, so malformed or blank Props/Actors/Locations no longer crash the resource panels.
- Selected resources inside scene mode now open with the correct media type and resource context, so video cards open as videos and resource deletes target the correct card.
- Deleting an Actor / Location / Prop now also refreshes the legacy actor/location name lists and removes that resource from every scene reference list.
- Repaired the saved storyboard JSON so every existing Prop now has the same safe `id / description / media / sheetMedia / mode` structure as Actors and Locations.

## Follow-up verification

- `npx vite build` passed after adding resource-aware video trim/split/frame extraction.
- `npx vite build` passed after repairing selected-resource lightbox context and resource delete normalization.
- `npx vite build` passed after adding extracted-frame badges.
- `npx vite build` passed after the saved Props JSON repair.
- Disk data check now reports `bad: 0` for Actors, Locations, and Props.

## Notes

- `npm run build` still fails on older TypeScript issues already spread through storyboard/canvas/server code. The Vite production build itself passes.
- The deeper full video lightbox feature set still needs more work: true non-destructive crop/split and simultaneous multi-video comparison playback are not complete yet.
- Moodboard grouping is a first usable shell: group frames can be named and persist, but full group dragging/resizing and style-reference export are still future passes.

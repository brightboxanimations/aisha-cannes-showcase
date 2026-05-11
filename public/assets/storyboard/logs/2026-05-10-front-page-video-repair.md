# 2026-05-10 Front Page And Video Repair Log

## Front Page

- Repaired leaked native file inputs on public hero, gallery, and character portrait controls.
- Public hover controls now render as tiny glass buttons only: plus for upload/replace and cross for delete.
- Removed the extra capture icon from the tiny hover controls.
- Uploaded public gallery/hero media now displays neutral editable placeholders instead of file names.
- Hero title/caption, gallery card title, gallery overlay title/description, and character name/role/description/backstory/traits are editable on the page.
- Editable title/description regions are line-clamped so long text crops instead of changing the layout size.
- Hero carousel status/dots moved to top-center to avoid the add/delete controls.
- Press Play now plays the currently visible uploaded hero video, or jumps to the first video slide if the current slide is an image.
- Kept rounded-frame capture only inside the large gallery overlay.
- Forced public gallery media cards to 16:9.
- Gallery accepts image and video uploads, including drag/drop and multiple upload.
- Gallery art/video cards open a large cinematic overlay with left/right navigation.
- Character portrait areas accept image drag/drop and hover replacement/deletion.
- Contact information remains editable directly on the page.

## Storyboard Video

- Empty video storyboard cells now create a video lightbox target instead of an image target.
- Existing video thumbnails can be double-clicked to open the lightbox.
- Video lightbox note submission uses video generation mode.
- Video model settings are available in the note settings menu:
  - Seedance 2.0 Standard
  - PixVerse 6
  - PixVerse C1
  - Happy Horse
  - Kling 3.0
  - Kling 01
  - Grok
- Video settings include 720p/1080p, duration 1-15 seconds, aspect ratio, and batch count.
- Attachment picker accepts images, videos, and audio files in the UI.
- Backend filters refs correctly: image files pass as image refs, video files pass as video refs, audio files are kept out of PixVerse reference arguments.
- Backend uses PixVerse `create reference` for multi-reference image/video reference generation.

## Verification

- `npx vite build` passes.
- Local dev server restarted on `http://127.0.0.1:5173/`.

## Known Caveat

- `npm run build` still reports older strict TypeScript issues elsewhere in Director Cut/storyboard code that were present outside this repair path. The Vite production bundle builds successfully.

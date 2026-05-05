# Skill: Download Images from PixVerse

## Prerequisites
- User has **PixVerse** (pixverse.ai) open and **logged in** in their browser
- The `pixverse` CLI is available via `npx pixverse`
- CLI shares authentication with the browser session (cookies)

---

## Step-by-Step

### Step 1 — List saved/favorited images

```bash
npx pixverse saved items --type image --limit 100 --json
```

Returns JSON array of favorited images. Each item has:
- `asset_id` — unique ID for download
- `created_at` — UTC timestamp (e.g., `2026-05-05T07:03:20Z`)
- `image_url` — direct URL to the image
- `model` — AI model used (e.g., `gemini-3.1-flash`, `gemini-3.0`)
- `quality` — resolution (e.g., `2160p`, `1440p`)

**Pagination:** If more than 100 items, use `--page 2`, `--page 3`, etc.

### Step 2 — Filter by date and time range

Parse `created_at` to filter images within the requested window.

**Example:** Filter May 5th, 07:00-08:20 UTC:
```python
for item in items:
    ts = item['created_at']  # "2026-05-05T07:03:20Z"
    date = ts[:10]           # "2026-05-05"
    time = ts[11:16]         # "07:03"
    if date == '2026-05-05' and '07:00' <= time <= '08:20':
        # Keep this image
```

> **Important:** Paginate through ALL pages. Don't stop at page 1. Check total count.

### Step 3 — Download each image

```bash
mkdir -p public/assets/storyboard/uploads/<task-folder-name>/
npx pixverse asset download <asset_id> --type image --dest <output_directory> --json
```

The CLI auto-names files as `pixverse_image_<id>_<timestamp>.png`.

### Step 4 — Register images in the task

Build image objects:
```json
{
  "id": "img-<unique>",
  "url": "/assets/storyboard/uploads/<task-folder>/<filename>.png",
  "note": "",
  "selected": false,
  "improve4k": false,
  "splitGrid": false
}
```

Create a Pass object:
```json
{
  "id": "pass-1",
  "name": "Pass 1 — PixVerse Favorites <date> (<time range>)",
  "images": [ ...image objects... ]
}
```

### Step 5 — Update task files

Update **both** files:
1. `public/assets/storyboard/tasks/current/<task-id>.json`
2. `public/assets/storyboard/storyboard-data.json`

Set:
- `status` → `"pass"`
- `passes` → `[pass1]`
- `activePassId` → `"pass-1"`
- `generatedImages` → image array

The UI polls `storyboard-data.json` and auto-refreshes.

---

## Other Useful Commands

| Command | What it does |
|---------|-------------|
| `npx pixverse saved list --json` | List all saved folders |
| `npx pixverse saved items <folder_id> --type image --limit 100 --json` | List items in a specific folder |
| `npx pixverse asset list --type image --limit 100 --json` | List all assets (not just favorites) |
| `npx pixverse asset info <asset_id> --json` | Get details of one asset |
| `npx pixverse account --json` | Check authentication status |

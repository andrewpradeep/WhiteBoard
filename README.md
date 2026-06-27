# CreamBoard

Live app: [creamboard.netlify.app](https://creamboard.netlify.app/)

Apple-minimal browser whiteboard with multi-board tabs, viewport zoom/pan, freehand drawing, shapes, connectors, containers, plain-text labels, PNG export, voice-enabled AI assistant, and local persistence.

## Deprecation

| Folder | Status |
|--------|--------|
| [`v1/`](v1/) | **Deprecated** — legacy prototype snapshot, kept for reference only |
| [`v2/`](v2/) | **Deprecated** — pre-v3 snapshot (workspaces, early geometric model); kept for reference only |
| [`v3/src/`](v3/src/) | **Active** — current CreamBoard source; root tooling loads this via [`index.html`](index.html) |

Do not develop against `v1/` or `v2/`. All new work goes in `v3/src/`.

## Tech Stack

- **UI:** React 18, TypeScript, Vite (`@vitejs/plugin-react-swc`)
- **State:** Redux Toolkit (canvas tools, board data, viewport)
- **Rendering:** HTML Canvas layered engine
- **Persistence:** IndexedDB (`creamboard-v3`)
- **AI assistant:** Local T5 geometric model via `@huggingface/transformers` (quantized ONNX)
- **Speech:** Local Whisper Tiny English (fp32 ONNX, fetched at build time) with Web Speech API fallback
- **Testing:** Playwright end-to-end tests

## Features

### Canvas and editing

- Shapes: square, rectangle, circle, oval, triangle, star, line, arrow, scribble, text box, container
- Selection, drag, resize, erase
- Shape connectors between anchor points (lines and arrows)
- Curved lines and arrows with midpoint bend handles
- Containers: group multiple shapes; single standard shapes are not auto-wrapped
- Shape text editing and object display names (`rect1`, `circle2`, …)
- Toggle element labels on canvas while the assistant is open

### Viewport and boards

- Zoom (`+` / `-` / Fit), pinch-to-zoom, pan via trackpad
- Segmented board tabs, inline rename (double-click), add board
- Content isolated per board; state persisted across reloads
- Mobile-friendly bottom toolbar layout

### Export

- PNG export of the active board

### AI assistant

- Collapsible chat panel with text and voice input
- **Dynamic onboarding:** intro message (patterns) + placement guide (appears when board has shapes or after first shape is added)
- **Command routing (fast paths first):**
  - Pattern library (house, smiley, grid, row, …)
  - Simple shapes (`draw a rectangle`, `create a circle`, …)
  - Relative/spatial placement (`20px left of rect2`, `below the circle`, …)
  - Fuzzy shape aliases for misspellings (`curcle` → circle)
- **Viewport-aware references:** type-only refs prefer the last shape visible in the viewport
- **Geometric model fallback:** local T5 inference when fast paths do not match
- **First-use model consent** (~73 MB download) with session-scoped approval
- **Loading overlay** with progress while the geometric model loads
- **Placement avoidance** so generated shapes do not overlap existing ones

### Offline speech

- Local Whisper Tiny English model (`public/models/whisper-tiny.en/`)
- Model files are **not in git** (merged fp32 decoder exceeds GitHub’s 100 MB limit)
- **Production:** `npm run build` runs `prebuild` → `download:speech-model` automatically (Netlify default build command works as-is)
- **Local dev:** run `npm run download:speech-model` once before using the mic (~144 MB fp32 encoder + merged decoder)
- Mic capture with offline transcription; Web Speech API used when offline model is unavailable

### Future-ready

- Document operation log and sync provider stub

## Run

```sh
npm install --legacy-peer-deps
npm run download:speech-model   # once, before offline speech in dev
npm run dev
```

## Build (production)

```sh
npm run build   # prebuild downloads speech model, then tsc + vite build
```

Deploys to [creamboard.netlify.app](https://creamboard.netlify.app/) use `npm run build` by default — no extra Netlify config needed.

## Test

```sh
npm run lint
npm run build
npm run test:e2e:smoke
npm run test:e2e
npm run test:e2e:model          # geometric model (slow)
```

For `tests/speech-model.spec.ts`, run `npm run download:speech-model` once first (Playwright uses `npm run dev`, not `build`).

## Geometric Model

- Local T5 spatial model outputs compact DSL tokens
- Pattern library handles composite/spatial commands without waiting for retrain
- See [`GEOMETRIC_MODEL_WORKFLOW.md`](GEOMETRIC_MODEL_WORKFLOW.md) for the app-side pipeline

### Model Training (non-blocking)

Training runs in the separate Geometric model repo:

```sh
cd "../Python projects/Geometric model"
chmod +x scripts/*.sh
nohup bash scripts/train_and_deploy_async.sh &
```

Check status:

```sh
cat training.status   # running | success | failed
tail -f training.log
```

On success, artifacts are copied to `public/models/geometric/`. Hard-refresh the browser to load the new weights.

## Project Layout

```
/
  index.html          → loads v3/src/main.tsx
  package.json        → root dev/build/test scripts
  public/models/      → geometric (in repo); whisper (gitignored, downloaded at build)
  scripts/            → download-speech-model.mjs
  tests/              → Playwright e2e tests
  v1/                 → deprecated
  v2/                 → deprecated
  v3/src/             → active application source
```

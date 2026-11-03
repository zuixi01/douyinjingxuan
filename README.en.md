# douyinjingxuan · Video Knowledge Prototype

[简体中文](README.md) · [Contributing](CONTRIBUTING.md) · [Architecture](docs/ARCHITECTURE.md) · [Assets](docs/ASSETS.md)

An independent, unofficial prototype for browsing videos, reading prepared notes, and collecting searchable knowledge cards. The frontend uses React 18, Vite, Tailwind CSS, and Framer Motion. An optional FastAPI backend persists collections in JSON or SQLite via SQLAlchemy.

This project is not affiliated with Douyin, ByteDance, or the featured creators. The repository is public, but the application is an experimental local demo with no stable API or production readiness commitment.

“AI” summaries are prepared sample data and historical processing outputs. Runtime previews do not call an LLM; text intake uses simple extraction rules. Knowledge relationships are derived from keywords and rules. There is no authentication, user isolation, or multi-tenant support.

## Run the frontend

Requires Git, Node.js **22.x (22.13+) or 24+**, and npm, matching `package.json` engines. A full clone includes large tracked media files:

```bash
git clone https://github.com/zuixi01/douyinjingxuan.git
cd douyinjingxuan
npm ci
npm run dev -- --host 127.0.0.1
```

Open the address shown by Vite, usually <http://127.0.0.1:5173>. Without a reachable backend, the app uses browser storage. The data source is selected during page initialization. Backend request failures are reported instead of silently saving locally. Refresh after changing backend availability. Local and backend collections are separate; export important notes before clearing browser data.

For a clone without large media, use this **instead of** the full clone command:

```bash
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/zuixi01/douyinjingxuan.git
cd douyinjingxuan
git sparse-checkout set --no-cone '/*' '!/public/videos/' '!/cache/'
git checkout main
```

The current default application does not depend on `cache/`, so it can build without that directory and display the prepared summaries in `src/data/feed.js`. Local video playback requires the media files. Retrieve the optional cache if you need historical article notes, the legacy root UI, or the cache-processing script. Excluding files does not remove them from Git history or establish redistribution rights.

## Optional backend

Requires Python **3.11+**. Run from the repository root:

```bash
python -m venv .venv
```

macOS / Linux:

```bash
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Health check: <http://127.0.0.1:8000/api/health>. API documentation: <http://127.0.0.1:8000/docs>. Refresh the frontend after starting the API.

The API has no access control: every client shares the same data. Keep it on loopback for personal development. CORS does not provide authentication.

## Configuration

| Variable | Default / purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Frontend API address: `http://127.0.0.1:8000` |
| `KNOWLEDGE_STORAGE_BACKEND` | `json`; set to `database` for SQLAlchemy storage |
| `KNOWLEDGE_DATA_DIR` | `backend/data`; JSON and default SQLite data directory |
| `DATABASE_URL` | Database mode only; defaults to `knowledge.db` in the data directory |
| `KNOWLEDGE_CORS_ORIGINS` | Comma-separated origins; defaults to `localhost` and `127.0.0.1` on ports `5173` and `4173` |

Copy `.env.example` to `.env.local` for Vite configuration and restart Vite after changes. `VITE_` values are public in the browser bundle; never store secrets there.

**The backend does not load `.env` files.** Set its variables in the backend terminal before starting it, for example `export KNOWLEDGE_STORAGE_BACKEND=database` on macOS / Linux, or `$env:KNOWLEDGE_STORAGE_BACKEND = 'database'` in PowerShell. JSON mode uses in-process locking and atomic file replacement, but remains **single-process only**. SQLite is optional; multi-process initialization and deployment have not been verified. Storage modes do not automatically migrate or merge existing data.

Runtime data is not tracked by Git. A fresh backend store starts with default sections and no cards, while frontend-only mode includes one example collection entry. Existing local data files are retained when updating the code.

## Verify and build

```bash
npm run check
npm run preview
python -m pytest backend/tests -q
```

`npm run check` runs frontend tests, cache-tool tests, and the build. Run the Python command in the virtual environment; in PowerShell, use `.\.venv\Scripts\python.exe -m pytest backend/tests -q`. Backend tests use temporary storage. `npm run build` outputs `dist/`; preview is for local inspection.

CI is configured for frontend checks on Ubuntu / Windows with Node.js 22, backend checks on Ubuntu with Python 3.11 / 3.13, and a high-severity npm dependency audit. Check the actual results for the relevant commit. No automatic GitHub Pages deployment is configured.

## Source map

- `src/main.jsx` → `src/app/App.jsx`: current application entry and video UI.
- `src/data/feed.js`: current feed metadata and prepared summaries.
- `src/features/knowledge/` and `src/services/`: collections, storage operations, and previews.
- `article-drafts.js` → `cache/mp3/* - 解析稿.md`: historical article notes used only by the legacy root UI.
- `backend/`: FastAPI routes, JSON / SQLAlchemy repositories, and tests.

The root `douyin_featured_ui_demo.jsx`, root `feed-data.js`, and `src/feed-data.js` are legacy files. The historical script's `--build` command writes `src/feed-data.js`; it does **not** update the current app's `src/data/feed.js`. See the [script guide](scripts/README.md).

## Contributing and licensing

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), [SECURITY.md](SECURITY.md), and the [release checklist](docs/RELEASING.md). No formal stable release or response SLA is claimed.

This preparation branch proposes the [MIT License](LICENSE) for **original project code**, subject to maintainer confirmation before merging and releasing. Third-party videos, audio, transcripts, trademarks, and other third-party content are excluded. Their redistribution rights have not been established by this repository. Review the [asset inventory](docs/ASSETS.md) before reusing or publishing those materials. Dependencies retain their own licenses.

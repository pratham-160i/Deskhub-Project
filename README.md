# Deskhub · Tickets workspace

Vanilla ES modules + Vite for the frontend and a small Express API that reads/writes `db.json` (similar workflow to **json-server**, including **`X-Total-Count`** on list responses for pagination).

## Setup

```bash
npm install
npm run dev
```

Then open **http://localhost:5173/public/login.html** (or **http://localhost:5173/** which redirects there).

### GitHub Pages (`*.github.io/RepoName/…`)

The live site uses **relative asset URLs**, **`siteBase()`** so `/RepoName` is prefixed correctly even when the path does not contain `/public/`, and **`.nojekyll`** so GitHub does not run Jekyll on your files.

**Data on Pages:** `db.json` is copied to **`public/db.json`** (`npm run sync-db`, also runs automatically before `npm run build`) and loaded in the browser together with **`localStorage`** so the full UI works without a server.

On **`*.github.io`**, the app runs in **static mode** (see `src/api/staticMode.js` + `clientDb.js`). Sign-in, tickets, dashboard, comments, and CRUD all work in the browser until you clear site data.

To use the **Node API** instead, run **`npm run dev`** locally (API on port 3001) or deploy `server.mjs` elsewhere and point the client at that URL (future enhancement).

After changing **`db.json`**, run **`npm run sync-db`** (or `npm run build`) so **`public/db.json`** stays in sync for GitHub Pages.

- **API:** http://localhost:3001 (started alongside Vite via `concurrently`)
- **Demo login:** `priya@deskhub.in` / `demo123` (other users in `db.json` still use password `password` unless you change them)

## What’s included

| Area | Notes |
|------|--------|
| **Tickets list** | Search (debounced), status / priority / assignee / sort filters, pagination (10/page), URL sync (`replaceState`) + `popstate`, CSV export |
| **Detail** | Parallel `Promise.all` load for ticket, comments, users; PATCH status/priority/assignee; delete with confirm; comments thread + POST |
| **Dashboard** | Four stat cards using `X-Total-Count` from parallel filtered `GET /tickets` calls; recent 5 tickets |
| **UI** | Toasts, modal (Esc + overlay + initial focus), fullscreen loader, confirm dialog |
| **Forms** | Shared validators; create-ticket modal with blur + submit validation (`textContent` for user text) |

## Architecture

- **`src/main.js`** — reads `data-page` on `<body>` and starts the right module.
- **`src/api/`** — `fetch` wrappers; **`users.js`** caches `GET /users` once per session.
- **`src/modules/`** — page controllers; **`ui.js`** — overlays and toasts.
- **`server.mjs`** — REST + filters + sort + pagination + `X-Total-Count`; validates ticket/comment payloads (400 with message on bad input).

## Production smoke (built assets + API)

```bash
npm run preview:full
```

This runs `vite build`, starts the API, then **`vite preview`** on port **4173** with the same `/tickets` → API proxy as dev. Open **http://localhost:4173/public/login.html**.

## Theme

Use **Dark** / **Light** in the header (or on the login toolbar). Choice is stored in `localStorage` as `deskhub_theme`. System dark preference applies until you pick a mode.

## Screenshots

Add 2–3 screenshots here after you run the app (login, tickets table, dashboard).

## Known limitations

- Tokens are **not** verified on the server (client-side “auth” only, suitable for the course lab).
- Search is simple substring match on title, customer, and description.
- No automated tests in-repo (smoke-test manually).

## What I’d add next

- Real JWT verification middleware and role-based access.
- E2E tests (Playwright) against `npm run dev`.
- Optimistic UI for PATCH and comments.

## Reflection (course hand-in)

The hardest part was matching **filtered** list behaviour with **`X-Total-Count`** and pagination without double-fetching. I’d spend more time up front on a tiny OpenAPI-style contract for query params so the server and client stay in lockstep.

## Stretch goals implemented

- **URL state** for filters + page (with `popstate`).
- **CSV export** of the current filtered list.
- **Dark / light theme** toggle (header or login toolbar), persisted in `localStorage` (`deskhub_theme`), with system preference as the default when unset.

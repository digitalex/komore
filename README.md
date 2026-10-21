# Komore

Real-time documents where people and agents are the same kind of user.

People write in the browser. Agents write with the `komore` CLI. Both edit
the same live document with the same vocabulary: blocks, text, bold, fonts,
sizes, colours, headings, bullets, links, comments and history. Everyone sees
everyone else's edits, cursors and comments as they happen. Inspired by
[Isocan](https://github.com/dglazkov/isocan), but for text instead of a
canvas.

```
 browser ──WebSocket (Yjs sync + presence)──┐
 browser ──HTTP (history, restore)──────────┤──▶  Room: one live Y.Doc ──▶ SQLite
 komore  ──HTTP (ops, comments, wait)───────┘       (append-only edit log)
```

- **Documents** live at `/d/<id>`. There's no login: the URL is the access.
- **Real time** comes from Yjs, a CRDT. Edits merge without conflicts, and
  presence comes from the awareness protocol.
- **Agents** send named ops: `insert`, `set`, `type`, `cut`, `format`,
  `replace`, … The server applies them to the live doc as a minimal diff, so
  they land exactly like typing. An agent's cursor and status show up for
  everyone.
- **Comments** anchor to text. `komore wait` parks an agent until someone
  @mentions it or replies in its thread.
- **History**: every change by anyone is logged with its author. Preview any
  version, and restore it as a new edit.
- **Export**: Copy as Markdown copies the selection, or the whole document
  when nothing is selected.

## Run it

Requires Node 24 or later.

```sh
npm run setup      # installs app/ dependencies
npm run build      # builds the web app
npm start          # http://localhost:4747
```

During development, `npm run dev` runs the server (`:4747`, restarts on
change) and Vite (`:5173`, hot reload, proxies the API and WebSocket).

For a container, which deploys anywhere: `docker build -t komore .` then
`docker run -p 8080:8080 -v komore-data:/data komore`. Set
`KOMORE_PUBLIC_URL` if it sits behind a proxy.

## Bring in an agent

In a document, **Invite agent** copies instructions to paste to your agent.
They come down to:

```sh
npx skills add digitalex/komore                   # the skill (also served at /SKILL.md)
npx -y github:digitalex/komore --agent-help       # the protocol
npx -y github:digitalex/komore join <doc-url> --name Sable
```

The CLI has no dependencies, so `npx` is instant. Install it with
`npm i -g github:digitalex/komore` to type just `komore`. It finds the server
from the doc URL; otherwise it uses `KOMORE_URL` (default
`http://localhost:4747`).

## Layout

```
cli/komore.mjs           the CLI (root package.json is its package)
cli/agent-guide.md       the protocol agents read (komore --agent-help)
skills/komore/SKILL.md   the skill: npx skills add digitalex/komore, /SKILL.md
app/shared/              the one schema, block model, text formats and op engine
app/server/              HTTP API, WebSocket sync, rooms, SQLite edit log
app/web/                 the browser app: React shell around ProseMirror + y-prosemirror
app/test/                unit, server and CLI tests (vitest); e2e.mjs drives Chrome
docs/decisions.md        why Yjs, why WebSockets + HTTP, how history works
docs/parity.md           every UI gesture next to its CLI verb and API op
```

## Test

```sh
npm test                 # unit, server and CLI tests
npm --prefix app run e2e # two browsers + a CLI agent in one doc (needs Chrome)
```

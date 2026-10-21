# Decisions

The foundation choices, why they were made, and what they cost. Read this
before changing any of them.

## 1. The data model is Yjs

Every document is one `Y.Doc`. The text lives in an `XmlFragment` named
`content`, in the shape y-prosemirror reads and writes. Comment threads live
in the same doc, in an array named `threads`.

**Alternatives considered**

| | Yjs | Automerge 2/3 | Loro |
|---|---|---|---|
| Rich-text editor binding | y-prosemirror: years in production, behind Tiptap and others | automerge-prosemirror: newer | loro-prosemirror: newer |
| Presence | awareness protocol, built in | DIY | built-in ephemeral store |
| Anchors that survive edits | relative positions | cursors | cursors |
| Per-user undo | `UndoManager` scoped by origin | DIY | built in |
| Runtime | pure JS, small | WASM | WASM |
| Wire protocol everyone speaks | y-websocket sync + awareness | automerge-repo | DIY |

Yjs wins on maturity where it matters most to us: the ProseMirror binding,
presence, and per-origin undo. Automerge's built-in history is attractive,
but we get history more simply by logging updates (decision 4).

**The cost.** A Yjs document only grows: deleted content leaves tombstones.
Yjs garbage-collects deleted content by default, and history is kept in the
update log rather than in the doc, so the live doc stays lean.

## 2. Browsers use WebSockets. Agents use plain HTTP.

**Browser ↔ server: a WebSocket per open tab.** It carries the standard
y-websocket protocol: sync step 1/2 plus incremental updates, and awareness
for cursors and presence.

- Collaborative editing is bidirectional and high-frequency: every keystroke
  goes up and everyone else's comes down, plus cursor movement. A WebSocket
  is one ordered, full-duplex, binary channel.
- SSE only flows server → client, and only as text. Client edits would need a
  separate POST per keystroke, with no ordering guarantee relative to the
  stream, two connections per tab, and base64 overhead on binary Yjs updates.
- Using the y-websocket wire format means any Yjs client can connect, and we
  inherit its reconnect and resync logic.

**CLI ↔ server: request/response HTTP, plus one long-poll.**

- An agent's command is a one-shot process. It has no use for a persistent
  socket, and nothing in it needs to hold CRDT state.
- `komore wait` is a long-poll (`GET …/wait`). It blocks in one tool call and
  returns when something addresses the agent, which matches how agent
  harnesses work: the call returning is the wake-up. It also passes through
  any proxy that can carry HTTP.
- If something ever needs to watch a doc continuously without a CRDT (a
  dashboard, say), an SSE event stream is the natural addition. Nothing
  needs it yet.

## 3. The server applies agent ops to the live document

The CLI sends named ops (`insert_blocks`, `format`, …). The server:

1. reads the live `Y.Doc` into the flat block model,
2. applies the op batch to it (a pure function in `shared/ops.ts`, atomic,
   with errors that say what to do next), and
3. writes the result back through y-prosemirror's `updateYFragment`, which
   diffs against the current state and emits a minimal Yjs update.

Step 3 produces the same kind of update a person typing would. Browsers see
an agent's edit land in place, not a page reload. Concurrent typing elsewhere
in the doc is untouched. Agents need no CRDT library, and quote-based
addressing (`--match "words"`) is resolved against the latest state at the
moment of applying. The server's Node process is single-threaded, so
read-apply-write is atomic with respect to every other edit.

## 4. The edit log is the Yjs update stream

Every update that reaches a document is appended to SQLite with its author,
time, and a label (the op names for API edits, `restore N`, `undo`). Every
250 updates we also store a full-state checkpoint.

- **Any past version** = latest checkpoint at or before it, plus replay of
  the updates after it.
- **Versions in the UI** group continuous browser typing by time (a version
  breaks after 60 s idle or 10 min of activity). An API op batch is always a
  version of its own, because it is one deliberate act: "go back to before
  the agent rewrote this" has to be possible.
- **Restore** never rewinds the log. It writes the old content as a new edit,
  by whoever restored it, so restoring is itself undoable and visible.

## 5. Users are just users

A user is a name and a colour, and its id is derived from the name. The
browser and the CLI send the same thing; the server attributes socket edits
to the socket's user and API edits to the request's user. There's no access
control by design: the document URL is the capability. Two people who pick
the same name are the same user.

## 6. Distribution follows Isocan

- The root `package.json` *is* the CLI: zero dependencies, no build step. So
  `npx -y github:digitalex/komore …` is fast, and npm's git installer never
  runs a nested build.
- The skill lives at `skills/komore/SKILL.md`, which is where `npx skills add
  digitalex/komore` looks. The server also serves it at `/SKILL.md`.
- The skill is a doorway. The protocol ships inside the CLI
  (`komore --agent-help`, `cli/agent-guide.md`), so it describes the build
  the agent is actually running.

## Known limits

- **One process holds each live doc.** Rooms are in memory. Running more than
  one server instance needs sticky routing by doc id, or a pub/sub layer
  between instances.
- **The update log grows forever.** Compaction (merging old updates between
  checkpoints) is future work.
- **API ops convert the whole document** to blocks and back. That's linear in
  document size and fine into the thousands of blocks.
- **Comment anchors** that span several blocks are reported to agents from
  the block where they start.

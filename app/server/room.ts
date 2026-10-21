// A room is one live document: the authoritative Y.Doc, the browsers
// connected to it over WebSocket, the API users present on it, and the
// comment feed agents wait on.
//
// Every change — a keystroke from a socket, an op batch from the CLI, a
// restore, an undo — is a Yjs transaction on this one doc. The `update`
// handler logs it with its author and relays it to every socket. Nothing
// distinguishes a person from an agent: both are a `User` on an origin.
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { updateYFragment, yXmlFragmentToProseMirrorRootNode } from "y-prosemirror";
import type { WebSocket } from "ws";

import { schema, newId } from "../shared/schema.ts";
import { blocksToDoc, docToBlocks, ensureIds, spansText } from "../shared/blocks.ts";
import type { Block } from "../shared/blocks.ts";
import { applyOps, OpError } from "../shared/ops.ts";
import type { Caret, Op, OpResult } from "../shared/ops.ts";
import { addMessage, createThread, findThread, readThread, threadsOf } from "../shared/comments.ts";
import type { Message, ThreadData } from "../shared/comments.ts";
import { mentions } from "../shared/identity.ts";
import type { User } from "../shared/identity.ts";
import type { Store, EventRow } from "./db.ts";

export const CONTENT = "content";
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const CHECKPOINT_EVERY = 250;
/** API users fade from presence this long after their last call. */
export const PRESENCE_TTL_MS = 2 * 60_000;

/** Where an API user's change came from. */
interface ApiOrigin {
  kind: "api";
  user: User;
  label: string;
}

interface Conn {
  kind: "ws";
  socket: WebSocket;
  user: User;
  /** Awareness client ids this socket controls. */
  clients: Set<number>;
}

/** An API user's presence: their own awareness so they get a cursor like anyone. */
interface ApiPresence {
  user: User;
  ydoc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  expires: number;
  waiting: number;
  undo: Y.UndoManager;
  origin: ApiOrigin;
}

interface Waiter {
  user: User;
  after: number;
  all: boolean;
  resolve: (events: WakeEvent[]) => void;
}

export interface WakeEvent {
  seq: number;
  threadId: string;
  messageId: string;
  author: string;
  body: string;
  ts: number;
  quote: string;
  reason: "mention" | "thread" | "all";
}

export interface Version {
  /** The update seq this version ends at — pass it to show/restore. */
  version: number;
  from: number;
  to: number;
  authors: { name: string; color: string }[];
  edits: number;
  labels: string[];
}

function blocksOfFragment(frag: Y.XmlFragment): Block[] {
  return docToBlocks(yXmlFragmentToProseMirrorRootNode(frag, schema));
}

export class Room {
  readonly id: string;
  readonly doc = new Y.Doc();
  readonly fragment: Y.XmlFragment;
  readonly awareness: awarenessProtocol.Awareness;
  private conns = new Set<Conn>();
  private api = new Map<string, ApiPresence>();
  private waiters = new Set<Waiter>();
  private knownMessages = new Set<string>();
  private sinceCheckpoint = 0;
  private titleTimer: NodeJS.Timeout | null = null;
  private sweeper: NodeJS.Timeout;
  lastActive = Date.now();

  private store: Store;

  constructor(id: string, store: Store) {
    this.id = id;
    this.store = store;
    this.fragment = this.doc.getXmlFragment(CONTENT);
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.awareness.setLocalState(null); // the server itself has no presence

    this.load();
    for (const t of threadsOf(this.doc)) for (const m of readThread(t).messages) this.knownMessages.add(m.id);

    this.doc.on("update", (update: Uint8Array, origin: unknown, _doc: Y.Doc, tr: Y.Transaction) => this.onUpdate(update, origin, tr));
    this.awareness.on("update", ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
      const changed = [...added, ...updated, ...removed];
      if (origin && typeof origin === "object" && (origin as Conn).kind === "ws") {
        const conn = origin as Conn;
        added.forEach((c) => conn.clients.add(c));
        removed.forEach((c) => conn.clients.delete(c));
      }
      const msg = encoding.createEncoder();
      encoding.writeVarUint(msg, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(msg, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed));
      this.broadcast(encoding.toUint8Array(msg));
    });
    this.sweeper = setInterval(() => this.sweepPresence(), 10_000);
    this.sweeper.unref();
  }

  // ------------------------------------------------------------ persistence

  private load(): void {
    const cp = this.store.checkpointAtOrBefore(this.id);
    if (cp) Y.applyUpdate(this.doc, cp.data, "load");
    const rows = this.store.updates(this.id, cp?.seq ?? 0);
    for (const r of rows) Y.applyUpdate(this.doc, r.data, "load");
    this.sinceCheckpoint = rows.length;
  }

  private onUpdate(update: Uint8Array, origin: unknown, tr: Y.Transaction): void {
    this.lastActive = Date.now();
    // Relay to every socket except the one it came from.
    const msg = encoding.createEncoder();
    encoding.writeVarUint(msg, MESSAGE_SYNC);
    syncProtocol.writeUpdate(msg, update);
    this.broadcast(encoding.toUint8Array(msg), origin as Conn);

    if (origin === "load") return;
    const user = this.userOf(origin);
    const touched = (t: unknown) => tr.changedParentTypes.has(t as Y.AbstractType<Y.YEvent<any>>) || tr.changed.has(t as Y.AbstractType<Y.YEvent<any>>);
    const kind = touched(this.fragment)
      ? "content"
      : touched(threadsOf(this.doc))
        ? "comments"
        : "meta";
    const label = origin && typeof origin === "object" && (origin as ApiOrigin).kind === "api"
      ? (origin as ApiOrigin).label
      : origin instanceof Y.UndoManager
        ? "undo"
        : null;
    const seq = this.store.appendUpdate({
      doc_id: this.id,
      data: update,
      user_id: user?.id ?? null,
      user_name: user?.name ?? null,
      user_color: user?.color ?? null,
      kind,
      label,
      ts: Date.now(),
    });
    if (++this.sinceCheckpoint >= CHECKPOINT_EVERY) {
      this.store.saveCheckpoint(this.id, seq, Y.encodeStateAsUpdate(this.doc));
      this.sinceCheckpoint = 0;
    }
    if (kind === "content") this.scheduleTitle();
    if (kind === "comments") this.scanComments();
  }

  private userOf(origin: unknown): User | null {
    if (!origin || typeof origin !== "object") return null;
    if ((origin as Conn).kind === "ws") return (origin as Conn).user;
    if ((origin as ApiOrigin).kind === "api") return (origin as ApiOrigin).user;
    for (const p of this.api.values()) if (p.undo === origin) return p.user;
    return null;
  }

  private scheduleTitle(): void {
    if (this.titleTimer) return;
    this.titleTimer = setTimeout(() => {
      this.titleTimer = null;
      const first = blocksOfFragment(this.fragment).find((b) => spansText(b.spans).trim());
      this.store.setTitle(this.id, first ? spansText(first.spans).trim().slice(0, 120) : "");
    }, 500);
  }

  // ------------------------------------------------------------ sockets

  addSocket(socket: WebSocket, user: User): void {
    const conn: Conn = { kind: "ws", socket, user, clients: new Set() };
    this.conns.add(conn);
    this.lastActive = Date.now();
    socket.binaryType = "arraybuffer";
    socket.on("message", (data: ArrayBuffer | Buffer) => {
      try {
        this.onMessage(conn, new Uint8Array(data as ArrayBuffer));
      } catch (e) {
        console.error(`[${this.id}] bad message`, e);
      }
    });
    socket.on("close", () => {
      this.conns.delete(conn);
      awarenessProtocol.removeAwarenessStates(this.awareness, [...conn.clients], null);
      this.lastActive = Date.now();
    });
    // Sync step 1, then everyone's presence.
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(enc, this.doc);
    this.send(conn, encoding.toUint8Array(enc));
    const states = [...this.awareness.getStates().keys()];
    if (states.length) {
      const a = encoding.createEncoder();
      encoding.writeVarUint(a, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(a, awarenessProtocol.encodeAwarenessUpdate(this.awareness, states));
      this.send(conn, encoding.toUint8Array(a));
    }
  }

  private onMessage(conn: Conn, data: Uint8Array): void {
    const decoder = decoding.createDecoder(data);
    const type = decoding.readVarUint(decoder);
    if (type === MESSAGE_SYNC) {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, enc, this.doc, conn);
      if (encoding.length(enc) > 1) this.send(conn, encoding.toUint8Array(enc));
    } else if (type === MESSAGE_AWARENESS) {
      awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), conn);
    }
  }

  private send(conn: Conn, msg: Uint8Array): void {
    if (conn.socket.readyState === 1) conn.socket.send(msg);
  }

  private broadcast(msg: Uint8Array, except?: Conn): void {
    for (const c of this.conns) if (c !== except) this.send(c, msg);
  }

  get socketCount(): number {
    return this.conns.size;
  }

  get idle(): boolean {
    return this.conns.size === 0 && this.api.size === 0 && this.waiters.size === 0;
  }

  // ------------------------------------------------------------ API presence

  /** Mark an API user present (refreshing their TTL) and return their presence. */
  touch(user: User, fields: { status?: string | null; caret?: Caret | null } = {}): ApiPresence {
    let p = this.api.get(user.id);
    if (!p) {
      const ydoc = new Y.Doc();
      const awareness = new awarenessProtocol.Awareness(ydoc);
      awareness.on("update", ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
        const changed = [...added, ...updated, ...removed];
        awarenessProtocol.applyAwarenessUpdate(this.awareness, awarenessProtocol.encodeAwarenessUpdate(awareness, changed), "api");
      });
      const origin: ApiOrigin = { kind: "api", user, label: "" };
      const undo = new Y.UndoManager(this.fragment, { trackedOrigins: new Set([origin]), captureTimeout: 0 });
      p = { user, ydoc, awareness, expires: 0, waiting: 0, undo, origin };
      this.api.set(user.id, p);
      awareness.setLocalState({ user: { name: user.name, color: user.color, id: user.id }, via: "api", status: null, cursor: null });
    }
    p.user = user;
    p.origin.user = user;
    p.expires = Date.now() + PRESENCE_TTL_MS;
    const state = { ...(p.awareness.getLocalState() ?? {}) } as Record<string, unknown>;
    state.user = { name: user.name, color: user.color, id: user.id };
    if (fields.status !== undefined) state.status = fields.status;
    if (fields.caret !== undefined) state.cursor = fields.caret ? this.caretToCursor(fields.caret) : null;
    p.awareness.setLocalState(state);
    this.lastActive = Date.now();
    return p;
  }

  leave(userId: string): boolean {
    const p = this.api.get(userId);
    if (!p) return false;
    this.dropPresence(p);
    return true;
  }

  private dropPresence(p: ApiPresence): void {
    p.awareness.setLocalState(null);
    p.awareness.destroy();
    p.undo.destroy();
    this.api.delete(p.user.id);
  }

  private sweepPresence(): void {
    const now = Date.now();
    for (const p of this.api.values()) if (p.waiting === 0 && p.expires < now) this.dropPresence(p);
  }

  /** Everyone here: browsers and API users alike. */
  presence(): { name: string; color: string; id?: string; status?: string | null; via: string }[] {
    const seen = new Map<string, { name: string; color: string; id?: string; status?: string | null; via: string }>();
    for (const state of this.awareness.getStates().values()) {
      const u = state.user as { name?: string; color?: string; id?: string } | undefined;
      if (!u?.name) continue;
      const key = u.id ?? u.name;
      if (!seen.has(key)) seen.set(key, { name: u.name, color: u.color ?? "#888888", id: u.id, status: (state.status as string) ?? null, via: (state.via as string) ?? "web" });
    }
    return [...seen.values()];
  }

  /** A relative-position cursor the browser's cursor plugin can draw. */
  private caretToCursor(caret: Caret): { anchor: unknown; head: unknown } | null {
    const text = this.textOfBlock(caret.blockId);
    if (!text) return null;
    const pos = Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(text, Math.min(caret.offset, text.length)));
    return { anchor: pos, head: pos };
  }

  /** The Y.XmlText holding a block's characters (created if the block is empty). */
  private textOfBlock(blockId: string): Y.XmlText | null {
    const el = this.elementOfBlock(blockId);
    if (!el) return null;
    const first = el.get(0);
    if (first instanceof Y.XmlText) return first;
    return null;
  }

  private elementOfBlock(blockId: string): Y.XmlElement | null {
    const walk = (parent: Y.XmlFragment | Y.XmlElement): Y.XmlElement | null => {
      for (const child of parent.toArray()) {
        if (!(child instanceof Y.XmlElement)) continue;
        if (child.getAttribute("id") === blockId) return child;
        const found = walk(child);
        if (found) return found;
      }
      return null;
    };
    return walk(this.fragment);
  }

  // ------------------------------------------------------------ reading & editing

  blocks(): Block[] {
    const blocks = blocksOfFragment(this.fragment);
    if (ensureIds(blocks)) {
      // Someone's editor left a block without an id (or two with one). Settle
      // it now so the ids we hand out are the ids that stay.
      this.writeBlocks(blocks, "system");
      return blocksOfFragment(this.fragment);
    }
    return blocks;
  }

  private writeBlocks(blocks: Block[], origin: unknown): void {
    const pm = blocksToDoc(blocks);
    this.doc.transact(() => {
      updateYFragment(this.doc, this.fragment, pm, { mapping: new Map(), isOMark: new Map() });
    }, origin);
  }

  /** Apply an op batch as `user`. Atomic: on error nothing changes. */
  apply(user: User, ops: Op[]): { results: OpResult[]; blocks: Block[] } {
    const before = this.blocks();
    const { blocks, results, caret } = applyOps(before, ops);
    const p = this.touch(user);
    p.origin.label = [...new Set(ops.map((o) => o.op))].join(", ");
    p.undo.stopCapturing();
    this.writeBlocks(blocks, p.origin);
    p.undo.stopCapturing();
    this.touch(user, { caret });
    return { results, blocks: this.blocks() };
  }

  undo(user: User, redo = false): boolean {
    const p = this.touch(user);
    const mgr = p.undo;
    const stack = redo ? mgr.redoStack : mgr.undoStack;
    if (!stack.length) return false;
    if (redo) mgr.redo();
    else mgr.undo();
    return true;
  }

  // ------------------------------------------------------------ comments

  threads(): ThreadData[] {
    return threadsOf(this.doc).toArray().map(readThread);
  }

  /** Where a thread's anchor sits now: block id, offsets, and the text there. */
  anchorOf(t: ThreadData): { blockId: string; from: number; to: number; text: string } | null {
    if (!t.anchor) return null;
    try {
      const from = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(t.anchor.from), this.doc);
      const to = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(t.anchor.to), this.doc);
      if (!from || !to || !(from.type instanceof Y.XmlText)) return null;
      const parent = from.type.parent;
      if (!(parent instanceof Y.XmlElement)) return null;
      const blockId = parent.getAttribute("id") as string | undefined;
      if (!blockId) return null;
      const plain = (from.type.toDelta() as { insert: unknown }[]).map((d) => (typeof d.insert === "string" ? d.insert : "")).join("");
      // A selection across blocks is reported from where it starts, with the original quote.
      if (from.type !== to.type) return { blockId, from: from.index, to: plain.length, text: t.quote };
      return { blockId, from: from.index, to: to.index, text: plain.slice(from.index, to.index) };
    } catch {
      return null;
    }
  }

  addComment(user: User, body: string, anchor?: { blockId: string; from: number; to: number } | null): ThreadData {
    if (!body.trim()) throw new OpError("comment body is empty");
    let relAnchor: ThreadData["anchor"] = null;
    let quote = "";
    if (anchor) {
      const text = this.textOfBlock(anchor.blockId);
      if (!text) throw new OpError(`no text in block "${anchor.blockId}" to comment on`);
      const plain = spansText(this.blocks().find((b) => b.id === anchor.blockId)?.spans ?? []);
      if (anchor.from < 0 || anchor.to > plain.length || anchor.from >= anchor.to) throw new OpError(`range ${anchor.from}..${anchor.to} is outside block ${anchor.blockId}`);
      quote = plain.slice(anchor.from, anchor.to);
      relAnchor = {
        from: Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(text, anchor.from)),
        to: Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(text, anchor.to, -1)),
      };
    }
    const p = this.touch(user, anchor ? { caret: { blockId: anchor.blockId, offset: anchor.to } } : {});
    const msg: Message = { id: newId(10), author: user, body, ts: Date.now() };
    let id = "";
    this.doc.transact(() => {
      id = newId(10);
      createThread(this.doc, { id, anchor: relAnchor, quote, author: user, createdAt: msg.ts }, msg);
    }, { ...p.origin, label: "comment" });
    return readThread(findThread(this.doc, id)!);
  }

  reply(user: User, threadId: string, body: string): ThreadData {
    if (!body.trim()) throw new OpError("reply body is empty");
    const t = this.requireThread(threadId);
    const p = this.touch(user);
    this.doc.transact(() => addMessage(t, { id: newId(10), author: user, body, ts: Date.now() }), { ...p.origin, label: "comment" });
    return readThread(t);
  }

  setResolved(user: User, threadId: string, resolved: boolean): ThreadData {
    const t = this.requireThread(threadId);
    const p = this.touch(user);
    this.doc.transact(() => t.set("resolved", resolved), { ...p.origin, label: resolved ? "resolve" : "reopen" });
    return readThread(t);
  }

  private requireThread(threadId: string): Y.Map<unknown> {
    const all = threadsOf(this.doc).toArray();
    const t = all.find((x) => x.get("id") === threadId) ?? all.filter((x) => String(x.get("id")).startsWith(threadId)).at(0);
    if (!t) throw new OpError(`no comment thread "${threadId}" — run \`komore comments\``);
    return t;
  }

  /** Find messages nobody has seen yet, record them as events, wake waiters. */
  private scanComments(): void {
    let added = false;
    for (const t of threadsOf(this.doc)) {
      const data = readThread(t);
      for (const m of data.messages) {
        if (this.knownMessages.has(m.id)) continue;
        this.knownMessages.add(m.id);
        this.store.appendEvent({
          doc_id: this.id,
          thread_id: data.id,
          message_id: m.id,
          author_id: m.author?.id ?? "",
          author_name: m.author?.name ?? "",
          body: m.body,
          ts: m.ts,
        });
        added = true;
      }
    }
    if (added) for (const w of [...this.waiters]) this.tryWake(w);
  }

  // ------------------------------------------------------------ waiting

  eventHead(): number {
    return this.store.latestEvent(this.id);
  }

  /** Events after `after` that concern `user`. */
  relevantEvents(user: User, after: number, all: boolean): WakeEvent[] {
    const threads = new Map(this.threads().map((t) => [t.id, t]));
    const out: WakeEvent[] = [];
    for (const e of this.store.eventsAfter(this.id, after) as EventRow[]) {
      if (e.author_id === user.id) continue;
      const t = threads.get(e.thread_id);
      let reason: WakeEvent["reason"] | null = null;
      if (mentions(e.body, user.name)) reason = "mention";
      else if (t && (t.author?.id === user.id || t.messages.some((m) => m.author?.id === user.id))) reason = "thread";
      else if (all) reason = "all";
      if (reason) out.push({ seq: e.seq, threadId: e.thread_id, messageId: e.message_id, author: e.author_name, body: e.body, ts: e.ts, quote: t?.quote ?? "", reason });
    }
    return out;
  }

  /** Resolve when something concerning `user` arrives after `after`, or [] on timeout. */
  wait(user: User, after: number, all: boolean, timeoutMs: number, signal?: AbortSignal): Promise<WakeEvent[]> {
    const ready = this.relevantEvents(user, after, all);
    if (ready.length) return Promise.resolve(ready);
    const p = this.touch(user, { status: "waiting for comments" });
    p.waiting++;
    return new Promise((resolve) => {
      const finish = (events: WakeEvent[]) => {
        clearTimeout(timer);
        this.waiters.delete(waiter);
        p.waiting = Math.max(0, p.waiting - 1);
        if (this.api.get(user.id) === p) this.touch(user, { status: null });
        resolve(events);
      };
      const waiter: Waiter = { user, after, all, resolve: finish };
      const timer = setTimeout(() => finish([]), timeoutMs);
      signal?.addEventListener("abort", () => finish([]));
      this.waiters.add(waiter);
    });
  }

  private tryWake(w: Waiter): void {
    const events = this.relevantEvents(w.user, w.after, w.all);
    if (events.length) w.resolve(events);
  }

  // ------------------------------------------------------------ history

  /** The edit log, grouped into versions (newest first). */
  versions(): Version[] {
    const rows = this.store.updateLog(this.id).filter((r) => r.kind === "content");
    const groups: Version[] = [];
    let cur: (Version & { authorKeys: Set<string>; start: number; discrete: boolean }) | null = null;
    // Typing in the browser streams many small updates; those group by time.
    // An API op batch (an agent's command, a restore, the creation) is one
    // deliberate act, so it is always a version of its own — which is what
    // makes "go back to just before the agent rewrote this" possible.
    const GAP = 60_000;
    const SPAN = 10 * 60_000;
    for (const r of rows) {
      const discrete = !!r.label;
      if (!cur || discrete || cur.discrete || r.ts - cur.to > GAP || r.ts - cur.start > SPAN) {
        if (cur) groups.push(cur);
        cur = { version: r.seq, from: r.ts, to: r.ts, authors: [], edits: 0, labels: [], authorKeys: new Set(), start: r.ts, discrete };
      }
      cur.version = r.seq;
      cur.to = r.ts;
      cur.edits++;
      const key = r.user_id ?? "system";
      if (!cur.authorKeys.has(key) && r.user_name) {
        cur.authorKeys.add(key);
        cur.authors.push({ name: r.user_name, color: r.user_color ?? "#888888" });
      }
      if (r.label && !cur.labels.includes(r.label)) cur.labels.push(r.label);
    }
    if (cur) groups.push(cur);
    return groups.reverse().map(({ version, from, to, authors, edits, labels }) => ({ version, from, to, authors, edits, labels }));
  }

  /** The document's blocks as they were right after update `seq`. */
  blocksAt(seq: number): Block[] {
    const doc = new Y.Doc();
    const cp = this.store.checkpointAtOrBefore(this.id, seq);
    Y.transact(doc, () => {
      if (cp) Y.applyUpdate(doc, cp.data);
      for (const r of this.store.updates(this.id, cp?.seq ?? 0, seq)) Y.applyUpdate(doc, r.data);
    });
    const blocks = blocksOfFragment(doc.getXmlFragment(CONTENT));
    doc.destroy();
    return blocks;
  }

  /** Make the document look like version `seq` again, as a new edit by `user`. */
  restore(user: User, seq: number): Block[] {
    const exists = this.store.updateLog(this.id).some((r) => r.seq === seq);
    if (!exists) throw new OpError(`no version ${seq} — run \`komore history\``);
    const target = this.blocksAt(seq);
    const p = this.touch(user);
    p.origin.label = `restore ${seq}`;
    this.writeBlocks(target, p.origin);
    return this.blocks();
  }

  destroy(): void {
    clearInterval(this.sweeper);
    if (this.titleTimer) clearTimeout(this.titleTimer);
    for (const p of [...this.api.values()]) this.dropPresence(p);
    for (const w of [...this.waiters]) w.resolve([]);
    this.awareness.destroy();
    this.doc.destroy();
  }
}

/** Create a document's first state: one paragraph (or the given blocks). */
export function seedDoc(store: Store, id: string, blocks: Block[], user: User | null): void {
  const doc = new Y.Doc();
  const frag = doc.getXmlFragment(CONTENT);
  let update: Uint8Array | null = null;
  doc.on("update", (u: Uint8Array) => (update = u));
  const ready = blocks.length ? blocks : [{ id: newId(), type: "p" as const, depth: 0, spans: [] }];
  ensureIds(ready);
  doc.transact(() => updateYFragment(doc, frag, blocksToDoc(ready), { mapping: new Map(), isOMark: new Map() }));
  store.createDoc(id);
  const first = ready.find((b) => spansText(b.spans).trim());
  if (first) store.setTitle(id, spansText(first.spans).trim().slice(0, 120));
  store.appendUpdate({
    doc_id: id,
    data: update!,
    user_id: user?.id ?? null,
    user_name: user?.name ?? null,
    user_color: user?.color ?? null,
    kind: "content",
    label: "create",
    ts: Date.now(),
  });
  doc.destroy();
}

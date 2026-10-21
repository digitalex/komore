// Storage. Every Yjs update that reaches a document is appended to `updates`
// with who made it and when — that append-only log IS the edit history, and
// any past version is rebuilt by replaying it. `checkpoints` hold full states
// every so often so replays stay short. `events` is the comment feed that
// `komore wait` long-polls.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface UpdateRow {
  seq: number;
  doc_id: string;
  data: Uint8Array;
  user_id: string | null;
  user_name: string | null;
  user_color: string | null;
  kind: "content" | "comments" | "meta";
  label: string | null;
  ts: number;
}

export interface EventRow {
  seq: number;
  doc_id: string;
  thread_id: string;
  message_id: string;
  author_id: string;
  author_name: string;
  body: string;
  ts: number;
}

export class Store {
  db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS docs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS updates (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id TEXT NOT NULL,
        data BLOB NOT NULL,
        user_id TEXT,
        user_name TEXT,
        user_color TEXT,
        kind TEXT NOT NULL,
        label TEXT,
        ts INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS updates_doc ON updates (doc_id, seq);
      CREATE TABLE IF NOT EXISTS checkpoints (
        doc_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        data BLOB NOT NULL,
        PRIMARY KEY (doc_id, seq)
      );
      CREATE TABLE IF NOT EXISTS events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        body TEXT NOT NULL,
        ts INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS events_doc ON events (doc_id, seq);
    `);
  }

  createDoc(id: string, now = Date.now()): void {
    this.db.prepare("INSERT INTO docs (id, created_at, updated_at) VALUES (?, ?, ?)").run(id, now, now);
  }

  getDoc(id: string): { id: string; title: string; created_at: number; updated_at: number } | undefined {
    return this.db.prepare("SELECT * FROM docs WHERE id = ?").get(id) as never;
  }

  setTitle(id: string, title: string): void {
    this.db.prepare("UPDATE docs SET title = ? WHERE id = ?").run(title, id);
  }

  appendUpdate(row: Omit<UpdateRow, "seq">): number {
    const r = this.db
      .prepare("INSERT INTO updates (doc_id, data, user_id, user_name, user_color, kind, label, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(row.doc_id, row.data, row.user_id, row.user_name, row.user_color, row.kind, row.label, row.ts);
    this.db.prepare("UPDATE docs SET updated_at = ? WHERE id = ?").run(row.ts, row.doc_id);
    return Number(r.lastInsertRowid);
  }

  /** Updates after `afterSeq`, up to and including `uptoSeq`. */
  updates(docId: string, afterSeq: number, uptoSeq = Number.MAX_SAFE_INTEGER): UpdateRow[] {
    return this.db
      .prepare("SELECT * FROM updates WHERE doc_id = ? AND seq > ? AND seq <= ? ORDER BY seq")
      .all(docId, afterSeq, uptoSeq) as unknown as UpdateRow[];
  }

  /** Metadata only (no blobs) for the history view. */
  updateLog(docId: string): Omit<UpdateRow, "data">[] {
    return this.db
      .prepare("SELECT seq, doc_id, user_id, user_name, user_color, kind, label, ts FROM updates WHERE doc_id = ? ORDER BY seq")
      .all(docId) as unknown as Omit<UpdateRow, "data">[];
  }

  countSince(docId: string, seq: number): number {
    const r = this.db.prepare("SELECT COUNT(*) AS n FROM updates WHERE doc_id = ? AND seq > ?").get(docId, seq) as { n: number };
    return r.n;
  }

  latestSeq(docId: string): number {
    const r = this.db.prepare("SELECT MAX(seq) AS s FROM updates WHERE doc_id = ?").get(docId) as { s: number | null };
    return r.s ?? 0;
  }

  saveCheckpoint(docId: string, seq: number, data: Uint8Array): void {
    this.db.prepare("INSERT OR REPLACE INTO checkpoints (doc_id, seq, data) VALUES (?, ?, ?)").run(docId, seq, data);
  }

  /** The newest checkpoint at or before `seq`. */
  checkpointAtOrBefore(docId: string, seq = Number.MAX_SAFE_INTEGER): { seq: number; data: Uint8Array } | undefined {
    return this.db
      .prepare("SELECT seq, data FROM checkpoints WHERE doc_id = ? AND seq <= ? ORDER BY seq DESC LIMIT 1")
      .get(docId, seq) as never;
  }

  appendEvent(e: Omit<EventRow, "seq">): number {
    const r = this.db
      .prepare("INSERT INTO events (doc_id, thread_id, message_id, author_id, author_name, body, ts) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(e.doc_id, e.thread_id, e.message_id, e.author_id, e.author_name, e.body, e.ts);
    return Number(r.lastInsertRowid);
  }

  eventsAfter(docId: string, seq: number): EventRow[] {
    return this.db.prepare("SELECT * FROM events WHERE doc_id = ? AND seq > ? ORDER BY seq").all(docId, seq) as unknown as EventRow[];
  }

  latestEvent(docId: string): number {
    const r = this.db.prepare("SELECT MAX(seq) AS s FROM events WHERE doc_id = ?").get(docId) as { s: number | null };
    return r.s ?? 0;
  }
}

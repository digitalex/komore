// The Komore server: one HTTP API for everybody, one WebSocket per open
// browser tab, and the web app's static files.
//
//   browser ──ws /ws/:id (Yjs sync + presence)──┐
//   browser ──http /api/… (history, restore)────┤──▶ Room (Y.Doc) ──▶ SQLite
//   CLI     ──http /api/… (ops, comments, wait)─┘
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse, Server } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

import { Store } from "./db.ts";
import { Room, seedDoc } from "./room.ts";
import type { ThreadData } from "../shared/comments.ts";
import { OpError } from "../shared/ops.ts";
import type { Op } from "../shared/ops.ts";
import { TextError, blocksToKomoreText, blocksToMarkdown, markdownToBlocks, spansToKomoreText } from "../shared/text.ts";
import { spansText } from "../shared/blocks.ts";
import type { Block } from "../shared/blocks.ts";
import { makeUser, cleanName } from "../shared/identity.ts";
import type { User } from "../shared/identity.ts";
import { newId } from "../shared/schema.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");

export interface ServerOptions {
  dbPath: string;
  /** Built web app (vite build output). */
  staticDir?: string;
  /** Overrides the origin used in returned URLs. */
  publicUrl?: string;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

export function blockView(b: Block) {
  return { id: b.id, type: b.type, depth: b.depth, text: spansToKomoreText(b.spans), length: spansText(b.spans).length };
}

export function startServer(opts: ServerOptions): { server: Server; store: Store; rooms: Map<string, Room>; close: () => Promise<void> } {
  const store = new Store(opts.dbPath);
  const rooms = new Map<string, Room>();

  const room = (id: string): Room => {
    let r = rooms.get(id);
    if (r) return r;
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(id) || !store.getDoc(id)) throw new HttpError(404, `no document "${id}"`);
    r = new Room(id, store);
    rooms.set(id, r);
    return r;
  };

  const unloader = setInterval(() => {
    for (const [id, r] of rooms) {
      if (r.idle && Date.now() - r.lastActive > 5 * 60_000) {
        r.destroy();
        rooms.delete(id);
      }
    }
  }, 60_000);
  unloader.unref();

  const origin = (req: IncomingMessage): string => {
    if (opts.publicUrl) return opts.publicUrl.replace(/\/$/, "");
    const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0] ?? "http";
    return `${proto}://${req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost"}`;
  };

  const readJson = async (req: IncomingMessage): Promise<Record<string, unknown>> => {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const c of req) {
      size += (c as Buffer).length;
      if (size > 2_000_000) throw new HttpError(413, "request body too large");
      chunks.push(c as Buffer);
    }
    if (!chunks.length) return {};
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new HttpError(400, "body is not JSON");
    }
  };

  const userFrom = (raw: unknown, required = true): User => {
    const u = (raw ?? {}) as { name?: unknown; color?: unknown };
    const name = cleanName(u.name);
    if (!name) {
      if (required) throw new HttpError(400, "who are you? pass user.name (the CLI: --name, KOMORE_NAME, or `komore join --name`)");
      return makeUser("Anonymous");
    }
    return makeUser(name, typeof u.color === "string" ? u.color : null);
  };

  const threadView = (r: Room, t: ThreadData) => {
    const at = r.anchorOf(t);
    return {
      id: t.id,
      quote: t.quote,
      anchor: at ? { blockId: at.blockId, from: at.from, to: at.to, text: at.text } : null,
      detached: !!t.anchor && !at,
      resolved: t.resolved,
      author: t.author?.name,
      createdAt: t.createdAt,
      messages: t.messages.map((m) => ({ id: m.id, author: m.author?.name, color: m.author?.color, body: m.body, ts: m.ts })),
    };
  };

  const send = (res: ServerResponse, status: number, body: unknown, type = "application/json") => {
    const data = type === "application/json" ? JSON.stringify(body) : String(body);
    res.writeHead(status, { "content-type": type === "application/json" ? "application/json; charset=utf-8" : type, "cache-control": "no-store" });
    res.end(data);
  };

  const serveFile = async (res: ServerResponse, path: string, cache = false): Promise<boolean> => {
    try {
      const s = await stat(path);
      if (!s.isFile()) return false;
      const body = await readFile(path);
      res.writeHead(200, {
        "content-type": MIME[extname(path)] ?? "application/octet-stream",
        "cache-control": cache ? "public, max-age=31536000, immutable" : "no-cache",
      });
      res.end(body);
      return true;
    } catch {
      return false;
    }
  };

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://x");
    const path = url.pathname;
    const method = req.method ?? "GET";
    let m: RegExpExecArray | null;

    if (path === "/healthz" || path === "/api/healthz") return send(res, 200, { ok: true, docs: rooms.size });

    // The skill and the agent guide are served from the same files the repo ships.
    if (path === "/SKILL.md" || path === "/skill.md") {
      if (await serveFile(res, join(ROOT, "skills/komore/SKILL.md"))) return;
    }
    if (path === "/agent-guide.md") {
      if (await serveFile(res, join(ROOT, "cli/agent-guide.md"))) return;
    }

    if (path === "/api/docs" && method === "POST") {
      const body = await readJson(req);
      const user = body.user ? userFrom(body.user) : null;
      const blocks = typeof body.markdown === "string" ? markdownToBlocks(body.markdown) : [];
      const id = newId(12);
      seedDoc(store, id, blocks, user);
      return send(res, 201, { id, url: `${origin(req)}/d/${id}` });
    }

    if ((m = /^\/api\/docs\/([^/]+)(\/.*)?$/.exec(path))) {
      const r = room(m[1]);
      const sub = m[2] ?? "";

      if (sub === "" && method === "GET") {
        const blocks = r.blocks();
        const format = url.searchParams.get("format");
        if (format === "md") return send(res, 200, blocksToMarkdown(blocks), "text/markdown; charset=utf-8");
        if (format === "text") return send(res, 200, blocksToKomoreText(blocks), "text/plain; charset=utf-8");
        const meta = store.getDoc(r.id)!;
        return send(res, 200, {
          id: r.id,
          url: `${origin(req)}/d/${r.id}`,
          title: meta.title,
          updatedAt: meta.updated_at,
          blocks: blocks.map(blockView),
          eventHead: r.eventHead(),
          present: r.presence(),
          openComments: r.threads().filter((t) => !t.resolved).length,
        });
      }

      if (sub === "/ops" && method === "POST") {
        const body = await readJson(req);
        const user = userFrom(body.user);
        const ops = (Array.isArray(body.ops) ? body.ops : body.op ? [body] : []) as Op[];
        const { results, blocks } = r.apply(user, ops);
        return send(res, 200, { results, blocks: blocks.map(blockView) });
      }

      if ((sub === "/undo" || sub === "/redo") && method === "POST") {
        const body = await readJson(req);
        const ok = r.undo(userFrom(body.user), sub === "/redo");
        return send(res, 200, { ok, blocks: r.blocks().map(blockView) });
      }

      if (sub === "/history" && method === "GET") return send(res, 200, { versions: r.versions() });

      if ((m = /^\/versions\/(\d+)$/.exec(sub)) && method === "GET") {
        const seq = Number(m[1]);
        if (!store.updateLog(r.id).some((u) => u.seq === seq)) throw new HttpError(404, `no version ${seq}`);
        const blocks = r.blocksAt(seq);
        const format = url.searchParams.get("format");
        if (format === "md") return send(res, 200, blocksToMarkdown(blocks), "text/markdown; charset=utf-8");
        if (format === "text") return send(res, 200, blocksToKomoreText(blocks), "text/plain; charset=utf-8");
        return send(res, 200, { version: seq, blocks: blocks.map(blockView), content: blocks });
      }

      if (sub === "/restore" && method === "POST") {
        const body = await readJson(req);
        const blocks = r.restore(userFrom(body.user), Number(body.version));
        return send(res, 200, { blocks: blocks.map(blockView) });
      }

      if (sub === "/comments" && method === "GET") {
        return send(res, 200, { threads: r.threads().map((t) => threadView(r, t)), eventHead: r.eventHead() });
      }

      if (sub === "/comments" && method === "POST") {
        const body = await readJson(req);
        const user = userFrom(body.user);
        const a = body.anchor as { blockId?: string; from?: number; to?: number; match?: string; occurrence?: number } | undefined;
        let anchor: { blockId: string; from: number; to: number } | null = null;
        if (a?.blockId) {
          const block = r.blocks().find((b) => b.id === a.blockId);
          if (!block) throw new OpError(`no block with id "${a.blockId}"`);
          const text = spansText(block.spans);
          if (a.match) {
            const hits: number[] = [];
            for (let i = text.indexOf(a.match); i >= 0; i = text.indexOf(a.match, i + 1)) hits.push(i);
            if (!hits.length) throw new OpError(`"${a.match}" not found in block ${a.blockId}`);
            if (hits.length > 1 && !a.occurrence) throw new OpError(`"${a.match}" occurs ${hits.length} times — pass occurrence`);
            const at = hits[(a.occurrence ?? 1) - 1];
            if (at === undefined) throw new OpError(`occurrence ${a.occurrence} out of range`);
            anchor = { blockId: a.blockId, from: at, to: at + a.match.length };
          } else {
            anchor = { blockId: a.blockId, from: a.from ?? 0, to: a.to ?? text.length };
          }
        }
        const t = r.addComment(user, String(body.body ?? ""), anchor);
        return send(res, 201, threadView(r, t));
      }

      if ((m = /^\/comments\/([^/]+)\/(replies|resolve|reopen)$/.exec(sub)) && method === "POST") {
        const body = await readJson(req);
        const user = userFrom(body.user);
        const t = m[2] === "replies" ? r.reply(user, m[1], String(body.body ?? "")) : r.setResolved(user, m[1], m[2] === "resolve");
        return send(res, 200, threadView(r, t));
      }

      if (sub === "/presence" && method === "GET") return send(res, 200, { present: r.presence() });

      if (sub === "/presence" && method === "POST") {
        const body = await readJson(req);
        const user = userFrom(body.user);
        if (body.leave) {
          r.leave(user.id);
        } else {
          r.touch(user, body.status !== undefined ? { status: body.status ? String(body.status).slice(0, 140) : null } : {});
        }
        return send(res, 200, { present: r.presence(), eventHead: r.eventHead() });
      }

      if (sub === "/wait" && method === "GET") {
        const user = userFrom({ name: url.searchParams.get("name"), color: url.searchParams.get("color") });
        const after = Number(url.searchParams.get("after") ?? r.eventHead());
        const timeout = Math.min(Math.max(Number(url.searchParams.get("timeout") ?? 300), 1), 3600) * 1000;
        const ac = new AbortController();
        res.on("close", () => ac.abort());
        const events = await r.wait(user, after, url.searchParams.get("all") === "1", timeout, ac.signal);
        if (res.destroyed) return;
        const threads = new Map(r.threads().map((t) => [t.id, t]));
        return send(res, 200, {
          events,
          threads: [...new Set(events.map((e) => e.threadId))].map((id) => threads.get(id)).filter(Boolean).map((t) => threadView(r, t!)),
          eventHead: Math.max(after, ...events.map((e) => e.seq)),
        });
      }
    }

    if (path.startsWith("/api/")) throw new HttpError(404, `no route ${method} ${path}`);

    // The web app.
    if (opts.staticDir && (method === "GET" || method === "HEAD")) {
      const dir = resolve(opts.staticDir);
      const file = resolve(dir, "." + decodeURIComponent(path));
      if (file.startsWith(dir) && path !== "/" && (await serveFile(res, file, path.startsWith("/assets/")))) return;
      // A missing file (font, image, script) is a 404, not the app shell.
      if (extname(path) && !path.endsWith(".html")) return send(res, 404, "Not found", "text/plain; charset=utf-8");
      if (await serveFile(res, join(dir, "index.html"))) return;
    }
    send(res, 404, "Not found — is the web app built? (npm run build)", "text/plain; charset=utf-8");
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((e: unknown) => {
      if (res.headersSent) return res.end();
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      if (e instanceof OpError || e instanceof TextError) return send(res, 400, { error: e.message });
      console.error(e);
      send(res, 500, { error: "internal error" });
    });
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://x");
    const m = /^\/ws\/([^/]+)$/.exec(url.pathname);
    let r: Room;
    try {
      if (!m) throw new HttpError(404, "bad path");
      r = room(m[1]);
    } catch {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const user = makeUser(url.searchParams.get("name") || "Anonymous", url.searchParams.get("color"));
      r.addSocket(ws, user);
    });
  });

  const close = async () => {
    clearInterval(unloader);
    for (const r of rooms.values()) r.destroy();
    rooms.clear();
    for (const c of wss.clients) c.terminate();
    await new Promise<void>((done) => server.close(() => done()));
    server.closeAllConnections?.();
    store.db.close();
  };

  return { server, store, rooms, close };
}

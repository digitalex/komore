import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { WebSocket } from "ws";
import { updateYFragment, yXmlFragmentToProseMirrorRootNode } from "y-prosemirror";
import { startServer } from "../server/server.ts";
import { schema } from "../shared/schema.ts";
import { blocksToDoc, docToBlocks } from "../shared/blocks.ts";
import { applyOps } from "../shared/ops.ts";
import { blocksToKomoreText } from "../shared/text.ts";
import { createThread } from "../shared/comments.ts";
import { makeUser } from "../shared/identity.ts";

let base = "";
let srv: ReturnType<typeof startServer>;

beforeAll(async () => {
  srv = startServer({ dbPath: ":memory:" });
  await new Promise<void>((r) => srv.server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(srv.server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  await srv.close();
});

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

const ada = { name: "Ada" };
const sable = { name: "Sable" };

function browser(docId: string, name: string) {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(base.replace("http", "ws") + "/ws", docId, doc, {
    WebSocketPolyfill: WebSocket as never,
    params: { name },
    disableBc: true,
  });
  provider.awareness.setLocalStateField("user", { name, color: "#1a73e8" });
  const synced = new Promise<void>((r) => provider.once("sync", () => r()));
  return { doc, provider, synced, frag: doc.getXmlFragment("content") };
}

const until = async (cond: () => boolean, ms = 3000) => {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe("server", () => {
  it("creates a doc, applies agent ops, and a browser sees them live", async () => {
    const created = await api("POST", "/api/docs", { markdown: "# Plan\n\nFirst draft.\n", user: ada });
    expect(created.status).toBe(201);
    const id = created.json.id;
    expect(created.json.url).toMatch(new RegExp(`/d/${id}$`));

    const b = browser(id, "Ada");
    await b.synced;
    const read = () => blocksToKomoreText(docToBlocks(yXmlFragmentToProseMirrorRootNode(b.frag, schema)));
    expect(read()).toBe("# Plan\n\nFirst draft.\n");

    const doc = await api("GET", `/api/docs/${id}`);
    const para = doc.json.blocks[1].id;
    const r = await api("POST", `/api/docs/${id}/ops`, {
      user: sable,
      ops: [
        { op: "insert_blocks", after: para, blocks: [{ type: "bullet", text: "one" }, { type: "bullet", text: "two", depth: 1 }] },
        { op: "format", id: para, match: "First", style: { bold: true, color: "red" } },
      ],
    });
    expect(r.status).toBe(200);
    await until(() => read().includes("two"));
    expect(read()).toBe("# Plan\n\n[**First**]{color=red} draft.\n\n- one\n  - two\n");

    // The browser edits like an editor would; the agent reads it back.
    const pm = yXmlFragmentToProseMirrorRootNode(b.frag, schema);
    const next = applyOps(docToBlocks(pm), [{ op: "insert_text", id: para, text: " Typed by Ada." }]);
    b.doc.transact(() => updateYFragment(b.doc, b.frag, blocksToDoc(next.blocks), { mapping: new Map(), isOMark: new Map() }));
    await until(() => srv.rooms.get(id)!.blocks()[1].spans.some((s) => s.text.includes("Typed")));
    const md = await api("GET", `/api/docs/${id}?format=md`);
    expect(md.json).toBe("# Plan\n\n**First** draft. Typed by Ada.\n\n- one\n  - two\n");

    // The agent's presence is visible to the browser, cursor and all.
    await until(() => [...b.provider.awareness.getStates().values()].some((s: any) => s.user?.name === "Sable" && s.cursor));
    b.provider.destroy();
  });

  it("rejects bad ops atomically with a useful message", async () => {
    const { json } = await api("POST", "/api/docs", { markdown: "Hello hello\n" });
    const doc = await api("GET", `/api/docs/${json.id}`);
    const res = await api("POST", `/api/docs/${json.id}/ops`, {
      user: sable,
      ops: [{ op: "update_block", id: doc.json.blocks[0].id, text: "changed" }, { op: "format", match: "nope", style: { bold: true } }],
    });
    expect(res.status).toBe(400);
    expect(res.json.error).toMatch(/not found/);
    expect((await api("GET", `/api/docs/${json.id}?format=text`)).json).toBe("Hello hello\n");
    expect((await api("POST", `/api/docs/${json.id}/ops`, { ops: [] })).json.error).toMatch(/who are you/);
    expect((await api("GET", `/api/docs/nosuchdoc`)).status).toBe(404);
  });

  it("wakes a waiting agent on a mention from the browser, not on its own words", async () => {
    const { json } = await api("POST", "/api/docs", { markdown: "Some text to discuss.\n" });
    const id = json.id;
    const head = (await api("GET", `/api/docs/${id}`)).json.eventHead;

    // Agent comments on a passage; its own comment must not wake it.
    const blockId = (await api("GET", `/api/docs/${id}`)).json.blocks[0].id;
    const c = await api("POST", `/api/docs/${id}/comments`, { user: sable, body: "Is this right?", anchor: { blockId, match: "text" } });
    expect(c.json.anchor).toMatchObject({ blockId, text: "text" });
    const waiting = api("GET", `/api/docs/${id}/wait?name=Sable&after=${head}&timeout=5`);

    // A person replies in the agent's thread from the browser (straight into Yjs).
    const b = browser(id, "Ada");
    await b.synced;
    const threads = b.doc.getArray<Y.Map<any>>("threads");
    await until(() => threads.length === 1);
    b.doc.transact(() => {
      threads.get(0).get("messages").push([{ id: "m-browser", author: makeUser("Ada"), body: "Yes, but shorten it", ts: Date.now() }]);
    });
    const woke = await waiting;
    expect(woke.json.events).toHaveLength(1);
    expect(woke.json.events[0]).toMatchObject({ author: "Ada", reason: "thread", body: "Yes, but shorten it" });

    // A brand-new thread that @mentions the agent wakes it too.
    const waiting2 = api("GET", `/api/docs/${id}/wait?name=Sable&after=${woke.json.eventHead}&timeout=5`);
    b.doc.transact(() => {
      createThread(b.doc, { id: "t2", anchor: null, quote: "", author: makeUser("Ada"), createdAt: Date.now() }, { id: "m2", author: makeUser("Ada"), body: "@sable add a summary", ts: Date.now() });
    });
    const woke2 = await waiting2;
    expect(woke2.json.events[0]).toMatchObject({ reason: "mention", threadId: "t2" });

    // Nothing for it: times out empty.
    const idle = await api("GET", `/api/docs/${id}/wait?name=Sable&after=${woke2.json.eventHead}&timeout=1`);
    expect(idle.json.events).toEqual([]);
    b.provider.destroy();
  });

  it("logs versions with authors and restores an old one as a new edit", async () => {
    const { json } = await api("POST", "/api/docs", { markdown: "Version one.\n", user: ada });
    const id = json.id;
    const first = (await api("GET", `/api/docs/${id}/history`)).json.versions[0];
    expect(first.authors).toEqual([expect.objectContaining({ name: "Ada" })]);
    await api("POST", `/api/docs/${id}/ops`, { user: sable, ops: [{ op: "set_markdown", markdown: "Version two, rewritten.\n" }] });
    expect((await api("GET", `/api/docs/${id}/versions/${first.version}?format=md`)).json).toBe("Version one.\n");
    await api("POST", `/api/docs/${id}/restore`, { user: ada, version: first.version });
    expect((await api("GET", `/api/docs/${id}?format=md`)).json).toBe("Version one.\n");
    const versions = (await api("GET", `/api/docs/${id}/history`)).json.versions;
    expect(versions[0].labels).toEqual([`restore ${first.version}`]);
  });

  it("undoes only the caller's own edits", async () => {
    const { json } = await api("POST", "/api/docs", { markdown: "Base.\n" });
    const id = json.id;
    const blockId = (await api("GET", `/api/docs/${id}`)).json.blocks[0].id;
    await api("POST", `/api/docs/${id}/ops`, { user: sable, ops: [{ op: "insert_text", id: blockId, text: " Sable." }] });
    await api("POST", `/api/docs/${id}/ops`, { user: ada, ops: [{ op: "insert_text", id: blockId, text: " Ada." }] });
    await api("POST", `/api/docs/${id}/undo`, { user: sable });
    expect((await api("GET", `/api/docs/${id}?format=md`)).json).toBe("Base. Ada.\n");
    await api("POST", `/api/docs/${id}/redo`, { user: sable });
    expect((await api("GET", `/api/docs/${id}?format=md`)).json).toBe("Base. Sable. Ada.\n");
  });

  it("serves the skill", async () => {
    const res = await fetch(base + "/SKILL.md");
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/^---\nname: komore/);
  });
});

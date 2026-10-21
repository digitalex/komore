#!/usr/bin/env node
// komore — the command line for Komore documents.
//
// A thin client: every command is one or two HTTP calls to the same API the
// web app uses, so whatever it does shows up live in every open browser.
// No dependencies, so `npx github:digitalex/komore` is instant.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(readFileSync(join(HERE, "../package.json"), "utf8")).version;
const DEFAULT_SERVER = "http://localhost:4747";
const STATE_DIR = process.env.KOMORE_HOME ?? join(homedir(), ".komore");
const STATE_FILE = join(STATE_DIR, "state.json");

// ------------------------------------------------------------------ args

const BOOLEAN = new Set([
  "json", "md", "text", "all", "open", "start", "end", "help", "h", "version", "bold",
  "no-bold", "no-color", "no-font", "no-size", "no-link", "agent-help", "quiet",
]);

function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      pos.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      const key = eq > 0 ? a.slice(2, eq) : a.slice(2);
      if (eq > 0) flags[key] = a.slice(eq + 1);
      else if (BOOLEAN.has(key)) flags[key] = true;
      else if (i + 1 < argv.length) flags[key] = argv[++i];
      else fail(`--${key} needs a value`);
    } else if (a === "-h") flags.help = true;
    else pos.push(a);
  }
  return { pos, flags };
}

class CliError extends Error {}
function fail(msg) {
  throw new CliError(msg);
}

// ------------------------------------------------------------------ state

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { dirs: {}, cursors: {} };
  }
}

function saveState(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
}

/** Split a doc reference (URL or bare id) into server + id. */
function parseDocRef(ref) {
  const m = /^(https?:\/\/[^/]+)\/(?:d|api\/docs)\/([A-Za-z0-9_-]+)/.exec(ref);
  if (m) return { server: m[1], id: m[2] };
  if (/^[A-Za-z0-9_-]{4,64}$/.test(ref)) return { server: null, id: ref };
  fail(`"${ref}" is not a Komore document URL or id`);
}

function context(flags, { needDoc = true, needName = false } = {}) {
  const state = loadState();
  const here = state.dirs[process.cwd()] ?? {};
  const ref = flags.doc ?? process.env.KOMORE_DOC ?? here.doc;
  let server = flags.server ?? process.env.KOMORE_URL ?? here.server ?? DEFAULT_SERVER;
  let id = null;
  if (ref) {
    const parsed = parseDocRef(ref);
    id = parsed.id;
    if (parsed.server && !flags.server) server = parsed.server;
  }
  if (needDoc && !id) fail("which document? `komore join <url> --name <you>` first, or pass --doc <url>");
  const name = flags.name ?? process.env.KOMORE_NAME ?? here.name;
  if (needName && !name) fail("who are you? `komore join <url> --name <your name>` first, or pass --name");
  const color = flags.color ?? process.env.KOMORE_COLOR ?? here.color;
  const user = name ? { name, ...(color ? { color } : {}) } : undefined;
  return { state, server: server.replace(/\/$/, ""), id, user, name };
}

const cursorKey = (ctx) => `${ctx.server}|${ctx.id}|${String(ctx.name).toLowerCase()}`;

// ------------------------------------------------------------------ http

async function call(ctx, method, path, body, { raw = false, signal } = {}) {
  let res;
  try {
    res = await fetch(ctx.server + path, {
      method,
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    fail(`can't reach Komore at ${ctx.server} (${e?.cause?.code ?? e.message}). Is the server running?`);
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text).error ?? text;
    } catch {}
    fail(msg);
  }
  if (raw) return text;
  return text ? JSON.parse(text) : null;
}

const docPath = (ctx, sub = "") => `/api/docs/${ctx.id}${sub}`;
const ops = (ctx, list) => call(ctx, "POST", docPath(ctx, "/ops"), { user: ctx.user, ops: list });

async function readStdin() {
  if (process.stdin.isTTY) fail("expected input on stdin");
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function textArg(pos, flags, what) {
  if (pos.length === 1 && pos[0] === "-") return readStdin();
  if (pos.length) return pos.join(" ");
  if (flags.file) return readFileSync(flags.file, "utf8");
  fail(`${what} is missing (pass it as an argument, --file <path>, or - for stdin)`);
}

// ------------------------------------------------------------------ output

function out(flags, data, human) {
  if (flags.json) console.log(JSON.stringify(data, null, 2));
  else if (human) {
    const s = human(data);
    if (s) console.log(s);
  }
}

function blockLine(b) {
  return `${b.id}  ${b.type.padEnd(6)}  ${"  ".repeat(b.depth)}${b.text}`;
}

function printBlocks(blocks) {
  return blocks.map(blockLine).join("\n");
}

function changedSummary(r) {
  const lines = [];
  for (const res of r.results) {
    const parts = [];
    if (res.created?.length) parts.push(`created ${res.created.join(" ")}`);
    if (res.changed?.length) parts.push(`changed ${res.changed.join(" ")}`);
    if (res.deleted?.length) parts.push(`deleted ${res.deleted.join(" ")}`);
    if (res.count !== undefined) parts.push(`${res.count} match${res.count === 1 ? "" : "es"}`);
    lines.push(`✓ ${res.op}${parts.length ? ": " + parts.join("; ") : ""}`);
  }
  const touched = new Set(r.results.flatMap((x) => [...(x.created ?? []), ...(x.changed ?? [])]));
  const shown = r.blocks.filter((b) => touched.has(b.id));
  if (shown.length) lines.push(printBlocks(shown));
  return lines.join("\n");
}

function ago(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(ts).toISOString().slice(0, 16).replace("T", " ");
}

function printThread(t) {
  const where = t.anchor ? `on "${t.anchor.text}" in ${t.anchor.blockId}` : t.detached ? `on "${t.quote}" (text since deleted)` : "on the document";
  const head = `thread ${t.id}${t.resolved ? " [resolved]" : ""} — ${where}`;
  const msgs = t.messages.map((m) => `  ${m.author} (${ago(m.ts)}): ${m.body.replace(/\n/g, "\n    ")}`);
  return [head, ...msgs].join("\n");
}

function styleFlags(flags) {
  const style = {};
  if (flags.bold) style.bold = true;
  if (flags["no-bold"]) style.bold = false;
  if (flags.color !== undefined) style.color = flags.color;
  if (flags["no-color"]) style.color = null;
  if (flags.font !== undefined) style.font = flags.font;
  if (flags["no-font"]) style.font = null;
  if (flags.size !== undefined) style.size = flags.size;
  if (flags["no-size"]) style.size = null;
  if (flags.link !== undefined) style.link = flags.link;
  if (flags["no-link"]) style.link = null;
  return style;
}

function place(flags) {
  if (flags.after) return { after: flags.after };
  if (flags.before) return { before: flags.before };
  if (flags.start) return { at: "start" };
  return { at: "end" };
}

const num = (v) => (v === undefined ? undefined : Number(v));

// ------------------------------------------------------------------ commands

const commands = {
  async new({ pos, flags }) {
    const ctx = context(flags, { needDoc: false });
    const markdown = flags.file ? readFileSync(flags.file, "utf8") : pos[0] === "-" ? await readStdin() : pos.length ? pos.join(" ") : undefined;
    const r = await call(ctx, "POST", "/api/docs", { markdown, user: ctx.user });
    out(flags, r, (d) => d.url);
  },

  async join({ pos, flags }) {
    const ref = pos[0] ?? flags.doc ?? process.env.KOMORE_DOC;
    if (ref) flags.doc = ref;
    const ctx = context(flags, { needName: true });
    const here = { ...(ctx.state.dirs[process.cwd()] ?? {}), doc: `${ctx.server}/d/${ctx.id}`, server: ctx.server, name: ctx.name };
    if (flags.color) here.color = flags.color;
    ctx.state.dirs[process.cwd()] = here;
    const r = await call(ctx, "POST", docPath(ctx, "/presence"), { user: ctx.user, status: flags.status ?? null });
    // Keep an existing wait cursor so nothing that arrived between sessions is lost.
    ctx.state.cursors[cursorKey(ctx)] ??= r.eventHead;
    saveState(ctx.state);
    const doc = await call(ctx, "GET", docPath(ctx));
    out(flags, doc, (d) =>
      [
        `Joined "${d.title || "Untitled"}" as ${ctx.name} — ${d.url}`,
        `Here: ${d.present.map((p) => p.name).join(", ")}   Open comments: ${d.openComments}`,
        "",
        printBlocks(d.blocks),
      ].join("\n"),
    );
  },

  async use({ pos, flags }) {
    if (!pos[0]) fail("usage: komore use <doc-url>");
    flags.doc = pos[0];
    const ctx = context(flags);
    ctx.state.dirs[process.cwd()] = { ...(ctx.state.dirs[process.cwd()] ?? {}), doc: `${ctx.server}/d/${ctx.id}`, server: ctx.server };
    saveState(ctx.state);
    console.log(`Using ${ctx.server}/d/${ctx.id} in ${process.cwd()}`);
  },

  async leave({ flags }) {
    const ctx = context(flags, { needName: true });
    await call(ctx, "POST", docPath(ctx, "/presence"), { user: ctx.user, leave: true });
    console.log(`${ctx.name} left ${ctx.server}/d/${ctx.id}`);
  },

  async status({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    const status = pos.join(" ") || null;
    await call(ctx, "POST", docPath(ctx, "/presence"), { user: ctx.user, status });
    console.log(status ? `${ctx.name}: ${status}` : `${ctx.name}: status cleared`);
  },

  async who({ flags }) {
    const ctx = context(flags);
    const r = await call(ctx, "GET", docPath(ctx, "/presence"));
    out(flags, r, (d) => d.present.map((p) => `${p.name}${p.status ? ` — ${p.status}` : ""}`).join("\n") || "nobody here");
  },

  async url({ flags }) {
    const ctx = context(flags);
    console.log(`${ctx.server}/d/${ctx.id}`);
  },

  async read({ pos, flags }) {
    const ctx = context(flags);
    const version = flags.version ?? pos[0];
    const base = version ? docPath(ctx, `/versions/${version}`) : docPath(ctx);
    if (flags.md) return process.stdout.write(await call(ctx, "GET", base + "?format=md", null, { raw: true }));
    if (flags.text) return process.stdout.write(await call(ctx, "GET", base + "?format=text", null, { raw: true }));
    const d = await call(ctx, "GET", base);
    let blocks = d.blocks;
    if (flags.block) blocks = blocks.filter((b) => String(flags.block).split(",").includes(b.id));
    out(flags, { ...d, blocks }, () => printBlocks(blocks));
  },

  async insert({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    const text = await textArg(pos, flags, "text");
    const op = flags.md
      ? { op: "insert_blocks", ...place(flags), markdown: text }
      : { op: "insert_blocks", ...place(flags), blocks: [{ type: flags.type ?? "p", depth: num(flags.depth) ?? 0, text }] };
    out(flags, await ops(ctx, [op]), changedSummary);
  },

  async set({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    const [id, ...rest] = pos;
    if (!id) fail("usage: komore set <block> [text] [--type t] [--depth n]");
    const op = { op: "update_block", id };
    if (rest.length === 1 && rest[0] === "-") op.text = (await readStdin()).replace(/\n+$/, "");
    else if (rest.length) op.text = rest.join(" ");
    if (flags.type) op.type = flags.type;
    if (flags.depth !== undefined) op.depth = num(flags.depth);
    out(flags, await ops(ctx, [op]), changedSummary);
  },

  async rm({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    if (!pos.length) fail("usage: komore rm <block> [block…]");
    out(flags, await ops(ctx, [{ op: "delete_blocks", ids: pos }]), changedSummary);
  },

  async mv({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    if (!pos.length) fail("usage: komore mv <block> [block…] (--after <b> | --before <b> | --start | --end)");
    out(flags, await ops(ctx, [{ op: "move_blocks", ids: pos, ...place(flags) }]), changedSummary);
  },

  async type({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    const [id, ...rest] = pos;
    if (!id || !rest.length) fail('usage: komore type <block> "text" [--at N | --after "x" | --before "x"]');
    const op = { op: "insert_text", id, text: rest.join(" ") };
    if (flags.at !== undefined) op.offset = num(flags.at);
    if (flags.after !== undefined) op.after = flags.after;
    if (flags.before !== undefined) op.before = flags.before;
    if (flags.occurrence) op.occurrence = num(flags.occurrence);
    const style = styleFlags(flags);
    if (Object.keys(style).length) op.style = style;
    out(flags, await ops(ctx, [op]), changedSummary);
  },

  async cut({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    const [id, ...rest] = pos;
    if (!id) fail('usage: komore cut <block> ("text" | --from N --to M)');
    const op = { op: "delete_text", id };
    if (rest.length) op.match = rest.join(" ");
    if (flags.match) op.match = flags.match;
    if (flags.from !== undefined) op.from = num(flags.from);
    if (flags.to !== undefined) op.to = num(flags.to);
    if (flags.occurrence) op.occurrence = num(flags.occurrence);
    out(flags, await ops(ctx, [op]), changedSummary);
  },

  async format({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    const style = styleFlags(flags);
    if (!Object.keys(style).length) fail("format what? --bold --color <c> --font <f> --size <n> --link <url> (or --no-…)");
    const op = { op: "format", style };
    const [id, ...rest] = pos;
    if (id) op.id = id;
    if (rest.length) op.match = rest.join(" ");
    if (flags.match) op.match = flags.match;
    if (flags.from !== undefined) op.from = num(flags.from);
    if (flags.to !== undefined) op.to = num(flags.to);
    if (flags.occurrence) op.occurrence = num(flags.occurrence);
    if (flags.all) op.all = true;
    if (!op.id && !op.match) fail('format needs a block id, or --match "text" to find');
    out(flags, await ops(ctx, [op]), changedSummary);
  },

  async replace({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    if (pos.length < 2) fail('usage: komore replace "find" "replace" [--all] [--block id]');
    const op = { op: "replace_text", find: pos[0], replace: pos[1] };
    if (flags.all) op.all = true;
    if (flags.block) op.id = flags.block;
    if (flags.occurrence) op.occurrence = num(flags.occurrence);
    out(flags, await ops(ctx, [op]), changedSummary);
  },

  async write({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    if (!pos[0]) fail("usage: komore write <file.md | ->");
    const markdown = pos[0] !== "-" ? readFileSync(pos[0], "utf8") : await readStdin();
    out(flags, await ops(ctx, [{ op: "set_markdown", markdown }]), (r) => {
      const res = r.results[0];
      return `✓ document rewritten: ${res.created.length} new block(s), ${res.deleted.length} removed, ${r.blocks.length - res.created.length} kept`;
    });
  },

  async ops({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    if (!pos[0]) fail("usage: komore ops '<json>' | <file> | -");
    const src = pos[0] !== "-" ? (existsSync(pos[0]) ? readFileSync(pos[0], "utf8") : pos.join(" ")) : await readStdin();
    let list;
    try {
      list = JSON.parse(src);
    } catch {
      fail("ops must be JSON: an array of {op: …} objects");
    }
    out(flags, await ops(ctx, Array.isArray(list) ? list : [list]), changedSummary);
  },

  async undo({ flags }) {
    const ctx = context(flags, { needName: true });
    const r = await call(ctx, "POST", docPath(ctx, "/undo"), { user: ctx.user });
    out(flags, r, (d) => (d.ok ? "✓ undid your last edit" : "nothing of yours to undo"));
  },

  async redo({ flags }) {
    const ctx = context(flags, { needName: true });
    const r = await call(ctx, "POST", docPath(ctx, "/redo"), { user: ctx.user });
    out(flags, r, (d) => (d.ok ? "✓ redid your last undone edit" : "nothing to redo"));
  },

  async comments({ flags }) {
    const ctx = context(flags);
    const r = await call(ctx, "GET", docPath(ctx, "/comments"));
    let threads = r.threads;
    if (!flags.all) threads = threads.filter((t) => !t.resolved);
    out(flags, { ...r, threads }, () => threads.map(printThread).join("\n\n") || (flags.all ? "no comments" : "no open comments"));
  },

  async comment({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    const body = pos.join(" ");
    if (!body) fail('usage: komore comment "text" [--block <id> [--match "quoted words"]]');
    const anchor = flags.block ? { blockId: flags.block, match: flags.match, from: num(flags.from), to: num(flags.to), occurrence: num(flags.occurrence) } : undefined;
    const r = await call(ctx, "POST", docPath(ctx, "/comments"), { user: ctx.user, body, anchor });
    out(flags, r, printThread);
  },

  async reply({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    const [thread, ...rest] = pos;
    if (!thread || !rest.length) fail('usage: komore reply <thread> "text"');
    const r = await call(ctx, "POST", docPath(ctx, `/comments/${thread}/replies`), { user: ctx.user, body: rest.join(" ") });
    out(flags, r, printThread);
  },

  async resolve({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    if (!pos[0]) fail("usage: komore resolve <thread>");
    const r = await call(ctx, "POST", docPath(ctx, `/comments/${pos[0]}/resolve`), { user: ctx.user });
    out(flags, r, (t) => `✓ resolved thread ${t.id}`);
  },

  async reopen({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    if (!pos[0]) fail("usage: komore reopen <thread>");
    const r = await call(ctx, "POST", docPath(ctx, `/comments/${pos[0]}/reopen`), { user: ctx.user });
    out(flags, r, (t) => `✓ reopened thread ${t.id}`);
  },

  async wait({ flags }) {
    const ctx = context(flags, { needName: true });
    const key = cursorKey(ctx);
    let after = ctx.state.cursors[key];
    if (after === undefined) {
      const p = await call(ctx, "POST", docPath(ctx, "/presence"), { user: ctx.user });
      after = p.eventHead;
    }
    const timeout = num(flags.timeout) ?? 240;
    const q = new URLSearchParams({ name: ctx.name, after: String(after), timeout: String(timeout) });
    if (ctx.user.color) q.set("color", ctx.user.color);
    if (flags.all) q.set("all", "1");
    const r = await call(ctx, "GET", docPath(ctx, `/wait?${q}`));
    const state = loadState(); // re-read: other commands may have run meanwhile
    state.cursors[key] = r.eventHead;
    saveState(state);
    if (!r.events.length) {
      out(flags, r, () => "no new comments for you — park again with `komore wait`");
      process.exitCode = 2;
      return;
    }
    out(flags, r, (d) =>
      [
        ...d.events.map((e) => `💬 ${e.author} (${e.reason}) in thread ${e.threadId}: ${e.body}`),
        "",
        ...d.threads.map(printThread),
      ].join("\n"),
    );
  },

  async history({ flags }) {
    const ctx = context(flags);
    const r = await call(ctx, "GET", docPath(ctx, "/history"));
    out(flags, r, (d) =>
      d.versions
        .map((v) => `v${v.version}  ${ago(v.to).padEnd(16)}  ${v.authors.map((a) => a.name).join(", ") || "—"}  (${v.edits} edit${v.edits === 1 ? "" : "s"}${v.labels.length ? `: ${v.labels.join(", ")}` : ""})`)
        .join("\n"),
    );
  },

  async show({ pos, flags }) {
    if (!pos[0]) fail("usage: komore show <version> [--md]");
    return commands.read({ pos: [String(pos[0]).replace(/^v/, "")], flags });
  },

  async restore({ pos, flags }) {
    const ctx = context(flags, { needName: true });
    if (!pos[0]) fail("usage: komore restore <version>");
    const r = await call(ctx, "POST", docPath(ctx, "/restore"), { user: ctx.user, version: Number(String(pos[0]).replace(/^v/, "")) });
    out(flags, r, () => `✓ restored version ${pos[0]} (as a new edit — \`komore history\` keeps everything)`);
  },

  async guide() {
    process.stdout.write(readFileSync(join(HERE, "agent-guide.md"), "utf8"));
  },
};

const ALIASES = { ls: "read", cat: "read", delete: "rm", del: "rm", add: "insert", append: "insert", edit: "set", log: "history", whoami: "who", "agent-help": "guide", create: "new" };

const HELP = `komore ${VERSION} — real-time documents for people and agents

Agents: run \`komore --agent-help\` first. It is the protocol.

Getting in
  new [markdown|-] [--file f]        create a document, print its URL
  join <url> --name <you>            be present on a doc; this directory remembers it
  use <url>                          switch this directory's doc without joining
  who | status "doing x" | leave     presence
  url                                print this directory's doc URL

Reading
  read [--md | --text | --json] [--block id,id]   blocks with ids (default), markdown, or komore text
  comments [--all]                   open comment threads (--all includes resolved)
  history | show <version> [--md]    the edit log, and any past version

Writing (every edit is live for everyone)
  insert "text" [--type p|h1|h2|bullet] [--depth n] [--after id | --before id | --start | --end]
  insert --md - < file.md            insert several blocks from markdown
  set <id> "text" [--type t] [--depth n]     replace a block's text / change its type
  rm <id…> | mv <id…> --after <id>   delete / move blocks
  type <id> "text" [--at N | --after "x" | --before "x"]   insert text inside a block
  cut <id> "text" | --from N --to M  delete text inside a block
  format [id] [--match "x"] [--all] --bold --color red --font serif --size 18 --link url  (--no-… to clear)
  replace "find" "with" [--all] [--block id]
  write file.md | -                  replace the whole document (unchanged blocks keep their ids)
  ops '[{"op":…}]' | -               send a raw op batch (atomic)
  undo | redo                        your own edits only
  restore <version>                  bring a past version back, as a new edit

Talking
  comment "text" [--block id [--match "words"]]   start a thread (anchored to words, or doc-level)
  reply <thread> "text" | resolve <thread> | reopen <thread>
  wait [--timeout s] [--all]         park until someone @mentions you or replies in your thread
                                     exit 0 = woke (prints the threads), 2 = timed out

Global: --doc <url>  --name <you>  --server <url>  --json
Env:    KOMORE_DOC  KOMORE_NAME  KOMORE_URL  KOMORE_COLOR
Text:   **bold**  [label](url)  [words]{color=red font=serif size=18}
`;

async function main() {
  const { pos, flags } = parseArgs(process.argv.slice(2));
  if (flags.version) return console.log(VERSION);
  if (flags["agent-help"]) return commands.guide({ pos, flags });
  const cmd = ALIASES[pos[0]] ?? pos[0];
  if (!cmd || flags.help || cmd === "help") return process.stdout.write(HELP);
  const fn = commands[cmd];
  if (!fn) fail(`unknown command "${pos[0]}" — \`komore --help\` lists them`);
  await fn({ pos: pos.slice(1), flags });
}

main().catch((e) => {
  if (e instanceof CliError) {
    console.error(`komore: ${e.message}`);
    process.exit(1);
  }
  console.error(e);
  process.exit(1);
});

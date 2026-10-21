import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { execFile } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { startServer } from "../server/server.ts";

const CLI = resolve(import.meta.dirname, "../../cli/komore.mjs");
let base = "";
let srv: ReturnType<typeof startServer>;
const home = mkdtempSync(join(tmpdir(), "komore-cli-"));
const cwd = mkdtempSync(join(tmpdir(), "komore-cwd-"));

beforeAll(async () => {
  srv = startServer({ dbPath: ":memory:" });
  await new Promise<void>((r) => srv.server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(srv.server.address() as AddressInfo).port}`;
});
afterAll(() => srv.close());

function komore(args: string[], input?: string, env: Record<string, string> = {}): Promise<{ code: number; out: string; err: string }> {
  return new Promise((done) => {
    const child = execFile(process.execPath, [CLI, ...args], { cwd, env: { ...process.env, KOMORE_HOME: home, KOMORE_URL: base, ...env } }, (error, stdout, stderr) => {
      done({ code: error ? ((error as { code?: number }).code ?? 1) : 0, out: stdout, err: stderr });
    });
    if (input !== undefined) child.stdin!.end(input);
    else child.stdin!.end();
  });
}

describe("komore CLI", () => {
  it("runs a whole agent lap", async () => {
    const created = await komore(["new", "# Notes\n\nfirst line"]);
    expect(created.code).toBe(0);
    const url = created.out.trim();
    expect(url).toMatch(/\/d\/[a-z0-9]+$/);

    const joined = await komore(["join", url, "--name", "Wren"]);
    expect(joined.out).toContain('Joined "Notes" as Wren');
    const ids = [...joined.out.matchAll(/^(\w{8}) /gm)].map((m) => m[1]);
    expect(ids).toHaveLength(2);

    expect((await komore(["insert", "--md", "-", "--after", ids[1]], "## Next\n- alpha\n- beta\n")).code).toBe(0);
    expect((await komore(["format", ids[1], "--match", "first", "--bold", "--color", "teal"])).code).toBe(0);
    expect((await komore(["replace", "beta", "gamma"])).out).toContain("1 match");
    const md = await komore(["read", "--text"]);
    expect(md.out).toBe("# Notes\n\n[**first**]{color=teal} line\n\n## Next\n\n- alpha\n- gamma\n");

    const bad = await komore(["format", ids[1], "--match", "missing", "--bold"]);
    expect(bad.code).toBe(1);
    expect(bad.err).toContain('"missing" not found');

    // A person @mentions Wren; the parked CLI wakes with the thread.
    const parked = komore(["wait", "--timeout", "10"]);
    await new Promise((r) => setTimeout(r, 300));
    await fetch(`${url.replace("/d/", "/api/docs/")}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user: { name: "Ada" }, body: "@Wren please add a summary", anchor: { blockId: ids[0], match: "Notes" } }),
    });
    const woke = await parked;
    expect(woke.code).toBe(0);
    expect(woke.out).toContain("Ada (mention)");
    const thread = /in thread (\w+)/.exec(woke.out)![1];

    expect((await komore(["reply", thread, "Done."])).out).toContain("Wren");
    const again = await komore(["wait", "--timeout", "1"]);
    expect(again.code).toBe(2); // its own reply does not wake it

    expect((await komore(["history"])).out).toMatch(/v\d+ .*Wren/);
    expect((await komore(["--agent-help"])).out).toContain("The lap");
  }, 20_000);
});

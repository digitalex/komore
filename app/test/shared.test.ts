import { describe, expect, it } from "vitest";
import { blocksToDoc, docToBlocks } from "../shared/blocks.ts";
import type { Block } from "../shared/blocks.ts";
import { applyOps, OpError } from "../shared/ops.ts";
import { blocksToKomoreText, blocksToMarkdown, markdownToBlocks, parseInline, spansToKomoreText } from "../shared/text.ts";
import { mentions } from "../shared/identity.ts";

const sample = `# Title

Intro with **bold** and a [link](https://example.com).

## Section

- one
- two
  - nested **deep**
- three

Closing [warm]{color=orange font=serif} words.
`;

describe("komore text", () => {
  it("round-trips spans losslessly", () => {
    for (const s of [
      "plain",
      "a **b** c",
      "[x **y**](https://e.com) z",
      "[red **and bold**]{color=#123456} tail",
      "[styled [link](https://a.b)]{font=mono size=18}",
      "escape \\* \\[ \\] \\\\",
    ]) {
      expect(spansToKomoreText(parseInline(s))).toBe(s);
    }
  });

  it("parses named colours to hex", () => {
    expect(parseInline("[x]{color=red}")[0].color).toBe("#d93025");
  });

  it("round-trips a document through markdown, blocks and the editor tree", () => {
    const blocks = markdownToBlocks(sample);
    expect(blocks.map((b) => `${b.type}${b.depth}`)).toEqual(["h10", "p0", "h20", "bullet0", "bullet0", "bullet1", "bullet0", "p0"]);
    const doc = blocksToDoc(blocks);
    const back = docToBlocks(doc);
    expect(back).toEqual(blocks);
    expect(blocksToKomoreText(back)).toBe(sample);
    expect(blocksToMarkdown(back)).toContain("Closing warm words.");
  });
});

describe("ops", () => {
  const base = (): Block[] => markdownToBlocks("# Title\n\nHello world, hello again.\n");

  it("inserts blocks after an id and reports them", () => {
    const b = base();
    const r = applyOps(b, [{ op: "insert_blocks", after: b[0].id, blocks: [{ type: "bullet", text: "**x**" }] }]);
    expect(r.blocks[1].type).toBe("bullet");
    expect(r.results[0].created).toEqual([r.blocks[1].id]);
    expect(b.length).toBe(2); // input untouched
  });

  it("refuses an ambiguous match, accepts an occurrence", () => {
    const b = base();
    expect(() => applyOps(b, [{ op: "format", id: b[1].id, match: "ello", style: { bold: true } }])).toThrow(OpError);
    const r = applyOps(b, [{ op: "format", id: b[1].id, match: "ello", occurrence: 2, style: { bold: true, color: "blue" } }]);
    expect(spansToKomoreText(r.blocks[1].spans)).toBe("Hello world, h[**ello**]{color=blue} again.");
  });

  it("inserts text inheriting the style before it, but not a link at its end", () => {
    const b = markdownToBlocks("[site](https://a.b) and **bold**\n");
    let r = applyOps(b, [{ op: "insert_text", id: b[0].id, after: "site", text: "!" }]);
    expect(spansToKomoreText(r.blocks[0].spans)).toBe("[site](https://a.b)! and **bold**");
    r = applyOps(b, [{ op: "insert_text", id: b[0].id, text: "er" }]);
    expect(spansToKomoreText(r.blocks[0].spans)).toBe("[site](https://a.b) and **bolder**");
  });

  it("replaces text keeping the style of what it replaced", () => {
    const b = markdownToBlocks("say **hello** there\n");
    const r = applyOps(b, [{ op: "replace_text", find: "hello", replace: "goodbye" }]);
    expect(spansToKomoreText(r.blocks[0].spans)).toBe("say **goodbye** there");
  });

  it("set_markdown keeps ids of unchanged blocks", () => {
    const b = base();
    const r = applyOps(b, [{ op: "set_markdown", markdown: "# Title\n\nNew paragraph.\n" }]);
    expect(r.blocks[0].id).toBe(b[0].id);
    expect(r.blocks[1].id).not.toBe(b[1].id);
  });

  it("is atomic: a failing op leaves nothing applied", () => {
    const b = base();
    expect(() => applyOps(b, [{ op: "update_block", id: b[0].id, text: "changed" }, { op: "delete_blocks", ids: ["nope"] }])).toThrow(/no block/);
    expect(spansToKomoreText(b[0].spans)).toBe("Title");
  });
});

describe("mentions", () => {
  it("matches @names with spaces, case-insensitively, and @all", () => {
    expect(mentions("hey @sable can you", "Sable")).toBe(true);
    expect(mentions("hey @Ada Lovelace!", "Ada Lovelace")).toBe(true);
    expect(mentions("email sable@x.com", "Sable")).toBe(false);
    expect(mentions("@sabled", "Sable")).toBe(false);
    expect(mentions("@all please look", "Sable")).toBe(true);
  });
});

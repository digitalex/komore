// The block model: the granularity everyone addresses a document at.
//
// A document is a flat list of blocks. Each block is one line of text — a
// paragraph, a heading, or a bullet at some depth — with a stable id, and its
// text is a run of styled spans. The editor's tree (lists inside lists) and
// this flat list convert both ways without loss.
import type { Node as PMNode, Fragment, Mark } from "prosemirror-model";
import { schema, newId } from "./schema.ts";

export type BlockType = "p" | "h1" | "h2" | "bullet";
export const BLOCK_TYPES: BlockType[] = ["p", "h1", "h2", "bullet"];

export interface Style {
  bold?: boolean;
  link?: string;
  color?: string;
  font?: string;
  size?: number;
}

export interface Span extends Style {
  text: string;
}

export interface Block {
  id: string;
  type: BlockType;
  /** Nesting level for bullets (0 = top level); always 0 for other types. */
  depth: number;
  spans: Span[];
}

// ---------------------------------------------------------------- tree → flat

function marksToStyle(marks: readonly Mark[]): Style {
  const s: Style = {};
  for (const m of marks) {
    if (m.type.name === "bold") s.bold = true;
    else if (m.type.name === "link") s.link = m.attrs.href;
    else if (m.type.name === "color") s.color = m.attrs.value;
    else if (m.type.name === "font") s.font = m.attrs.family;
    else if (m.type.name === "size") s.size = m.attrs.px;
  }
  return s;
}

function textblockSpans(node: PMNode): Span[] {
  const spans: Span[] = [];
  node.forEach((child) => {
    if (child.isText && child.text) spans.push({ text: child.text, ...marksToStyle(child.marks) });
  });
  return normalizeSpans(spans);
}

/** Flatten a document (or any fragment of top-level nodes) into blocks. */
export function fragmentToBlocks(fragment: Fragment): Block[] {
  const out: Block[] = [];
  const walkList = (list: PMNode, depth: number) => {
    list.forEach((item) => {
      item.forEach((child) => {
        if (child.type.name === "paragraph") {
          out.push({ id: child.attrs.id ?? "", type: "bullet", depth, spans: textblockSpans(child) });
        } else if (child.type.name === "bulletList") {
          walkList(child, depth + 1);
        }
      });
    });
  };
  fragment.forEach((node) => {
    if (node.type.name === "paragraph") {
      out.push({ id: node.attrs.id ?? "", type: "p", depth: 0, spans: textblockSpans(node) });
    } else if (node.type.name === "heading") {
      out.push({ id: node.attrs.id ?? "", type: node.attrs.level === 1 ? "h1" : "h2", depth: 0, spans: textblockSpans(node) });
    } else if (node.type.name === "bulletList") {
      walkList(node, 0);
    } else if (node.type.name === "listItem") {
      // A cut slice can start inside a list.
      walkList(schema.nodes.bulletList.create(null, node), 0);
    }
  });
  return out;
}

export function docToBlocks(doc: PMNode): Block[] {
  return fragmentToBlocks(doc.content);
}

/**
 * Give every block an id, and make ids unique (the later of two blocks that
 * share an id — a split paragraph, say — gets a fresh one). Returns whether
 * anything changed.
 */
export function ensureIds(blocks: Block[]): boolean {
  const seen = new Set<string>();
  let changed = false;
  for (const b of blocks) {
    if (!b.id || seen.has(b.id)) {
      b.id = newId();
      changed = true;
    }
    seen.add(b.id);
  }
  return changed;
}

// ---------------------------------------------------------------- flat → tree

function styleToMarks(s: Style): Mark[] {
  let marks: readonly Mark[] = [];
  const add = (m: Mark) => (marks = m.addToSet(marks));
  if (s.link) add(schema.marks.link.create({ href: s.link }));
  if (s.bold) add(schema.marks.bold.create());
  if (s.color) add(schema.marks.color.create({ value: s.color }));
  if (s.font) add(schema.marks.font.create({ family: s.font }));
  if (s.size) add(schema.marks.size.create({ px: s.size }));
  return [...marks];
}

function inlineNodes(spans: Span[]): PMNode[] {
  return normalizeSpans(spans).map((s) => schema.text(s.text, styleToMarks(s)));
}

/** Clamp bullet depths so each bullet nests at most one level below the one before it. */
export function normalizeDepths(blocks: Block[]): void {
  let prev = -1; // depth of the previous bullet in the current run; -1 = not in a list
  for (const b of blocks) {
    if (b.type !== "bullet") {
      b.depth = 0;
      prev = -1;
      continue;
    }
    b.depth = Math.max(0, Math.min(Math.floor(b.depth || 0), prev + 1));
    prev = b.depth;
  }
}

export function blocksToDoc(input: Block[]): PMNode {
  const blocks = input.map((b) => ({ ...b }));
  if (blocks.length === 0) blocks.push({ id: newId(), type: "p", depth: 0, spans: [] });
  normalizeDepths(blocks);
  const nodes: PMNode[] = [];
  let i = 0;
  const buildList = (depth: number): PMNode => {
    const items: PMNode[] = [];
    while (i < blocks.length && blocks[i].type === "bullet" && blocks[i].depth >= depth) {
      const b = blocks[i++];
      const para = schema.nodes.paragraph.create({ id: b.id }, inlineNodes(b.spans));
      const children = [para];
      if (i < blocks.length && blocks[i].type === "bullet" && blocks[i].depth > depth) {
        children.push(buildList(depth + 1));
      }
      items.push(schema.nodes.listItem.create(null, children));
    }
    return schema.nodes.bulletList.create(null, items);
  };
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === "bullet") {
      nodes.push(buildList(0));
    } else {
      i++;
      if (b.type === "p") nodes.push(schema.nodes.paragraph.create({ id: b.id }, inlineNodes(b.spans)));
      else nodes.push(schema.nodes.heading.create({ id: b.id, level: b.type === "h1" ? 1 : 2 }, inlineNodes(b.spans)));
    }
  }
  const doc = schema.nodes.doc.create(null, nodes);
  doc.check();
  return doc;
}

// ---------------------------------------------------------------- spans

export function sameStyle(a: Style, b: Style): boolean {
  return !!a.bold === !!b.bold && a.link === b.link && a.color === b.color && a.font === b.font && a.size === b.size;
}

export function styleOf(s: Span): Style {
  const out: Style = {};
  if (s.bold) out.bold = true;
  if (s.link) out.link = s.link;
  if (s.color) out.color = s.color;
  if (s.font) out.font = s.font;
  if (s.size) out.size = s.size;
  return out;
}

/** Drop empty spans, merge neighbours that look the same, drop falsy style keys. */
export function normalizeSpans(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const s of spans) {
    if (!s.text) continue;
    const clean: Span = { text: s.text, ...styleOf(s) };
    const last = out[out.length - 1];
    if (last && sameStyle(last, clean)) last.text += clean.text;
    else out.push(clean);
  }
  return out;
}

export function spansText(spans: Span[]): string {
  return spans.map((s) => s.text).join("");
}

/** Split spans so that a boundary falls exactly at `offset`. */
function splitAt(spans: Span[], offset: number): Span[] {
  const out: Span[] = [];
  let pos = 0;
  for (const s of spans) {
    const end = pos + s.text.length;
    if (offset > pos && offset < end) {
      out.push({ ...s, text: s.text.slice(0, offset - pos) }, { ...s, text: s.text.slice(offset - pos) });
    } else out.push({ ...s });
    pos = end;
  }
  return out;
}

export function sliceSpans(spans: Span[], from: number, to: number): Span[] {
  const out: Span[] = [];
  let pos = 0;
  for (const s of splitAt(splitAt(spans, from), to)) {
    const end = pos + s.text.length;
    if (pos >= from && end <= to) out.push(s);
    pos = end;
  }
  return normalizeSpans(out);
}

export function deleteRange(spans: Span[], from: number, to: number): Span[] {
  const len = spansText(spans).length;
  return normalizeSpans([...sliceSpans(spans, 0, from), ...sliceSpans(spans, to, len)]);
}

/** The style a character typed at `offset` picks up — like a caret in an editor. */
export function styleAt(spans: Span[], offset: number): Style {
  let pos = 0;
  for (const s of spans) {
    const end = pos + s.text.length;
    if (offset > pos && offset <= end) {
      const style = styleOf(s);
      if (offset === end) delete style.link; // links don't grow at their end
      return style;
    }
    pos = end;
  }
  return offset === 0 && spans[0] ? (({ link: _l, ...rest }) => rest)(styleOf(spans[0])) : {};
}

export function insertSpans(spans: Span[], offset: number, inserted: Span[]): Span[] {
  const len = spansText(spans).length;
  return normalizeSpans([...sliceSpans(spans, 0, offset), ...inserted, ...sliceSpans(spans, offset, len)]);
}

/** A style patch: a key set to `null`/`false` removes that style. */
export type StylePatch = { [K in keyof Style]?: Style[K] | null | false };

export function applyStyle(spans: Span[], from: number, to: number, patch: StylePatch): Span[] {
  const len = spansText(spans).length;
  const mid = sliceSpans(spans, from, to).map((s) => {
    const next: Span = { ...s };
    for (const [k, v] of Object.entries(patch) as [keyof Style, unknown][]) {
      if (v === undefined) continue;
      if (v === null || v === false) delete next[k];
      else (next as unknown as Record<string, unknown>)[k] = v;
    }
    return next;
  });
  return normalizeSpans([...sliceSpans(spans, 0, from), ...mid, ...sliceSpans(spans, to, len)]);
}

// The operation vocabulary.
//
// Every edit that arrives through the API is a list of these ops, applied
// atomically by `applyOps` against the document's current blocks. The server
// then writes the result into the shared CRDT as a minimal diff, exactly as
// if someone had typed it — which is why a person watching sees an agent's
// edit land in place rather than the page reloading.
//
// The browser editor produces the same changes through the keyboard and
// toolbar; docs/parity.md lists each UI gesture next to its op.
import type { Block, BlockType, Span, StylePatch } from "./blocks.ts";
import {
  BLOCK_TYPES,
  applyStyle,
  deleteRange,
  ensureIds,
  insertSpans,
  normalizeDepths,
  sliceSpans,
  spansText,
  styleAt,
  styleOf,
} from "./blocks.ts";
import { newId, normalizeColor, normalizeFont, normalizeSize } from "./schema.ts";
import { markdownToBlocks, parseInline, spansEqual, TextError } from "./text.ts";

export class OpError extends Error {}

export interface NewBlock {
  type?: BlockType;
  depth?: number;
  /** Komore text (markdown inline + `[x]{color=…}` spans). */
  text?: string;
}

/** Where a block goes: after or before another block, or at either end. */
export interface Place {
  after?: string;
  before?: string;
  at?: "start" | "end";
}

/** Which characters an op touches inside one block. */
export interface Range {
  /** Character offsets; `to` is exclusive. */
  from?: number;
  to?: number;
  /** Literal text to find instead of offsets. */
  match?: string;
  /** Which occurrence of `match` (1-based). Required when it is ambiguous. */
  occurrence?: number;
}

export type StyleInput = {
  bold?: boolean | null;
  link?: string | null;
  color?: string | null;
  font?: string | null;
  size?: number | string | null;
};

export type Op =
  | ({ op: "insert_blocks"; blocks?: NewBlock[]; markdown?: string } & Place)
  | { op: "update_block"; id: string; text?: string; type?: BlockType; depth?: number }
  | { op: "delete_blocks"; ids: string[] }
  | ({ op: "move_blocks"; ids: string[] } & Place)
  | ({ op: "insert_text"; id: string; text: string; offset?: number; after?: string; before?: string; occurrence?: number; style?: StyleInput })
  | ({ op: "delete_text"; id: string } & Range)
  | ({ op: "format"; id?: string; all?: boolean; style: StyleInput } & Range)
  | { op: "replace_text"; find: string; replace: string; id?: string; all?: boolean; occurrence?: number }
  | { op: "set_markdown"; markdown: string };

export const OP_NAMES = [
  "insert_blocks",
  "update_block",
  "delete_blocks",
  "move_blocks",
  "insert_text",
  "delete_text",
  "format",
  "replace_text",
  "set_markdown",
] as const;

export interface OpResult {
  op: string;
  /** Blocks this op created. */
  created?: string[];
  /** Blocks this op changed. */
  changed?: string[];
  /** Blocks this op removed. */
  deleted?: string[];
  /** Number of matches affected, for find-based ops. */
  count?: number;
}

/** Where the actor's caret should rest afterwards, for presence. */
export interface Caret {
  blockId: string;
  offset: number;
}

export interface ApplyResult {
  blocks: Block[];
  results: OpResult[];
  caret: Caret | null;
}

// ---------------------------------------------------------------- helpers

function indexOfBlock(blocks: Block[], id: string): number {
  const i = blocks.findIndex((b) => b.id === id);
  if (i < 0) throw new OpError(`no block with id "${id}" — run \`komore read\` for current ids`);
  return i;
}

function insertionIndex(blocks: Block[], place: Place): number {
  const given = [place.after, place.before, place.at].filter((v) => v !== undefined).length;
  if (given > 1) throw new OpError("give only one of after, before or at");
  if (place.after) return indexOfBlock(blocks, place.after) + 1;
  if (place.before) return indexOfBlock(blocks, place.before);
  if (place.at === "start") return 0;
  return blocks.length;
}

function checkType(type: unknown): BlockType {
  if (type === undefined) return "p";
  if (!BLOCK_TYPES.includes(type as BlockType)) throw new OpError(`unknown block type "${String(type)}" — use ${BLOCK_TYPES.join(", ")}`);
  return type as BlockType;
}

function parse(text: string): Span[] {
  try {
    return parseInline(text);
  } catch (e) {
    if (e instanceof TextError) throw new OpError(e.message);
    throw e;
  }
}

/** All start offsets of `needle` in `hay`. */
function occurrences(hay: string, needle: string): number[] {
  if (!needle) throw new OpError("match text is empty");
  const out: number[] = [];
  for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + needle.length)) out.push(i);
  return out;
}

function pickOccurrence(hits: number[], occurrence: number | undefined, needle: string, where: string): number {
  if (!hits.length) throw new OpError(`"${needle}" not found in ${where}`);
  if (occurrence !== undefined) {
    if (occurrence < 1 || occurrence > hits.length) throw new OpError(`"${needle}" occurs ${hits.length} time(s) in ${where}; occurrence ${occurrence} is out of range`);
    return hits[occurrence - 1];
  }
  if (hits.length > 1) throw new OpError(`"${needle}" occurs ${hits.length} times in ${where} — pass occurrence (1-${hits.length}) or a longer match`);
  return hits[0];
}

function resolveRange(block: Block, r: Range): [number, number] {
  const text = spansText(block.spans);
  if (r.match !== undefined) {
    const at = pickOccurrence(occurrences(text, r.match), r.occurrence, r.match, `block ${block.id}`);
    return [at, at + r.match.length];
  }
  const from = r.from ?? 0;
  const to = r.to ?? text.length;
  if (from < 0 || to > text.length || from > to) throw new OpError(`range ${from}..${to} is outside block ${block.id} (length ${text.length})`);
  return [from, to];
}

export function normalizeStyle(input: StyleInput): StylePatch {
  const patch: StylePatch = {};
  if (input.bold !== undefined) patch.bold = input.bold ? true : null;
  if (input.link !== undefined) patch.link = input.link ? String(input.link) : null;
  if (input.color !== undefined) {
    if (input.color === null || input.color === "" || input.color === "default") patch.color = null;
    else {
      const c = normalizeColor(String(input.color));
      if (!c) throw new OpError(`unknown color "${input.color}"`);
      patch.color = c;
    }
  }
  if (input.font !== undefined) {
    if (input.font === null || input.font === "" || input.font === "default") patch.font = null;
    else {
      const f = normalizeFont(String(input.font));
      if (!f) throw new OpError(`unknown font "${input.font}" — use sans, serif or mono`);
      patch.font = f;
    }
  }
  if (input.size !== undefined) {
    if (input.size === null || input.size === "" || input.size === "default") patch.size = null;
    else {
      const n = normalizeSize(input.size);
      if (!n) throw new OpError(`size "${input.size}" out of range`);
      patch.size = n;
    }
  }
  if (!Object.keys(patch).length) throw new OpError("format needs at least one style (bold, link, color, font, size)");
  return patch;
}

function cloneBlocks(blocks: Block[]): Block[] {
  return blocks.map((b) => ({ ...b, spans: b.spans.map((s) => ({ ...s })) }));
}

/** Reuse ids of blocks whose content did not change, in order. */
function adoptIds(prev: Block[], next: Block[]): void {
  let p = 0;
  for (const nb of next) {
    for (let k = p; k < prev.length; k++) {
      const pb = prev[k];
      if (pb.type === nb.type && pb.depth === nb.depth && spansEqual(pb.spans, nb.spans)) {
        nb.id = pb.id;
        p = k + 1;
        break;
      }
    }
  }
}

// ---------------------------------------------------------------- apply

export function applyOps(current: Block[], ops: Op[]): ApplyResult {
  if (!Array.isArray(ops) || ops.length === 0) throw new OpError("no ops given");
  let blocks = cloneBlocks(current);
  ensureIds(blocks);
  const results: OpResult[] = [];
  let caret: Caret | null = null;

  for (const op of ops) {
    switch (op?.op) {
      case "insert_blocks": {
        const incoming: Block[] = op.markdown !== undefined
          ? markdownToBlocks(op.markdown)
          : (op.blocks ?? []).map((nb) => ({ id: newId(), type: checkType(nb.type), depth: nb.depth ?? 0, spans: parse(nb.text ?? "") }));
        if (!incoming.length) throw new OpError("insert_blocks needs blocks or markdown");
        const at = insertionIndex(blocks, op);
        blocks.splice(at, 0, ...incoming);
        results.push({ op: op.op, created: incoming.map((b) => b.id) });
        const last = incoming[incoming.length - 1];
        caret = { blockId: last.id, offset: spansText(last.spans).length };
        break;
      }
      case "update_block": {
        const b = blocks[indexOfBlock(blocks, op.id)];
        if (op.text === undefined && op.type === undefined && op.depth === undefined) throw new OpError("update_block needs text, type or depth");
        if (op.text !== undefined) b.spans = parse(op.text);
        if (op.type !== undefined) b.type = checkType(op.type);
        if (op.depth !== undefined) b.depth = op.depth;
        results.push({ op: op.op, changed: [b.id] });
        caret = { blockId: b.id, offset: spansText(b.spans).length };
        break;
      }
      case "delete_blocks": {
        if (!op.ids?.length) throw new OpError("delete_blocks needs ids");
        for (const id of op.ids) indexOfBlock(blocks, id);
        const doomed = new Set(op.ids);
        const firstIdx = blocks.findIndex((b) => doomed.has(b.id));
        blocks = blocks.filter((b) => !doomed.has(b.id));
        results.push({ op: op.op, deleted: [...doomed] });
        const near = blocks[Math.max(0, firstIdx - 1)];
        caret = near ? { blockId: near.id, offset: spansText(near.spans).length } : null;
        break;
      }
      case "move_blocks": {
        if (!op.ids?.length) throw new OpError("move_blocks needs ids");
        const moving = op.ids.map((id) => blocks[indexOfBlock(blocks, id)]);
        if (op.after && op.ids.includes(op.after)) throw new OpError("can't move a block after itself");
        if (op.before && op.ids.includes(op.before)) throw new OpError("can't move a block before itself");
        blocks = blocks.filter((b) => !op.ids.includes(b.id));
        blocks.splice(insertionIndex(blocks, op), 0, ...moving);
        results.push({ op: op.op, changed: op.ids });
        caret = { blockId: moving[0].id, offset: 0 };
        break;
      }
      case "insert_text": {
        const b = blocks[indexOfBlock(blocks, op.id)];
        if (typeof op.text !== "string" || !op.text) throw new OpError("insert_text needs text");
        const text = spansText(b.spans);
        let offset: number;
        if (op.after !== undefined) {
          offset = pickOccurrence(occurrences(text, op.after), op.occurrence, op.after, `block ${b.id}`) + op.after.length;
        } else if (op.before !== undefined) {
          offset = pickOccurrence(occurrences(text, op.before), op.occurrence, op.before, `block ${b.id}`);
        } else {
          offset = op.offset ?? text.length;
          if (offset < 0 || offset > text.length) throw new OpError(`offset ${offset} is outside block ${b.id} (length ${text.length})`);
        }
        const base = styleAt(b.spans, offset);
        const patch = op.style ? normalizeStyle(op.style) : {};
        const span = applyStyle([{ text: op.text, ...base }], 0, op.text.length, patch);
        b.spans = insertSpans(b.spans, offset, span);
        results.push({ op: op.op, changed: [b.id] });
        caret = { blockId: b.id, offset: offset + op.text.length };
        break;
      }
      case "delete_text": {
        const b = blocks[indexOfBlock(blocks, op.id)];
        const [from, to] = resolveRange(b, op);
        b.spans = deleteRange(b.spans, from, to);
        results.push({ op: op.op, changed: [b.id] });
        caret = { blockId: b.id, offset: from };
        break;
      }
      case "format": {
        const patch = normalizeStyle(op.style ?? {});
        if (op.id) {
          const b = blocks[indexOfBlock(blocks, op.id)];
          const ranges: [number, number][] = op.all && op.match !== undefined
            ? occurrences(spansText(b.spans), op.match).map((s) => [s, s + op.match!.length])
            : [resolveRange(b, op)];
          if (!ranges.length) throw new OpError(`"${op.match}" not found in block ${b.id}`);
          for (const [f, t] of ranges) b.spans = applyStyle(b.spans, f, t, patch);
          results.push({ op: op.op, changed: [b.id], count: ranges.length });
          caret = { blockId: b.id, offset: ranges[ranges.length - 1][1] };
        } else {
          if (op.match === undefined) throw new OpError("format needs an id, or a match to search the whole document for");
          const hits: { b: Block; at: number }[] = [];
          for (const b of blocks) for (const at of occurrences(spansText(b.spans), op.match)) hits.push({ b, at });
          if (!hits.length) throw new OpError(`"${op.match}" not found in the document`);
          let chosen = hits;
          if (!op.all) {
            if (op.occurrence !== undefined) {
              if (op.occurrence < 1 || op.occurrence > hits.length) throw new OpError(`occurrence ${op.occurrence} out of range (1-${hits.length})`);
              chosen = [hits[op.occurrence - 1]];
            } else if (hits.length > 1) {
              throw new OpError(`"${op.match}" occurs ${hits.length} times in the document — pass occurrence, all, or an id`);
            }
          }
          for (const h of chosen) h.b.spans = applyStyle(h.b.spans, h.at, h.at + op.match.length, patch);
          results.push({ op: op.op, changed: [...new Set(chosen.map((h) => h.b.id))], count: chosen.length });
          const last = chosen[chosen.length - 1];
          caret = { blockId: last.b.id, offset: last.at + op.match.length };
        }
        break;
      }
      case "replace_text": {
        if (!op.find) throw new OpError("replace_text needs find");
        const scope = op.id ? [blocks[indexOfBlock(blocks, op.id)]] : blocks;
        const hits: { b: Block; at: number }[] = [];
        for (const b of scope) for (const at of occurrences(spansText(b.spans), op.find)) hits.push({ b, at });
        if (!hits.length) throw new OpError(`"${op.find}" not found${op.id ? ` in block ${op.id}` : ""}`);
        let chosen = hits;
        if (!op.all) {
          if (op.occurrence !== undefined) {
            if (op.occurrence < 1 || op.occurrence > hits.length) throw new OpError(`occurrence ${op.occurrence} out of range (1-${hits.length})`);
            chosen = [hits[op.occurrence - 1]];
          } else if (hits.length > 1) {
            throw new OpError(`"${op.find}" occurs ${hits.length} times — pass occurrence, all, or a longer find`);
          }
        }
        // Right to left within each block keeps earlier offsets valid.
        for (const h of [...chosen].reverse()) {
          const style = styleOf(sliceSpans(h.b.spans, h.at, h.at + op.find.length)[0] ?? { text: "" });
          h.b.spans = insertSpans(deleteRange(h.b.spans, h.at, h.at + op.find.length), h.at, op.replace ? [{ text: op.replace, ...style }] : []);
        }
        results.push({ op: op.op, changed: [...new Set(chosen.map((h) => h.b.id))], count: chosen.length });
        const last = chosen[chosen.length - 1];
        caret = { blockId: last.b.id, offset: last.at + op.replace.length };
        break;
      }
      case "set_markdown": {
        if (typeof op.markdown !== "string") throw new OpError("set_markdown needs markdown");
        const next = markdownToBlocks(op.markdown);
        adoptIds(blocks, next);
        const prevIds = new Set(blocks.map((b) => b.id));
        const nextIds = new Set(next.map((b) => b.id));
        results.push({
          op: op.op,
          created: next.filter((b) => !prevIds.has(b.id)).map((b) => b.id),
          deleted: blocks.filter((b) => !nextIds.has(b.id)).map((b) => b.id),
        });
        blocks = next;
        const last = blocks[blocks.length - 1];
        caret = last ? { blockId: last.id, offset: spansText(last.spans).length } : null;
        break;
      }
      default:
        throw new OpError(`unknown op "${(op as { op?: string })?.op}" — known: ${OP_NAMES.join(", ")}`);
    }
  }
  normalizeDepths(blocks);
  if (!blocks.length) blocks.push({ id: newId(), type: "p", depth: 0, spans: [] });
  return { blocks, results, caret };
}

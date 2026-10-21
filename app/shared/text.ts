// Text formats.
//
// "Komore text" is how a block reads and writes on the command line: plain
// markdown inline syntax (`**bold**`, `[label](url)`) plus one extension for
// what markdown cannot say — a bracketed span with attributes:
//
//     [warm words]{color=orange font=serif size=18}
//
// It is lossless: every block's spans print to it and parse back unchanged.
// Markdown export (Copy as Markdown) is the same minus the styled spans.
import type { Block, BlockType, Span, Style } from "./blocks.ts";
import { normalizeSpans, sameStyle } from "./blocks.ts";
import { COLORS, normalizeColor, normalizeFont, normalizeSize, newId } from "./schema.ts";

const COLOR_NAMES = Object.fromEntries(Object.entries(COLORS).map(([n, hex]) => [hex, n]));

// ---------------------------------------------------------------- parse

export class TextError extends Error {}

function findClose(s: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findUnescaped(s: string, needle: string, from: number): number {
  for (let i = from; i <= s.length - needle.length; i++) {
    if (s[i] === "\\") {
      i++;
      continue;
    }
    if (s.startsWith(needle, i)) return i;
  }
  return -1;
}

export function parseStyleAttrs(attrs: string): Style {
  const style: Style = {};
  for (const part of attrs.trim().split(/\s+/).filter(Boolean)) {
    const m = /^([a-z]+)=(.*)$/i.exec(part);
    if (!m) {
      if (part === "bold" || part === ".bold") style.bold = true;
      else throw new TextError(`can't read style "${part}" — expected key=value (color, font, size)`);
      continue;
    }
    const key = m[1].toLowerCase();
    const value = m[2].replace(/^["']|["']$/g, "");
    if (key === "color") {
      const c = normalizeColor(value);
      if (!c) throw new TextError(`unknown color "${value}"`);
      style.color = c;
    } else if (key === "font") {
      const f = normalizeFont(value);
      if (!f) throw new TextError(`unknown font "${value}" — use sans, serif or mono`);
      style.font = f;
    } else if (key === "size") {
      const n = normalizeSize(value);
      if (!n) throw new TextError(`size "${value}" out of range`);
      style.size = n;
    } else throw new TextError(`unknown style "${key}" — use color, font or size`);
  }
  return style;
}

/** Parse one line of komore text (or markdown inline) into spans. */
export function parseInline(src: string, base: Style = {}): Span[] {
  const out: Span[] = [];
  let buf = "";
  const flush = () => {
    if (buf) out.push({ text: buf, ...base });
    buf = "";
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\" && i + 1 < src.length && /[\\*_[\]{}()`#-]/.test(src[i + 1])) {
      buf += src[i + 1];
      i += 2;
      continue;
    }
    if ((src.startsWith("**", i) || src.startsWith("__", i)) && i + 2 < src.length) {
      const marker = src.slice(i, i + 2);
      const end = findUnescaped(src, marker, i + 2);
      if (end > i + 2) {
        flush();
        out.push(...parseInline(src.slice(i + 2, end), { ...base, bold: true }));
        i = end + 2;
        continue;
      }
    }
    if (c === "[") {
      const close = findClose(src, i, "[", "]");
      if (close > i) {
        const inner = src.slice(i + 1, close);
        if (src[close + 1] === "(") {
          const end = findClose(src, close + 1, "(", ")");
          if (end > close) {
            flush();
            const href = src.slice(close + 2, end).trim().split(/\s+/)[0] ?? "";
            out.push(...parseInline(inner, { ...base, link: href }));
            i = end + 1;
            continue;
          }
        } else if (src[close + 1] === "{") {
          const end = findClose(src, close + 1, "{", "}");
          if (end > close) {
            flush();
            out.push(...parseInline(inner, { ...base, ...parseStyleAttrs(src.slice(close + 2, end)) }));
            i = end + 1;
            continue;
          }
        }
      }
    }
    buf += c;
    i++;
  }
  flush();
  return normalizeSpans(out);
}

// ---------------------------------------------------------------- print

function escapeText(s: string): string {
  return s.replace(/([\\*[\]`])/g, "\\$1").replace(/__/g, "\\_\\_");
}

function styleAttrs(s: Style): string {
  const parts: string[] = [];
  if (s.color) parts.push(`color=${COLOR_NAMES[s.color] ?? s.color}`);
  if (s.font) parts.push(`font=${s.font}`);
  if (s.size) parts.push(`size=${s.size}`);
  return parts.join(" ");
}

/** Group consecutive spans that agree on `key`, then print each group. */
function printGroups(spans: Span[], key: (s: Span) => string, wrap: (inner: string, first: Span) => string, next: (g: Span[]) => string): string {
  let out = "";
  let i = 0;
  while (i < spans.length) {
    const k = key(spans[i]);
    let j = i + 1;
    while (j < spans.length && key(spans[j]) === k) j++;
    const group = spans.slice(i, j);
    out += k ? wrap(next(group), group[0]) : next(group);
    i = j;
  }
  return out;
}

function printSpans(spans: Span[], withStyles: boolean): string {
  const bold = (g: Span[]) =>
    printGroups(g, (s) => (s.bold ? "b" : ""), (inner) => `**${inner}**`, (gg) => gg.map((s) => escapeText(s.text)).join(""));
  const link = (g: Span[]) => printGroups(g, (s) => s.link ?? "", (inner, f) => `[${inner}](${f.link})`, bold);
  if (!withStyles) return link(spans);
  return printGroups(spans, (s) => styleAttrs(s), (inner, f) => `[${inner}]{${styleAttrs(f)}}`, link);
}

/** Lossless: every style, including colour, font and size. */
export function spansToKomoreText(spans: Span[]): string {
  return printSpans(normalizeSpans(spans), true);
}

/** Markdown: bold and links survive; colour, font and size do not. */
export function spansToMarkdown(spans: Span[]): string {
  const plain = normalizeSpans(spans.map(({ color: _c, font: _f, size: _s, ...rest }) => rest));
  return printSpans(plain, false);
}

// ---------------------------------------------------------------- whole documents

function blockPrefix(b: Block): string {
  if (b.type === "h1") return "# ";
  if (b.type === "h2") return "## ";
  if (b.type === "bullet") return "  ".repeat(b.depth) + "- ";
  return "";
}

function joinBlocks(blocks: Block[], line: (b: Block) => string): string {
  let out = "";
  blocks.forEach((b, i) => {
    if (i > 0) out += b.type === "bullet" && blocks[i - 1].type === "bullet" ? "\n" : "\n\n";
    out += line(b);
  });
  return out ? out + "\n" : "";
}

export function blocksToMarkdown(blocks: Block[]): string {
  return joinBlocks(blocks, (b) => blockPrefix(b) + spansToMarkdown(b.spans));
}

export function blocksToKomoreText(blocks: Block[]): string {
  return joinBlocks(blocks, (b) => blockPrefix(b) + spansToKomoreText(b.spans));
}

/**
 * Parse markdown (or komore text) into fresh blocks. Supports `#`/`##`
 * headings (deeper headings become `##`), `-`/`*`/`+`/`1.` bullets nested
 * by indentation, and paragraphs; inline syntax per `parseInline`.
 */
export function markdownToBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let listIndents: number[] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ id: newId(), type: "p", depth: 0, spans: parseInline(para.join(" ")) });
    para = [];
  };
  for (const raw of md.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(/\t/g, "    ");
    if (!line.trim()) {
      flushPara();
      continue;
    }
    const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      flushPara();
      listIndents = [];
      const type: BlockType = heading[1].length === 1 ? "h1" : "h2";
      blocks.push({ id: newId(), type, depth: 0, spans: parseInline(heading[2]) });
      continue;
    }
    const bullet = /^(\s*)(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) {
      flushPara();
      const indent = bullet[1].length;
      if (blocks[blocks.length - 1]?.type !== "bullet") listIndents = [];
      while (listIndents.length && indent < listIndents[listIndents.length - 1]) listIndents.pop();
      if (!listIndents.length || indent > listIndents[listIndents.length - 1]) listIndents.push(indent);
      blocks.push({ id: newId(), type: "bullet", depth: listIndents.length - 1, spans: parseInline(bullet[2]) });
      continue;
    }
    if (blocks[blocks.length - 1]?.type === "bullet" && !para.length && /^\s+/.test(line)) {
      // A lazy continuation line of the bullet above.
      const last = blocks[blocks.length - 1];
      last.spans = normalizeSpans([...last.spans, { text: " " }, ...parseInline(line.trim())]);
      continue;
    }
    listIndents = [];
    para.push(line.trim());
  }
  flushPara();
  return blocks;
}

export function spansEqual(a: Span[], b: Span[]): boolean {
  const na = normalizeSpans(a);
  const nb = normalizeSpans(b);
  return na.length === nb.length && na.every((s, i) => s.text === nb[i].text && sameStyle(s, nb[i]));
}

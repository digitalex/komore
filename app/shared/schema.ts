// The one document schema. The browser editor, the server's op engine and the
// history renderer all read and write documents through it, so a block an
// agent writes is byte-for-byte the block a person would have typed.
import { Schema } from "prosemirror-model";
import type { DOMOutputSpec, Node as PMNode } from "prosemirror-model";

export const FONTS = {
  sans: 'Inter, "Helvetica Neue", Arial, system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
} as const;
export type FontName = keyof typeof FONTS;

export const SIZES = [12, 14, 16, 18, 20, 24, 32] as const;
export const MIN_SIZE = 8;
export const MAX_SIZE = 72;

/** Named colours an agent can say instead of a hex code. */
export const COLORS: Record<string, string> = {
  black: "#202124",
  gray: "#5f6368",
  red: "#d93025",
  orange: "#e8710a",
  yellow: "#b08800",
  green: "#188038",
  teal: "#00796b",
  blue: "#1a73e8",
  purple: "#9334e6",
  pink: "#d01884",
};

const idAttr = { id: { default: null as string | null } };

function blockAttrs(node: PMNode): Record<string, string> {
  return node.attrs.id ? { "data-block-id": node.attrs.id } : {};
}

export const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      attrs: idAttr,
      parseDOM: [{ tag: "p" }],
      toDOM: (node): DOMOutputSpec => ["p", blockAttrs(node), 0],
    },
    heading: {
      group: "block",
      content: "inline*",
      defining: true,
      attrs: { ...idAttr, level: { default: 1 } },
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 2 } },
      ],
      toDOM: (node): DOMOutputSpec => [`h${node.attrs.level}`, blockAttrs(node), 0],
    },
    bulletList: {
      group: "block",
      content: "listItem+",
      parseDOM: [{ tag: "ul" }, { tag: "ol" }],
      toDOM: (): DOMOutputSpec => ["ul", 0],
    },
    listItem: {
      // A list item is exactly one line of text, optionally followed by its
      // own nested list. Keeping it that strict is what lets the flat block
      // model (one bullet = one block with a depth) round-trip losslessly.
      content: "paragraph bulletList?",
      defining: true,
      parseDOM: [{ tag: "li" }],
      toDOM: (): DOMOutputSpec => ["li", 0],
    },
    text: { group: "inline" },
  },
  marks: {
    link: {
      attrs: { href: {} },
      inclusive: false,
      parseDOM: [{ tag: "a[href]", getAttrs: (dom) => ({ href: (dom as HTMLElement).getAttribute("href") }) }],
      toDOM: (mark): DOMOutputSpec => ["a", { href: mark.attrs.href, rel: "noopener noreferrer nofollow", target: "_blank" }, 0],
    },
    bold: {
      parseDOM: [
        { tag: "strong" },
        { tag: "b", getAttrs: (dom) => (dom as HTMLElement).style.fontWeight !== "normal" && null },
        { style: "font-weight", getAttrs: (v) => /^(bold(er)?|[6-9]\d{2,})$/.test(v as string) && null },
      ],
      toDOM: (): DOMOutputSpec => ["strong", 0],
    },
    color: {
      attrs: { value: {} },
      parseDOM: [{ style: "color", getAttrs: (v) => (normalizeColor(v as string) ? { value: normalizeColor(v as string) } : false) }],
      toDOM: (mark): DOMOutputSpec => ["span", { style: `color: ${mark.attrs.value}` }, 0],
    },
    font: {
      attrs: { family: {} },
      toDOM: (mark): DOMOutputSpec => [
        "span",
        { style: `font-family: ${FONTS[mark.attrs.family as FontName] ?? FONTS.sans}`, "data-font": mark.attrs.family },
        0,
      ],
      parseDOM: [{ tag: "span[data-font]", getAttrs: (dom) => ({ family: (dom as HTMLElement).dataset.font }) }],
    },
    size: {
      attrs: { px: {} },
      toDOM: (mark): DOMOutputSpec => ["span", { style: `font-size: ${mark.attrs.px}px` }, 0],
      parseDOM: [
        {
          style: "font-size",
          getAttrs: (v) => {
            const m = /^(\d+(?:\.\d+)?)px$/.exec(v as string);
            return m ? { px: Math.round(Number(m[1])) } : false;
          },
        },
      ],
    },
  },
});

/** `#abc`, `#aabbcc`, a named colour, or `rgb(…)` → `#aabbcc`, else null. */
export function normalizeColor(input: string): string | null {
  const v = input.trim().toLowerCase();
  if (COLORS[v]) return COLORS[v];
  let m = /^#?([0-9a-f]{6})$/.exec(v);
  if (m) return `#${m[1]}`;
  m = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`;
  m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v);
  if (m) return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  return null;
}

export function normalizeFont(input: string): FontName | null {
  const v = input.trim().toLowerCase();
  return v in FONTS ? (v as FontName) : null;
}

export function normalizeSize(input: number | string): number | null {
  const n = Math.round(Number(String(input).replace(/px$/, "")));
  return Number.isFinite(n) && n >= MIN_SIZE && n <= MAX_SIZE ? n : null;
}

/** Short, URL-safe, random block / thread / message id. */
export function newId(len = 8): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

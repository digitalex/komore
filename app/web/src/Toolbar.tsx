import { useEffect, useRef, useState } from "react";
import type { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";
import { undoCommand, redoCommand } from "y-prosemirror";
import { schema, COLORS, FONTS, SIZES } from "../../shared/schema.ts";
import { currentKind, isMarkActive, linkRange, markAttr, setKind, setMark, toggleBold } from "./editor.ts";
import type { Kind } from "./editor.ts";

const DEFAULT_SIZE: Record<Kind, number> = { p: 16, bullet: 16, h1: 30, h2: 22 };
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl+";

interface Props {
  view: EditorView;
  linkEditing: boolean;
  setLinkEditing: (v: boolean) => void;
  onComment: () => void;
  onCopyMarkdown: () => void;
}

export function Toolbar({ view, linkEditing, setLinkEditing, onComment, onCopyMarkdown }: Props) {
  const state = view.state;
  const kind = currentKind(state);
  const font = (markAttr(state, schema.marks.font, "family") as string | null) ?? "sans";
  const size = (markAttr(state, schema.marks.size, "px") as number | null) ?? DEFAULT_SIZE[kind];
  const color = (markAttr(state, schema.marks.color, "value") as string | null) ?? null;
  const bold = isMarkActive(state, schema.marks.bold);
  const link = linkRange(state);
  const [colorOpen, setColorOpen] = useState(false);

  const run = (cmd: (s: typeof state, d: typeof view.dispatch, v: EditorView) => boolean) => {
    cmd(view.state, view.dispatch, view);
    view.focus();
  };

  const sizes = [...new Set([...SIZES, size])].sort((a, b) => a - b);

  return (
    <div className="toolbar" onMouseDown={(e) => {
      // Keep the editor's selection when clicking buttons (but let inputs focus).
      const t = e.target as HTMLElement;
      if (!t.closest("select, input")) e.preventDefault();
    }}>
      <button title={`Undo (${mod}Z)`} onClick={() => run((s, d) => !!undoCommand(s, d))} aria-label="Undo" className="icon">
        ⟲
      </button>
      <button title={`Redo (${mod}⇧Z)`} onClick={() => run((s, d) => !!redoCommand(s, d))} aria-label="Redo" className="icon">
        ⟳
      </button>
      <span className="sep" />
      <select
        title="Text style"
        value={kind === "bullet" ? "p" : kind}
        onChange={(e) => run(setKind(e.target.value as Kind))}
        aria-label="Text style"
      >
        <option value="p">Body text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
      </select>
      <select
        title="Font"
        value={font}
        onChange={(e) => run(setMark(schema.marks.font, e.target.value === "sans" ? null : { family: e.target.value }))}
        aria-label="Font"
      >
        {Object.keys(FONTS).map((f) => (
          <option key={f} value={f} style={{ fontFamily: FONTS[f as keyof typeof FONTS] }}>
            {f[0].toUpperCase() + f.slice(1)}
          </option>
        ))}
      </select>
      <select
        title="Font size"
        className="size"
        value={size}
        onChange={(e) => {
          const px = Number(e.target.value);
          run(setMark(schema.marks.size, px === DEFAULT_SIZE[kind] ? null : { px }));
        }}
        aria-label="Font size"
      >
        {sizes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <span className="sep" />
      <button title={`Bold (${mod}B)`} className={bold ? "on" : ""} onClick={() => run(toggleBold)} aria-label="Bold">
        <b>B</b>
      </button>
      <div className="color-wrap">
        <button title="Text color" onClick={() => setColorOpen(!colorOpen)} aria-label="Text color">
          <span className="color-a" style={{ borderBottomColor: color ?? "var(--ink)" }}>
            A
          </span>
        </button>
        {colorOpen && (
          <div className="color-pop" onMouseLeave={() => setColorOpen(false)}>
            <button className="swatch default" title="Default" onClick={() => (run(setMark(schema.marks.color, null)), setColorOpen(false))}>
              ⃠
            </button>
            {Object.entries(COLORS).map(([name, hex]) => (
              <button
                key={name}
                className={`swatch ${color === hex ? "on" : ""}`}
                title={name}
                style={{ background: hex }}
                onClick={() => (run(setMark(schema.marks.color, { value: hex })), setColorOpen(false))}
              />
            ))}
          </div>
        )}
      </div>
      <button title={`Link (${mod}K)`} className={link ? "on" : ""} onClick={() => setLinkEditing(!linkEditing)} aria-label="Link">
        🔗
      </button>
      <button title={`Bulleted list (${mod}⇧8)`} className={kind === "bullet" ? "on" : ""} onClick={() => run(setKind(kind === "bullet" ? "p" : "bullet"))} aria-label="Bulleted list">
        • ≡
      </button>
      <span className="sep" />
      <button title={`Comment (${mod}⌥M)`} onClick={onComment}>
        Comment
      </button>
      <span className="grow" />
      <button title="Copies the selection, or the whole document if nothing is selected" onClick={onCopyMarkdown}>
        Copy as Markdown
      </button>
      {linkEditing && <LinkEditor view={view} current={link?.href ?? ""} onDone={() => (setLinkEditing(false), view.focus())} />}
    </div>
  );
}

function LinkEditor({ view, current, onDone }: { view: EditorView; current: string; onDone: () => void }) {
  const [href, setHref] = useState(current);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const apply = (value: string | null) => {
    const { state } = view;
    const range = linkRange(state);
    let { from, to, empty } = state.selection;
    if (empty && range) ({ from, to } = range);
    let tr = state.tr;
    if (value) {
      const url = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
      if (from === to) {
        // Nothing selected: insert the URL itself as the link text.
        tr = tr.insertText(url, from).addMark(from, from + url.length, schema.marks.link.create({ href: url }));
        tr.setSelection(TextSelection.create(tr.doc, from + url.length));
      } else {
        tr = tr.removeMark(from, to, schema.marks.link).addMark(from, to, schema.marks.link.create({ href: url }));
      }
    } else {
      tr = tr.removeMark(from, to, schema.marks.link);
    }
    view.dispatch(tr);
    onDone();
  };

  return (
    <form
      className="link-editor"
      onSubmit={(e) => {
        e.preventDefault();
        apply(href.trim() || null);
      }}
    >
      <input ref={input} value={href} onChange={(e) => setHref(e.target.value)} placeholder="Paste or type a link" onKeyDown={(e) => e.key === "Escape" && onDone()} />
      <button className="primary" type="submit">
        Apply
      </button>
      {current && (
        <button type="button" onClick={() => apply(null)}>
          Remove
        </button>
      )}
      <button type="button" onClick={onDone}>
        Cancel
      </button>
    </form>
  );
}

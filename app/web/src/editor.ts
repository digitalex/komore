// The browser editor: ProseMirror bound to the shared Y.Doc.
//
// Everything a person does here becomes a Yjs update on the same document
// the CLI edits through the server; the gestures map one-to-one onto ops
// (docs/parity.md).
import { EditorState, Plugin, PluginKey, TextSelection } from "prosemirror-state";
import type { Command, Transaction } from "prosemirror-state";
import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, setBlockType, toggleMark, chainCommands } from "prosemirror-commands";
import { inputRules, textblockTypeInputRule, wrappingInputRule } from "prosemirror-inputrules";
import { liftListItem, sinkListItem, splitListItem, wrapInList } from "prosemirror-schema-list";
import type { MarkType, Node as PMNode } from "prosemirror-model";
import {
  ySyncPlugin,
  ySyncPluginKey,
  yCursorPlugin,
  yUndoPlugin,
  undoCommand,
  redoCommand,
  initProseMirrorDoc,
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
} from "y-prosemirror";
import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";

import { schema, newId } from "../../shared/schema.ts";
import { fragmentToBlocks } from "../../shared/blocks.ts";
import type { BlockType } from "../../shared/blocks.ts";
import { blocksToMarkdown, spansToMarkdown } from "../../shared/text.ts";
import { threadsOf, readThread } from "../../shared/comments.ts";

// ---------------------------------------------------------------- block ids

/** Give every textblock a unique id after local edits (a split copies the id). */
const blockIdPlugin = new Plugin({
  appendTransaction(trs, _old, state) {
    if (!trs.some((tr) => tr.docChanged)) return null;
    if (trs.every((tr) => tr.getMeta(ySyncPluginKey)?.isChangeOrigin)) return null;
    const seen = new Set<string>();
    let tr: Transaction | null = null;
    state.doc.descendants((node, pos) => {
      if (!node.isTextblock) return true;
      const id = node.attrs.id as string | null;
      if (!id || seen.has(id)) {
        tr ??= state.tr;
        const fresh = newId();
        tr.setNodeAttribute(pos, "id", fresh);
        seen.add(fresh);
      } else seen.add(id);
      return false;
    });
    // Not `addToHistory: false`: y-prosemirror syncs the whole batch under one
    // origin, so that meta would drop the user's own edit from undo as well.
    return tr;
  },
});

// ---------------------------------------------------------------- comments

export const commentKey = new PluginKey<{ decos: DecorationSet; active: string | null }>("comments");

function commentPlugin(ydoc: Y.Doc, fragment: Y.XmlFragment, onClick: (id: string) => void) {
  const compute = (state: EditorState, active: string | null): DecorationSet => {
    const binding = ySyncPluginKey.getState(state)?.binding;
    if (!binding) return DecorationSet.empty;
    const decos: Decoration[] = [];
    for (const t of threadsOf(ydoc).toArray().map(readThread)) {
      if (!t.anchor || t.resolved) continue;
      try {
        const from = relativePositionToAbsolutePosition(ydoc, fragment, Y.createRelativePositionFromJSON(t.anchor.from), binding.mapping);
        const to = relativePositionToAbsolutePosition(ydoc, fragment, Y.createRelativePositionFromJSON(t.anchor.to), binding.mapping);
        if (from === null || to === null || to <= from || to > state.doc.content.size) continue;
        decos.push(Decoration.inline(from, to, { class: t.id === active ? "comment-mark active" : "comment-mark", "data-thread": t.id }, { thread: t.id }));
      } catch {
        /* anchor no longer resolvable */
      }
    }
    return DecorationSet.create(state.doc, decos);
  };
  return new Plugin({
    key: commentKey,
    state: {
      init: () => ({ decos: DecorationSet.empty, active: null as string | null }),
      apply(tr, prev, _old, state) {
        const meta = tr.getMeta(commentKey) as { active?: string | null } | undefined;
        const active = meta && "active" in meta ? (meta.active ?? null) : prev.active;
        if (!tr.docChanged && !meta) return prev;
        return { decos: compute(state, active), active };
      },
    },
    props: {
      decorations: (state) => commentKey.getState(state)?.decos,
      handleClick(view, pos) {
        const found = commentKey.getState(view.state)?.decos.find(pos, pos) ?? [];
        const id = found.map((d) => (d.spec as { thread?: string }).thread).find(Boolean);
        if (id) onClick(id);
        return false;
      },
    },
  });
}

/** Ask the comment plugin to recompute (threads changed) and/or mark one active. */
export function refreshComments(view: EditorView, active?: string | null): void {
  const meta = active === undefined ? {} : { active };
  view.dispatch(view.state.tr.setMeta(commentKey, meta).setMeta("addToHistory", false));
}

// ---------------------------------------------------------------- commands

export type Kind = "p" | "h1" | "h2" | "bullet";

export function currentKind(state: EditorState): Kind {
  const { $from } = state.selection;
  const parent = $from.parent;
  if (parent.type === schema.nodes.heading) return parent.attrs.level === 1 ? "h1" : "h2";
  for (let d = $from.depth; d > 0; d--) if ($from.node(d).type === schema.nodes.listItem) return "bullet";
  return "p";
}

const liftOutOfList: Command = (state, dispatch) => {
  if (currentKind(state) !== "bullet") return false;
  let s = state;
  let changed = false;
  let guard = 0;
  // Lift repeatedly until the block is no longer inside any list.
  while (currentKind(s) === "bullet" && guard++ < 10) {
    let next: Transaction | null = null;
    if (!liftListItem(schema.nodes.listItem)(s, (tr) => (next = tr))) break;
    s = s.apply(next!);
    changed = true;
  }
  if (changed && dispatch) {
    const tr = state.tr;
    // Replay the lifted document as one step so undo is a single action.
    tr.replaceWith(0, state.doc.content.size, s.doc.content);
    tr.setSelection(TextSelection.create(tr.doc, Math.min(s.selection.from, tr.doc.content.size)));
    dispatch(tr);
  }
  return changed;
};

export function setKind(kind: Kind): Command {
  return (state, dispatch, view) => {
    if (kind === "bullet") {
      if (currentKind(state) === "bullet") return true;
      let s = state;
      if (currentKind(s) !== "p") {
        let next: Transaction | null = null;
        setBlockType(schema.nodes.paragraph)(s, (tr) => (next = tr));
        if (next) s = s.apply(next);
      }
      let wrapped: Transaction | null = null;
      if (!wrapInList(schema.nodes.bulletList)(s, (tr) => (wrapped = tr))) return false;
      if (dispatch) {
        const after = s.apply(wrapped!);
        const tr = state.tr.replaceWith(0, state.doc.content.size, after.doc.content);
        tr.setSelection(TextSelection.create(tr.doc, Math.min(after.selection.from, tr.doc.content.size)));
        dispatch(tr);
      }
      return true;
    }
    if (currentKind(state) === "bullet") {
      if (!dispatch) return true;
      let lifted: EditorState = state;
      liftOutOfList(state, (tr) => (lifted = state.apply(tr)));
      const type = kind === "p" ? schema.nodes.paragraph : schema.nodes.heading;
      const attrs = kind === "p" ? {} : { level: kind === "h1" ? 1 : 2 };
      let final: Transaction | null = null;
      setBlockType(type, attrs)(lifted, (tr) => (final = tr));
      const result = final ? lifted.apply(final) : lifted;
      const tr = state.tr.replaceWith(0, state.doc.content.size, result.doc.content);
      tr.setSelection(TextSelection.create(tr.doc, Math.min(result.selection.from, tr.doc.content.size)));
      dispatch(tr);
      return true;
    }
    if (kind === "p") return setBlockType(schema.nodes.paragraph)(state, dispatch, view);
    return setBlockType(schema.nodes.heading, { level: kind === "h1" ? 1 : 2 })(state, dispatch, view);
  };
}

export function markAttr(state: EditorState, type: MarkType, attr: string): unknown {
  const { from, $from, to, empty } = state.selection;
  if (empty) return (state.storedMarks ?? $from.marks()).find((m) => m.type === type)?.attrs[attr] ?? null;
  let value: unknown = undefined;
  let mixed = false;
  state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return;
    const v = node.marks.find((m) => m.type === type)?.attrs[attr] ?? null;
    if (value === undefined) value = v;
    else if (value !== v) mixed = true;
  });
  return mixed ? null : (value ?? null);
}

export function isMarkActive(state: EditorState, type: MarkType): boolean {
  const { from, $from, to, empty } = state.selection;
  if (empty) return !!type.isInSet(state.storedMarks ?? $from.marks());
  return state.doc.rangeHasMark(from, to, type);
}

/** Set (or with `attrs` null, clear) a mark across the selection. */
export function setMark(type: MarkType, attrs: Record<string, unknown> | null): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection;
    if (!dispatch) return true;
    if (empty) {
      const marks = state.storedMarks ?? state.selection.$from.marks();
      const cleared = type.removeFromSet(marks);
      dispatch(state.tr.setStoredMarks(attrs ? type.create(attrs).addToSet(cleared) : cleared));
      return true;
    }
    const tr = state.tr.removeMark(from, to, type);
    if (attrs) tr.addMark(from, to, type.create(attrs));
    dispatch(tr);
    return true;
  };
}

export const toggleBold = toggleMark(schema.marks.bold);

/** The extent of the link around the cursor: the contiguous run of text carrying it. */
export function linkRange(state: EditorState): { from: number; to: number; href: string } | null {
  const { $from } = state.selection;
  const mark = schema.marks.link.isInSet($from.marks()) ?? ($from.nodeBefore && schema.marks.link.isInSet($from.nodeBefore.marks));
  if (!mark) return null;
  const start = $from.start();
  const runs: { from: number; to: number }[] = [];
  $from.parent.forEach((child, offset) => {
    if (!mark.isInSet(child.marks)) return;
    const s = start + offset;
    const last = runs[runs.length - 1];
    if (last && last.to === s) last.to = s + child.nodeSize;
    else runs.push({ from: s, to: s + child.nodeSize });
  });
  const run = runs.find((r) => r.from <= $from.pos && $from.pos <= r.to);
  return run ? { ...run, href: mark.attrs.href } : null;
}

/** What someone typed into a link field, as a URL ("example.com" → "https://example.com"). */
export function normalizeHref(value: string): string {
  const v = value.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
}

/** Only these schemes are opened from the editor; links written through the API can contain anything. */
export function isSafeHref(href: string): boolean {
  return /^(https?:|mailto:)/i.test(href.trim());
}

/**
 * Replace the link around the cursor with new anchor text and/or URL, as one
 * undoable edit. The text keeps the formatting of the link's first character;
 * an empty URL removes the link but keeps the text.
 */
export function updateLink(text: string, href: string): Command {
  return (state, dispatch) => {
    const range = linkRange(state);
    if (!range || !text) return false;
    if (!dispatch) return true;
    const first = state.doc.nodeAt(range.from);
    let marks = schema.marks.link.removeFromSet(first?.marks ?? []);
    if (href.trim()) marks = schema.marks.link.create({ href: normalizeHref(href) }).addToSet(marks);
    const tr = state.tr.replaceWith(range.from, range.to, schema.text(text, marks));
    // Rest the caret inside the link so its box stays open on the result.
    tr.setSelection(TextSelection.create(tr.doc, range.from + Math.max(1, text.length - 1)));
    dispatch(tr.scrollIntoView());
    return true;
  };
}

/** Remove the link around the cursor, keeping its text. */
export const removeLink: Command = (state, dispatch) => {
  const range = linkRange(state);
  if (!range) return false;
  if (dispatch) dispatch(state.tr.removeMark(range.from, range.to, schema.marks.link));
  return true;
};

// ---------------------------------------------------------------- markdown export

/** Markdown of the selection, or of the whole document when nothing is selected. */
export function selectionMarkdown(state: EditorState): { markdown: string; whole: boolean } {
  const { from, to, empty, $from, $to } = state.selection;
  if (empty) return { markdown: blocksToMarkdown(fragmentToBlocks(state.doc.content)), whole: true };
  const blocks = fragmentToBlocks(state.doc.slice(from, to, true).content);
  // A selection that just grazes the edge of a block shouldn't copy an empty "## " or "- ".
  while (blocks.length > 1 && !blocks[0].spans.length) blocks.shift();
  while (blocks.length > 1 && !blocks[blocks.length - 1].spans.length) blocks.pop();
  if (blocks.length === 1 && !blocks[0].spans.length) return { markdown: "", whole: false };
  if ($from.sameParent($to) && blocks.length === 1) return { markdown: spansToMarkdown(blocks[0].spans), whole: false };
  return { markdown: blocksToMarkdown(blocks), whole: false };
}

// ---------------------------------------------------------------- comment anchors

export function selectionAnchor(view: EditorView, ydoc: Y.Doc): { anchor: { from: unknown; to: unknown }; quote: string } | null {
  const { from, to, empty } = view.state.selection;
  if (empty) return null;
  const binding = ySyncPluginKey.getState(view.state)?.binding;
  if (!binding) return null;
  const fragment = ydoc.getXmlFragment("content");
  const rf = absolutePositionToRelativePosition(from, fragment, binding.mapping);
  const rt = absolutePositionToRelativePosition(to, fragment, binding.mapping);
  return {
    anchor: { from: Y.relativePositionToJSON(rf), to: Y.relativePositionToJSON(rt) },
    quote: view.state.doc.textBetween(from, to, " ").slice(0, 300),
  };
}

/** Scroll to and select a thread's anchored text. */
export function revealThread(view: EditorView, ydoc: Y.Doc, anchor: { from: unknown; to: unknown }): boolean {
  const binding = ySyncPluginKey.getState(view.state)?.binding;
  if (!binding) return false;
  const fragment = ydoc.getXmlFragment("content");
  const from = relativePositionToAbsolutePosition(ydoc, fragment, Y.createRelativePositionFromJSON(anchor.from), binding.mapping);
  if (from === null) return false;
  const coords = view.coordsAtPos(Math.min(from, view.state.doc.content.size));
  const scroller = view.dom.closest(".doc-scroll");
  if (scroller) {
    const box = scroller.getBoundingClientRect();
    if (coords.top < box.top + 80 || coords.top > box.bottom - 80) scroller.scrollBy({ top: coords.top - box.top - box.height / 3, behavior: "smooth" });
  }
  return true;
}

// ---------------------------------------------------------------- the editor

export interface EditorOptions {
  ydoc: Y.Doc;
  awareness: Awareness;
  onChange: () => void;
  onThreadClick: (id: string) => void;
  onLink: () => void;
  onComment: () => void;
}

export function createEditor(mount: HTMLElement, opts: EditorOptions): EditorView {
  const fragment = opts.ydoc.getXmlFragment("content");
  const { doc, mapping } = initProseMirrorDoc(fragment, schema);

  const kindKey = (k: Kind): Command => setKind(k);
  const state = EditorState.create({
    doc: doc as PMNode,
    plugins: [
      ySyncPlugin(fragment, { mapping }),
      yCursorPlugin(opts.awareness, { cursorBuilder }),
      yUndoPlugin(),
      blockIdPlugin,
      commentPlugin(opts.ydoc, fragment, opts.onThreadClick),
      inputRules({
        rules: [
          textblockTypeInputRule(/^#\s$/, schema.nodes.heading, { level: 1 }),
          textblockTypeInputRule(/^##\s$/, schema.nodes.heading, { level: 2 }),
          wrappingInputRule(/^\s*[-*]\s$/, schema.nodes.bulletList),
        ],
      }),
      keymap({
        "Mod-z": (s, d) => !!undoCommand(s, d),
        "Mod-y": (s, d) => !!redoCommand(s, d),
        "Mod-Shift-z": (s, d) => !!redoCommand(s, d),
        "Mod-b": toggleBold,
        "Mod-k": () => (opts.onLink(), true),
        "Mod-Alt-m": () => (opts.onComment(), true),
        "Mod-Alt-0": kindKey("p"),
        "Mod-Alt-1": kindKey("h1"),
        "Mod-Alt-2": kindKey("h2"),
        "Mod-Shift-8": (state, dispatch, view) => (currentKind(state) === "bullet" ? kindKey("p") : kindKey("bullet"))(state, dispatch, view),
        Enter: chainCommands(splitListItem(schema.nodes.listItem), baseKeymap.Enter),
        Tab: sinkListItem(schema.nodes.listItem),
        "Shift-Tab": liftListItem(schema.nodes.listItem),
        // Backspace at the start of a bullet turns it back into a paragraph.
        Backspace: (state, dispatch, view) => {
          const { $from, empty } = state.selection;
          if (!empty || $from.parentOffset !== 0 || currentKind(state) !== "bullet") return false;
          return liftListItem(schema.nodes.listItem)(state, dispatch, view);
        },
      }),
      keymap(baseKeymap),
    ],
  });

  const view: EditorView = new EditorView(mount, {
    state,
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
      opts.onChange();
    },
    handleDOMEvents: {
      click(_view, event) {
        const a = (event.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
        if (a && (event.metaKey || event.ctrlKey)) {
          if (isSafeHref(a.getAttribute("href") ?? "")) window.open(a.href, "_blank", "noopener,noreferrer");
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
  });

  // Re-decorate when threads change (someone comments, resolves, …).
  const threads = threadsOf(opts.ydoc);
  const onThreads = () => refreshComments(view);
  threads.observeDeep(onThreads);
  const destroy = view.destroy.bind(view);
  view.destroy = () => {
    threads.unobserveDeep(onThreads);
    destroy();
  };
  return view;
}

function cursorBuilder(user: { name: string; color: string; status?: string }): HTMLElement {
  const cursor = document.createElement("span");
  cursor.classList.add("ProseMirror-yjs-cursor");
  cursor.style.borderColor = user.color;
  const label = document.createElement("div");
  label.style.backgroundColor = user.color;
  label.textContent = user.name;
  cursor.appendChild(label);
  return cursor;
}

export type { BlockType };

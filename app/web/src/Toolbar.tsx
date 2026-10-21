import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";
import { undoCommand, redoCommand } from "y-prosemirror";
import { Select as BaseSelect } from "@base-ui/react/select";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { Link2, List, MessageSquarePlus } from "lucide-react";
import { Button, Field, Popover, Select, ThemedIcon, Toolbar as ToolbarParts } from "@graphical";
import { schema, COLORS, FONTS, SIZES } from "../../shared/schema.ts";
import { currentKind, isMarkActive, linkRange, markAttr, normalizeHref, setKind, setMark, toggleBold } from "./editor.ts";
import type { Kind } from "./editor.ts";
import { AppIcon } from "./theme/icons.tsx";
import { appTheme } from "./theme/document.ts";

// The default size of each block type follows the theme's text steps
// (body = m, Heading 2 = l, Heading 1 = xl), matching the editor stylesheet.
const step = (key: "m" | "l" | "xl") => Math.round(appTheme.theme.text[key].size);
const DEFAULT_SIZE: Record<Kind, number> = { p: step("m"), bullet: step("m"), h1: step("xl"), h2: step("l") };
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl+";

const STYLE_ITEMS = [
  { value: "p", label: "Body text" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
];
const FONT_ITEMS = Object.keys(FONTS).map((f) => ({ value: f, label: f[0].toUpperCase() + f.slice(1) }));

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
  // Popups hand focus back to the document when they close.
  const editorFocus = useMemo(() => ({ current: view.dom as HTMLElement }), [view]);

  const run = (cmd: (s: typeof state, d: typeof view.dispatch, v: EditorView) => boolean) => {
    cmd(view.state, view.dispatch, view);
    view.focus();
  };

  const sizeItems = [...new Set([...SIZES, size])].sort((a, b) => a - b).map((s) => ({ value: s, label: String(s) }));

  return (
    <ToolbarParts.Root className="editor-toolbar" aria-label="Formatting">
      <ToolbarParts.Button className="ui-toolbar-icon" aria-label="Undo" title={`Undo (${mod}Z)`} onClick={() => run((s, d) => !!undoCommand(s, d))}>
        <ThemedIcon name="undo" semantic />
      </ToolbarParts.Button>
      <ToolbarParts.Button className="ui-toolbar-icon" aria-label="Redo" title={`Redo (${mod}⇧Z)`} onClick={() => run((s, d) => !!redoCommand(s, d))}>
        <ThemedIcon name="redo" semantic />
      </ToolbarParts.Button>
      <ToolbarParts.Separator />

      <ToolbarSelect
        label="Text style"
        value={kind === "bullet" ? "p" : kind}
        items={STYLE_ITEMS}
        onChange={(v) => run(setKind(v as Kind))}
        finalFocus={editorFocus}
      />
      <ToolbarSelect
        label="Font"
        value={font}
        items={FONT_ITEMS}
        onChange={(v) => run(setMark(schema.marks.font, v === "sans" ? null : { family: v }))}
        finalFocus={editorFocus}
      />
      <ToolbarSelect
        label="Font size"
        value={size}
        items={sizeItems}
        onChange={(px) => run(setMark(schema.marks.size, px === DEFAULT_SIZE[kind] ? null : { px }))}
        finalFocus={editorFocus}
      />
      <ToolbarParts.Separator />

      <ToolbarParts.Button
        className="ui-toolbar-icon"
        aria-label="Bold"
        title={`Bold (${mod}B)`}
        render={<BaseToggle pressed={bold} onPressedChange={() => run(toggleBold)} />}
      >
        <ThemedIcon name="bold" semantic />
      </ToolbarParts.Button>

      <Popover.Root open={colorOpen} onOpenChange={setColorOpen}>
        <ToolbarParts.Button className="ui-toolbar-icon" aria-label="Text color" title="Text color" render={<BasePopover.Trigger />}>
          <span className="color-glyph" style={{ borderBottomColor: color ?? "currentColor" }} aria-hidden="true">
            A
          </span>
        </ToolbarParts.Button>
        <Popover.Portal>
          <Popover.Positioner sideOffset={8} align="start">
            <Popover.Popup className="color-popup" finalFocus={editorFocus}>
              <Popover.Title>Text color</Popover.Title>
              <div className="swatches">
                <button
                  type="button"
                  className={`swatch default${color === null ? " on" : ""}`}
                  aria-label="Default"
                  aria-pressed={color === null}
                  onClick={() => (run(setMark(schema.marks.color, null)), setColorOpen(false))}
                />
                {Object.entries(COLORS).map(([name, hex]) => (
                  <button
                    type="button"
                    key={name}
                    className={`swatch${color === hex ? " on" : ""}`}
                    aria-label={name}
                    aria-pressed={color === hex}
                    title={name}
                    // Document colours are content, so each swatch shows its real value.
                    style={{ background: hex }}
                    onClick={() => (run(setMark(schema.marks.color, { value: hex })), setColorOpen(false))}
                  />
                ))}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <Popover.Root open={linkEditing} onOpenChange={setLinkEditing}>
        <ToolbarParts.Button
          className="ui-toolbar-icon"
          aria-label="Link"
          title={`Link (${mod}K)`}
          data-pressed={link ? "" : undefined}
          render={<BasePopover.Trigger />}
        >
          <AppIcon icon={Link2} />
        </ToolbarParts.Button>
        <Popover.Portal>
          <Popover.Positioner sideOffset={8} align="start">
            <Popover.Popup finalFocus={editorFocus}>
              <LinkEditor view={view} current={link?.href ?? ""} onDone={() => setLinkEditing(false)} />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <ToolbarParts.Button
        className="ui-toolbar-icon"
        aria-label="Bulleted list"
        title={`Bulleted list (${mod}⇧8)`}
        render={<BaseToggle pressed={kind === "bullet"} onPressedChange={() => run(setKind(kind === "bullet" ? "p" : "bullet"))} />}
      >
        <AppIcon icon={List} />
      </ToolbarParts.Button>
      <ToolbarParts.Separator />

      <ToolbarParts.Button title={`Comment (${mod}⌥M)`} onClick={onComment}>
        <AppIcon icon={MessageSquarePlus} />
        Comment
      </ToolbarParts.Button>
      <span className="grow" />
      <ToolbarParts.Button title="Copies the selection, or the whole document if nothing is selected" onClick={onCopyMarkdown}>
        <ThemedIcon name="copy" semantic />
        Copy as Markdown
      </ToolbarParts.Button>
    </ToolbarParts.Root>
  );
}

/** A select whose trigger is a toolbar control (one element, roving focus intact). */
function ToolbarSelect<V extends string | number>({
  label,
  value,
  items,
  onChange,
  finalFocus,
}: {
  label: string;
  value: V;
  items: { value: V; label: string }[];
  onChange: (value: V) => void;
  finalFocus: React.RefObject<HTMLElement | null>;
}) {
  return (
    <Select.Root value={value} items={items} onValueChange={(v) => v !== null && onChange(v as V)}>
      <ToolbarParts.Button className="toolbar-select" aria-label={label} title={label} render={<BaseSelect.Trigger />}>
        <Select.Value />
        <Select.Icon />
      </ToolbarParts.Button>
      <Select.Portal>
        <Select.Positioner>
          <Select.Popup finalFocus={finalFocus}>
            <Select.List>
              {items.map((item) => (
                <Select.Item key={String(item.value)} value={item.value}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
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
      const url = normalizeHref(value);
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
      className="link-form"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        apply(href.trim() || null);
      }}
    >
      <Field.Root>
        <Field.Label>Link</Field.Label>
        <Field.Control ref={input} value={href} onChange={(e) => setHref(e.target.value)} placeholder="Paste or type a link" />
      </Field.Root>
      <div className="popup-actions">
        {current && (
          <Button variant="secondary" type="button" onClick={() => apply(null)}>
            Remove
          </Button>
        )}
        <Button variant="primary" type="submit">
          Apply
        </Button>
      </div>
    </form>
  );
}

// The link box: when the caret is inside a link, a small popover anchored to
// it offers to visit the link, edit its text and URL, or remove it. It doesn't
// take focus, so typing carries on in the document.
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { EditorView } from "prosemirror-view";
import { ExternalLink, Pencil, Unlink } from "lucide-react";
import { Button, Field, Popover } from "@graphical";
import { isSafeHref, linkRange, removeLink, updateLink } from "./editor.ts";
import { AppIcon } from "./theme/icons.tsx";

export function LinkBubble({ view }: { view: EditorView }) {
  const range = view.state.selection.empty ? linkRange(view.state) : null;
  const key = range ? `${range.from}:${range.href}` : null;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const rangeRef = useRef(range);
  rangeRef.current = range;

  // Leaving the link resets the box, so coming back shows it again.
  useEffect(() => {
    if (!range) {
      setDismissed(null);
      setEditing(false);
    }
  }, [range === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = !!range && (editing || key !== dismissed);
  const anchor = () => {
    const r = rangeRef.current;
    if (!r) return null;
    return {
      contextElement: view.dom,
      getBoundingClientRect: () => {
        const a = view.coordsAtPos(r.from, 1);
        const b = view.coordsAtPos(r.to, -1);
        const left = Math.min(a.left, b.left);
        const right = Math.max(a.right, b.right);
        return new DOMRect(left, a.top, Math.max(1, right - left), b.bottom - a.top);
      },
    };
  };

  const close = () => {
    setEditing(false);
    setDismissed(key);
  };
  const backToDocument = () => {
    setEditing(false);
    view.focus();
  };

  if (!range) return null;
  const text = view.state.doc.textBetween(range.from, range.to);
  const safe = isSafeHref(range.href);

  return (
    <Popover.Root open={open} onOpenChange={(next) => !next && close()}>
      <Popover.Portal>
        <Popover.Positioner anchor={anchor} side="bottom" align="start" sideOffset={6}>
          <Popover.Popup className="link-bubble" initialFocus={editing} finalFocus={false} aria-label="Link details">
            {editing ? (
              <LinkForm
                text={text}
                href={range.href}
                onSave={(t, h) => {
                  updateLink(t, h)(view.state, view.dispatch, view);
                  backToDocument();
                }}
                onCancel={backToDocument}
              />
            ) : (
              <div className="link-bubble-view">
                <span className="link-bubble-url" title={range.href}>
                  {range.href}
                </span>
                <div className="link-bubble-actions">
                  <Button
                    variant="ghost"
                    className="icon-button"
                    aria-label="Visit link"
                    title={safe ? "Open in a new tab" : "Only http(s) and mailto links can be opened"}
                    disabled={!safe}
                    onClick={() => window.open(range.href, "_blank", "noopener,noreferrer")}
                  >
                    <AppIcon icon={ExternalLink} />
                  </Button>
                  <Button variant="ghost" className="icon-button" aria-label="Edit link" title="Edit text and link" onClick={() => setEditing(true)}>
                    <AppIcon icon={Pencil} />
                  </Button>
                  <Button
                    variant="ghost"
                    className="icon-button"
                    aria-label="Remove link"
                    title="Remove link"
                    onClick={() => {
                      removeLink(view.state, view.dispatch, view);
                      view.focus();
                    }}
                  >
                    <AppIcon icon={Unlink} />
                  </Button>
                </div>
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function LinkForm({ text, href, onSave, onCancel }: { text: string; href: string; onSave: (text: string, href: string) => void; onCancel: () => void }) {
  const [t, setT] = useState(text);
  const [h, setH] = useState(href);
  return (
    <form
      className="link-form"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (t) onSave(t, h);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <Field.Root>
        <Field.Label>Text</Field.Label>
        <Field.Control autoFocus value={t} onChange={(e) => setT(e.target.value)} />
      </Field.Root>
      <Field.Root>
        <Field.Label>Link</Field.Label>
        <Field.Control value={h} onChange={(e) => setH(e.target.value)} placeholder="Paste or type a link" />
      </Field.Root>
      <div className="popup-actions">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={!t}>
          Save
        </Button>
      </div>
    </form>
  );
}

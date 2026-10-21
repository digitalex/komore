import { useCallback, useEffect, useState } from "react";
import type * as Y from "yjs";
import type { User } from "../../shared/identity.ts";
import type { Block, Span } from "../../shared/blocks.ts";
import { FONTS } from "../../shared/schema.ts";
import { Button, Dialog, ScrollArea, ThemedIcon } from "@graphical";

interface Version {
  version: number;
  from: number;
  to: number;
  authors: { name: string; color: string }[];
  edits: number;
  labels: string[];
}

function stamp(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toDateString() === today.toDateString() ? `Today, ${time}` : `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

const OP_WORDS: Record<string, string> = {
  insert_blocks: "added text",
  update_block: "rewrote a block",
  delete_blocks: "deleted blocks",
  move_blocks: "moved blocks",
  insert_text: "inserted text",
  delete_text: "deleted text",
  format: "formatted",
  replace_text: "replaced text",
  set_markdown: "rewrote the document",
  undo: "undid an edit",
};

function describe(v: Version): string {
  const l = v.labels.find((x) => x.startsWith("restore"));
  if (l) return `Restored version ${l.split(" ")[1]}`;
  if (v.labels.includes("create")) return "Created";
  const words = v.labels.flatMap((x) => x.split(", ")).map((x) => OP_WORDS[x]).filter(Boolean);
  if (words.length) return [...new Set(words)].join(", ").replace(/^./, (c) => c.toUpperCase());
  return `${v.edits} edit${v.edits === 1 ? "" : "s"}`;
}

export function HistoryPanel({ id, ydoc, user, onClose, flash }: { id: string; ydoc: Y.Doc; user: User; onClose: () => void; flash: (title: string, description?: string) => void }) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [preview, setPreview] = useState<{ v: Version; blocks: Block[] } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/docs/${id}/history`);
    if (r.ok) setVersions((await r.json()).versions);
  }, [id]);

  useEffect(() => {
    load();
    // The log grows as anyone edits; keep it current while open.
    let timer: number | undefined;
    const onUpdate = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(load, 1200);
    };
    ydoc.on("update", onUpdate);
    return () => {
      ydoc.off("update", onUpdate);
      window.clearTimeout(timer);
    };
  }, [ydoc, load]);

  const open = async (v: Version) => {
    const r = await fetch(`/api/docs/${id}/versions/${v.version}`);
    if (r.ok) setPreview({ v, blocks: (await r.json()).content });
  };

  const restore = async (v: Version) => {
    const r = await fetch(`/api/docs/${id}/restore`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user: { name: user.name, color: user.color }, version: v.version }),
    });
    if (r.ok) {
      setPreview(null);
      flash(`Restored the version from ${stamp(v.to)}`);
      load();
    } else flash((await r.json()).error ?? "Restore failed");
  };

  return (
    <aside className="side-panel" aria-label="Version history">
      <div className="panel-head">
        <h2 className="panel-title">Version history</h2>
        <Button variant="ghost" className="icon-button" onClick={onClose} aria-label="Close history">
          <ThemedIcon name="close" semantic />
        </Button>
      </div>
      <ScrollArea.Root className="panel-scroll">
        <ScrollArea.Viewport>
          <ScrollArea.Content className="panel-body">
            {!versions && <div className="meta">Loading…</div>}
            {versions?.map((v, i) => (
              <button
                type="button"
                key={v.version}
                className={`version ${preview?.v.version === v.version ? "active" : ""}`}
                onClick={() => open(v)}
              >
                <div className="version-top">
                  <strong>{stamp(v.to)}</strong>
                  {i === 0 && <span className="badge">Current</span>}
                </div>
                <div className="meta">{describe(v)}</div>
                <div className="authors">
                  {v.authors.map((a) => (
                    <span key={a.name} className="author">
                      <span className="dot" style={{ background: a.color }} aria-hidden="true" /> {a.name}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical">
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
      <Dialog.Root open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup className="preview-dialog">
            {preview && (
              <>
                <div className="preview-head">
                  <div className="preview-heading">
                    <Dialog.Title>{stamp(preview.v.to)}</Dialog.Title>
                    <Dialog.Description>
                      {describe(preview.v)} by {preview.v.authors.map((a) => a.name).join(", ") || "—"} · version {preview.v.version}
                    </Dialog.Description>
                  </div>
                  <div className="popup-actions">
                    <Dialog.Close>Close</Dialog.Close>
                    {versions?.[0]?.version !== preview.v.version && (
                      <Dialog.Action onClick={() => restore(preview.v)}>Restore this version</Dialog.Action>
                    )}
                  </div>
                </div>
                <div className="preview-page editor">
                  <div className="ProseMirror readonly">
                    <Blocks blocks={preview.blocks} />
                  </div>
                </div>
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </aside>
  );
}

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) => {
        const style: React.CSSProperties = {};
        if (s.color) style.color = s.color;
        if (s.font) style.fontFamily = FONTS[s.font as keyof typeof FONTS];
        if (s.size) style.fontSize = `${s.size}px`;
        let el: React.ReactNode = <span style={style}>{s.text}</span>;
        if (s.bold) el = <strong>{el}</strong>;
        if (s.link) el = <a href={s.link} target="_blank" rel="noopener noreferrer">{el}</a>;
        return <span key={i}>{el}</span>;
      })}
    </>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b) => {
        if (b.type === "h1") return <h1 key={b.id}><Spans spans={b.spans} /></h1>;
        if (b.type === "h2") return <h2 key={b.id}><Spans spans={b.spans} /></h2>;
        if (b.type === "bullet")
          return (
            <ul key={b.id} style={{ marginLeft: `calc(var(--space-l) * ${b.depth})`, marginTop: 0, marginBottom: 0 }}>
              <li><p><Spans spans={b.spans} /></p></li>
            </ul>
          );
        return <p key={b.id}><Spans spans={b.spans} /></p>;
      })}
    </>
  );
}

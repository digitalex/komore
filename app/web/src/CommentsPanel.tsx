import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import type { EditorView } from "prosemirror-view";
import { ySyncPluginKey, relativePositionToAbsolutePosition } from "y-prosemirror";
import { newId } from "../../shared/schema.ts";
import type { User } from "../../shared/identity.ts";
import { addMessage, createThread, findThread } from "../../shared/comments.ts";
import type { ThreadData } from "../../shared/comments.ts";
import { initials } from "./identity.ts";

export interface Draft {
  anchor: { from: unknown; to: unknown } | null;
  quote: string;
}

interface Props {
  ydoc: Y.Doc;
  view: EditorView | null;
  user: User;
  threads: ThreadData[];
  draft: Draft | null;
  setDraft: (d: Draft | null) => void;
  active: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

function when(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

/** Render @mentions in a comment body. */
function Body({ text }: { text: string }) {
  const parts = text.split(/(@[\w-]+(?: [A-Z][\w-]*)?)/g);
  return (
    <div className="msg-body">
      {parts.map((p, i) =>
        p.startsWith("@") ? (
          <span key={i} className="mention">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </div>
  );
}

export function CommentsPanel({ ydoc, view, user, threads, draft, setDraft, active, onSelect, onClose }: Props) {
  const [showResolved, setShowResolved] = useState(false);
  const [body, setBody] = useState("");
  const draftRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (draft) draftRef.current?.focus();
  }, [draft]);

  // Order threads the way they appear in the document; doc-level ones first.
  const ordered = useMemo(() => {
    const binding = view ? ySyncPluginKey.getState(view.state)?.binding : null;
    const fragment = ydoc.getXmlFragment("content");
    const pos = (t: ThreadData): number => {
      if (!t.anchor || !binding) return -1;
      try {
        return relativePositionToAbsolutePosition(ydoc, fragment, Y.createRelativePositionFromJSON(t.anchor.from), binding.mapping) ?? Infinity;
      } catch {
        return Infinity;
      }
    };
    return threads
      .filter((t) => showResolved || !t.resolved)
      .map((t) => ({ t, p: pos(t) }))
      .sort((a, b) => a.p - b.p || a.t.createdAt - b.t.createdAt)
      .map((x) => x.t);
  }, [threads, showResolved, view, ydoc, view?.state.doc]);

  const submitDraft = () => {
    if (!draft || !body.trim()) return;
    const now = Date.now();
    const id = newId(10);
    ydoc.transact(() =>
      createThread(ydoc, { id, anchor: draft.anchor, quote: draft.quote, author: user, createdAt: now }, { id: newId(10), author: user, body: body.trim(), ts: now }),
    );
    setBody("");
    setDraft(null);
    onSelect(id);
  };

  const resolvedCount = threads.filter((t) => t.resolved).length;

  return (
    <aside className="side-panel">
      <div className="panel-head">
        <h2>Comments</h2>
        <div className="row">
          <button className="ghost" onClick={() => setDraft({ anchor: null, quote: "" })} title="Comment on the whole document">
            + New
          </button>
          <button className="ghost" onClick={onClose} aria-label="Close comments">
            ✕
          </button>
        </div>
      </div>
      <div className="panel-body">
        {draft && (
          <div className="thread draft">
            {draft.quote ? <blockquote>{draft.quote}</blockquote> : <div className="muted small">On the whole document</div>}
            <textarea
              ref={draftRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Comment, or @mention someone to ask them"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitDraft();
                if (e.key === "Escape") setDraft(null);
              }}
            />
            <div className="row end">
              <button onClick={() => setDraft(null)}>Cancel</button>
              <button className="primary" onClick={submitDraft} disabled={!body.trim()}>
                Comment
              </button>
            </div>
          </div>
        )}
        {ordered.length === 0 && !draft && (
          <div className="empty">
            <p>No open comments.</p>
            <p className="muted small">Select text and press Comment. To ask an agent, @mention it by name.</p>
          </div>
        )}
        {ordered.map((t) => (
          <Thread key={t.id} t={t} ydoc={ydoc} user={user} active={active === t.id} onSelect={() => onSelect(t.id)} />
        ))}
        {resolvedCount > 0 && (
          <button className="ghost small show-resolved" onClick={() => setShowResolved(!showResolved)}>
            {showResolved ? "Hide" : "Show"} {resolvedCount} resolved
          </button>
        )}
      </div>
    </aside>
  );
}

function Thread({ t, ydoc, user, active, onSelect }: { t: ThreadData; ydoc: Y.Doc; user: User; active: boolean; onSelect: () => void }) {
  const [reply, setReply] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  const send = () => {
    const ymap = findThread(ydoc, t.id);
    if (!ymap || !reply.trim()) return;
    ydoc.transact(() => addMessage(ymap, { id: newId(10), author: user, body: reply.trim(), ts: Date.now() }));
    setReply("");
  };
  const setResolved = (v: boolean) => {
    const ymap = findThread(ydoc, t.id);
    if (ymap) ydoc.transact(() => ymap.set("resolved", v));
  };

  return (
    <div ref={ref} className={`thread ${active ? "active" : ""} ${t.resolved ? "resolved" : ""}`} onClick={onSelect}>
      <div className="thread-top">
        {t.quote ? <blockquote>{t.quote}</blockquote> : <div className="muted small">On the whole document</div>}
        <button className="ghost small" onClick={(e) => (e.stopPropagation(), setResolved(!t.resolved))} title={t.resolved ? "Reopen" : "Resolve"}>
          {t.resolved ? "Reopen" : "✓ Resolve"}
        </button>
      </div>
      {t.messages.map((m) => (
        <div className="msg" key={m.id}>
          <div className="msg-head">
            <span className="avatar tiny" style={{ background: m.author?.color }}>
              {initials(m.author?.name ?? "?")}
            </span>
            <strong>{m.author?.name}</strong>
            <span className="muted small">{when(m.ts)}</span>
          </div>
          <Body text={m.body} />
        </div>
      ))}
      {active && !t.resolved && (
        <div className="reply" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply…"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
          />
          <div className="row end">
            <button className="primary" onClick={send} disabled={!reply.trim()}>
              Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { EditorView } from "prosemirror-view";

import type { User } from "../../shared/identity.ts";
import { createEditor, refreshComments, revealThread, selectionAnchor, selectionMarkdown } from "./editor.ts";
import { loadUser, saveUser, rememberDoc, initials } from "./identity.ts";
import { Toolbar } from "./Toolbar.tsx";
import { CommentsPanel } from "./CommentsPanel.tsx";
import type { Draft } from "./CommentsPanel.tsx";
import { HistoryPanel } from "./HistoryPanel.tsx";
import { threadsOf, findThread } from "../../shared/comments.ts";
import type { ThreadData } from "../../shared/comments.ts";

interface Peer {
  clientId: number;
  name: string;
  color: string;
  status: string | null;
  via: string;
}

export function DocPage({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(loadUser);
  const [exists, setExists] = useState<boolean | null>(null);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    fetch(`/api/docs/${id}`)
      .then((r) => setExists(r.ok))
      .catch(() => setExists(false));
  }, [id]);

  if (exists === false)
    return (
      <div className="center-page">
        <h1>No such document</h1>
        <p className="muted">
          Nothing lives at <code>/d/{id}</code>.
        </p>
        <a className="button primary" href="/">
          Go home
        </a>
      </div>
    );
  if (!user || renaming)
    return (
      <NameDialog
        initial={user?.name ?? ""}
        onSave={(name) => {
          setUser(saveUser(name));
          setRenaming(false);
        }}
        onCancel={user ? () => setRenaming(false) : undefined}
      />
    );
  if (exists === null) return <div className="center-page muted">Loading…</div>;
  return <DocEditor key={user.id} id={id} user={user} onRename={() => setRenaming(true)} />;
}

function NameDialog({ initial, onSave, onCancel }: { initial: string; onSave: (n: string) => void; onCancel?: () => void }) {
  const [name, setName] = useState(initial);
  return (
    <div className="modal-backdrop">
      <form
        className="modal name-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim());
        }}
      >
        <h2>What should others call you?</h2>
        <p className="muted">Your name appears on your cursor, your edits and your comments. People can @mention you by it.</p>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={40} />
        <div className="row end">
          {onCancel && (
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="primary" type="submit" disabled={!name.trim()}>
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}

function DocEditor({ id, user, onRename }: { id: string; user: User; onRename: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [panel, setPanel] = useState<"comments" | "history" | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [threads, setThreads] = useState<ThreadData[]>([]);
  const [linkEditing, setLinkEditing] = useState(false);

  const { ydoc, provider } = useMemo(() => {
    const ydoc = new Y.Doc();
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const provider = new WebsocketProvider(`${proto}//${location.host}/ws`, id, ydoc, {
      params: { name: user.name, color: user.color },
    });
    provider.awareness.setLocalStateField("user", { name: user.name, color: user.color, id: user.id });
    provider.awareness.setLocalStateField("via", "web");
    return { ydoc, provider };
  }, [id, user]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  // Connection, sync, presence.
  useEffect(() => {
    const onStatus = ({ status }: { status: string }) => setConnected(status === "connected");
    const onSync = (s: boolean) => s && setSynced(true);
    const onAwareness = () => {
      const list: Peer[] = [];
      const seen = new Set<string>();
      provider.awareness.getStates().forEach((state, clientId) => {
        const u = state.user as { name?: string; color?: string; id?: string } | undefined;
        if (!u?.name || clientId === provider.awareness.clientID) return;
        const key = u.id ?? u.name;
        if (seen.has(key) || key === user.id) return;
        seen.add(key);
        list.push({ clientId, name: u.name, color: u.color ?? "#888", status: (state.status as string) ?? null, via: (state.via as string) ?? "web" });
      });
      setPeers(list);
    };
    provider.on("status", onStatus);
    provider.on("sync", onSync);
    provider.awareness.on("change", onAwareness);
    return () => {
      provider.off("status", onStatus);
      provider.off("sync", onSync);
      provider.awareness.off("change", onAwareness);
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc, user.id]);

  // Threads, kept as plain data for the panel.
  useEffect(() => {
    const arr = threadsOf(ydoc);
    const read = () => setThreads(arr.toArray().map((t) => ({ ...(t.toJSON() as ThreadData) })));
    read();
    arr.observeDeep(read);
    return () => arr.unobserveDeep(read);
  }, [ydoc]);

  const openComment = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const a = selectionAnchor(view, ydoc);
    setDraft(a ? { anchor: a.anchor, quote: a.quote } : { anchor: null, quote: "" });
    setPanel("comments");
  }, [ydoc]);

  // The editor, once the document has arrived.
  useEffect(() => {
    if (!synced || !mountRef.current || viewRef.current) return;
    const view = createEditor(mountRef.current, {
      ydoc,
      awareness: provider.awareness,
      onChange: rerender,
      onThreadClick: (tid) => {
        setPanel("comments");
        setActiveThread(tid);
      },
      onLink: () => setLinkEditing(true),
      onComment: openComment,
    });
    viewRef.current = view;
    (window as unknown as { komoreView?: EditorView }).komoreView = view; // handy in devtools and tests
    view.focus();
    rerender();
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [synced, ydoc, provider, rerender, openComment]);

  useEffect(() => {
    const v = viewRef.current;
    if (v) refreshComments(v, activeThread);
  }, [activeThread]);

  // Title: the first line with words in it.
  const view = viewRef.current;
  useEffect(() => {
    if (!view) return;
    let t = "";
    view.state.doc.descendants((n) => {
      if (t) return false;
      if (n.isTextblock && n.textContent.trim()) t = n.textContent.trim();
      return !t;
    });
    if (t !== title) setTitle(t);
  });
  useEffect(() => {
    document.title = `${title || "Untitled document"} — Komore`;
    rememberDoc(id, title);
  }, [title, id]);

  const copyMarkdown = async () => {
    if (!view) return;
    const { markdown, whole } = selectionMarkdown(view.state);
    try {
      await navigator.clipboard.writeText(markdown);
      flash(whole ? "Copied the document as Markdown" : "Copied the selection as Markdown");
    } catch {
      flash("Couldn't reach the clipboard");
    }
  };

  const copyText = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(msg);
    } catch {
      flash("Couldn't reach the clipboard");
    }
  };

  const docUrl = `${location.origin}/d/${id}`;
  const inviteText = [
    `Join me in a Komore document: ${docUrl}`,
    ``,
    `Komore is a shared real-time doc where people and agents edit together. Your edits, cursor and comments appear live.`,
    `1. Install the skill (once): npx skills add digitalex/komore. It's also at ${location.origin}/SKILL.md`,
    `2. Read the protocol: npx -y github:digitalex/komore --agent-help`,
    `3. Join with a name of your own: npx -y github:digitalex/komore join ${docUrl} --name "<your name>"`,
    `Then address the open comments, and park on \`komore wait\` so I can @mention you.`,
  ].join("\n");

  const selectThread = (tid: string | null) => {
    setActiveThread(tid);
    if (!tid || !view) return;
    const t = findThread(ydoc, tid);
    const anchor = t?.get("anchor") as { from: unknown; to: unknown } | null;
    if (anchor) revealThread(view, ydoc, anchor);
  };

  const openThreads = threads.filter((t) => !t.resolved).length;

  return (
    <div className="doc-page">
      <header className="topbar">
        <a className="brand small" href="/" title="Komore home">
          <span className="brand-mark">K</span>
        </a>
        <div className="title-area">
          <div className="doc-title">{title || "Untitled document"}</div>
          <div className="doc-sub muted">
            <span className={`dot ${connected ? "on" : "off"}`} /> {connected ? "Live" : "Reconnecting…"}
          </div>
        </div>
        <div className="presence">
          {peers.map((p) => (
            <div key={p.clientId} className="avatar-wrap" title={`${p.name}${p.status ? ` — ${p.status}` : ""}${p.via === "api" ? " (via API)" : ""}`}>
              <span className="avatar" style={{ background: p.color }}>
                {initials(p.name)}
              </span>
              {p.status && <span className="status-pill" style={{ borderColor: p.color }}>{p.status}</span>}
            </div>
          ))}
          <button className="avatar-wrap me" onClick={onRename} title={`You (${user.name}) — click to rename`}>
            <span className="avatar" style={{ background: user.color }}>
              {initials(user.name)}
            </span>
          </button>
        </div>
        <div className="top-actions">
          <button className={panel === "history" ? "toggled" : ""} onClick={() => setPanel(panel === "history" ? null : "history")}>
            History
          </button>
          <button className={panel === "comments" ? "toggled" : ""} onClick={() => setPanel(panel === "comments" ? null : "comments")}>
            Comments{openThreads ? ` · ${openThreads}` : ""}
          </button>
          <button onClick={() => copyText(inviteText, "Agent instructions copied. Paste them to your agent.")}>Invite agent</button>
          <button className="primary" onClick={() => copyText(docUrl, "Link copied. Anyone with it can edit.")}>
            Share
          </button>
        </div>
      </header>

      {view && (
        <Toolbar
          view={view}
          linkEditing={linkEditing}
          setLinkEditing={setLinkEditing}
          onComment={openComment}
          onCopyMarkdown={copyMarkdown}
        />
      )}

      <div className="workspace">
        <div className="doc-scroll">
          <div className="page">
            {!synced && <div className="muted loading">Connecting…</div>}
            <div ref={mountRef} className="editor" />
          </div>
        </div>
        {panel === "comments" && (
          <CommentsPanel
            ydoc={ydoc}
            view={view}
            user={user}
            threads={threads}
            draft={draft}
            setDraft={setDraft}
            active={activeThread}
            onSelect={selectThread}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "history" && <HistoryPanel id={id} ydoc={ydoc} user={user} onClose={() => setPanel(null)} flash={flash} />}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { EditorView } from "prosemirror-view";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { MessageSquarePlus } from "lucide-react";
import { Avatar, Button, ContextMenu, Dialog, Field, Menu, ThemedIcon, Toggle, Tooltip } from "@graphical";
import { AppIcon } from "./theme/icons.tsx";
import { colorFor } from "../../shared/identity.ts";
import type { User } from "../../shared/identity.ts";
import { createEditor, refreshComments, revealThread, selectionAnchor, selectionMarkdown } from "./editor.ts";
import { loadUser, saveUser, rememberDoc, initials } from "./identity.ts";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** A person in the presence bar; their identity colour is data, not theme. */
function PersonAvatar({ name, color }: { name: string; color: string }) {
  return (
    <Avatar.Root className="person-avatar">
      <Avatar.Fallback style={{ background: color }}>{initials(name)}</Avatar.Fallback>
    </Avatar.Root>
  );
}
import { Toolbar } from "./Toolbar.tsx";
import { LinkBubble } from "./LinkBubble.tsx";
import { CommentsPanel } from "./CommentsPanel.tsx";
import type { Draft } from "./CommentsPanel.tsx";
import { HistoryPanel } from "./HistoryPanel.tsx";
import { threadsOf, findThread } from "../../shared/comments.ts";
import type { ThreadData } from "../../shared/comments.ts";
import { Brand } from "./Brand.tsx";
import { useNotify } from "./theme/ThemeRoot.tsx";

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
        <h1 className="page-title">No such document</h1>
        <p className="body-text muted">
          Nothing lives at <code>/d/{id}</code>.
        </p>
        <Button variant="primary" nativeButton={false} render={<a href="/" />}>
          Go home
        </Button>
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
  if (exists === null) return <div className="center-page body-text muted">Loading…</div>;
  return <DocEditor key={user.id} id={id} user={user} onRename={() => setRenaming(true)} />;
}

function NameDialog({ initial, onSave, onCancel }: { initial: string; onSave: (n: string) => void; onCancel?: () => void }) {
  const [name, setName] = useState(initial);
  // Without a name there is nothing to fall back to, so the dialog can't be dismissed.
  const dismissible = !!onCancel;
  return (
    <Dialog.Root open onOpenChange={(open) => !open && dismissible && onCancel?.()} disablePointerDismissal={!dismissible}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className="name-dialog">
          <form
            className="dialog-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) onSave(name.trim());
            }}
          >
            <Dialog.Title>What should others call you?</Dialog.Title>
            <Dialog.Description>
              Your name appears on your cursor, your edits and your comments. People can @mention you by it.
            </Dialog.Description>
            <Field.Root>
              <Field.Label>Name</Field.Label>
              <Field.Control autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={40} />
            </Field.Root>
            <div className="dialog-actions">
              {dismissible && (
                <Button variant="secondary" type="button" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button variant="primary" type="submit" disabled={!name.trim()}>
                Continue
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
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

  const flash = useNotify();

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
        list.push({ clientId, name: u.name, color: u.color ?? colorFor(u.name), status: (state.status as string) ?? null, via: (state.via as string) ?? "web" });
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

  const copyText = async (text: string, msg: string, detail?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(msg, detail);
    } catch {
      flash("Couldn't reach the clipboard");
    }
  };

  const docUrl = `${location.origin}/d/${id}`;
  const inviteText = [
    `Join me in a Komore document: ${docUrl}`,
    ``,
    `Komore is a shared real-time doc where people and agents edit together. Your edits, cursor and comments appear live.`,
    `1. Install the skill (once): npx skills add digitalex/komore --skill komore. It's also at ${location.origin}/SKILL.md`,
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
        <Brand compact />
        <div className="title-area">
          <div className="doc-title">{title || "Untitled document"}</div>
          <div className="doc-sub">
            <span className={`dot ${connected ? "on" : "off"}`} aria-hidden="true" /> {connected ? "Live" : "Reconnecting…"}
          </div>
        </div>
        <div className="presence" aria-label="People here">
          {peers.map((p) => (
            <div key={p.clientId} className="presence-item">
              <Tooltip.Root>
                <BaseTooltip.Trigger
                  className="presence-trigger"
                  aria-label={`${p.name}${p.status ? `: ${p.status}` : ""}`}
                >
                  <PersonAvatar name={p.name} color={p.color} />
                </BaseTooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner sideOffset={8}>
                    <Tooltip.Popup>
                      {p.name}
                      {p.status ? ` — ${p.status}` : ""}
                      {p.via === "api" ? " (via API)" : ""}
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
              {p.status && (
                <span className="status-pill">
                  <span className="dot" style={{ background: p.color }} aria-hidden="true" />
                  {p.status}
                </span>
              )}
            </div>
          ))}
          <Tooltip.Root>
            <BaseTooltip.Trigger className="presence-trigger me" onClick={onRename} aria-label={`You (${user.name}). Rename`}>
              <PersonAvatar name={user.name} color={user.color} />
            </BaseTooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner sideOffset={8}>
                <Tooltip.Popup>You ({user.name}). Click to rename</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
        <div className="top-actions">
          <Toggle pressed={panel === "history"} onPressedChange={(on) => setPanel(on ? "history" : null)}>
            History
          </Toggle>
          <Toggle pressed={panel === "comments"} onPressedChange={(on) => setPanel(on ? "comments" : null)}>
            Comments{openThreads ? ` · ${openThreads}` : ""}
          </Toggle>
          <Button variant="secondary" onClick={() => copyText(inviteText, "Agent instructions copied", "Paste them to your agent.")}>
            Invite agent
          </Button>
          <Button variant="primary" onClick={() => copyText(docUrl, "Link copied", "Anyone with it can edit.")}>
            Share
          </Button>
        </div>
      </header>

      {view && (
        <div className="toolbar-row">
        <Toolbar
          view={view}
          linkEditing={linkEditing}
          setLinkEditing={setLinkEditing}
          onComment={openComment}
          onCopyMarkdown={copyMarkdown}
        />
        </div>
      )}

      <div className="workspace">
        <div className="doc-scroll">
          {/* Right-click on selected text offers to comment on it. With nothing
              selected the browser's own menu (spelling, paste) is left alone. */}
          <ContextMenu.Root>
            <BaseContextMenu.Trigger
              className="page"
              onContextMenuCapture={(e) => {
                if (!view || view.state.selection.empty) e.stopPropagation();
              }}
            >
              {!synced && <div className="body-text muted loading">Connecting…</div>}
              <div ref={mountRef} className="editor" />
              {view && !linkEditing && <LinkBubble view={view} />}
            </BaseContextMenu.Trigger>
            <ContextMenu.Portal>
              <ContextMenu.Positioner>
                <ContextMenu.Popup finalFocus={false}>
                  <ContextMenu.Item onClick={openComment}>
                    <Menu.ItemContent icon={<AppIcon icon={MessageSquarePlus} />} shortcut={isMac ? "⌘⌥M" : "Ctrl+Alt+M"}>
                      Comment
                    </Menu.ItemContent>
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    onClick={() => {
                      copyMarkdown();
                      view?.focus();
                    }}
                  >
                    <Menu.ItemContent icon={<ThemedIcon name="copy" semantic />}>Copy as Markdown</Menu.ItemContent>
                  </ContextMenu.Item>
                </ContextMenu.Popup>
              </ContextMenu.Positioner>
            </ContextMenu.Portal>
          </ContextMenu.Root>
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
    </div>
  );
}

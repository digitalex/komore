// Comment threads live inside the document's Y.Doc (array "threads"), so they
// sync in real time like the text and need no second channel. The browser
// writes them directly; the server writes them for API callers. Both use
// these helpers so the shape never drifts.
import * as Y from "yjs";
import type { User } from "./identity.ts";

export interface Message {
  id: string;
  author: User;
  body: string;
  ts: number;
}

export interface ThreadData {
  id: string;
  /** Yjs relative positions (JSON) bracketing the commented text, or null for a doc-level comment. */
  anchor: { from: unknown; to: unknown } | null;
  /** The text that was selected when the thread started. */
  quote: string;
  author: User;
  createdAt: number;
  resolved: boolean;
  messages: Message[];
}

export const THREADS = "threads";

export function threadsOf(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray<Y.Map<unknown>>(THREADS);
}

export function readThread(t: Y.Map<unknown>): ThreadData {
  const msgs = t.get("messages") as Y.Array<Message> | undefined;
  return {
    id: t.get("id") as string,
    anchor: (t.get("anchor") as ThreadData["anchor"]) ?? null,
    quote: (t.get("quote") as string) ?? "",
    author: t.get("author") as User,
    createdAt: (t.get("createdAt") as number) ?? 0,
    resolved: !!t.get("resolved"),
    messages: msgs ? msgs.toArray() : [],
  };
}

export function findThread(doc: Y.Doc, id: string): Y.Map<unknown> | undefined {
  return threadsOf(doc).toArray().find((t) => t.get("id") === id);
}

/** Must be called inside a transaction on `doc`. */
export function createThread(doc: Y.Doc, init: Omit<ThreadData, "messages" | "resolved">, first: Message): Y.Map<unknown> {
  const t = new Y.Map<unknown>();
  threadsOf(doc).push([t]);
  t.set("id", init.id);
  t.set("anchor", init.anchor);
  t.set("quote", init.quote);
  t.set("author", init.author);
  t.set("createdAt", init.createdAt);
  t.set("resolved", false);
  const msgs = new Y.Array<Message>();
  t.set("messages", msgs);
  msgs.push([first]);
  return t;
}

export function addMessage(t: Y.Map<unknown>, m: Message): void {
  (t.get("messages") as Y.Array<Message>).push([m]);
}

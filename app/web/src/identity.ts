import { makeUser } from "../../shared/identity.ts";
import type { User } from "../../shared/identity.ts";

const KEY = "komore.user";
const RECENT = "komore.recent";

export function loadUser(): User | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return raw?.name ? makeUser(raw.name, raw.color) : null;
  } catch {
    return null;
  }
}

export function saveUser(name: string, color?: string): User {
  const u = makeUser(name, color);
  try {
    localStorage.setItem(KEY, JSON.stringify({ name: u.name, color: u.color }));
  } catch {
    /* private mode */
  }
  return u;
}

export interface Recent {
  id: string;
  title: string;
  ts: number;
}

export function recentDocs(): Recent[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT) ?? "[]");
  } catch {
    return [];
  }
}

export function rememberDoc(id: string, title: string): void {
  try {
    const list = recentDocs().filter((r) => r.id !== id);
    list.unshift({ id, title, ts: Date.now() });
    localStorage.setItem(RECENT, JSON.stringify(list.slice(0, 30)));
  } catch {
    /* ignore */
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

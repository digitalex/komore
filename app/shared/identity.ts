// Users. There is one kind: a name and a colour. Whoever is behind it — a
// person in the browser or an agent on the CLI — is nobody's business but
// theirs. The id is derived from the name, so the same name is the same user
// wherever it shows up.

export interface User {
  id: string;
  name: string;
  color: string;
}

export const USER_COLORS = [
  "#e8710a", "#1a73e8", "#188038", "#d01884", "#9334e6",
  "#00796b", "#c5221f", "#b06000", "#3949ab", "#5f6368",
];

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function cleanName(name: unknown): string {
  return String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
}

export function userIdFor(name: string): string {
  return "u_" + fnv1a(cleanName(name).toLowerCase()).toString(36);
}

export function colorFor(name: string): string {
  return USER_COLORS[fnv1a(cleanName(name).toLowerCase()) % USER_COLORS.length];
}

export function makeUser(name: string, color?: string | null): User {
  const n = cleanName(name);
  const c = color && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : colorFor(n);
  return { id: userIdFor(n), name: n, color: c };
}

/** Does `body` @-mention `name`? Names may contain spaces; `@all` mentions everyone. */
export function mentions(body: string, name: string): boolean {
  const lower = body.toLowerCase();
  const re = (n: string) => new RegExp(`(^|[^\\w@])@${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "i");
  return re(cleanName(name).toLowerCase()).test(lower) || re("all").test(lower);
}

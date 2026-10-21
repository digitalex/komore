// The theme document the app renders with: the captured Graphical theme
// (components/graphical/theme.ts, kept byte-for-byte as delivered) plus one
// app-level asset decision — the font fallback.
//
// The theme selects GT Standard (licensed, Grilli Type). Its files aren't in
// this project, and the free fallback Timeless Grotesk was chosen instead.
// Per the asset guide the licensed family stays first and the fallback is
// inserted right after it, ahead of the system stack:
//
//   "GT Standard L", "Timeless Grotesk", -apple-system, BlinkMacSystemFont, sans-serif
//
// Adding licensed GT Standard webfonts later needs no change here: register
// them in fonts.css and the browser picks the first family that loads.
import { theme, type ThemeDocument } from "@graphical";

export const FONT_FALLBACK = '"Timeless Grotesk"';

/** Insert the fallback family after the first (licensed) family of a stack. */
export function withFontFallback(stack: string): string {
  if (stack.includes(FONT_FALLBACK)) return stack;
  const comma = stack.indexOf(",");
  return comma < 0 ? `${stack}, ${FONT_FALLBACK}` : `${stack.slice(0, comma)}, ${FONT_FALLBACK}${stack.slice(comma)}`;
}

const fonts = Object.fromEntries(
  Object.entries(theme.theme.fonts).map(([role, font]) => [role, { ...font, family: withFontFallback(font.family) }]),
) as typeof theme.theme.fonts;

export const appTheme: ThemeDocument = { ...theme, theme: { ...theme.theme, fonts } };

/** The visible name of the theme (document.name). Internal identities stay untouched. */
export const themeDisplayName = theme.name;

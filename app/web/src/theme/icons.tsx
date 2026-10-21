// Icon adapter. The theme selects Central (outlined), a licensed pack whose
// artwork isn't in this project; Lucide is the chosen free fallback.
//
// Every icon in the app goes through this file, so restoring Central later
// means changing only this file: license Central at https://iconists.co/central,
// add its artwork to the project, and point `renderThemeIcon` and `AppIcon` at it.
import type { SVGProps } from "react";
import {
  Archive, ArrowDownToLine, ArrowRight, ArrowUp, Award, Bell, Bold, BookOpen, Bookmark,
  CalendarDays, CalendarPlus, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight,
  Copy, CreditCard, Download, FilePlus, FileText, Folder, FolderOpen, Gift, Globe, House,
  Inbox, Info, Italic, ListOrdered, LoaderCircle, Mailbox, MapPin, Minus, Package,
  PanelLeft, Paperclip, Pause, Pencil, Play, Plus, Printer, Redo2, Save, Search, Settings,
  ShieldCheck, ShoppingBag, SlidersHorizontal, Stamp, Tag, Timer, Trash2, TrendingUp, Truck,
  Underline, Undo2, UsersRound, X,
  type LucideIcon,
} from "lucide-react";
import type { ThemeIconName, ThemeIconRenderProps } from "@graphical";

/** The bundled components' semantic icon names, each mapped to its Lucide glyph. */
const THEME_ICONS: Record<ThemeIconName, LucideIcon> = {
  home: House, folder: Folder, team: UsersRound, settings: Settings, inboxTray: Inbox,
  shoppingBag: ShoppingBag, gift: Gift, creditCard: CreditCard, award: Award, pause: Pause,
  play: Play, bookmark: Bookmark, arrowRight: ArrowRight, archive: Archive, inbox: ArrowDownToLine,
  adjust: SlidersHorizontal, document: FileText, search: Search, paperclip: Paperclip, bell: Bell,
  trash: Trash2, stamp: Stamp, globe: Globe, pencil: Pencil, mailbox: Mailbox,
  panelLeft: PanelLeft, check: Check, chevronDown: ChevronDown, chevronLeft: ChevronLeft,
  chevronRight: ChevronRight, minus: Minus, plus: Plus, close: X, info: Info, bold: Bold,
  italic: Italic, underline: Underline, copy: Copy, download: Download, filePlus: FilePlus,
  folderOpen: FolderOpen, printer: Printer, save: Save, undo: Undo2, redo: Redo2, arrowUp: ArrowUp,
  calendarPlus: CalendarPlus, calendarDays: CalendarDays, mapPin: MapPin, tag: Tag,
  package: Package, truck: Truck, listOrdered: ListOrdered, loader: LoaderCircle, timer: Timer,
  bookOpen: BookOpen, checkCheck: CheckCheck, shieldCheck: ShieldCheck, trendingUp: TrendingUp,
};

/** Lucide ships outlines only, which matches the selected "outlined" style. */
const LUCIDE_ATTRS = { "data-icon-family": "Lucide", "data-icon-style": "outlined", strokeWidth: "var(--icon-stroke-width, 2)" } as const;

/**
 * IconRendererProvider callback. Forwards every SVG prop — including `style`,
 * which carries size and the icon-weight variables — and the accessibility
 * attributes the component supplied.
 */
export function renderThemeIcon({ name, family: _family, variant: _variant, weight: _weight, ...svgProps }: ThemeIconRenderProps) {
  const Icon = THEME_ICONS[name];
  if (!Icon) return undefined;
  return <Icon {...LUCIDE_ATTRS} {...svgProps} />;
}

/**
 * App-specific glyphs (link, comment, history…) beyond the components' set.
 * Decorative by default: the owning control carries the accessible name.
 */
export function AppIcon({ icon: Icon, size = "1em", ...props }: SVGProps<SVGSVGElement> & { icon: LucideIcon; size?: number | string }) {
  return <Icon aria-hidden="true" {...LUCIDE_ATTRS} size={size} {...(props as object)} />;
}

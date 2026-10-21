# GUI — Untitled design language

This file contains the saved theme and instructions for using it. The **Theme values** sections are readable, editable JSON and can restore the theme in Graphical. The accompanying `gui/` references describe component structure, behavior, and resolved styles; `skills/` contains workflows for using them. The full-component selection also includes Graphical’s actual themed component source and runtime. The default theme-and-skills selection includes guidance only and adds no runtime source or dependencies.

## Start here

Keep `GUI.md` and `gui/` at the project root. The install command puts the three skills in `.agents/skills/`; for a ZIP, copy the folders from `skills/` there, preserving existing files and local edits. Add this pointer to the project’s active agent instructions without replacing them: “For UI work, follow GUI.md and use graphical-ui, graphical-convert, or graphical-audit as appropriate.” Agents with other conventions can read these files directly.

Inspect the app’s styling, shared components, and consumers before making changes. Honor the selected setup recorded below and any scope the user already gave. Otherwise ask once: **“How would you like to apply this theme?”**

- **Convert the whole app:** update shared components and their usage across screens.
- **Convert selected areas:** establish the pages or components and contain shared changes using the app’s existing mechanisms.
- **Keep the current UI:** install the guidance and instruction pointer, then stop without changing styles or runtime dependencies.

Wait for a missing scope choice before changing application styles. A component request does not authorize whole-app conversion. These rules apply equally to prompt, terminal, and ZIP setup.

## Apply the theme

Use `graphical-convert` for existing UI, including its shadcn mapping when relevant. Use `graphical-ui` for new UI and future interface edits, even when the user does not mention Graphical. New screens use the current design system by default.

Implement the chosen scope in the app’s existing styling system and shared components. Use the values below, [foundations](gui/foundations.md), and each relevant [component specification](gui/components.md). Preserve authored component edits across parts, variants, sizes, states, modes, and portals. Global tokens alone do not complete conversion; an approximate preset or unchanged library defaults do not replace the supplied specifications.

Preserve content, behavior, routing, public component APIs, and intentional local customizations. After deliberate customization, the app’s active definitions take precedence over this downloaded snapshot. Preserve dependency versions, ranges, overrides, and lockfiles. Add only missing packages using the project’s package manager and version policy; verify APIs against installed versions and report incompatibilities instead of silently migrating dependencies.

### Set up all Base UI components

An explicit request for all Base UI components, including a recorded selection below, authorizes theme conversion, asset setup, and reusable modules across the existing app. Proceed without another scope question, honoring any narrower scope already supplied.

Integrate the bundled Graphical components and theme runtime; use their actual source rather than reconstructing the library from specifications. Import the bundled stylesheet, connect the theme provider to the supplied document and the app’s active color mode, and expose usable component imports. Reuse or adapt compatible existing shared components without discarding their public APIs or behavior. Use the [component specifications](gui/components.md) to verify the selected edits and [Base UI guidance](gui/base-ui.md) for integration. Check the receiving version’s [official catalog](https://base-ui.com/llms.txt) for additional primitives; use the same foundations where source is not supplied and disclose that coverage gap. Installing source files or dependencies alone does not complete setup until the components and existing app use the selected theme.

The source lives in `components/graphical/`. Import components, `GraphicalProvider`, and `theme` through its `index.ts`; `theme.ts` contains the captured document with the user’s component customizations. Import `components/graphical/styles.css` once at the framework’s supported stylesheet entry. Wrap the intended scope with `GraphicalProvider document={theme} colorMode={colorMode}`, using the app’s real light/dark state. Keep the bundled shared runtime with the components so their resolver, motion, and portal behavior remain connected. Configure the selected icons with `IconRendererProvider` under [Base UI integration](gui/base-ui.md), and fonts with the app’s loader; artwork and font files are not included. Do not silently leave Lucide active when a different free pack was selected.

Add only missing `@base-ui/react`, `motion`, and `lucide-react` packages required by the bundled source, using the receiving project’s package manager and version policy. Preserve its installed framework, React, dependency ranges, overrides, and lockfile decisions. Adapt source to supported APIs or report concrete incompatibilities; do not silently replace package versions. Install the selected fonts and icon pack separately under the asset instructions below. Guidance-only installation adds none of these runtime dependencies.

Before running an install command, check the receiving app’s installed APIs and dependency constraints. The supplied runtime uses React 19 context/provider and ref APIs and is verified against Base UI 1.7; this is a compatibility baseline, not a version-pinning requirement. Existing React 18 apps need compatible context/provider and ref-forwarding adaptations, or a concrete blocker report. Never upgrade existing dependencies automatically to make the source work.

## Rules for UI work

- Locate the active theme, mode, shared components, and nearby patterns first. Use existing tokens or verified aliases; report missing choices instead of inventing theme values. Keep named references at use sites and literals in token definitions. Typography includes family, weight, size, line height, and letter spacing.
- Reuse components and variants, then compose available primitives. New components fill missing capabilities using existing tokens. Consolidate equivalent roles without changing established values unless requested.
- Keep interfaces minimal: useful titles, content, and actions; no decorative eyebrows, filler subtitles, slogans, or redundant explanations. Default wrapping text to `text-wrap: pretty`.
- Treat grid tracks, breakpoints, content widths, aspect ratios, and positioning as structural choices. Preserve meaningful data encodings and external widgets in context.
- Preserve keyboard focus, labels, form values, interaction states, and theme propagation into portals. Use composed box shadows for edges with zero native border width, retaining opacity and the theme’s stroke placement.
- Fonts and icon artwork are acquired separately. Follow the selected assets and official links below. Preserve font names, weights, fallback stacks, and icon style/weight. Use licensed files when supplied; ask for missing files or their location before a fallback decision, honoring an existing answer. Use the documented free fallback only for unavailable paid selections, disclose substitutions, and explain how to restore licensed assets. System fonts need no download; report unresolved or gated sources without silently substituting.

## Verify and hand off

Finish conversion with `graphical-audit`: find and fix gaps within the agreed scope. Report each component as converted, already matches, intentionally preserved, or blocked, with evidence or a reason. For full library setup, also list module import paths and catalog coverage. Report actual checks, substitutions, and remaining gaps; source inspection alone does not establish rendered equivalence. Follow the receiving project’s testing and browser-review policy. A small edit does not trigger an app-wide audit.

## Focused references

| Need                                                   | Read                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| Token ownership, aliases, and deliberate theme changes | [Theme contract](gui/theme-contract.md)                                   |
| Hierarchy, composition, navigation, and controls       | [Interface judgment](gui/interface-judgment.md)                           |
| Colors, typography, spacing, effects, and motion       | [Foundations](gui/foundations.md)                                         |
| Asset installation and licensed fallbacks              | [Font and icon setup](gui/assets.md)                                      |
| Component anatomy, assignments, states, and modes      | [Component specifications](gui/components.md)                             |
| Primitives and existing libraries                      | [Base UI](gui/base-ui.md) · [Custom components](gui/custom-components.md) |
| Resolved CSS variables and component assignments       | [Theme references](gui/themes.md)                                         |
| Proportional checks                                    | [Verification](gui/verification.md)                                       |

| Task                                    | Skill               |
| --------------------------------------- | ------------------- |
| Build or edit UI with the current theme | `graphical-ui`      |
| Apply this theme to existing UI         | `graphical-convert` |
| Find and repair theme drift             | `graphical-audit`   |


## Selected setup for this download

The user selected **Install theme, skills, and all Base UI components**. The actual preview components, shared styling runtime, stylesheet, and current theme snapshot are included in `components/graphical/`. Use these files directly; do not recreate them from specifications. Follow [the component setup guide](gui/base-ui.md): import `components/graphical/styles.css` once, wrap the app with `GraphicalProvider` using the exported `theme`, and use the public components from `components/graphical/index.ts`. Apply the theme across existing app styles and components, preserving behavior and authored refinements. This is an explicit setup request: proceed without another conversion-scope question, honoring any narrower scope already supplied. Add only missing dependencies with the receiving package manager; preserve existing versions and report API incompatibilities. Install the chosen fonts and icons separately. Report component coverage, import paths, actual verification, and any visual or asset gaps. Copying files or installing Base UI alone is not completion.

## Fonts and icons

Follow [asset installation](gui/assets.md) when implementing this theme. Download and configure the selected free assets from their official sources; no font files or icon artwork are bundled. Weights below are the authored requests: load matching static faces or a variable range and report any unavailable weight. Register the exact family aliases below, or map the role tokens to the loader’s actual family.

| Selected font | Roles | Weights | Family stack | Setup |
| --- | --- | --- | --- | --- |
| <code>GT Standard</code> (paid) | brand, ui, editorial, data | 400, 500, 600 | <code>"GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif</code> | Reuse supplied licensed webfonts. If missing, ask the user to share their files or identify their location, naming the free fallback below that will be used if unavailable. Honor an existing answer; use that fallback when the user has no files or chooses it. Follow [font guidance](gui/assets.md) and explain how to add [GT Standard](https://www.grillitype.com/shops/gt-standard) later. |

### Free fallbacks for unavailable paid fonts

Ask for missing licensed webfont files or their location before choosing these fallbacks, unless the user has already said the files are unavailable or chosen a fallback. Explain the named fallback for each affected role and continue independent work while an answer is pending. Install these only for the listed paid selections. Keep the paid family first, insert the installed free family before generic/system fallbacks, and preserve the authored weights. Leave other selected free families in place. Tell the user which fallback is active, link the vendor above, and explain where to add licensed webfont files and their font declarations to restore the selection.

| Paid selection | Roles | Free fallback | Weights | Fallback family stack | Setup |
| --- | --- | --- | --- | --- | --- |
| <code>GT Standard</code> | brand, ui, editorial, data | <code>Timeless Grotesk</code> | 400, 500, 600 | <code>"Timeless Grotesk", sans-serif</code> | Download and load [Timeless Grotesk](https://timeless.co/type) in the app. Use the vendor’s Grotesk cut; if using Timeless Sans variable files, pin STYL to 0, with ital 0 for upright or 100 for required italic faces. |

### Icons

Selected: [Central](https://iconists.co/central), outlined. Use the user’s licensed Central artwork if supplied under the [vendor license](https://iconists.co/license). If missing, ask the user to share their licensed icon files or identify their location, explaining that Lucide is the free fallback. Honor an existing answer and continue independent work while waiting. When the user confirms the files are unavailable or chooses the fallback, install [Lucide](https://lucide.dev/guide/react/getting-started) (React: <code>lucide-react</code>) and wire it into the app’s icon adapter. Tell the user that Lucide is active and that they can license Central at the vendor link, download its icon files, give the agent their location, and update that adapter to restore Central.

Preserve icon size, color, weight, style, and accessible names. Match the selected style only where the pack supports it; Lucide’s official pack supplies outlines, so report a filled-style gap rather than claiming exact filled artwork. Keep existing package versions and add only missing packages using the receiving project’s package manager.

## Theme values

These sections contain the complete saved theme: both color modes, foundation values, and authored component edits. Import this GUI.md from Theme → Edit → Import theme to restore it. Shared palette catalogs and editor preferences are not part of the theme.

Lengths are pixels, letter spacing is em, motion durations are milliseconds, and opacity values are percentages. Text sizes, line heights, spacing, and radii render at the nearest whole pixel; the saved precision below preserves editing values. Color translucency defaults to 20% when omitted. Component edits use named tokens; the companion component specifications resolve inherited styles and behavior.

<!-- graphical-theme:start -->

### Identity

```json
{
  "format": "graphical-theme",
  "version": 1,
  "preset": "atlas",
  "schemaVersion": 2,
  "name": "Untitled"
}
```

### Colors

```json
{
  "colors": {
    "dark": {
      "error": "#fc032d",
      "color-1": "#00b7c4",
      "color-2": "#094b58",
      "color-3": "#ffb579",
      "color-4": "#c1f3ed",
      "success": "#00906c",
      "warning": "#ffea00",
      "neutral-1": "#000000",
      "neutral-2": "#202020",
      "neutral-3": "#2b2b2b",
      "neutral-4": "#3d3d3d",
      "neutral-5": "#565656",
      "neutral-6": "#838383",
      "neutral-7": "#ababab",
      "neutral-8": "#cfcfcf",
      "neutral-9": "#f4f4f4",
      "neutral-10": "#ffffff"
    },
    "light": {
      "error": "#fc032d",
      "color-1": "#00b7c4",
      "color-2": "#094b58",
      "color-3": "#ffb579",
      "color-4": "#c1f3ed",
      "success": "#00906c",
      "warning": "#ffea00",
      "neutral-1": "#ffffff",
      "neutral-2": "#fbfbfb",
      "neutral-3": "#f4f4f4",
      "neutral-4": "#e7e7e7",
      "neutral-5": "#cdcdcd",
      "neutral-6": "#a1a1a1",
      "neutral-7": "#7d7d7d",
      "neutral-8": "#555555",
      "neutral-9": "#333333",
      "neutral-10": "#000000"
    }
  },
  "primaryForeground": { "dark": "neutral-2", "light": "neutral-2" },
  "primaryActionColor": "neutral-10",
  "neutralTone": "neutral",
  "colorEmphasis": 37,
  "keyColorPalette": [
    "#ff5a00",
    "#ff9800",
    "#cf9148",
    "#d4b441",
    "#ffea00",
    "#abff5a",
    "#6dcc00",
    "#00c853",
    "#00906c",
    "#085e55",
    "#00b7c4",
    "#00e1f3",
    "#00afe8",
    "#0088ff",
    "#07376b",
    "#242424",
    "#5151fc",
    "#5100c0",
    "#a34cf3",
    "#e82cf2",
    "#ff6fff",
    "#ffc0ff",
    "#ff2c9c",
    "#ff2863",
    "#fc032d"
  ]
}
```

### Typography

```json
{
  "fonts": {
    "ui": {
      "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": { "heavy": 600, "medium": 500, "regular": 400 }
    },
    "data": {
      "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": { "heavy": 600, "medium": 500, "regular": 400 }
    },
    "brand": {
      "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": { "heavy": 600, "medium": 500, "regular": 400 }
    },
    "editorial": {
      "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": { "heavy": 600, "medium": 500, "regular": 400 }
    }
  },
  "text": {
    "l": { "size": 23.28, "lineHeight": 31.04 },
    "m": { "size": 15.52, "lineHeight": 23.28 },
    "s": { "size": 13.58, "lineHeight": 19.4 },
    "xl": { "size": 34.92, "lineHeight": 38.8 },
    "xs": { "size": 11.64, "lineHeight": 15.52 },
    "xxl": { "size": 46.56, "lineHeight": 50.44 },
    "xxs": { "size": 9.7, "lineHeight": 13.58 }
  },
  "letterSpacing": { "l": 0.01, "m": 0, "s": -0.01, "xl": 0.02, "xs": -0.02 }
}
```

### Spacing and corners

```json
{
  "spacing": {
    "l": 22.116,
    "m": 14.744,
    "s": 11.058,
    "xl": 29.488,
    "xs": 7.372,
    "xxl": 44.232,
    "xxs": 3.686,
    "zero": 0
  },
  "radius": {
    "l": 16.96,
    "m": 10.96,
    "s": 6.96,
    "xl": 26.96,
    "xs": 3.48,
    "full": 9999,
    "zero": 0
  },
  "buttonRadius": "s"
}
```

### Borders and effects

```json
{
  "border": { "l": 0, "m": 0, "s": 0, "none": 0 },
  "shadows": {
    "l": {
      "x": 0,
      "y": 16,
      "blur": 48,
      "color": { "dark": "neutral-1", "light": "neutral-10" },
      "spread": 0,
      "opacity": 0
    },
    "m": {
      "x": 0,
      "y": 8,
      "blur": 24,
      "color": { "dark": "neutral-1", "light": "neutral-10" },
      "spread": 0,
      "opacity": 12
    },
    "s": {
      "x": 0,
      "y": 2,
      "blur": 4,
      "color": { "dark": "neutral-1", "light": "neutral-10" },
      "spread": 0,
      "opacity": 0
    }
  }
}
```

### Motion

```json
{
  "animation": {
    "large": { "easing": [ 0.22, 1, 0.36, 1 ], "duration": 360 },
    "easing": [ 0.16, 1, 0.3, 1 ],
    "duration": 200,
    "popupScale": 0.96,
    "pressDistance": 1
  }
}
```

### Icons

No separate icon weight is set; icons follow the surrounding text weight.

```json
{ "iconFamily": "Central", "iconStyle": "outlined" }
```

### Component edits

```json
{
  "componentTokens": {
    "button:ghost:rest": { "paddingX": "l", "paddingTop": "s", "paddingBottom": "s" },
    "button:danger:rest": { "paddingX": "l", "paddingTop": "s", "paddingBottom": "s" },
    "input:default:rest": {
      "paddingX": "m",
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "button:outline:rest": { "paddingX": "l", "paddingTop": "s", "paddingBottom": "s" },
    "button:primary:rest": { "paddingX": "l", "paddingTop": "s", "paddingBottom": "s" },
    "select:default:rest": {
      "paddingX": "m",
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "button:secondary:rest": { "paddingX": "l", "paddingTop": "s", "paddingBottom": "s" },
    "combobox:default:rest": {
      "paddingX": "m",
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "menu:default:part:option:rest": {
      "paddingX": "xs",
      "paddingTop": "xs",
      "paddingLeft": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs"
    },
    "slider:default:part:thumb:rest": { "controlSize": "l" },
    "slider:default:part:track:rest": { "controlSize": "xl" },
    "switch:default:part:control:rest": { "controlSize": "xl" },
    "combobox:default:part:option:rest": {
      "paddingX": "xs",
      "paddingTop": "xs",
      "paddingLeft": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs"
    },
    "menu:default:part:option:selected": {
      "paddingX": "xs",
      "paddingTop": "xs",
      "paddingLeft": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs"
    },
    "otp-field:default:part:input:rest": {
      "paddingX": "s",
      "paddingTop": "xs",
      "paddingLeft": "s",
      "paddingRight": "s",
      "paddingBottom": "xs"
    },
    "checkbox:default:part:control:rest": { "controlSize": "l" },
    "autocomplete:default:part:input:rest": {
      "paddingX": "s",
      "paddingTop": "s",
      "paddingLeft": "s",
      "paddingRight": "s",
      "paddingBottom": "s"
    },
    "autocomplete:default:part:option:rest": {
      "paddingX": "xs",
      "paddingTop": "xs",
      "paddingLeft": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs"
    },
    "combobox:default:part:option:selected": {
      "paddingX": "xs",
      "paddingTop": "xs",
      "paddingLeft": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs"
    },
    "autocomplete:default:part:popover:rest": { "radius": "s" },
    "autocomplete:default:part:option:selected": {
      "paddingX": "xs",
      "paddingTop": "xs",
      "paddingLeft": "xs",
      "paddingRight": "xs",
      "paddingBottom": "xs"
    }
  },
  "componentVariants": {}
}
```

<!-- graphical-theme:end -->

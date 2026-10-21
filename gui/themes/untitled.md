# Untitled

Generated from the current project, including edits awaiting autosave. Return to the [theme index](../themes.md). Install the selected fonts and icons using the setup below; assets are acquired separately from their official sources.

## Font and icon setup

Follow [asset installation](../assets.md) when implementing this theme. Download and configure the selected free assets from their official sources; no font files or icon artwork are bundled. Weights below are the authored requests: load matching static faces or a variable range and report any unavailable weight. Register the exact family aliases below, or map the role tokens to the loader’s actual family.

| Selected font | Roles | Weights | Family stack | Setup |
| --- | --- | --- | --- | --- |
| <code>GT Standard</code> (paid) | brand, ui, editorial, data | 400, 500, 600 | <code>"GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif</code> | Reuse supplied licensed webfonts. If missing, ask the user to share their files or identify their location, naming the free fallback below that will be used if unavailable. Honor an existing answer; use that fallback when the user has no files or chooses it. Follow [font guidance](../assets.md) and explain how to add [GT Standard](https://www.grillitype.com/shops/gt-standard) later. |

### Free fallbacks for unavailable paid fonts

Ask for missing licensed webfont files or their location before choosing these fallbacks, unless the user has already said the files are unavailable or chosen a fallback. Explain the named fallback for each affected role and continue independent work while an answer is pending. Install these only for the listed paid selections. Keep the paid family first, insert the installed free family before generic/system fallbacks, and preserve the authored weights. Leave other selected free families in place. Tell the user which fallback is active, link the vendor above, and explain where to add licensed webfont files and their font declarations to restore the selection.

| Paid selection | Roles | Free fallback | Weights | Fallback family stack | Setup |
| --- | --- | --- | --- | --- | --- |
| <code>GT Standard</code> | brand, ui, editorial, data | <code>Timeless Grotesk</code> | 400, 500, 600 | <code>"Timeless Grotesk", sans-serif</code> | Download and load [Timeless Grotesk](https://timeless.co/type) in the app. Use the vendor’s Grotesk cut; if using Timeless Sans variable files, pin STYL to 0, with ital 0 for upright or 100 for required italic faces. |

### Icons

Selected: [Central](https://iconists.co/central), outlined. Use the user’s licensed Central artwork if supplied under the [vendor license](https://iconists.co/license). If missing, ask the user to share their licensed icon files or identify their location, explaining that Lucide is the free fallback. Honor an existing answer and continue independent work while waiting. When the user confirms the files are unavailable or chooses the fallback, install [Lucide](https://lucide.dev/guide/react/getting-started) (React: <code>lucide-react</code>) and wire it into the app’s icon adapter. Tell the user that Lucide is active and that they can license Central at the vendor link, download its icon files, give the agent their location, and update that adapter to restore Central.

Preserve icon size, color, weight, style, and accessible names. Match the selected style only where the pack supports it; Lucide’s official pack supplies outlines, so report a filled-style gap rather than claiming exact filled artwork. Keep existing package versions and add only missing packages using the receiving project’s package manager.

## Foundations

These foundations describe the captured theme resolved by the bundled GraphicalProvider. The name below is document.theme.name, an internal style identity used by the components; displayName is the project’s visible name. Preserve it and the provider’s resolved --theme-name even when they differ from each other or from the project’s display name. Use document.name for visible labels.

```json
{
  "name": "Atlas",
  "text": {
    "l": {
      "size": 23,
      "lineHeight": 31
    },
    "m": {
      "size": 16,
      "lineHeight": 23
    },
    "s": {
      "size": 14,
      "lineHeight": 19
    },
    "xl": {
      "size": 35,
      "lineHeight": 39
    },
    "xs": {
      "size": 12,
      "lineHeight": 16
    },
    "xxl": {
      "size": 47,
      "lineHeight": 50
    },
    "xxs": {
      "size": 10,
      "lineHeight": 14
    }
  },
  "fonts": {
    "ui": {
      "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": {
        "heavy": 600,
        "medium": 500,
        "regular": 400
      }
    },
    "data": {
      "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": {
        "heavy": 600,
        "medium": 500,
        "regular": 400
      }
    },
    "brand": {
      "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": {
        "heavy": 600,
        "medium": 500,
        "regular": 400
      }
    },
    "editorial": {
      "family": "\"GT Standard L\", -apple-system, BlinkMacSystemFont, sans-serif",
      "weights": {
        "heavy": 600,
        "medium": 500,
        "regular": 400
      }
    }
  },
  "border": {
    "l": 0,
    "m": 0,
    "s": 0,
    "none": 0
  },
  "radius": {
    "l": 17,
    "m": 11,
    "s": 7,
    "xl": 27,
    "xs": 3,
    "full": 9999,
    "zero": 0
  },
  "shadows": {
    "l": {
      "x": 0,
      "y": 16,
      "blur": 48,
      "color": {
        "dark": "neutral-1",
        "light": "neutral-10"
      },
      "spread": 0,
      "opacity": 0
    },
    "m": {
      "x": 0,
      "y": 8,
      "blur": 24,
      "color": {
        "dark": "neutral-1",
        "light": "neutral-10"
      },
      "spread": 0,
      "opacity": 12
    },
    "s": {
      "x": 0,
      "y": 2,
      "blur": 4,
      "color": {
        "dark": "neutral-1",
        "light": "neutral-10"
      },
      "spread": 0,
      "opacity": 0
    }
  },
  "spacing": {
    "l": 22,
    "m": 15,
    "s": 11,
    "xl": 29,
    "xs": 7,
    "xxl": 44,
    "xxs": 4,
    "zero": 0
  },
  "animation": {
    "large": {
      "easing": [
        0.22,
        1,
        0.36,
        1
      ],
      "duration": 360
    },
    "easing": [
      0.16,
      1,
      0.3,
      1
    ],
    "duration": 200,
    "popupScale": 0.96,
    "pressDistance": 1
  },
  "iconStyle": "outlined",
  "iconFamily": "Central",
  "neutralTone": "neutral",
  "buttonRadius": "s",
  "colorEmphasis": 37,
  "letterSpacing": {
    "l": 0.01,
    "m": 0,
    "s": -0.01,
    "xl": 0.02,
    "xs": -0.02
  },
  "primaryForeground": {
    "dark": "neutral-2",
    "light": "neutral-2"
  },
  "primaryActionColor": "neutral-10",
  "displayName": "Untitled"
}
```

## light CSS variables

GraphicalProvider already defines these variables for this mode and carries them into portalled components. Use this table to verify the integration. Preserve its internal --theme-name value; do not rename it to match the project title. Keep application styles linked to these variables.

| Variable | Value |
| --- | --- |
| `--theme-name` | Felt |
| `--theme-icon-family` | Central |
| `--theme-icon-style` | outlined |
| `--theme-icon-stroke-width` | initial |
| `--theme-icon-thin-display` | initial |
| `--theme-icon-light-display` | initial |
| `--theme-icon-regular-display` | initial |
| `--theme-icon-bold-display` | initial |
| `--toolbar-divider-bleed` | 0 |
| `--focus-ring-outline` | initial |
| `--icon-stroke-width` | var(--theme-icon-stroke-width, 2) |
| `--icon-light-display` | var(--theme-icon-light-display, none) |
| `--icon-regular-display` | var(--theme-icon-regular-display, inline) |
| `--icon-bold-display` | var(--theme-icon-bold-display, none) |
| `--motion-duration` | 200ms |
| `--motion-easing` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-type` | easing |
| `--motion-visual-duration` | 0.2 |
| `--motion-bounce` | 0.2 |
| `--motion-enabled` | 1 |
| `--motion-small-iterations` | infinite |
| `--motion-large-duration` | 360ms |
| `--motion-large-easing` | cubic-bezier(0.22, 1, 0.36, 1) |
| `--motion-large-type` | easing |
| `--motion-large-visual-duration` | 0.36 |
| `--motion-large-bounce` | 0.2 |
| `--motion-large-iterations` | infinite |
| `--motion-popup-scale` | 0.96 |
| `--motion-press-distance` | 1px |
| `--option-badge-background` | #00b7c4 |
| `--option-badge-foreground` | #fbfbfb |
| `--navigation-active-foreground` | #fbfbfb |
| `--emphasis-chart-fill` | #00b7c433 |
| `--emphasis-balance-background` | #cdcdcd |
| `--emphasis-rewards-background` | #f4f4f4 |
| `--emphasis-icon-background` | #f4f4f4 |
| `--emphasis-icon-foreground` | #000000 |
| `--emphasis-type-background` | #f4f4f4 |
| `--emphasis-type-foreground` | #000000 |
| `--navigation-active-background` | #00b7c4 |
| `--surface-raised-image` | none |
| `--surface-raised-shadow` | 0 0 0 0 transparent |
| `--surface-recessed-image` | none |
| `--surface-recessed-shadow` | 0 0 0 0 transparent |
| `--space-zero` | 0px |
| `--space-xxs` | 4px |
| `--space-xs` | 7px |
| `--space-s` | 11px |
| `--space-m` | 15px |
| `--space-l` | 22px |
| `--space-xl` | 29px |
| `--space-xxl` | 44px |
| `--tracking-xs` | -0.02em |
| `--tracking-s` | -0.01em |
| `--tracking-m` | 0em |
| `--tracking-l` | 0.01em |
| `--tracking-xl` | 0.02em |
| `--size-xxs` | 10px |
| `--line-xxs` | 14px |
| `--letter-spacing-xxs` | 0.02em |
| `--size-xs` | 12px |
| `--line-xs` | 16px |
| `--letter-spacing-xs` | 0.01em |
| `--size-s` | 14px |
| `--line-s` | 19px |
| `--letter-spacing-s` | 0.01em |
| `--size-m` | 16px |
| `--line-m` | 23px |
| `--letter-spacing-m` | 0em |
| `--size-l` | 23px |
| `--line-l` | 31px |
| `--letter-spacing-l` | -0.01em |
| `--size-xl` | 35px |
| `--line-xl` | 39px |
| `--letter-spacing-xl` | -0.01em |
| `--size-xxl` | 47px |
| `--line-xxl` | 50px |
| `--letter-spacing-xxl` | -0.02em |
| `--radius-zero` | 0px |
| `--radius-xs` | 3px |
| `--radius-s` | 7px |
| `--radius-m` | 11px |
| `--radius-l` | 17px |
| `--radius-xl` | 27px |
| `--radius-full` | 9999px |
| `--border-none` | 0px |
| `--border-s` | 0px |
| `--border-m` | 0px |
| `--border-l` | 0px |
| `--border-default-color` | #e7e7e733 |
| `--border-shadow-none` | 0 0 0 0 transparent |
| `--border-shadow-s` | 0 0 0 0 transparent |
| `--border-shadow-m` | 0 0 0 0 transparent |
| `--border-shadow-l` | 0 0 0 0 transparent |
| `--font-ui` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-ui-regular` | 400 |
| `--weight-ui-medium` | 500 |
| `--weight-ui-heavy` | 600 |
| `--font-brand` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-brand-regular` | 400 |
| `--weight-brand-medium` | 500 |
| `--weight-brand-heavy` | 600 |
| `--font-editorial` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-editorial-regular` | 400 |
| `--weight-editorial-medium` | 500 |
| `--weight-editorial-heavy` | 600 |
| `--font-data` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-data-regular` | 400 |
| `--weight-data-medium` | 500 |
| `--weight-data-heavy` | 600 |
| `--color-none` | transparent |
| `--color-1` | #00b7c4 |
| `--color-1-transparent` | #00b7c433 |
| `--color-2` | #094b58 |
| `--color-2-transparent` | #094b5833 |
| `--color-3` | #ffb579 |
| `--color-3-transparent` | #ffb57933 |
| `--color-4` | #c1f3ed |
| `--color-4-transparent` | #c1f3ed33 |
| `--neutral-1` | #ffffff |
| `--neutral-1-transparent` | #ffffff33 |
| `--neutral-2` | #fbfbfb |
| `--neutral-2-transparent` | #fbfbfb33 |
| `--neutral-3` | #f4f4f4 |
| `--neutral-3-transparent` | #f4f4f433 |
| `--neutral-4` | #e7e7e7 |
| `--neutral-4-transparent` | #e7e7e733 |
| `--neutral-5` | #cdcdcd |
| `--neutral-5-transparent` | #cdcdcd33 |
| `--neutral-6` | #a1a1a1 |
| `--neutral-6-transparent` | #a1a1a133 |
| `--neutral-7` | #7d7d7d |
| `--neutral-7-transparent` | #7d7d7d33 |
| `--neutral-8` | #555555 |
| `--neutral-8-transparent` | #55555533 |
| `--neutral-9` | #333333 |
| `--neutral-9-transparent` | #33333333 |
| `--neutral-10` | #000000 |
| `--neutral-10-transparent` | #00000033 |
| `--success` | #00906c |
| `--success-transparent` | #00906c33 |
| `--warning` | #ffea00 |
| `--warning-transparent` | #ffea0033 |
| `--error` | #fc032d |
| `--error-transparent` | #fc032d33 |
| `--shadow-none` | none |
| `--shadow-s` | 0px 2px 4px 0px #00000000 |
| `--shadow-m` | 0px 2px 6px 0px #0000000d, 0px 8px 24px 0px #00000013 |
| `--shadow-l` | 0px 16px 48px 0px #00000000 |
| `--cte-canvas` | #ffffff |
| `--cte-surface` | #fbfbfb |
| `--cte-surface-muted` | #f4f4f4 |
| `--cte-text` | #000000 |
| `--cte-text-muted` | #7d7d7d |
| `--cte-border` | #e7e7e733 |
| `--cte-accent` | #00b7c4 |
| `--cte-accent-text` | #fbfbfb |
| `--cte-danger` | #fc032d |
| `--cte-focus` | #00b7c4 |
| `--cte-font` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--cte-font-size` | 14px |
| `--cte-font-weight` | 400 |
| `--cte-line-height` | 19px |
| `--cte-letter-spacing` | 0.01em |
| `--cte-detail-font-size` | 12px |
| `--cte-detail-line-height` | 16px |
| `--cte-detail-letter-spacing` | 0.01em |

## dark CSS variables

GraphicalProvider already defines these variables for this mode and carries them into portalled components. Use this table to verify the integration. Preserve its internal --theme-name value; do not rename it to match the project title. Keep application styles linked to these variables.

| Variable | Value |
| --- | --- |
| `--theme-name` | Felt |
| `--theme-icon-family` | Central |
| `--theme-icon-style` | outlined |
| `--theme-icon-stroke-width` | initial |
| `--theme-icon-thin-display` | initial |
| `--theme-icon-light-display` | initial |
| `--theme-icon-regular-display` | initial |
| `--theme-icon-bold-display` | initial |
| `--toolbar-divider-bleed` | 0 |
| `--focus-ring-outline` | initial |
| `--icon-stroke-width` | var(--theme-icon-stroke-width, 2) |
| `--icon-light-display` | var(--theme-icon-light-display, none) |
| `--icon-regular-display` | var(--theme-icon-regular-display, inline) |
| `--icon-bold-display` | var(--theme-icon-bold-display, none) |
| `--motion-duration` | 200ms |
| `--motion-easing` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-type` | easing |
| `--motion-visual-duration` | 0.2 |
| `--motion-bounce` | 0.2 |
| `--motion-enabled` | 1 |
| `--motion-small-iterations` | infinite |
| `--motion-large-duration` | 360ms |
| `--motion-large-easing` | cubic-bezier(0.22, 1, 0.36, 1) |
| `--motion-large-type` | easing |
| `--motion-large-visual-duration` | 0.36 |
| `--motion-large-bounce` | 0.2 |
| `--motion-large-iterations` | infinite |
| `--motion-popup-scale` | 0.96 |
| `--motion-press-distance` | 1px |
| `--option-badge-background` | #00b7c4 |
| `--option-badge-foreground` | #fbfbfb |
| `--navigation-active-foreground` | #fbfbfb |
| `--emphasis-chart-fill` | #00b7c433 |
| `--emphasis-balance-background` | #565656 |
| `--emphasis-rewards-background` | #2b2b2b |
| `--emphasis-icon-background` | #2b2b2b |
| `--emphasis-icon-foreground` | #ffffff |
| `--emphasis-type-background` | #2b2b2b |
| `--emphasis-type-foreground` | #ffffff |
| `--navigation-active-background` | #00b7c4 |
| `--surface-raised-image` | none |
| `--surface-raised-shadow` | 0 0 0 0 transparent |
| `--surface-recessed-image` | none |
| `--surface-recessed-shadow` | 0 0 0 0 transparent |
| `--space-zero` | 0px |
| `--space-xxs` | 4px |
| `--space-xs` | 7px |
| `--space-s` | 11px |
| `--space-m` | 15px |
| `--space-l` | 22px |
| `--space-xl` | 29px |
| `--space-xxl` | 44px |
| `--tracking-xs` | -0.02em |
| `--tracking-s` | -0.01em |
| `--tracking-m` | 0em |
| `--tracking-l` | 0.01em |
| `--tracking-xl` | 0.02em |
| `--size-xxs` | 10px |
| `--line-xxs` | 14px |
| `--letter-spacing-xxs` | 0.02em |
| `--size-xs` | 12px |
| `--line-xs` | 16px |
| `--letter-spacing-xs` | 0.01em |
| `--size-s` | 14px |
| `--line-s` | 19px |
| `--letter-spacing-s` | 0.01em |
| `--size-m` | 16px |
| `--line-m` | 23px |
| `--letter-spacing-m` | 0em |
| `--size-l` | 23px |
| `--line-l` | 31px |
| `--letter-spacing-l` | -0.01em |
| `--size-xl` | 35px |
| `--line-xl` | 39px |
| `--letter-spacing-xl` | -0.01em |
| `--size-xxl` | 47px |
| `--line-xxl` | 50px |
| `--letter-spacing-xxl` | -0.02em |
| `--radius-zero` | 0px |
| `--radius-xs` | 3px |
| `--radius-s` | 7px |
| `--radius-m` | 11px |
| `--radius-l` | 17px |
| `--radius-xl` | 27px |
| `--radius-full` | 9999px |
| `--border-none` | 0px |
| `--border-s` | 0px |
| `--border-m` | 0px |
| `--border-l` | 0px |
| `--border-default-color` | #3d3d3d33 |
| `--border-shadow-none` | 0 0 0 0 transparent |
| `--border-shadow-s` | 0 0 0 0 transparent |
| `--border-shadow-m` | 0 0 0 0 transparent |
| `--border-shadow-l` | 0 0 0 0 transparent |
| `--font-ui` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-ui-regular` | 400 |
| `--weight-ui-medium` | 500 |
| `--weight-ui-heavy` | 600 |
| `--font-brand` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-brand-regular` | 400 |
| `--weight-brand-medium` | 500 |
| `--weight-brand-heavy` | 600 |
| `--font-editorial` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-editorial-regular` | 400 |
| `--weight-editorial-medium` | 500 |
| `--weight-editorial-heavy` | 600 |
| `--font-data` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--weight-data-regular` | 400 |
| `--weight-data-medium` | 500 |
| `--weight-data-heavy` | 600 |
| `--color-none` | transparent |
| `--color-1` | #00b7c4 |
| `--color-1-transparent` | #00b7c433 |
| `--color-2` | #094b58 |
| `--color-2-transparent` | #094b5833 |
| `--color-3` | #ffb579 |
| `--color-3-transparent` | #ffb57933 |
| `--color-4` | #c1f3ed |
| `--color-4-transparent` | #c1f3ed33 |
| `--neutral-1` | #000000 |
| `--neutral-1-transparent` | #00000033 |
| `--neutral-2` | #202020 |
| `--neutral-2-transparent` | #20202033 |
| `--neutral-3` | #2b2b2b |
| `--neutral-3-transparent` | #2b2b2b33 |
| `--neutral-4` | #3d3d3d |
| `--neutral-4-transparent` | #3d3d3d33 |
| `--neutral-5` | #565656 |
| `--neutral-5-transparent` | #56565633 |
| `--neutral-6` | #838383 |
| `--neutral-6-transparent` | #83838333 |
| `--neutral-7` | #ababab |
| `--neutral-7-transparent` | #ababab33 |
| `--neutral-8` | #cfcfcf |
| `--neutral-8-transparent` | #cfcfcf33 |
| `--neutral-9` | #f4f4f4 |
| `--neutral-9-transparent` | #f4f4f433 |
| `--neutral-10` | #ffffff |
| `--neutral-10-transparent` | #ffffff33 |
| `--success` | #00906c |
| `--success-transparent` | #00906c33 |
| `--warning` | #ffea00 |
| `--warning-transparent` | #ffea0033 |
| `--error` | #fc032d |
| `--error-transparent` | #fc032d33 |
| `--shadow-none` | none |
| `--shadow-s` | 0px 2px 4px 0px #00000000 |
| `--shadow-m` | 0px 2px 6px 0px #0000000d, 0px 8px 24px 0px #00000013 |
| `--shadow-l` | 0px 16px 48px 0px #00000000 |
| `--cte-canvas` | #000000 |
| `--cte-surface` | #202020 |
| `--cte-surface-muted` | #2b2b2b |
| `--cte-text` | #ffffff |
| `--cte-text-muted` | #ababab |
| `--cte-border` | #3d3d3d33 |
| `--cte-accent` | #00b7c4 |
| `--cte-accent-text` | #202020 |
| `--cte-danger` | #fc032d |
| `--cte-focus` | #00b7c4 |
| `--cte-font` | "GT Standard L", -apple-system, BlinkMacSystemFont, sans-serif |
| `--cte-font-size` | 14px |
| `--cte-font-weight` | 400 |
| `--cte-line-height` | 19px |
| `--cte-letter-spacing` | 0.01em |
| `--cte-detail-font-size` | 12px |
| `--cte-detail-line-height` | 16px |
| `--cte-detail-letter-spacing` | 0.01em |

## Authored component assignments

These are project edits. The [component reference](untitled-components.md) includes the effective assignments with defaults and shared parts resolved.

```json
{
  "componentTokens": {
    "button:ghost:rest": {
      "paddingX": "l",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "button:danger:rest": {
      "paddingX": "l",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "input:default:rest": {
      "paddingX": "m",
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "button:outline:rest": {
      "paddingX": "l",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "button:primary:rest": {
      "paddingX": "l",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "select:default:rest": {
      "paddingX": "m",
      "background": "neutral-3",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
    "button:secondary:rest": {
      "paddingX": "l",
      "paddingTop": "s",
      "paddingBottom": "s"
    },
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
    "slider:default:part:thumb:rest": {
      "controlSize": "l"
    },
    "slider:default:part:track:rest": {
      "controlSize": "xl"
    },
    "switch:default:part:control:rest": {
      "controlSize": "xl"
    },
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
    "checkbox:default:part:control:rest": {
      "controlSize": "l"
    },
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
    "autocomplete:default:part:popover:rest": {
      "radius": "s"
    },
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

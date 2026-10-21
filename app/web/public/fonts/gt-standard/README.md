# GT Standard (the theme's selected font, licensed)

The Untitled theme selects GT Standard (`"GT Standard L"`) for every text role,
at weights 400, 500 and 600. It's a commercial font:
https://www.grillitype.com/shops/gt-standard

To use it instead of the Timeless Grotesk fallback:

1. Buy a web license and download the webfonts.
2. Put the `.woff2` files for weights 400, 500 and 600 in this folder.
3. Uncomment the `GT Standard L` `@font-face` rules in
   `app/web/src/theme/fonts.css`, adjusting the file names to match.

The font stacks already list `"GT Standard L"` first, so nothing else needs to
change.

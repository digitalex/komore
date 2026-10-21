# Timeless Grotesk (active fallback for GT Standard)

Timeless Grotesk is free for personal and commercial use, but the vendor
delivers it by email, so it can't be downloaded automatically.

1. Go to https://timeless.co/type, press **Download**, and enter your email.
2. From the emailed package, copy the Grotesk variable webfonts here:
   - `TimelessGrotesk-Variable.woff2` (upright, must cover weights 400–600)
   - `TimelessGrotesk-Italic-Variable.woff2` (italic)
   If the files have different names, rename them, or update the `src` URLs in
   `app/web/src/theme/fonts.css`.
3. Keep the license file from the package next to the fonts.

Check it works: open a document, and in devtools run
`document.fonts.check('500 16px "Timeless Grotesk"')`. It should return `true`.

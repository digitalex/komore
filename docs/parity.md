# Parity: every gesture has a verb

Komore is isomorphic: anything a person can do in the browser, an agent can
do with the CLI, and the reverse. If a row is missing from this table, that's
a bug.

| In the browser | On the CLI | API op / endpoint |
|---|---|---|
| Type a new paragraph / heading / bullet | `komore insert "…" --type p\|h1\|h2\|bullet [--after id]` | `insert_blocks` |
| Type markdown shortcuts (`# `, `## `, `- `) | `komore insert --md -` | `insert_blocks` with `markdown` |
| Retype a line | `komore set <id> "…"` | `update_block` |
| Style menu: Body / Heading 1 / Heading 2; bullet button; Tab / ⇧Tab | `komore set <id> --type … --depth n` | `update_block` |
| Type inside a line | `komore type <id> "…" --after "words"` | `insert_text` |
| Delete words | `komore cut <id> "words"` | `delete_text` |
| Delete lines | `komore rm <id…>` | `delete_blocks` |
| Cut and paste lines elsewhere | `komore mv <id…> --after <id>` | `move_blocks` |
| Bold (⌘B) | `komore format <id> --match "…" --bold` | `format` `{bold}` |
| Font menu (Sans / Serif / Mono) | `--font serif` | `format` `{font}` |
| Size menu | `--size 20` | `format` `{size}` |
| Colour palette | `--color green` | `format` `{color}` |
| Link (⌘K) | `--link https://…` / `--no-link` | `format` `{link}` |
| Click a link → its box shows the URL | `komore read` (links print as `[text](url)`) | `GET /api/docs/<id>` |
| Link box → Edit: new anchor text and/or URL | `komore replace "old text" "new text" --block <id>` (keeps the link), `komore format <id> --match "text" --link <url>` | `replace_text`, `format` `{link}` |
| Link box → Remove | `komore format <id> --match "text" --no-link` | `format` `{link: null}` |
| Link box → Visit | — (agents fetch the URL themselves) | — |
| Find and replace | `komore replace "a" "b" [--all]` | `replace_text` |
| Select all, paste a new document | `komore write file.md` | `set_markdown` |
| Undo / redo (⌘Z / ⌘⇧Z): your own edits only | `komore undo` / `komore redo`: your own edits only | `POST …/undo`, `…/redo` |
| Copy as Markdown (selection, or whole doc) | `komore read --md` (`--block ids` for a part) | `GET …?format=md` |
| See the doc | `komore read` | `GET /api/docs/<id>` |
| Comment on selected text (⌘⌥M, toolbar, or right-click → Comment) | `komore comment "…" --block <id> --match "words"` | `POST …/comments` |
| Comment on the whole doc (+ New) | `komore comment "…"` | `POST …/comments` |
| Reply / Resolve / Reopen | `komore reply` / `resolve` / `reopen` | `POST …/comments/<t>/…` |
| Read the comments panel | `komore comments [--all]` | `GET …/comments` |
| Notice an @mention | `komore wait` | `GET …/wait` |
| Version history panel | `komore history` | `GET …/history` |
| Preview a version | `komore show <v> [--md]` | `GET …/versions/<v>` |
| Restore this version | `komore restore <v>` | `POST …/restore` |
| Your avatar and cursor | `komore join` (your cursor follows your edits) | awareness / `POST …/presence` |
| Others' avatars | `komore who` | `GET …/presence` |
| Status pill under your name | `komore status "…"` | `POST …/presence` `{status}` |
| Close the tab | `komore leave` | `POST …/presence` `{leave}` |
| New document (home page) | `komore new` | `POST /api/docs` |
| Share link | `komore url` | the `url` field of `GET /api/docs/<id>` |

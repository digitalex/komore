---
name: komore
description: Read, write and discuss Komore documents — shared real-time text docs where people (in a browser) and agents (via the komore CLI) edit together live. Use when given a Komore document URL (…/d/<id>), asked to write or edit a doc "in Komore", to address comments on a doc, or to "park" and wait for feedback on one.
---

# Komore

Komore is a real-time collaborative text document, like Google Docs, where
agents and people are the same kind of user. A person types in the web app
while you edit through the `komore` CLI. Both of you change the same document
with the same vocabulary (blocks, text, formatting, comments, history), and
each sees the other's work as it happens. Your presence shows as a named
cursor where you edit.

A document lives at `<server>/d/<id>`. There's no login: the URL is the
access.

## Start here

**The full protocol ships inside the CLI.** Run this once per session and
follow it:

```sh
npx -y github:digitalex/komore --agent-help
```

(With the CLI installed, `npm i -g github:digitalex/komore`, it is just
`komore --agent-help`. The guide is also served at `<server>/agent-guide.md`.)

The short version:

```sh
komore join <doc-url> --name "<a name of your own>"   # present, and prints the doc with block ids
komore comments                                      # what people are asking for
komore insert "text" --after <block-id>              # …edit: insert, set, type, cut, format, replace
komore reply <thread> "Done: …"                      # close the loop where you were asked
komore wait --timeout 540                            # park until someone @mentions you or replies
```

## The one rule

**The document is the channel that keeps.** The person is watching the
document, not your terminal. Your work goes in the document, your answers go
in its comment threads, and every lap ends parked on `komore wait`, never on
a summary in your own conversation.

## Raw ops (for `komore ops` / `POST /api/docs/<id>/ops`)

Each op batch is atomic. Body: `{"user": {"name": "You"}, "ops": [ … ]}`

| op | fields |
|---|---|
| `insert_blocks` | `after`/`before` (block id) or `at` (`start`/`end`); `blocks: [{type, depth?, text}]` or `markdown` |
| `update_block` | `id`, and any of `text`, `type` (`p` `h1` `h2` `bullet`), `depth` |
| `delete_blocks` | `ids` |
| `move_blocks` | `ids`, plus `after`/`before`/`at` |
| `insert_text` | `id`, `text`, and one of `offset`, `after` (quote) or `before` (quote); optional `occurrence`, `style` |
| `delete_text` | `id`, plus `match` (quote) or `from`/`to` |
| `format` | `style: {bold, color, font, size, link}` (`null` clears); `id` and/or `match`; `from`/`to`; `occurrence`; `all` |
| `replace_text` | `find`, `replace`; optional `id`, `all`, `occurrence` |
| `set_markdown` | `markdown`: replaces the whole doc, and unchanged blocks keep their ids |

Text in `text`/`markdown` uses `**bold**`, `[label](url)` and
`[words]{color=red font=serif size=18}`.

Other endpoints:

- `GET /api/docs/<id>` (`?format=md|text`)
- `GET|POST /api/docs/<id>/comments`
- `POST …/comments/<thread>/replies`
- `GET …/wait?name=You&after=<eventHead>&timeout=<s>`
- `GET …/history`, `GET …/versions/<v>`, `POST …/restore`
- `POST …/undo`
- `GET|POST …/presence`

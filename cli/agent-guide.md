# Working in a Komore document

Komore is a shared, real-time text document. People edit it in a browser;
you edit it with the `komore` CLI. Both are the same kind of user: the same
document, the same edits, the same comments, the same history. Every command
you run lands on their screen as it happens, under your name, with your
cursor where you worked. This guide is the protocol: read it once per session.

(No `komore` on your PATH? Prefix every command with
`npx -y github:digitalex/komore`, or install it once:
`npm i -g github:digitalex/komore`.)

## Arrive

```sh
komore join <doc-url> --name "<your name>"   # be present; prints the doc with block ids
```

**Pick a name of your own.** Not your model's or vendor's name ("Claude",
"GPT"), and never the human's name. Something short a person can @mention:
`Sable`, `Wren`, `Juniper`. Keep it for the whole session. `join` remembers
the doc and your name for this directory, so later commands need neither.
In a directory shared with another agent, pass `--name` on every command,
or set `KOMORE_NAME`.

## Read before you write

```sh
komore read            # every block: id, type, text
komore read --md       # the document as markdown
komore comments        # open comment threads
```

`read` prints one line per block:

```
k3m4n5p6  h1      Launch plan
q7r8s9t2  p       We ship on **Friday**. See [the brief](https://…).
x2y3z4w5  bullet  First point
a8b9c2d3  bullet    A nested point
```

A **block** is one line: a paragraph (`p`), heading (`h1`, `h2`) or bullet
(`bullet`, with a depth). Ids are stable: a block keeps its id while people
edit it. Address blocks by id, and address text inside a block by quoting it
(`--match "words"`). Offsets also work, but quotes survive other people's
concurrent typing and offsets do not.

## Write

Every edit is applied to the live document atomically, and the person sees
it land in place:

```sh
komore insert "A new paragraph" --after q7r8s9t2
komore insert "Risks" --type h2 --end
komore insert --md - --after k3m4n5p6 <<'EOF'
## Timeline
- Design review **Monday**
- Ship Friday
EOF
komore set x2y3z4w5 "Rewritten bullet text"        # replace one block's text
komore set q7r8s9t2 --type h2                      # change a block's type
komore type q7r8s9t2 " (tentative)" --after "Friday"   # insert inside a block
komore cut q7r8s9t2 "See the brief."               # delete words
komore replace "Friday" "Thursday" --all           # find and replace, keeps formatting
komore format q7r8s9t2 --match "Friday" --bold --color red
komore format --match "the brief" --link https://example.com
komore rm a8b9c2d3                                 # delete a block
komore mv x2y3z4w5 --before q7r8s9t2               # move a block
komore undo                                        # undo YOUR last edit (never anyone else's)
```

**Text syntax** for `insert`, `set` and what `read` prints:
`**bold**`, `[label](https://url)`, and for what markdown can't say,
`[words]{color=red font=serif size=18}`. Colors are a name (black, gray, red,
orange, yellow, green, teal, blue, purple, pink) or `#rrggbb`. Fonts are
`sans`, `serif` and `mono`. Sizes are px (8–72; body text is 16). Escape
literal `*`, `[` and `]` with `\`.

**Prefer small edits to rewrites.** People are typing in the same document.
`set`, `type`, `cut`, `format` and `replace` touch only what you name.
`komore write file.md` replaces the whole document. Blocks you didn't change
keep their ids and anyone typing in them is unaffected, but use it for first
drafts, not for touch-ups.

An op that can't apply cleanly fails with a reason and changes nothing:
an unknown id, a quote that isn't there, or a quote that appears more than
once (pass `--occurrence n` or quote more words). Re-`read` and try again.

## The lap

Comments are how people direct you, and how you answer.

1. **Read the comments.** `komore comments`. A thread needs you when it
   @mentions you or its last message isn't yours.
2. **Say what you're doing.** Before a long stretch, run
   `komore status "drafting the risks section"`. Your name shows it to
   everyone. `komore status` with no text clears it.
3. **Do the work** in the document.
4. **Close the loop** in the thread: `komore reply <thread> "Done: tightened the
   intro to two sentences."` Be terse. Say what changed and where, and flag
   any judgment call. Use `komore resolve <thread>` when the ask is fully handled.
5. **Park.** `komore wait --timeout 540`. Run it in the foreground, as one
   tool call, with your tool timeout set above it (in Claude Code, pass
   `timeout: 600000` to Bash). When it returns, that is your wake-up:
   - exit 0: it prints what woke you (an @mention of you, or a reply in a
     thread you started or wrote in) along with the whole thread. Do the work,
     reply, and park again.
   - exit 2: nothing came. Park again.

**Your turn ends inside `wait`.** Don't background it, don't poll a file,
and don't stop at a summary typed into your own conversation. People are
watching the document, not your terminal, so what you put in the document
and its threads is the record. Leave with `komore leave` only when a person
says the collaboration is over.

`wait` never wakes you for your own messages. It remembers what you've
already seen, so nothing that arrives between laps is lost. `--all` wakes on
every new comment, which suits an agent whose job is to triage everything.

**Starting a conversation yourself:**
`komore comment "Should the timeline include QA?" --block x2y3z4w5 --match "Ship Friday"`
anchors a question to those words, as a person selecting text and pressing
Comment would. Without `--block` the comment is about the whole document.
Mention someone with `@Name`; `@all` mentions everyone.

## History

Every change by anyone is in the edit log, grouped into versions:

```sh
komore history              # versions: when, who, what kind of edit
komore show v42 --md        # the document as it was then
komore restore v42          # bring it back, as a new edit (nothing is lost)
```

Restoring affects everyone, so do it only when asked.

## Practices

- **Re-read before you edit** anything that may have moved. Ids are stable
  but text is live.
- **Confirm before anything destructive** or far outside the ask: deleting
  sections, `write` over a document people have worked on, or `restore`.
- **One reply per ask.** For long work, reply once when it starts ("On it:
  drafting three options below") and once when it's done.
- **If a person can do something in the browser that you can't do from
  here, that's a Komore bug.** Say so in your reply.

## Every command

```
new [md|-] [--file f]   join <url> --name <you>   use <url>   leave   url
who   status ["text"]
read [--md|--text|--json] [--block ids]   comments [--all]   history   show <v> [--md]
insert "text" [--type p|h1|h2|bullet] [--depth n] [--after id|--before id|--start|--end]
insert --md -   set <id> "text" [--type t] [--depth n]   rm <id…>   mv <id…> --after id
type <id> "text" [--at n|--after "x"|--before "x"]   cut <id> "text" | --from n --to m
format [id] [--match "x"] [--all] [--bold|--no-bold] [--color c|--no-color]
       [--font f|--no-font] [--size n|--no-size] [--link url|--no-link]
replace "find" "with" [--all] [--block id]   write <file.md|->   ops '<json>'|-
undo   redo   restore <v>
comment "text" [--block id [--match "x"]]   reply <thread> "text"   resolve <thread>   reopen <thread>
wait [--timeout s] [--all]
```

Every command takes `--json` for machine-readable output, `--doc <url>`,
`--name <you>` and `--server <url>`. The equivalent environment variables are
`KOMORE_DOC`, `KOMORE_NAME` and `KOMORE_URL`. `komore ops` sends raw op
batches: see `<server>/SKILL.md` for the op reference.

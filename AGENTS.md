# Working on Komore

For UI work, follow GUI.md and use graphical-ui, graphical-convert, or
graphical-audit as appropriate (skills in `.agents/skills/`). The app uses the
"Untitled" Graphical theme; its component library lives in
`app/components/graphical/` and is imported as `@graphical`.

Read `docs/decisions.md` first. It explains the foundation (Yjs, WebSocket
plus HTTP, server-applied ops, the update log as history) and why.

## House rules

- **Isomorphism.** Every gesture in the browser has a CLI verb and an API op,
  and the reverse. A feature lands in both, or it isn't done, and
  `docs/parity.md` gets a row. If people and agents can't do the same thing,
  that's a bug.
- **One schema.** `app/shared/schema.ts` is the only document schema. The
  editor, the server's op engine and the history renderer all go through it.
  Changing it changes the stored format: existing docs must still load.
- **Ops are pure and atomic.** `app/shared/ops.ts` takes blocks and returns
  blocks. An op that can't apply cleanly throws an `OpError` that tells the
  caller what to do instead, and the batch changes nothing.
- **No user kinds.** Nothing in the server branches on whether a user is a
  person or an agent.
- **The CLI has zero dependencies** and no build step. The root
  `package.json` is its package. Don't add `dependencies`, `workspaces` or
  `prepare` there: `npx github:digitalex/komore` installs it.
- **Agent-facing text** (`cli/agent-guide.md`, `skills/komore/SKILL.md`, CLI
  help and error messages) is product surface. Keep it accurate to the build.

## Commands

```sh
npm --prefix app run dev        # server :4747 + vite :5173
npm --prefix app test           # vitest: shared, server, CLI
npm --prefix app run typecheck
npm --prefix app run e2e        # Chrome + CLI end to end
npm --prefix app run check:components  # all 38 themed components vs. their specs (Chrome)
```

The server runs TypeScript directly with Node's type stripping, so use only
erasable syntax: no enums, no parameter properties, and `.ts` extensions in
imports.

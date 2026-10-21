// End-to-end: two people in two browsers and an agent on the CLI, all in one
// document. Starts its own server on a spare port with a throwaway database.
//   npm run e2e        (needs Google Chrome, or set CHROME=/path/to/chrome)
import { chromium } from "playwright-core";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";

const APP = resolve(import.meta.dirname, "..");
const CLI = resolve(APP, "../cli/komore.mjs");
const S = mkdtempSync(join(tmpdir(), "komore-e2e-"));
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = await new Promise((r) => {
  const s = createServer().listen(0, () => {
    const p = s.address().port;
    s.close(() => r(p));
  });
});
const BASE = `http://localhost:${port}`;
const server = spawn(process.execPath, [join(APP, "server/main.ts")], {
  env: { ...process.env, PORT: String(port), KOMORE_DB: join(S, "e2e.db") },
  stdio: "inherit",
});
for (let i = 0; ; i++) {
  try {
    if ((await fetch(`${BASE}/healthz`)).ok) break;
  } catch {}
  if (i > 50) throw new Error("server did not start");
  await new Promise((r) => setTimeout(r, 100));
}
const env = { ...process.env, KOMORE_HOME: join(S, "home"), KOMORE_URL: BASE };
const komore = (...args) => execFileSync(process.execPath, [CLI, ...args], { env, cwd: S, encoding: "utf8" });
const log = (...a) => console.log("•", ...a);
const errors = [];
let failed = false;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const selectWord = (loc, word) =>
  loc.evaluate((el, word) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode()) && !node.textContent.includes(word));
    const i = node.textContent.indexOf(word);
    const r = document.createRange();
    r.setStart(node, i);
    r.setEnd(node, i + word.length);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
  }, word);
const mk = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  // Missing font files 404 until the (email-gated) fallback fonts are added; everything else counts.
  page.on("response", (r) => r.status() >= 400 && !r.url().includes("/fonts/") && errors.push(`http ${r.status()}: ${r.url()}`));
  page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && errors.push(`console: ${m.text()}`));
  return page;
};

try {
  const ada = await mk();
  await ada.goto(BASE);
  await ada.getByRole("button", { name: "New document" }).click();
  await ada.waitForURL(/\/d\//);
  const url = ada.url();
  log("created", url);
  await ada.getByPlaceholder("Your name").fill("Ada");
  await ada.getByRole("button", { name: "Continue" }).click();
  await ada.locator(".ProseMirror").waitFor();
  await ada.locator(".ProseMirror").click();
  await ada.keyboard.type("# Launch plan");
  await ada.keyboard.press("Enter");
  await ada.keyboard.type("We ship on Friday if the review goes well.");
  await ada.keyboard.press("Enter");
  await ada.keyboard.type("- design review");
  await ada.keyboard.press("Enter");
  await ada.keyboard.type("QA pass");
  await ada.waitForTimeout(400);
  const html1 = await ada.locator(".ProseMirror").innerHTML();
  if (!/<h1[^>]*>Launch plan<\/h1>/.test(html1) || !/<ul>/.test(html1)) throw new Error("input rules failed: " + html1);
  log("typed heading, paragraph, bullets via markdown shortcuts");

  // Second person.
  const bea = await mk();
  await bea.goto(url);
  await bea.getByPlaceholder("Your name").fill("Bea");
  await bea.getByRole("button", { name: "Continue" }).click();
  await bea.locator(".ProseMirror h1").waitFor();
  await bea.locator(".ProseMirror li").last().click();
  await bea.keyboard.press("End");
  await bea.keyboard.type(" (Bea)");
  await ada.locator(".ProseMirror li", { hasText: "QA pass (Bea)" }).waitFor({ timeout: 3000 });
  await ada.locator(".presence-trigger[aria-label^='Bea']").waitFor();
  log("Bea's typing appears live for Ada; Bea in Ada's presence bar");

  // The agent.
  const joined = komore("join", url, "--name", "Sable");
  log("agent joined:\n" + joined.split("\n").map((l) => "    " + l).join("\n"));
  const para = /^(\w{8})\s+p\s+We ship/m.exec(joined)[1];
  komore("insert", "Risks", "--type", "h2", "--end");
  komore("insert", "Review may slip a day", "--type", "bullet", "--end");
  komore("format", para, "--match", "Friday", "--bold", "--color", "red");
  komore("status", "drafting risks");
  await ada.locator(".ProseMirror h2", { hasText: "Risks" }).waitFor({ timeout: 3000 });
  await ada.locator(".ProseMirror strong span[style*='color']", { hasText: "Friday" }).waitFor({ timeout: 3000 });
  await ada.locator(".ProseMirror-yjs-cursor", { hasText: "Sable" }).waitFor({ timeout: 3000 });
  await ada.locator(".status-pill", { hasText: "drafting risks" }).waitFor({ timeout: 3000 });
  log("agent's edits, cursor and status visible to Ada");

  // Ada formats with the toolbar: select "review goes well", bigger serif green + link.
  // Select the word "review" the way a person does: double-click it.
  const box = await ada.evaluate(() => {
    const p = [...document.querySelectorAll(".ProseMirror p")].find((el) => el.textContent.includes("the review"));
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode()) && !node.textContent.includes("review"));
    const range = document.createRange();
    const i = node.textContent.indexOf("review");
    range.setStart(node, i);
    range.setEnd(node, i + "review".length);
    const r = range.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await ada.mouse.dblclick(box.x, box.y);
  // ProseMirror adopts the browser's selection on its next selectionchange; let it land.
  await ada.waitForFunction(() => {
    const s = window.komoreView.state.selection;
    return window.komoreView.state.doc.textBetween(s.from, s.to) === "review";
  });
  await ada.waitForTimeout(100);
  // Base UI selects: open with the keyboard-reachable trigger, pick an option.
  await ada.getByRole("combobox", { name: "Font", exact: true }).click();
  await ada.getByRole("option", { name: "Serif" }).click();
  await ada.getByRole("combobox", { name: "Font size" }).click();
  await ada.getByRole("option", { name: "20", exact: true }).click();
  await ada.getByRole("button", { name: "Text color" }).click();
  const portalVar = await ada.evaluate(() => getComputedStyle(document.querySelector(".color-popup")).getPropertyValue("--neutral-1").trim());
  if (!portalVar) throw new Error("portalled popover lost the theme variables");
  await ada.locator(".swatch[title='green']").click();
  await ada.getByRole("button", { name: "Link" }).click();
  await ada.getByPlaceholder("Paste or type a link").fill("example.com/review");
  await ada.getByRole("button", { name: "Apply" }).click();
  await ada.waitForTimeout(500);
  const text = komore("read", "--text");
  log("agent reads Ada's formatting:\n" + text.split("\n").map((l) => "    " + l).join("\n"));
  if (!text.includes("[[review](https://example.com/review)]{color=green font=serif size=20}")) throw new Error("toolbar formatting not reflected");

  // Keyboard: the toolbar's style select opens and commits with the keyboard alone.
  await ada.locator(".ProseMirror h1").getByText("Launch plan").click();
  const styleSelect = ada.getByRole("combobox", { name: "Text style" });
  await ada.waitForFunction(() => document.querySelector('[aria-label="Text style"]')?.textContent?.includes("Heading 1"));
  await styleSelect.focus();
  await ada.keyboard.press("ArrowDown");
  await ada.getByRole("listbox").waitFor();
  await ada.waitForTimeout(200);
  await ada.keyboard.press("ArrowDown");
  await ada.waitForTimeout(200);
  await ada.keyboard.press("Enter");
  await ada.locator(".ProseMirror h2", { hasText: "Launch plan" }).waitFor({ timeout: 3000 });
  // Closing the select hands focus back to the document (finalFocus), so ⌘Z reaches the editor.
  await ada.waitForFunction(() => document.activeElement?.classList.contains("ProseMirror"));
  await ada.keyboard.press(`${process.platform === "darwin" ? "Meta" : "Control"}+z`);
  await ada.locator(".ProseMirror h1", { hasText: "Launch plan" }).waitFor({ timeout: 3000 });
  log("keyboard: select opened, changed the heading, undone");
  // Theme scope: the provider is in light mode and portalled popups carry the theme variables.
  const scope = await ada.evaluate(() => {
    const root = document.querySelector(".graphical-theme");
    return { mode: root?.getAttribute("data-color-mode"), theme: root?.getAttribute("data-graphical-theme") };
  });
  if (scope.mode !== "light" || scope.theme !== "Atlas") throw new Error("theme scope wrong: " + JSON.stringify(scope));

  // Copy as Markdown: whole doc, then selection.
  await ada.locator(".ProseMirror h1").click();
  await ada.getByRole("button", { name: "Copy as Markdown" }).click();
  const whole = await ada.evaluate(() => navigator.clipboard.readText());
  if (!whole.startsWith("# Launch plan\n\nWe ship on **Friday**")) throw new Error("copy whole failed: " + whole);
  await ada.locator(".ProseMirror h2").click({ position: { x: 4, y: 12 } });
  for (let i = 0; i < 5; i++) await ada.keyboard.press("Shift+ArrowRight");
  await ada.waitForTimeout(100);
  await ada.getByRole("button", { name: "Copy as Markdown" }).click();
  const sel = await ada.evaluate(() => navigator.clipboard.readText());
  if (sel !== "Risks") throw new Error("copy selection failed: " + JSON.stringify(sel));
  log("Copy as Markdown: whole doc and selection ok");

  // Comment from the UI mentioning the agent, while the agent is parked.
  const waiter = spawn(process.execPath, [CLI, "wait", "--timeout", "20"], { env, cwd: S });
  let waitOut = "";
  waiter.stdout.on("data", (d) => (waitOut += d));
  const waitDone = new Promise((r) => waiter.on("exit", r));
  await ada.waitForTimeout(400);
  await ada.locator(".ProseMirror h2").click({ position: { x: 4, y: 12 } });
  for (let i = 0; i < 5; i++) await ada.keyboard.press("Shift+ArrowRight");
  await ada.waitForTimeout(100);
  await ada.getByRole("toolbar", { name: "Formatting" }).getByRole("button", { name: "Comment", exact: true }).click();
  await ada.getByPlaceholder(/Comment, or @mention/).fill("@Sable can you list three risks?");
  await ada.locator(".thread.draft").getByRole("button", { name: "Comment" }).click();
  const code = await waitDone;
  log(`agent woke (exit ${code}):\n` + waitOut.split("\n").map((l) => "    " + l).join("\n"));
  if (code !== 0 || !waitOut.includes("Ada (mention)")) throw new Error("wait did not wake");
  const thread = /in thread (\w+)/.exec(waitOut)[1];
  komore("reply", thread, "Added three risks under Risks.");
  await ada.locator(".msg", { hasText: "Added three risks" }).waitFor({ timeout: 3000 });
  await ada.locator(".comment-mark").first().waitFor();
  log("agent reply shows in Ada's thread; anchored highlight present");


  // History: restore the version before the agent's edits.
  komore("set", para, "Totally rewritten by the agent.");
  await ada.locator(".ProseMirror p", { hasText: "Totally rewritten" }).waitFor({ timeout: 3000 });
  await ada.getByRole("button", { name: "History" }).click();
  await ada.locator(".version").first().waitFor();
  const n = await ada.locator(".version").count();
  log(`history shows ${n} version(s)`);
  await ada.locator(".version").nth(1).click();
  await ada.getByRole("dialog").filter({ hasText: "Restore this version" }).waitFor();
  await ada.getByRole("button", { name: "Restore this version" }).click();
  await ada.locator(".ProseMirror p", { hasText: "We ship" }).waitFor({ timeout: 3000 });
  await bea.locator(".ProseMirror p", { hasText: "We ship" }).waitFor({ timeout: 3000 });
  log("restore applied live for everyone");
  log("history via CLI:\n" + komore("history").split("\n").map((l) => "    " + l).join("\n"));

  // Invite agent copies instructions.
  await ada.getByRole("button", { name: "Invite agent" }).click();
  const invite = await ada.evaluate(() => navigator.clipboard.readText());
  if (!invite.includes("npx skills add digitalex/komore") || !invite.includes(url)) throw new Error("invite text wrong");
  log("invite text ok");
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  console.log(errors.length ? "BROWSER ERRORS:\n" + errors.join("\n") : "no browser errors");
  await browser.close();
  server.kill();
}
if (failed || errors.length) process.exit(1);
console.log("e2e passed");

// Rendered-fidelity check for the Graphical component library.
//
// Serves the dev-only gallery (web/gallery.html) with Vite, opens it in
// Chrome, opens every popup/dialog/menu, and compares each rendered part's
// computed style with the resolved CSS in its specification
// (gui/components/untitled/*.md), for the part's actual state in light mode.
//
//   node test/components.mjs          (needs Google Chrome, or CHROME=…)
//
// It checks what a stylesheet can be wrong about — fill, text colour, corner
// radius, padding and typography — not composited shadows or motion.
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const APP = resolve(import.meta.dirname, "..");
const SPECS = resolve(APP, "../gui/components/untitled");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FALLBACK = '"Timeless Grotesk"'; // web/src/theme/document.ts inserts it after the licensed family

// ---------------------------------------------------------------- specs
const specs = {};
for (const f of readdirSync(SPECS)) {
  const md = readFileSync(join(SPECS, f), "utf8");
  const json = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(md)[1]);
  specs[json.component] = json;
}
const PROPS = {
  background: ["backgroundColor"],
  foreground: ["color"],
  radius: ["borderTopLeftRadius"],
  paddingTop: ["paddingTop"],
  paddingBottom: ["paddingBottom"],
  paddingX: ["paddingLeft", "paddingRight"],
  paddingLeft: ["paddingLeft"],
  paddingRight: ["paddingRight"],
  textSize: ["fontSize"],
  weight: ["fontWeight"],
  lineHeight: ["lineHeight"],
  letterSpacing: ["letterSpacing"],
  font: ["fontFamily"],
};

function expected(component, part, state, variant) {
  const spec = specs[component];
  if (!spec) return null;
  const v = spec.variants[variant ?? Object.keys(spec.variants)[0]];
  const p = v?.light?.[part];
  if (!p || !p[state]) return null;
  const meta = spec.parts.find((x) => x.id === part);
  const css = p[state].css;
  const out = {};
  for (const prop of meta?.properties ?? []) {
    for (const key of PROPS[prop] ?? []) {
      let value = key === "borderTopLeftRadius" ? String(css.borderRadius ?? "").split(" ")[0] : css[key];
      if (value === undefined || value === "") continue;
      if (key === "fontFamily") {
        const comma = value.indexOf(",");
        value = comma < 0 ? value : `${value.slice(0, comma)}, ${FALLBACK}${value.slice(comma)}`;
      }
      if (key === "letterSpacing" && typeof value === "string" && value.endsWith("em")) {
        value = `${Math.round(parseFloat(value) * Number(css.fontSize) * 100) / 100}px`;
      }
      out[key] = value;
    }
  }
  return out;
}

// ---------------------------------------------------------------- compare
function norm(key, v) {
  if (v === undefined || v === null) return "";
  v = String(v).trim();
  // Chrome reports BlinkMacSystemFont as system-ui in computed styles.
  if (key === "fontFamily") return v.replace(/\s+/g, " ").replace(/'/g, '"').replace(/"?system-ui"?/gi, "blinkmacsystemfont").toLowerCase();
  if (/color/i.test(key)) return v;
  if (/^-?\d+(\.\d+)?$/.test(v) && key !== "fontWeight") return `${Math.round(Number(v))}px`;
  if (v === "normal" && key === "letterSpacing") return "0px";
  const px = /^(-?\d+(?:\.\d+)?)px$/.exec(v);
  if (px) return `${Math.round(Number(px[1]) * 10) / 10}px`;
  return v;
}
const hex = (c) => {
  // Browser computed colours are rgb()/rgba(); specs use #rrggbb[aa].
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(c);
  if (!m) return c;
  const a = m[4] === undefined ? 1 : Number(m[4]);
  const h = [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  return a === 0 ? "transparent" : a === 1 ? `#${h}` : `#${h}${Math.round(a * 255).toString(16).padStart(2, "0")}`;
};
const sameColor = (a, b) => {
  const x = hex(a).toLowerCase();
  const y = String(b).toLowerCase();
  if (x === y) return true;
  if ((x === "transparent" || x.endsWith("00")) && (y === "transparent" || y.endsWith("00") || y === "none")) return true;
  return false;
};

// ---------------------------------------------------------------- run
const vite = await createServer({ configFile: join(APP, "vite.config.ts"), server: { port: 0 }, logLevel: "error" });
await vite.listen();
const url = `http://localhost:${vite.httpServer.address().port}/gallery.html`;
console.log(`gallery: ${url}`);
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
page.setDefaultTimeout(5000);
await page.goto(url, { waitUntil: "load", timeout: 30000 });
await page.locator("[data-gallery]").first().waitFor({ timeout: 30000 });
await page.waitForTimeout(500);

const results = new Map(); // component -> { checked, mismatches: [] }
const seen = new Set();

async function measure(label) {
  await page.mouse.move(1270, 890); // nothing hovered
  await page.waitForTimeout(400); // let state transitions (Small motion) settle
  const parts = await page.evaluate(() => {
    const SPECIAL = [
      [".themed-button", "button", "control"],
      [".themed-input", "input", "control"],
      [".themed-select", "select", "control"],
      [".themed-select-popup", "select", "popover"],
      [".themed-select-option", "select", "option"],
      [".themed-checkbox", "checkbox", "control"],
      [".themed-switch", "switch", "control"],
      [".combobox-field", "combobox", "input"],
      [".combobox-popover", "combobox", "popover"],
      [".combobox-option", "combobox", "option"],
      [".combobox-label", "combobox", "label"],
    ];
    const VARIANTS = ["primary", "secondary", "outline", "ghost", "danger", "primary"];
    const out = [];
    const keys = ["backgroundColor", "color", "borderTopLeftRadius", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "fontFamily"];
    const stateOf = (el) => {
      // Choice rows take their state from the control inside them (:has in the stylesheet).
      if (el.matches(".ui-choice-row")) {
        const c = el.querySelector(":scope > .ui-choice, :scope > .themed-switch, :scope > .themed-checkbox");
        if (c) return stateOf(c) === "focus" ? "rest" : stateOf(c);
      }
      const d = el.dataset;
      if ("disabled" in d || el.disabled) return "disabled";
      if ("indeterminate" in d) return "indeterminate";
      if ("checked" in d) return "checked";
      if ("pressed" in d) return "pressed";
      if ("highlighted" in d) return "highlighted";
      if ("selected" in d || ("active" in d && el.getAttribute("role") === "tab")) return "selected";
      if ("popupOpen" in d || "panelOpen" in d || "open" in d) return "open";
      // The theme paints focus for keyboard focus only (:focus-visible / data-focused).
      if (el.matches(":focus-visible") || "focused" in d) return "focus";
      return "rest";
    };
    const push = (el, component, part, variant) => {
      if (!el.getClientRects().length) return;
      const cs = getComputedStyle(el);
      const style = Object.fromEntries(keys.map((k) => [k, cs[k]]));
      // Library structure: some parts paint through a dedicated child or sibling.
      if (component === "scroll-area" && part === "viewport") {
        const content = el.querySelector(".ui-scroll-content");
        if (content) for (const k of ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]) style[k] = getComputedStyle(content)[k];
      }
      if (component === "tabs" && part === "trigger" && "active" in el.dataset) {
        const indicator = el.parentElement?.querySelector(":scope > .ui-tabs-indicator:not([hidden])");
        if (indicator) style.backgroundColor = getComputedStyle(indicator).backgroundColor;
      }
      if (el.matches(".themed-checkbox") && "checked" in el.dataset) {
        // The checked fill is an animated layer (--control-fill) over the unselected control.
        style.backgroundColor = cs.getPropertyValue("--control-fill").trim();
      }
      if (component === "number-field" && (part === "increment" || part === "decrement")) {
        // Integrated steppers are square, sized by --number-step-size rather than padding.
        for (const k of ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]) style[k] = null;
      }
      out.push({ component, part, variant, state: stateOf(el), style, where: (el.textContent ?? "").trim().slice(0, 30) });
    };
    for (const el of document.querySelectorAll("[data-ui-component][data-ui-part]")) push(el, el.dataset.uiComponent, el.dataset.uiPart);
    for (const [sel, component, part] of SPECIAL) {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.matches("[data-ui-part]")) return;
        const card = el.closest("[data-gallery]");
        let variant;
        if (component === "button") {
          if (card?.dataset.gallery !== "button") return;
          variant = VARIANTS[[...card.querySelectorAll(".themed-button")].indexOf(el)];
        }
        push(el, component, part, variant);
      });
    }
    return out;
  });
  for (const p of parts) {
    const want = expected(p.component, p.part, p.state, p.variant);
    const key = `${p.component}/${p.part}/${p.variant ?? ""}/${p.state}/${p.where}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const r = results.get(p.component) ?? { checked: 0, skipped: 0, mismatches: [] };
    results.set(p.component, r);
    if (!want) {
      r.skipped++;
      continue;
    }
    r.checked++;
    for (const [k, v] of Object.entries(want)) {
      const got = p.style[k];
      if (got === null) continue;
      const ok = /color/i.test(k) ? sameColor(got, v) : norm(k, got) === norm(k, v);
      if (!ok) r.mismatches.push(`${p.part}${p.variant ? `:${p.variant}` : ""}[${p.state}] ${k}: got ${/color/i.test(k) ? hex(got) : got}, spec ${v}  (${label}: "${p.where}")`);
    }
  }
}

const card = (id) => page.locator(`[data-gallery="${id}"]`);
const step = async (label, open, close = () => page.keyboard.press("Escape")) => {
  try {
    await open();
    await page.waitForTimeout(450);
    await measure(label);
    await close();
    await page.waitForTimeout(350);
  } catch (e) {
    console.log(`! could not open ${label}: ${e.message.split("\n")[0]}`);
  }
};

await measure("inline");
await step("select popup", () => card("select").getByRole("combobox").first().click());
await step("combobox popup", () => card("combobox").getByRole("button", { name: "Show options" }).click());
await step("autocomplete popup", () => card("autocomplete").getByRole("combobox").fill("a"));
await step("tooltip", () => card("tooltip").getByText("Hover me").hover(), () => page.mouse.move(1270, 890));
await step("popover", () => card("popover").getByText("Open popover").click());
await step("preview card", () => card("preview-card").getByText("Launch plan").hover(), () => page.mouse.move(1270, 890));
await step("menu", () => card("menu").getByText("Actions").click());
await step("context menu", () => card("context-menu").getByText("Right-click here").click({ button: "right" }));
await step("menubar", () => card("menubar").getByText("File").click());
await step("navigation menu", () => card("navigation-menu").getByText("Docs").click());
await step("dialog", () => card("dialog").getByText("Open dialog").click());
await step("alert dialog", () => card("alert-dialog").getByText("Delete…").click());
await step("drawer", () => card("drawer").getByText("Open drawer").click());
await step("toast", () => card("toast").getByText("Show toast").click(), async () => {});

// Reduced motion: popups and parts drop their transitions.
await page.emulateMedia({ reducedMotion: "reduce" });
await page.waitForTimeout(200);
const motion = await page.evaluate(() => {
  const part = document.querySelector(".ui-part");
  return part ? getComputedStyle(part).transitionDuration : "missing";
});
const reducedOk = motion.split(",").every((d) => parseFloat(d) === 0);
console.log(`${reducedOk ? "✓" : "✗"}  reduced motion: .ui-part transition-duration ${motion}`);

await browser.close();
await vite.close();

// ---------------------------------------------------------------- report
const all = Object.keys(specs).sort();
let failures = 0;
for (const id of all) {
  const r = results.get(id);
  if (!r || !r.checked) {
    console.log(`?  ${id}: no rendered part matched a spec state`);
    failures++;
    continue;
  }
  if (r.mismatches.length) {
    failures++;
    console.log(`✗  ${id}: ${r.checked} part-states checked, ${r.mismatches.length} mismatch(es)`);
    for (const m of r.mismatches) console.log(`     ${m}`);
  } else console.log(`✓  ${id}: ${r.checked} part-states match the spec`);
}
if (pageErrors.length) console.log("page errors:\n" + pageErrors.join("\n"));
process.exit(failures || pageErrors.length || !reducedOk ? 1 : 0);

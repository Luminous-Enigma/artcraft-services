// Soul Mark gradients: the same pages for each gradient theme, plus the picker and the side menu.
//   node gradient-shots.mjs <dist dir> <out dir> [theme names, comma separated]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
const ONLY = process.argv[4] ? new Set(process.argv[4].split(",")) : null;
fs.mkdirSync(OUT, { recursive: true });

const theme = (background, color2, accent, extra = {}) => ({
  background, color2, accent, tint: 0.5, character: "soft", guard: true, shape: "vertical", ...extra,
});
const THEMES = [
  ["neon-deep", theme("#0E1A2E", "#070B14", "#00E5FF")],
  ["midnight-teal", theme("#101B44", "#000000", "#1CB6BE")],
  ["royal-blue-black", theme("#19206A", "#000000", "#1F6FEB")],
  ["deep-red-black", theme("#5D101B", "#000000", "#E23E57")],
  ["deep-violet-black", theme("#500169", "#000000", "#E86FA6")],
  ["sky-white", theme("#BFDBF1", "#FFFFFF", "#0969DA")],
  ["aurora-tritone", theme("#0D2661", "#0C2F1C", "#1CB6BE", { color3: "#0B0E14" })],
  ["synthwave-tritone", theme("#391961", "#521232", "#E86FA6", { color3: "#0B0E14" })],
  ["nebula-tritone", theme("#19206A", "#391961", "#E86FA6", { color3: "#0B0E14" })],
  ["ember-tritone", theme("#5D101B", "#441E13", "#F59E0B", { color3: "#0B0E14" })],
  ["twilight-tritone", theme("#521232", "#391961", "#E86FA6", { color3: "#101B44" })],
  ["event-horizon-elliptical", theme("#19206A", "#000000", "#219FD5", { shape: "elliptical" })],
  ["red-white-guard-on", theme("#FE2712", "#FFFFFF", "#2D81FF")],
  ["red-white-guard-off", theme("#FE2712", "#FFFFFF", "#2D81FF", { guard: false })],
];
const PAGES = [
  ["home", "/"], ["create-image", "/create-image"], ["library", "/library"], ["pricing", "/pricing"],
  ["edit-image", "/edit-image"], ["moodboard", "/moodboard"], ["support", "/support"],
];
const USER = { user_token: "u", username: "visual_compare", display_name: "Visual Compare",
  email_gravatar_hash: "0", core_info: {}, can_access_studio: true, maybe_feature_flags: [] };

const server = await new Promise((res) => {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".wasm": "application/wasm" };
  const s = http.createServer((q, r) => {
    let f = path.join(DIST, decodeURIComponent(q.url.split("?")[0]));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
    r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream" });
    fs.createReadStream(f).pipe(r);
  }).listen(0, "127.0.0.1", () => res(s));
});
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

// Gradients is its own theme: its seeds are stored apart from Soul Mark's.
async function context(seeds, viewport = { width: 1440, height: 900 }, state = { mode: "gradients", gradientSeeds: seeds }) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", deviceScaleFactor: 1 });
  const store = JSON.stringify({ state, version: 0 });
  await ctx.addInitScript((v) => localStorage.setItem("artcraft-theme", v), store);
  await ctx.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "127.0.0.1") return route.continue().catch(() => route.abort());
    if (u.pathname === "/v1/session") return route.fulfill({ json: { success: true, logged_in: true, user: USER } });
    if (u.pathname === "/v1/credits/namespace/artcraft") return route.fulfill({ json: { success: true, free_credits: 0, monthly_credits: 0, banked_credits: 0, sum_total_credits: 2500 } });
    if (u.pathname.startsWith("/v1/")) return route.fulfill({ json: { success: true, results: [], jobs: [], active_subscriptions: [] } });
    return route.abort();
  });
  return ctx;
}

// The picker: six shots spaced evenly from its top to its bottom, so together they show all of it.
async function shootPicker(tab, dir) {
  await tab.goto(base + "/");
  await tab.waitForTimeout(1800);
  await tab.locator("header button:has(img), [class*=topbar] button:has(img)").last().click();
  await tab.getByRole("menuitem", { name: /settings/i }).or(tab.getByText("Settings", { exact: true })).first().click();
  await tab.getByRole("button", { name: "Appearance" }).first().click();
  await settle(tab);
  await tab.screenshot({ path: path.join(dir, "picker-1.png") });
  for (const n of [2, 3, 4, 5, 6]) {
    await tab.evaluate((step) => {
      let el = document.elementFromPoint(900, 500);
      while (el && !(el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      if (el) el.scrollTop = ((el.scrollHeight - el.clientHeight) * step) / 5;
    }, n - 1);
    await tab.waitForTimeout(500);
    await tab.screenshot({ path: path.join(dir, `picker-${n}.png`) });
  }
}

async function settle(tab) {
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(1200);
}

for (const [name, seeds] of THEMES) {
  if (ONLY && !ONLY.has(name)) continue;
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await context(seeds);
  const tab = await ctx.newPage();
  for (const [page, url] of PAGES) {
    await tab.goto(base + url);
    await tab.waitForTimeout(1800);
    await settle(tab);
    // Check the input is real: the gradient must actually be applied.
    const applied = await tab.evaluate(() => document.documentElement.dataset.gradient ?? "");
    if (!applied) throw new Error(`${name}/${page}: no gradient applied`);
    await tab.screenshot({ path: path.join(dir, `${page}.png`) });
  }
  await shootPicker(tab, dir);
  await ctx.close();
  // A phone, with the side menu open.
  const phone = await context(seeds, { width: 390, height: 844 });
  const pt = await phone.newPage();
  await pt.goto(base + "/");
  await pt.waitForTimeout(1800);
  await settle(pt);
  await pt.screenshot({ path: path.join(dir, "phone-home.png") });
  const trigger = pt.locator("[data-sidebar=trigger], button:has(svg.lucide-menu), button[aria-label*=menu i]").first();
  if (await trigger.count()) {
    await trigger.click();
    await pt.waitForTimeout(900);
    await pt.screenshot({ path: path.join(dir, "phone-menu.png") });
  }
  await phone.close();
  console.log("shot", name);
}
// Soul Mark (solid) beside it: its picker, now without any gradient parts, and its page without a gradient.
if (!ONLY || ONLY.has("soul-mark-solid")) {
  const dir = path.join(OUT, "soul-mark-solid");
  fs.mkdirSync(dir, { recursive: true });
  const starter = { background: "#101B44", accent: "#1CB6BE", tint: 0.5, character: "soft", guard: true };
  const ctx = await context(starter, undefined, { mode: "soul-mark", seeds: starter });
  const tab = await ctx.newPage();
  await tab.goto(base + "/");
  await tab.waitForTimeout(1800);
  await settle(tab);
  const applied = await tab.evaluate(() => document.documentElement.dataset.gradient ?? "");
  if (applied) throw new Error("soul-mark-solid: a gradient was applied to the solid theme");
  await tab.screenshot({ path: path.join(dir, "home.png") });
  await shootPicker(tab, dir);
  await ctx.close();
  console.log("shot soul-mark-solid");
}
await browser.close();
server.close();

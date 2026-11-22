// Soul Mark: Neon: the same pages for each signature look, plus the picker and the side menu.
//   node neon-shots.mjs <dist dir> <out dir> [look names, comma separated]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
const ONLY = process.argv[4] ? new Set(process.argv[4].split(",")) : null;
fs.mkdirSync(OUT, { recursive: true });

const neon = (background, accent, glow, extra = {}) => ({
  background, accent, glow, strength: 0.6, grid: true, tint: 0.5, character: "cool", guard: true, ...extra,
});
const THEMES = [
  ["blueprint", neon("#162F56", "#00E5FF", "#00E5FF", { color2: "#03060C", shape: "vertical" })],
  ["workshop", neon("#03060C", "#FFB020", "#00E5FF")],
  ["green-terminal", neon("#000000", "#39FF88", "#39FF88")],
  ["amber-console", neon("#0B0E14", "#FFB020", "#FFB020", { grid: false })],
  ["synth", neon("#0D1117", "#9B6BFF", "#FF2BD6")],
  ["violet-night", neon("#101B44", "#FF2BD6", "#9B6BFF")],
  ["lime-radar", neon("#070B14", "#B6FF3B", "#B6FF3B")],
  ["red-alert", neon("#000000", "#FF4D6A", "#FF4D6A", { grid: false })],
  ["quiet-void", neon("#000000", "#00E5FF", "#00E5FF", { grid: false, strength: 0.3 })],
  ["dim-glow-guard-on", neon("#000000", "#00E5FF", "#003A40")],
  ["dim-glow-guard-off", neon("#000000", "#00E5FF", "#003A40", { guard: false })],
];
const PAGES = process.env.PAGES
  ? process.env.PAGES.split(",").map((p) => [p.replace(/\//g, "") || "home", p])
  : [["home", "/"], ["create-image", "/create-image"], ["library", "/library"], ["pricing", "/pricing"]];
const PAGES_ONLY = !!process.env.PAGES;
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

// Neon is its own theme: its seeds are stored apart from the others'.
async function context(seeds, viewport = { width: 1440, height: 900 }, state = { mode: "neon", neonSeeds: seeds }) {
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


const seeds = THEMES.find(([n]) => n === "blueprint")[1];
const dir = path.join(OUT, "blueprint");
fs.mkdirSync(dir, { recursive: true });
const ctx = await context(seeds);
const tab = await ctx.newPage();
async function snap(file) {
  const w = await tab.evaluate(() => document.documentElement.dataset.workspace ?? "none");
  await tab.screenshot({ path: path.join(dir, file) });
  console.log(file, "workspace:", w);
}
await tab.goto(base + "/edit-image"); await tab.waitForTimeout(2000); await settle(tab);
await tab.getByRole("button", { name: /blank canvas/i }).first().click().catch((e) => console.log("no blank canvas:", e.message));
await tab.waitForTimeout(1500);
await tab.getByText("1024 × 1024").first().click().catch((e) => console.log("size:", e.message));
await tab.getByRole("button", { name: /create canvas/i }).first().click().catch((e) => console.log("create:", e.message));
await tab.waitForTimeout(3000); await snap("edit-image-canvas.png");
console.log("canvas box:", await tab.evaluate(() => { const el = document.querySelector("div:has(> div > .konvajs-content)"); return el ? getComputedStyle(el).backgroundImage.slice(0, 90) : "NOT FOUND"; }));
console.log("page around it:", await tab.evaluate(() => { const el = document.querySelector(".bg-ui-background"); return el ? getComputedStyle(el).backgroundImage.slice(0, 140) : "NOT FOUND"; }));
await tab.goto(base + "/video-editor"); await tab.waitForTimeout(2000); await settle(tab);
await tab.getByRole("button", { name: /new project/i }).first().click().catch((e) => console.log("no new project:", e.message));
await tab.waitForTimeout(3000);
for (let i = 0; i < 4; i++) { const x = tab.locator('[role=dialog] button:has(svg.lucide-x), [role=dialog] button[aria-label*=close i]').first(); if (await x.count()) { await x.click().catch(() => {}); await tab.waitForTimeout(600); } }
await tab.keyboard.press("Escape"); await tab.waitForTimeout(1200); await snap("video-editor-project.png");
console.log("preview window:", await tab.evaluate(() => { const el = document.querySelector(".panel.bg-background.relative.size-full.min-h-0.min-w-0.flex-col"); return el ? getComputedStyle(el).backgroundImage.slice(0, 90) : "NOT FOUND"; }));
console.log("other panels:", await tab.evaluate(() => [...document.querySelectorAll(".panel.bg-background")].map((e) => getComputedStyle(e).backgroundImage.slice(0, 60)).join(" | ")));
await tab.goto(base + "/background-change"); await tab.waitForTimeout(2000); await settle(tab); await snap("background-change.png");
await ctx.close(); await browser.close(); server.close();

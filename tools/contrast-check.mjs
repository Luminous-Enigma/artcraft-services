#!/usr/bin/env node
// Text contrast check for the ArtCraft webapp, using axe-core's color-contrast
// rule (WCAG 2 AA: 4.5:1 for normal text, 3:1 for large text).
//
//   node contrast-check.mjs --dist <built webapp> --axe <path to axe.min.js>
//        --label <name> --out <file.json> [--storage '{"key":"value"}'] [--pages home,pricing]
//
// Prints one line per page: how many text elements fall short, and the worst ratio.

import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) =>
  (x.startsWith("--") && a.push([x.slice(2), all[i + 1]]), a), []));
const DIST = path.resolve(args.dist);
const AXE = fs.readFileSync(path.resolve(args.axe), "utf8");
const STORAGE = args.storage ? JSON.parse(args.storage) : null;
const PAGES = (args.pages ?? "login,signup,home,create-image,create-video,library,pricing,support,edit-image,moodboard,media,welcome")
  .split(",");
const PATHS = { home: "/", "create-image": "/create-image", "create-video": "/create-video", library: "/library",
  pricing: "/pricing", support: "/support", "edit-image": "/edit-image", moodboard: "/moodboard", media: "/media",
  welcome: "/welcome", login: "/login", signup: "/signup" };
const SIGNED_OUT = new Set(["login", "signup"]);

const USER = { user_token: "user_visualcompare", username: "visual_compare", display_name: "Visual Compare",
  email_gravatar_hash: "0", core_info: {}, can_access_studio: true, maybe_feature_flags: [] };
const ANSWERS = {
  "/v1/credits/namespace/artcraft": { success: true, free_credits: 120, monthly_credits: 2000, banked_credits: 380, sum_total_credits: 2500 },
  "/v1/billing/active_subscriptions": { success: true, active_subscriptions: [] },
  "/v1/jobs/session": { success: true, jobs: [] },
};

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
const results = [];

for (const name of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  if (STORAGE) await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, STORAGE);
  await ctx.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "127.0.0.1" || u.hostname.startsWith("fonts.g")) return route.continue().catch(() => route.abort());
    if (u.pathname === "/v1/session") return route.fulfill({ json: SIGNED_OUT.has(name)
      ? { success: true, logged_in: false } : { success: true, logged_in: true, user: USER } });
    if (ANSWERS[u.pathname]) return route.fulfill({ json: ANSWERS[u.pathname] });
    if (u.pathname.startsWith("/v1/")) return route.fulfill({ json: { success: true, results: [] } });
    return route.abort();
  });
  const tab = await ctx.newPage();
  await tab.goto(base + PATHS[name], { waitUntil: "load" });
  await tab.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(2000);
  await tab.addScriptTag({ content: AXE });
  const found = await tab.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: ["color-contrast"], resultTypes: ["violations"] });
    return (r.violations[0]?.nodes ?? []).map((n) => ({
      target: n.target.join(" "),
      html: n.html.slice(0, 120),
      ratio: n.any[0]?.data?.contrastRatio ?? null,
      needed: n.any[0]?.data?.expectedContrastRatio ?? null,
      fg: n.any[0]?.data?.fgColor ?? null,
      bg: n.any[0]?.data?.bgColor ?? null,
    }));
  });
  const worst = found.reduce((m, f) => (f.ratio && f.ratio < m ? f.ratio : m), Infinity);
  results.push({ page: name, path: PATHS[name], shortfalls: found.length, worst: found.length ? worst : null, found });
  console.log(`${args.label ?? ""} ${PATHS[name].padEnd(16)} ${String(found.length).padStart(3)} below AA${found.length ? `, worst ${worst}:1` : ""}`);
  await ctx.close();
}
await browser.close(); server.close();
fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
fs.writeFileSync(args.out, JSON.stringify({ label: args.label, results }, null, 2));
const total = results.reduce((s, r) => s + r.shortfalls, 0);
console.log(`${args.label ?? ""} TOTAL ${total} text elements below AA on ${results.length} pages`);

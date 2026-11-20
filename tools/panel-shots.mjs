// Screenshots of Settings > Appearance, where Soul Mark is chosen, in a few themes.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
fs.mkdirSync(OUT, { recursive: true });
const seeds = (bg, accent, guard = true) => JSON.stringify({ state: { mode: "soul-mark",
  seeds: { background: bg, accent, tint: 0.5, character: "soft", guard } }, version: 0 });
const SHOTS = [
  ["panel-off", JSON.stringify({ state: { mode: "default" }, version: 0 })],
  ["panel-light", seeds("#FFFFFF", "#2D81FF")],
  ["panel-dark", seeds("#0B0E14", "#2D81FF")],
  ["panel-starter", seeds("#FDF2F7", "#9B4DCA")],
  ["panel-guard-off", seeds("#DC143C", "#2D81FF", false)],
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
const browser = await chromium.launch();
for (const [name, store] of SHOTS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: "reduce" });
  await ctx.addInitScript((v) => localStorage.setItem("artcraft-theme", v), store);
  await ctx.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "127.0.0.1" || u.hostname.startsWith("fonts.g")) return route.continue().catch(() => route.abort());
    if (u.pathname === "/v1/session") return route.fulfill({ json: { success: true, logged_in: true, user: USER } });
    if (u.pathname === "/v1/credits/namespace/artcraft") return route.fulfill({ json: { success: true, free_credits: 0, monthly_credits: 0, banked_credits: 0, sum_total_credits: 2500 } });
    if (u.pathname.startsWith("/v1/")) return route.fulfill({ json: { success: true, results: [], jobs: [], active_subscriptions: [] } });
    return route.abort();
  });
  const tab = await ctx.newPage();
  await tab.goto(`http://127.0.0.1:${server.address().port}/`);
  await tab.waitForTimeout(2500);
  await tab.locator("header button:has(img), [class*=topbar] button:has(img)").last().click();
  await tab.getByRole("menuitem", { name: /settings/i }).or(tab.getByText("Settings", { exact: true })).first().click();
  await tab.getByRole("button", { name: "Appearance" }).first().click();
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(1200);
  await tab.screenshot({ path: path.join(OUT, `${name}.png`) });
  // The dialog scrolls; capture its lower half too.
  await tab.mouse.move(900, 600);
  await tab.mouse.wheel(0, 900);
  await tab.waitForTimeout(600);
  await tab.screenshot({ path: path.join(OUT, `${name}-lower.png`) });
  console.log("shot", name);
  await ctx.close();
}
await browser.close(); server.close();

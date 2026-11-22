// The pictures in Soul Mark Themes' README: four signature looks per theme, on ArtCraft's home page.
//   node readme-shots.mjs <dist dir> <out dir>
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
fs.mkdirSync(OUT, { recursive: true });
const base = { tint: 0.5, character: "soft", guard: true };
const solid = (background, accent) => ({ mode: "soul-mark", seeds: { ...base, background, accent } });
const grad = (colors, accent, shape = "vertical") => ({
  mode: "gradients",
  gradientSeeds: { ...base, background: colors[0], color2: colors[1], ...(colors[2] ? { color3: colors[2] } : {}), shape, accent },
});
const SHOTS = [
  ["solid-midnight-and-teal", solid("#101B44", "#1CB6BE")],
  ["solid-paper-and-cobalt", solid("#FFFFFF", "#0969DA")],
  ["solid-deep-red-and-red", solid("#5D101B", "#E23E57")],
  ["solid-deep-purple-and-pink", solid("#391961", "#E86FA6")],
  ["solid-deep-blue-and-light-blue", solid("#0D2661", "#749AFE")],
  ["solid-reddish-brown-and-amber", solid("#441E13", "#F59E0B")],
  ["solid-black-and-blue", solid("#000000", "#2D81FF")],
  ["solid-deep-green-and-green", solid("#0C2F1C", "#10B981")],
  ["gradient-neon-deep", grad(["#0E1A2E", "#070B14"], "#00E5FF")],
  ["gradient-aurora", grad(["#0D2661", "#0C2F1C", "#0B0E14"], "#1CB6BE")],
  ["gradient-synthwave", grad(["#391961", "#521232", "#0B0E14"], "#E86FA6")],
  ["gradient-ember", grad(["#5D101B", "#441E13", "#0B0E14"], "#F59E0B")],
  ["gradient-midnight-and-teal", grad(["#101B44", "#000000"], "#1CB6BE")],
  ["gradient-deep-violet-to-black", grad(["#500169", "#000000"], "#E86FA6")],
  ["gradient-black-to-charcoal", grad(["#000000", "#2C2C2C"], "#2D81FF")],
  ["gradient-white-to-silver", grad(["#FFFFFF", "#D2D2D2"], "#0969DA")],
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
for (const [name, state] of SHOTS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
  await ctx.addInitScript((v) => localStorage.setItem("artcraft-theme", v), JSON.stringify({ state, version: 0 }));
  await ctx.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "127.0.0.1") return route.continue().catch(() => route.abort());
    if (u.pathname === "/v1/session") return route.fulfill({ json: { success: true, logged_in: true, user: USER } });
    if (u.pathname === "/v1/credits/namespace/artcraft") return route.fulfill({ json: { success: true, free_credits: 0, monthly_credits: 0, banked_credits: 0, sum_total_credits: 2500 } });
    if (u.pathname.startsWith("/v1/")) return route.fulfill({ json: { success: true, results: [], jobs: [], active_subscriptions: [] } });
    return route.abort();
  });
  const tab = await ctx.newPage();
  await tab.goto(`http://127.0.0.1:${server.address().port}/`);
  await tab.waitForTimeout(1800);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(800);
  // Check the input is real: the right theme must be applied.
  const got = await tab.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.gradient ?? ""]);
  const wantGradient = state.mode === "gradients";
  if (got[0] !== state.mode || Boolean(got[1]) !== wantGradient) throw new Error(`${name}: theme not applied (${got})`);
  await tab.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log("shot", name);
  await ctx.close();
}
await browser.close();
server.close();

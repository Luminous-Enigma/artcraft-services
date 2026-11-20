#!/usr/bin/env node
// Visual comparison for the ArtCraft webapp.
//
// Serves two production builds of the webapp, opens every page in both with
// identical stand-in API answers, screenshots each page with the browser set
// to light and to dark, and counts the pixels that differ.
//
//   node visual-compare.mjs --before <dist dir> --after <dist dir> --out <dir>
//        [--before-label main-before] [--after-label main-after]
//        [--after-storage '{"key":"value"}']  (localStorage for "after", e.g. a Soul Mark theme)
//        [--pages home,pricing] [--schemes dark]
//
// Output: <out>/<before-label>/*.png, <out>/<after-label>/*.png,
//         <out>/diff/*.png (changed pixels in magenta), <out>/report.json, <out>/report.md
//
// Needs only Playwright (with Chromium) and Node 18+.

import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1]]);
    return acc;
  }, []),
);
const BEFORE = path.resolve(args.before);
const AFTER = path.resolve(args.after);
const OUT = path.resolve(args.out ?? "visual-compare-out");
const BEFORE_LABEL = args["before-label"] ?? "before";
const AFTER_LABEL = args["after-label"] ?? "after";
const AFTER_STORAGE = args["after-storage"] ? JSON.parse(args["after-storage"]) : null;
const WIDTH = 1440;
const HEIGHT = 900;

// Every route in src/app/app.tsx. `auth: false` pages are shown signed out.
const PAGES = [
  { name: "login", path: "/login", auth: false },
  { name: "signup", path: "/signup", auth: false },
  { name: "forgot-password", path: "/forgot-password", auth: false },
  { name: "forgot-password-verify", path: "/forgot-password/verify", auth: false },
  { name: "set-password", path: "/set-password", auth: false },
  { name: "login-desktop", path: "/login/desktop", auth: false },
  { name: "home", path: "/", auth: true },
  { name: "create-image", path: "/create-image", auth: true },
  { name: "create-video", path: "/create-video", auth: true },
  { name: "create-audio", path: "/create-audio", auth: true },
  { name: "create-object", path: "/create-object", auth: true },
  { name: "create-world", path: "/create-world", auth: true },
  { name: "background-change", path: "/background-change", auth: true },
  { name: "frame-extractor", path: "/frame-extractor", auth: true },
  { name: "moodboard", path: "/moodboard", auth: true },
  { name: "edit-3d", path: "/edit-3d", auth: true },
  { name: "edit-image", path: "/edit-image", auth: true },
  { name: "support", path: "/support", auth: true },
  { name: "pricing", path: "/pricing", auth: true },
  { name: "welcome", path: "/welcome", auth: true },
  { name: "video-editor", path: "/video-editor", auth: true },
  { name: "media", path: "/media", auth: true },
  { name: "library", path: "/library", auth: true },
  { name: "library-folders", path: "/library/folders", auth: true },
  { name: "referrals", path: "/referrals", auth: true },
  { name: "onboarding", path: "/onboarding", auth: true },
  { name: "checkout-success", path: "/checkout/success", auth: true },
  { name: "checkout-cancel", path: "/checkout/cancel", auth: true },
];
const SCHEMES = args.schemes ? args.schemes.split(",") : ["dark", "light"];
const ONLY_PAGES = args.pages ? new Set(args.pages.split(",")) : null;

const STAND_IN_USER = {
  user_token: "user_visualcompare",
  username: "visual_compare",
  display_name: "Visual Compare",
  email_gravatar_hash: "00000000000000000000000000000000",
  core_info: {},
  can_access_studio: true,
  maybe_feature_flags: [],
  onboarding: {
    email_not_set: false,
    email_not_confirmed: false,
    password_not_set: false,
    username_not_customized: false,
  },
};

// Endpoints whose answers the pages read numbers or lists from.
const STAND_IN_ANSWERS = {
  "/v1/credits/namespace/artcraft": { success: true, free_credits: 120, monthly_credits: 2000,
    banked_credits: 380, sum_total_credits: 2500 },
  "/v1/billing/active_subscriptions": { success: true, active_subscriptions: [] },
  "/v1/jobs/session": { success: true, jobs: [] },
  "/v1/web_referrals/record": { success: true },
};

const FONT_CACHE = new Map();

function serve(dir) {
  return new Promise((resolve) => {
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
      ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
      ".json": "application/json", ".woff2": "font/woff2", ".wasm": "application/wasm",
      ".mp4": "video/mp4", ".glb": "model/gltf-binary", ".ico": "image/x-icon" };
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split("?")[0]);
      let file = path.join(dir, url);
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(dir, "index.html"); // single-page app fallback
      }
      res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

// Same stand-in answers for both builds, so any difference comes from the build.
async function wireNetwork(context, signedIn) {
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1") return route.continue();
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
      // Fetch each font file once, then hand both builds the identical bytes.
      const key = url.href;
      if (!FONT_CACHE.has(key)) {
        const res = await route.fetch().catch(() => null);
        FONT_CACHE.set(key, res ? { status: res.status(), headers: res.headers(), body: await res.body() } : null);
      }
      const hit = FONT_CACHE.get(key);
      return hit ? route.fulfill(hit) : route.abort();
    }
    if (url.pathname === "/v1/session") {
      return route.fulfill({ json: signedIn
        ? { success: true, logged_in: true, user: STAND_IN_USER }
        : { success: true, logged_in: false } });
    }
    const stub = STAND_IN_ANSWERS[url.pathname];
    if (stub) return route.fulfill({ json: stub });
    if (url.pathname.startsWith("/v1/") || url.pathname.startsWith("/v2/")) {
      return route.fulfill({ json: { success: true, results: [], media_files: [], items: [],
        pagination: { maybe_next: null, maybe_previous: null } } });
    }
    return route.abort(); // analytics, CDNs, everything else
  });
}

async function shoot(browser, base, page, scheme, file, storage) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, colorScheme: scheme,
    reducedMotion: "reduce", timezoneId: "UTC", locale: "en-US",
  });
  if (storage) {
    await context.addInitScript((s) => {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    }, storage);
  }
  await context.addInitScript(() => { Math.random = () => 0.5; });
  await wireNetwork(context, page.auth);
  const tab = await context.newPage();
  const errors = [];
  tab.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
  await tab.clock.setFixedTime(new Date("2026-11-20T12:00:00Z"));
  await tab.goto(base + page.path, { waitUntil: "load" });
  await tab.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await tab.addStyleTag({ content:
    "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
  await tab.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => null)));
    await document.fonts.ready;
  });
  await tab.waitForTimeout(2500);
  const finalPath = new URL(tab.url()).pathname;
  await tab.screenshot({ path: file, animations: "disabled" });
  await context.close();
  return { finalPath, errors };
}

// Count differing pixels inside the browser (no extra packages needed).
async function diff(browser, a, b, outFile) {
  const tab = await browser.newPage();
  const result = await tab.evaluate(async ([a64, b64]) => {
    const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(a64), load(b64)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const read = (img) => { const c = new OffscreenCanvas(w, h); const x = c.getContext("2d");
      x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = read(ia), db = read(ib);
    const out = new OffscreenCanvas(w, h), ox = out.getContext("2d"), od = ox.createImageData(w, h);
    let changed = 0, maxDelta = 0;
    for (let i = 0; i < da.length; i += 4) {
      const same = da[i] === db[i] && da[i + 1] === db[i + 1] && da[i + 2] === db[i + 2] && da[i + 3] === db[i + 3];
      if (!same) { changed++; od.data.set([255, 0, 255, 255], i);
        maxDelta = Math.max(maxDelta, ...[0, 1, 2, 3].map((k) => Math.abs(da[i + k] - db[i + k]))); }
      else { const g = (da[i] + da[i + 1] + da[i + 2]) / 3 * 0.3; od.data.set([g, g, g, 255], i); }
    }
    ox.putImageData(od, 0, 0);
    const blob = await out.convertToBlob({ type: "image/png" });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; for (const v of buf) bin += String.fromCharCode(v);
    return { changed, maxDelta, total: w * h, png: btoa(bin) };
  }, [a, b].map((f) => "data:image/png;base64," + fs.readFileSync(f).toString("base64")));
  fs.writeFileSync(outFile, Buffer.from(result.png, "base64"));
  await tab.close();
  return { changed: result.changed, maxDelta: result.maxDelta, total: result.total };
}

const main = async () => {
  for (const d of [BEFORE_LABEL, AFTER_LABEL, "diff"]) fs.mkdirSync(path.join(OUT, d), { recursive: true });
  const [sb, sa] = [await serve(BEFORE), await serve(AFTER)];
  const browser = await chromium.launch();
  const rows = [];
  for (const page of PAGES.filter((p) => !ONLY_PAGES || ONLY_PAGES.has(p.name))) {
    for (const scheme of SCHEMES) {
      const name = `${page.name}--${scheme}.png`;
      const fb = path.join(OUT, BEFORE_LABEL, name), fa = path.join(OUT, AFTER_LABEL, name);
      const b = await shoot(browser, `http://127.0.0.1:${sb.port}`, page, scheme, fb, null);
      const a = await shoot(browser, `http://127.0.0.1:${sa.port}`, page, scheme, fa, AFTER_STORAGE);
      const d = await diff(browser, fb, fa, path.join(OUT, "diff", name));
      rows.push({ page: page.name, path: page.path, scheme, signedIn: page.auth,
        landedBefore: b.finalPath, landedAfter: a.finalPath, errorsBefore: b.errors, errorsAfter: a.errors, ...d });
      const err = b.errors.length || a.errors.length ? `  page errors: ${[...b.errors, ...a.errors][0]}` : "";
      console.log(`${page.path.padEnd(24)} ${scheme.padEnd(5)} ${String(d.changed).padStart(8)} px differ (max ${d.maxDelta}/255)${err}`);
    }
  }
  await browser.close(); sb.server.close(); sa.server.close();
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(rows, null, 2));
  const md = ["| Page | Browser set to | Signed in | Pixels that differ | Largest difference (of 255) |", "|---|---|---|---|---|",
    ...rows.map((r) => `| \`${r.path}\`${r.landedAfter !== r.path ? ` (shows \`${r.landedAfter}\`)` : ""} | ${r.scheme} | ${r.signedIn ? "yes" : "no"} | ${r.changed.toLocaleString("en-US")} of ${r.total.toLocaleString("en-US")} | ${r.maxDelta} |`)];
  fs.writeFileSync(path.join(OUT, "report.md"), md.join("\n") + "\n");
  const total = rows.reduce((s, r) => s + r.changed, 0);
  console.log(`\n${rows.length} screenshots per build, ${total} differing pixels in total.`);
};
main().catch((e) => { console.error(e); process.exit(1); });

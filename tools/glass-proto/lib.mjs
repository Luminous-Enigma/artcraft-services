// Shared setup for the Glass prototype pictures: local server, stand-in user and stand-in work.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

export const STANDIN = path.resolve(new URL(".", import.meta.url).pathname, "standin");
const USER = { user_token: "u", username: "visual_compare", display_name: "Visual Compare",
  email_gravatar_hash: "0", core_info: {}, can_access_studio: true, maybe_feature_flags: [] };

export async function start(dist) {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
    ".wasm": "application/wasm", ".jpg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".json": "application/json" };
  const server = await new Promise((res) => {
    const s = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split("?")[0]);
      let f = u.startsWith("/stand-in/") ? path.join(STANDIN, u.slice(10)) : path.join(dist, u);
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, "index.html");
      r.writeHead(200, { "content-type": types[path.extname(f)] ?? "application/octet-stream", "access-control-allow-origin": "*" });
      fs.createReadStream(f).pipe(r);
    }).listen(0, "127.0.0.1", () => res(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ["--enable-gpu-rasterization"] });
  return { server, base, browser };
}

export function media(base) {
  const files = fs.readdirSync(STANDIN).filter((f) => /\.(jpg|mp4)$/.test(f) && !f.includes("-thumb")).sort();
  return files.map((f, i) => {
    const video = f.endsWith(".mp4"); const url = `${base}/stand-in/${f}`;
    return {
      token: `m_standin${i}`, media_type: video ? "video" : "image", media_class: video ? "video" : "image",
      maybe_animation_type: null, maybe_engine_extension: null, maybe_batch_token: "", maybe_original_filename: f,
      maybe_creator_user: null, maybe_prompt_token: null,
      origin: { origin_category: "inference", product_category: video ? "video_gen" : "image_gen", maybe_model: { title: "Stand-in" } },
      origin_category: "inference", origin_product_category: video ? "video_gen" : "image_gen",
      maybe_origin_model_type: null, maybe_origin_model_token: null, maybe_duration_millis: video ? 5000 : null, maybe_style_name: null,
      public_bucket_path: `/stand-in/${f}`, public_bucket_url: url,
      media_links: (() => { const thumb = video ? `${base}/stand-in/${f.replace(".mp4", "")}-thumb.jpg` : url;
        return { cdn_url: url, thumbnail_template: thumb, maybe_thumbnail_template: thumb,
          maybe_video_previews: video ? { animated: thumb, still: thumb } : null }; })(),
      cover_image: { maybe_cover_image_public_bucket_path: null, default_cover: { image_index: 0, color_index: 0 } },
      creator_set_visibility: "private", maybe_title: `Stand-in ${f.replace(/\..*/, "")}`, maybe_text_transcript: null,
      stats: { positive_rating_count: 0, bookmark_count: 0 }, maybe_model_weight_info: null,
      created_at: new Date(Date.UTC(2026, 10, 20, 12, i)).toISOString(), updated_at: new Date(Date.UTC(2026, 10, 20, 12, i)).toISOString(),
    };
  });
}

export async function context(env, glass, viewport = { width: 1440, height: 900 }) {
  const { browser, base } = env;
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", deviceScaleFactor: 1 });
  await ctx.addInitScript((g) => {
    localStorage.setItem("artcraft-glass-proto", g);
    localStorage.setItem("artcraft-theme", JSON.stringify({ state: { mode: "default" }, version: 0 }));
  }, JSON.stringify(glass));
  const work = media(base);
  ctx.log = [];
  await ctx.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "127.0.0.1") return route.continue().catch(() => route.abort());
    const p = u.pathname;
    if (p.startsWith("/v1/")) ctx.log.push(p);
    if (p === "/v1/session") return route.fulfill({ json: { success: true, logged_in: true, user: USER } });
    if (p === "/v1/credits/namespace/artcraft") return route.fulfill({ json: { success: true, free_credits: 0, monthly_credits: 0, banked_credits: 0, sum_total_credits: 2500 } });
    if (/^\/v1\/media_files\/(list|search_session|list\/user\/)/.test(p) || p.startsWith("/v1/media_files/list")) {
      const want = u.searchParams.get("filter_media_type") ?? u.searchParams.get("filter_media_classes") ?? "";
      const pick = want.includes("video") && !want.includes("image") ? work.filter((m) => m.media_type === "video")
        : want.includes("image") && !want.includes("video") ? work.filter((m) => m.media_type === "image") : work;
      return route.fulfill({ json: { success: true, results: pick, pagination: { maybe_next: null, maybe_previous: null, cursor_is_reversed: false } } });
    }
    if (p === "/v1/media_files/batch") {
      const tokens = (u.searchParams.get("tokens") ?? "").split(",");
      return route.fulfill({ json: { success: true, media_files: work.filter((m) => tokens.includes(m.token)) } });
    }
    const one = p.match(/^\/v1\/media_files\/file\/(.+)$/);
    if (one) return route.fulfill({ json: { success: true, media_file: work.find((m) => m.token === one[1]) ?? work[0] } });
    if (p.includes("upload")) {
      const isVideo = (route.request().postDataBuffer()?.includes(Buffer.from("ftyp")) ?? false);
      const m = work.find((x) => x.media_type === (isVideo ? "video" : "image"));
      return route.fulfill({ json: { success: true, media_file_token: m.token, token: m.token, upload_token: m.token } });
    }
    if (p.startsWith("/v1/")) return route.fulfill({ json: { success: true, results: [], jobs: [], active_subscriptions: [] } });
    return route.abort();
  });
  return ctx;
}

export async function settle(tab, ms = 1200) {
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(ms);
}

export const glass = (extra = {}) => ({ on: true, kind: "light", frostOn: true, frost: 30, darkOn: false, darkened: 50,
  picture: "quartz", guard: true, ...extra });

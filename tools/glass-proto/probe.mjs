// Opens each workspace with glass on and lists its buttons and file inputs, plus a screenshot.
import { start, context, settle, glass } from "./lib.mjs";
import fs from "node:fs";
const [dist, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const env = await start(dist);
const ctx = await context(env, glass());
const tab = await ctx.newPage();
tab.on("pageerror", (e) => console.log("  pageerror:", e.message.slice(0, 120)));
const pages = (process.env.PAGES ?? "/,/library,/edit-image,/video-editor,/edit-3d,/moodboard,/background-change,/frame-extractor,/media,/create-image").split(",");
for (const p of pages) {
  await tab.goto(env.base + p); await settle(tab, 2500);
  const name = p.replace(/\//g, "") || "home";
  await tab.screenshot({ path: `${out}/${name}.png` });
  const info = await tab.evaluate(() => ({
    buttons: [...document.querySelectorAll("button")].map((b) => (b.innerText || b.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ")).filter(Boolean).slice(0, 40),
    files: document.querySelectorAll('input[type=file]').length,
    glass: document.documentElement.dataset.glassReport,
  }));
  console.log(`== ${p}  files:${info.files}\n  ${info.buttons.join(" | ")}`);
  if (p === "/") console.log("  glass:", info.glass);
}
console.log("api:", [...new Set(ctx.log)].join(" "));
await env.browser.close(); env.server.close();

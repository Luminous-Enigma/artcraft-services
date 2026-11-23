// Soul Mark: Glass prototype pictures, in five sets. Each workspace is opened and loaded with
// stand-in work once, then the glass changes live (window.__setGlassProto) so the work stays.
//   node shots.mjs <dist> <out>
import { start, context, glass, settle } from "./lib.mjs";
import { openWorkspace } from "./loaders.mjs";
import fs from "node:fs";
const [dist, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const env = await start(dist);
const STEPS = [0, 20, 40, 60, 80, 100];
const LIGHT = { kind: "light", picture: "dusk" }, DARK = { kind: "dark", picture: "aurora" };
const QUARTZ = { kind: "light", picture: "quartz", frostOn: true, frost: 30, darkOn: false };
const report = [];

async function shoot(tab, file, g) {
  await tab.evaluate((g) => window.__setGlassProto(g), g);
  await tab.waitForTimeout(700);
  await tab.screenshot({ path: `${out}/${file}.jpg`, type: "jpeg", quality: 80 });
  const r = JSON.parse(await tab.evaluate(() => document.documentElement.dataset.glassReport));
  report.push({ file, ...g, ...r });
}

async function session(names, plan, viewport) {
  const ctx = await context(env, glass(QUARTZ), viewport);
  const tab = await ctx.newPage();
  for (const name of names) {
    await openWorkspace(tab, env.base, name);
    for (const [file, g] of plan(name)) await shoot(tab, file, g);
    console.log("done", name);
  }
  await ctx.close();
}

// 1. Frost ladder.
await session(["home", "library", "edit-image", "moodboard"], (n) => [LIGHT, DARK].flatMap((k) =>
  STEPS.map((f) => [`frost/${n}-${k.kind}-frost${f}`, { ...k, frostOn: f > 0, frost: f, darkOn: false }])));
// 2. Darkened ladder (frost at the default 30).
await session(["edit-image", "video-editor", "library"], (n) => [{ kind: "light", picture: "quartz" }, DARK].flatMap((k) =>
  STEPS.map((d) => [`darkened/${n}-${k.kind}-dark${d}`, { ...k, frostOn: true, frost: 30, darkOn: d > 0, darkened: d }])));
// 3. Every workspace: Quartz, and dark glass with Darkened 60.
await session(["home", "create-image", "library", "media", "edit-image", "video-editor", "edit-3d", "moodboard", "background-change", "frame-extractor"],
  (n) => [[`workspaces/${n}-quartz`, QUARTZ], [`workspaces/${n}-dark-darkened60`, { ...DARK, frostOn: true, frost: 30, darkOn: true, darkened: 60 }]]);
// 4. Pictures.
await session(["home"], () => ["quartz", "dusk", "aurora", "shore", "ink", "confetti"].flatMap((p) =>
  ["light", "dark"].map((k) => [`pictures/${p}-${k}`, { kind: k, picture: p, frostOn: true, frost: 30, darkOn: false }])));
// 5. Phone.
await session(["home", "library", "edit-image"], (n) => [[`phone/${n}-quartz`, QUARTZ],
  [`phone/${n}-dark`, { ...DARK, frostOn: true, frost: 30, darkOn: false }]], { width: 390, height: 844 });

fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
console.log("shots:", report.length, "lowest worst-case contrast:", Math.min(...report.map((r) => r.worst)));
await env.browser.close(); env.server.close();

// Round 2: thinner stacked glass while frosted (menu and workspace panels), and the three-color
// fades as backgrounds. node stack.mjs <dist> <out>
import { start, context, glass } from "./lib.mjs";
import { openWorkspace } from "./loaders.mjs";
import fs from "node:fs";
const [dist, out] = process.argv.slice(2);
for (const d of ["opacity", "fades"]) fs.mkdirSync(`${out}/${d}`, { recursive: true });
const env = await start(dist);
// "now" is today's look, two full layers: the page fill f plus f again over what's left, f(1 - f).
const NOW = { light: 0.54 * 0.46, dark: 0.69 * 0.31 };
const LEVELS = [["now", null], ["medium", 0.12], ["low", 0.04]];
const report = [];
async function shoot(tab, file, g) {
  await tab.evaluate((g) => window.__setGlassProto(g), g);
  await tab.waitForTimeout(900);
  await tab.screenshot({ path: `${out}/${file}.jpg`, type: "jpeg", quality: 80 });
  const r = JSON.parse(await tab.evaluate(() => document.documentElement.dataset.glassReport));
  const overWork = await tab.evaluate(() => document.querySelectorAll("[data-glass-over-work]").length);
  report.push({ file, ...g, ...r, overWork });
}
async function session(names, plan) {
  const ctx = await context(env, glass({ kind: "light", picture: "dusk" }));
  const tab = await ctx.newPage();
  for (const n of names) { await openWorkspace(tab, env.base, n); for (const [f, g] of plan(n)) await shoot(tab, f, g); console.log("done", n); }
  await ctx.close();
}
const base = { frostOn: true, frost: 30, darkOn: false };
await session(["home", "library", "edit-image", "video-editor", "moodboard", "frame-extractor", "edit-3d"], (n) =>
  [["light", "dusk"], ["dark", "aurora"]].flatMap(([k, p]) => LEVELS.map(([lv, lift]) =>
    [`opacity/${n}-${k}-${lv}`, { ...base, kind: k, picture: p, stackLift: lift ?? NOW[k] }])));
const FADES = ["grad-aurora", "grad-synthwave", "grad-nebula", "grad-ember", "grad-twilight"];
await session(["home", "video-editor"], (n) => FADES.flatMap((p) => [[`fades/${n}-${p}-dark`, { ...base, kind: "dark", picture: p, stackLift: 0.12 }],
  ...(n === "home" ? [[`fades/${n}-${p}-light`, { ...base, kind: "light", picture: p, stackLift: 0.12 }]] : [])]));
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
console.log("shots", report.length, "worst page", Math.min(...report.map((r) => r.worst)), "worst stacked", Math.min(...report.map((r) => r.stackedWorst)));
await env.browser.close(); env.server.close();

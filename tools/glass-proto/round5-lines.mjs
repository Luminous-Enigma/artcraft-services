// Round 5: dark 3D lines on light glass, the 9% charcoal over 14 backgrounds, and the image
// editor before a picture is loaded. node round5.mjs <dist> <out>
import { start, context, glass } from "./lib.mjs";
import { openWorkspace } from "./loaders.mjs";
import fs from "node:fs";
const [dist, out] = process.argv.slice(2);
for (const d of ["lines", "backgrounds", "empty"]) fs.mkdirSync(`${out}/${d}`, { recursive: true });
const env = await start(dist);
const lift9 = (f) => 1 - (1 - f) * 0.91 - f;
const LIFT = { dark: lift9(0.69), light: lift9(0.54) };
const report = [];
const look = (kind, picture, extra = {}) => ({ frostOn: true, frost: 30, darkOn: false, kind, picture, stackLift: LIFT[kind], matchMenu: true, lines: "light", ...extra });
async function shoot(tab, file, g) {
  await tab.evaluate((g) => window.__setGlassProto(g), g); await tab.waitForTimeout(1500);
  await tab.screenshot({ path: `${out}/${file}.jpg`, type: "jpeg", quality: 80 });
  const r = JSON.parse(await tab.evaluate(() => document.documentElement.dataset.glassReport));
  const m = JSON.parse(await tab.evaluate(() => document.documentElement.dataset.glassMatchReport ?? "null"));
  const lines = await tab.evaluate(() => document.documentElement.dataset.sceneLines ?? "light");
  report.push({ file, ...g, ...r, match: m, lines }); console.log(file, JSON.stringify(m), lines);
}
async function session(kind, picture, names, plan) {
  const ctx = await context(env, glass(look(kind, picture)));
  const tab = await ctx.newPage();
  for (const n of names) { await openWorkspace(tab, env.base, n); for (const [f, g] of plan(n)) await shoot(tab, f, g); }
  await ctx.close();
}
// 1. 3D lines.
await session("light", "dusk", ["edit-3d"], () => [
  ["lines/light-dusk-light-lines", look("light", "dusk")], ["lines/light-dusk-dark-lines", look("light", "dusk", { lines: "dark" })],
  ["lines/light-quartz-light-lines", look("light", "quartz")], ["lines/light-quartz-dark-lines", look("light", "quartz", { lines: "dark" })]]);
await session("dark", "aurora", ["edit-3d"], () => [
  ["lines/dark-aurora-light-lines", look("dark", "aurora")], ["lines/dark-aurora-dark-lines", look("dark", "aurora", { lines: "dark" })]]);
fs.writeFileSync(`${out}/report-lines.json`, JSON.stringify(report, null, 1));
console.log("shots", report.length, "worst", Math.min(...report.map((r) => r.match?.worst ?? 99)), "below", report.reduce((a, r) => a + (r.match?.below ?? 0), 0));
await env.browser.close(); env.server.close();

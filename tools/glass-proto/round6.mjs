// Round 6: 9% transparency at Frost 0 and Frost 70, 14 backgrounds, 7 tools, light and dark.
//   node round6.mjs <dist> <out>
import { start, context, glass } from "./lib.mjs";
import { openWorkspace } from "./loaders.mjs";
import fs from "node:fs";
const [dist, out] = process.argv.slice(2); fs.mkdirSync(`${out}/r6`, { recursive: true });
const env = await start(dist);
const lift9 = (f) => 1 - (1 - f) * 0.91 - f;
const LIFT = { dark: lift9(0.69), light: lift9(0.54) };
const BGS = ["aurora", "dusk", "quartz", "shore", "ink", "confetti", "sunrise", "night-city", "marble",
  "grad-aurora", "grad-synthwave", "grad-nebula", "grad-ember", "grad-twilight"];
const TOOLS = ["edit-image", "moodboard", "frame-extractor", "video-editor", "edit-3d", "background-change", "media"];
const report = [];
const look = (kind, picture, frost) => ({ frostOn: frost > 0, frost, darkOn: false, kind, picture, stackLift: LIFT[kind], matchMenu: true, lines: "light" });
for (const kind of ["dark", "light"]) {
  const ctx = await context(env, glass(look(kind, "aurora", 30)));
  const tab = await ctx.newPage();
  for (const n of TOOLS) {
    await openWorkspace(tab, env.base, n);
    for (const frost of [0, 70]) for (const b of BGS) {
      const g = look(kind, b, frost);
      await tab.evaluate((g) => window.__setGlassProto(g), g); await tab.waitForTimeout(700);
      const file = `r6/${n}-${kind}-frost${frost}-${b}`;
      await tab.screenshot({ path: `${out}/${file}.jpg`, type: "jpeg", quality: 72 });
      const r = JSON.parse(await tab.evaluate(() => document.documentElement.dataset.glassReport));
      const m = JSON.parse(await tab.evaluate(() => document.documentElement.dataset.glassMatchReport ?? "null"));
      report.push({ file, ...g, ...r, match: m });
    }
    console.log("done", kind, n, report.at(-1).match);
  }
  await ctx.close();
}
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
const ws = report.map((r) => r.match?.worst ?? 99);
console.log("shots", report.length, "menu", [...new Set(report.map((r) => r.stackedFill))], "worst", Math.min(...ws), "below", report.reduce((a, r) => a + (r.match?.below ?? 0), 0), "no-report", report.filter((r) => !r.match).length);
await env.browser.close(); env.server.close();

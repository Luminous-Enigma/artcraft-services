// Round 3 (experiment): every workspace as see-through as the menu. node match.mjs <dist> <out>
import { start, context, glass } from "./lib.mjs";
import { openWorkspace } from "./loaders.mjs";
import fs from "node:fs";
const [dist, out] = process.argv.slice(2); fs.mkdirSync(`${out}/match`, { recursive: true });
const env = await start(dist);
const report = [];
const LOOKS = [["round2", { stackLift: 0.12, matchMenu: false }], ["match-medium", { stackLift: 0.12, matchMenu: true }], ["match-low", { stackLift: 0.04, matchMenu: true }]];
const ctx = await context(env, glass({ kind: "light", picture: "dusk" }));
const tab = await ctx.newPage();
for (const n of ["edit-image", "moodboard", "frame-extractor", "video-editor", "edit-3d", "background-change", "media"]) {
  await openWorkspace(tab, env.base, n);
  for (const [k, p] of [["light", "dusk"], ["dark", "aurora"]]) for (const [lv, extra] of LOOKS) {
    const g = { frostOn: true, frost: 30, darkOn: false, kind: k, picture: p, ...extra };
    await tab.evaluate((g) => window.__setGlassProto(g), g); await tab.waitForTimeout(900);
    const file = `match/${n}-${k}-${lv}`;
    await tab.screenshot({ path: `${out}/${file}.jpg`, type: "jpeg", quality: 80 });
    const r = JSON.parse(await tab.evaluate(() => document.documentElement.dataset.glassReport));
    const info = await tab.evaluate(() => ({ ws: document.documentElement.dataset.glassWorkspace ?? null,
      total: getComputedStyle(document.documentElement).getPropertyValue("--glass-fill-total").trim(),
      matched: document.querySelectorAll(".glass, [data-glass-over-work]").length }));
    report.push({ file, ...g, ...r, ...info });
  }
  console.log("done", n);
}
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
await env.browser.close(); env.server.close();

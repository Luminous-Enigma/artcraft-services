// Round 4 (experiment): the general match pass, the menu at 9% on dark and light glass, and the
// see-through 3D scene with bolder lines. node match2.mjs <dist> <out>
import { start, context, glass } from "./lib.mjs";
import { openWorkspace } from "./loaders.mjs";
import fs from "node:fs";
const [dist, out] = process.argv.slice(2); fs.mkdirSync(`${out}/match9`, { recursive: true });
const env = await start(dist);
const report = [];
// stackLift that puts the menu's own fill at 9%: total = 1 - (1 - f)(1 - 0.09), lift = total - f.
const lift9 = (f) => 1 - (1 - f) * 0.91 - f;
const LOOKS = [["dark", "aurora", lift9(0.69)], ["light", "dusk", lift9(0.54)]];
for (const [k, p, lift] of LOOKS) {
  const g = { frostOn: true, frost: 30, darkOn: false, kind: k, picture: p, stackLift: lift, matchMenu: true };
  const ctx = await context(env, glass(g));
  const tab = await ctx.newPage();
  for (const n of ["edit-image", "moodboard", "frame-extractor", "video-editor", "edit-3d", "background-change", "media"]) {
    await openWorkspace(tab, env.base, n); await tab.waitForTimeout(1500);
    const file = `match9/${n}-${k}`;
    await tab.screenshot({ path: `${out}/${file}.jpg`, type: "jpeg", quality: 80 });
    const r = JSON.parse(await tab.evaluate(() => document.documentElement.dataset.glassReport));
    const m = JSON.parse(await tab.evaluate(() => document.documentElement.dataset.glassMatchReport ?? "null"));
    report.push({ file, ...g, ...r, match: m });
    console.log(file, "menu", r.stackedFill, "match", JSON.stringify(m));
  }
  await ctx.close();
}
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
await env.browser.close(); env.server.close();

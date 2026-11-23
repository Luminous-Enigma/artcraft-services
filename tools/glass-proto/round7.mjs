// Round 7: the real Glass engine. Every signature look on four places, with its own numbers.
//   node round7.mjs <dist> <out>
import { start, context, glass } from "./lib.mjs";
import { openWorkspace } from "./loaders.mjs";
import fs from "node:fs";
const [dist, out] = process.argv.slice(2); fs.mkdirSync(`${out}/engine`, { recursive: true });
const env = await start(dist);
const SIGS = ["Quartz", "Smoked quartz", "Dusk", "Shore", "Sunrise", "Marble", "Aurora", "Ink", "Night city",
  "Northern lights", "Neon dusk", "Cosmos", "Hearth", "Evening"];
const PLACES = ["home", "edit-image", "video-editor", "edit-3d"];
const report = [];
for (const kindGroup of [SIGS.slice(0, 6), SIGS.slice(6)]) {
  // A fresh load per group: light-glass signatures first, then dark (no live switch across kinds).
  const ctx = await context(env, { on: true, signature: kindGroup[0], matchMenu: true });
  const tab = await ctx.newPage();
  for (const place of PLACES) {
    await openWorkspace(tab, env.base, place);
    for (const sig of kindGroup) {
      await tab.evaluate((s) => window.__setGlassProto({ signature: s }), sig); await tab.waitForTimeout(900);
      const slug = sig.toLowerCase().replace(/\s+/g, "-");
      const file = `engine/${place}-${slug}`;
      await tab.screenshot({ path: `${out}/${file}.jpg`, type: "jpeg", quality: 78 });
      const r = JSON.parse(await tab.evaluate(() => document.documentElement.dataset.glassReport));
      const m = JSON.parse(await tab.evaluate(() => document.documentElement.dataset.glassMatchReport ?? "null"));
      report.push({ file, signature: sig, place, ...r, match: m });
    }
    console.log("done", place, kindGroup[0]);
  }
  await ctx.close();
}
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
const ws = report.filter((r) => r.match).map((r) => r.match.worst);
console.log("shots", report.length, "worst matched surface", Math.min(...ws), "below", report.reduce((a, r) => a + (r.match?.below ?? 0), 0));
await env.browser.close(); env.server.close();

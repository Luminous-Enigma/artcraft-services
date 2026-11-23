// The Frost link: linked (default) thins only while frosted; unlinked thins at any Frost.
import { start, context, glass } from "./lib.mjs";
import { openWorkspace } from "./loaders.mjs";
import fs from "node:fs";
const [dist, out] = process.argv.slice(2); fs.mkdirSync(`${out}/link`, { recursive: true });
const env = await start(dist);
const ctx = await context(env, glass({ kind: "dark", picture: "sunrise", matchMenu: true, transparency: 0.09, linked: true, frost: 30 }));
const tab = await ctx.newPage();
await openWorkspace(tab, env.base, "moodboard");
const rows = [];
for (const [name, g] of [["linked-frost30", { linked: true, frostOn: true, frost: 30 }], ["linked-frost0", { linked: true, frostOn: false, frost: 0 }],
  ["unlinked-frost0", { linked: false, frostOn: false, frost: 0 }], ["unlinked-frost70", { linked: false, frostOn: true, frost: 70 }]]) {
  await tab.evaluate((g) => window.__setGlassProto(g), g); await tab.waitForTimeout(1200);
  await tab.screenshot({ path: `${out}/link/${name}.jpg`, type: "jpeg", quality: 80 });
  const r = JSON.parse(await tab.evaluate(() => document.documentElement.dataset.glassReport));
  const thin = await tab.evaluate(() => document.documentElement.hasAttribute("data-glass-thin"));
  const m = await tab.evaluate(() => document.documentElement.dataset.glassMatchReport ?? null);
  rows.push(`${name.padEnd(18)} thin=${thin} menu=${r.stackedFill} blur=${r.blur} match=${m}`);
}
console.log(rows.join("\n"));
await env.browser.close(); env.server.close();

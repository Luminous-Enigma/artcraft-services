// The Glass adapter, as a person uses it: Glass picked in the app's own theme store (no prototype
// hooks), each signature on four places, plus Settings › Appearance with Glass open.
//   node adapter-shots.mjs <dist> <out>
import { start, context } from "./lib.mjs";
import { openWorkspace } from "./loaders.mjs";
import fs from "node:fs";
import path from "node:path";
const [dist, out] = process.argv.slice(2); fs.mkdirSync(`${out}/adapter`, { recursive: true });
const env = await start(dist);
const sigs = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "glass-signatures.json"), "utf8"));
const PLACES = (process.env.PLACES ?? "home,edit-image,video-editor,edit-3d").split(",");
const report = [];
for (const s of sigs) {
  const { name, theme: _t, code: _c, ...seeds } = s;
  const ctx = await context(env, null, undefined, { mode: "glass", glassSeeds: seeds });
  const tab = await ctx.newPage();
  for (const place of PLACES) {
    await openWorkspace(tab, env.base, place); await tab.waitForTimeout(800);
    const file = `adapter/${place}-${name.toLowerCase().replace(/\s+/g, "-")}`;
    await tab.screenshot({ path: `${out}/${file}.jpg`, type: "jpeg", quality: 78 });
    const state = await tab.evaluate(() => ({
      glass: document.documentElement.dataset.glass ?? null,
      thin: document.documentElement.hasAttribute("data-glass-thin"),
      fill: getComputedStyle(document.documentElement).getPropertyValue("--glass-fill").trim(),
      stacked: getComputedStyle(document.documentElement).getPropertyValue("--glass-fill-stacked").trim(),
      match: JSON.parse(document.documentElement.dataset.glassMatchReport ?? "null"),
    }));
    report.push({ file, signature: name, place, ...state });
  }
  console.log("done", name, JSON.stringify(report.at(-1)));
  await ctx.close();
}
// Settings › Appearance with Glass open.
{
  const ctx = await context(env, null, undefined, { mode: "glass", glassSeeds: (({ name, theme, code, ...x }) => x)(sigs[0]) });
  const tab = await ctx.newPage();
  await tab.goto(env.base + "/"); await tab.waitForTimeout(2000);
  await tab.locator("header button:has(img), [class*=topbar] button:has(img)").last().click();
  await tab.getByRole("menuitem", { name: /settings/i }).or(tab.getByText("Settings", { exact: true })).first().click();
  await tab.getByRole("button", { name: "Appearance" }).first().click();
  await tab.waitForTimeout(1500);
  for (const n of [1, 2, 3, 4, 5, 6]) {
    await tab.evaluate((step) => {
      let el = document.elementFromPoint(900, 500);
      while (el && !(el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      if (el) el.scrollTop = ((el.scrollHeight - el.clientHeight) * (step - 1)) / 5;
    }, n);
    await tab.waitForTimeout(500);
    await tab.screenshot({ path: `${out}/adapter/settings-${n}.jpg`, type: "jpeg", quality: 82 });
  }
  await ctx.close();
}
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
const ws = report.filter((r) => r.match).map((r) => r.match.worst);
console.log("shots", report.length, "glass on", report.filter((r) => r.glass).length, "worst", Math.min(...ws), "below", report.reduce((a, r) => a + (r.match?.below ?? 0), 0));
await env.browser.close(); env.server.close();

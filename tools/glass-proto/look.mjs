import { start, context, glass } from "./lib.mjs";
import { WORKSPACES, openWorkspace } from "./loaders.mjs";
import fs from "node:fs";
const [dist, out, only] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const env = await start(dist);
const ctx = await context(env, glass(JSON.parse(process.env.GLASS ?? "{}")));
const tab = await ctx.newPage();
tab.on("pageerror", (e) => console.log("  pageerror:", e.message.slice(0, 160)));
for (const name of (only ? only.split(",") : Object.keys(WORKSPACES))) {
  await openWorkspace(tab, env.base, name);
  await tab.screenshot({ path: `${out}/${name}.png` }); console.log("shot", name);
}
await env.browser.close(); env.server.close();

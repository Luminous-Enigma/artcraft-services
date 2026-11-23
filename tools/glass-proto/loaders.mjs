// How each workspace gets stand-in work loaded before its picture is taken.
import { STANDIN, settle } from "./lib.mjs";
import path from "node:path";

const click = async (tab, loc, ms = 1200) => { await loc.first().click({ timeout: 5000 }); await tab.waitForTimeout(ms); };
const pickFromLibrary = async (tab, n = 1) => {
  const dialog = tab.locator('[role=dialog]').last();
  await tab.waitForTimeout(1500);
  const items = dialog.locator("img");
  const count = await items.count();
  for (let i = 0; i < Math.min(n, count); i++) await items.nth(i).click({ timeout: 4000 }).catch(() => {});
  await tab.waitForTimeout(500);
  const ok = dialog.getByRole("button", { name: /^(add|select|use|insert|done|confirm|import)/i });
  if (await ok.count()) await ok.last().click().catch(() => {});
  await tab.waitForTimeout(2000);
};

export const WORKSPACES = {
  home: { path: "/" },
  library: { path: "/library" },
  "create-image": { path: "/create-image" },
  "edit-image": { path: "/edit-image", async load(tab) {
    await click(tab, tab.getByRole("button", { name: /pick from library/i }));
    await pickFromLibrary(tab, 1);
  } },
  "video-editor": { path: "/video-editor", async load(tab) {
    await click(tab, tab.getByRole("button", { name: /new project/i }), 3000);
    for (let i = 0; i < 3; i++) { await tab.keyboard.press("Escape"); await tab.waitForTimeout(400); }
    await click(tab, tab.getByRole("button", { name: /browse/i }), 1500);
    await tab.getByText(/^Video$/).first().click().catch(() => {});
    await pickFromLibrary(tab, 2);
    // Drag each asset from the asset panel onto the timeline.
    const assets = tab.locator('[draggable=true]');
    const n = await assets.count(); console.log("  video assets:", n);
    const lane = await tab.locator('text=Main scene').first().boundingBox().catch(() => null);
    for (let i = 0; i < Math.min(n, 3); i++) {
      const box = await assets.nth(i).boundingBox(); if (!box || !lane) break;
      await tab.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await tab.mouse.down();
      await tab.mouse.move(lane.x - 200 + i * 250, lane.y + 60, { steps: 12 }); await tab.mouse.up(); await tab.waitForTimeout(1500);
    }
  } },
  "edit-3d": { path: "/edit-3d", async load(tab) {
    await click(tab, tab.getByRole("button", { name: /lone drifter/i }), 6000);
  } },
  moodboard: { path: "/moodboard", async load(tab) {
    await click(tab, tab.getByRole("button", { name: /^from library$/i }));
    await pickFromLibrary(tab, 8);
  } },
  "background-change": { path: "/background-change", async load(tab) {
    const inputs = tab.locator("input[type=file]");
    await inputs.nth(0).setInputFiles(path.join(STANDIN, "clip-2.mp4")).catch((e) => console.log("  bg video:", e.message.slice(0, 80)));
    await tab.waitForTimeout(1500);
    await inputs.nth(1).setInputFiles(path.join(STANDIN, "work-06.jpg")).catch((e) => console.log("  bg image:", e.message.slice(0, 80)));
    await tab.waitForTimeout(2500);
  } },
  "frame-extractor": { path: "/frame-extractor", async load(tab) {
    await tab.locator("input[type=file]").first().setInputFiles(path.join(STANDIN, "clip-1.mp4"));
    await tab.waitForTimeout(4000);
    await tab.getByRole("button", { name: /capture frame/i }).first().click().catch(() => {});
    await tab.waitForTimeout(1500);
  } },
  media: { path: "/media/m_standin4" },
};

export async function openWorkspace(tab, base, name) {
  const w = WORKSPACES[name];
  await tab.goto(base + w.path); await settle(tab, 2500);
  if (w.load) await w.load(tab).catch((e) => console.log(`  ${name} load:`, e.message.split("\n")[0].slice(0, 120)));
  await settle(tab, 1500);
}

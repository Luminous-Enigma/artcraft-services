import { contrastRatio, type Hex, mix } from "./contrast";
import { type SoulMarkGlass, glassVariables } from "./glass";
import { GLASS_PICTURES } from "./glass-presets";
import { AA, cssVariables } from "./soul-mark";
import { workspaceGrid } from "./workspace";

/**
 * Soul Mark: Glass in ArtCraft: the app's side of it. The engine (glass.ts) decides every color
 * and how much of the picture each layer covers; this puts that on the page:
 * - the picture behind the glass (a starter, a fade, or the person's own, fitted to the window),
 * - the glass layers' variables and the data-* switches styles.css reads,
 * - finding glass that sits over someone's work, and matching every workspace surface to the
 *   menu, measuring each changed surface's text over pure black and white beneath,
 * - the 3D editor's see-through scene and its guide-line color.
 */

/** Where a person's own picture is kept on this device (fitted to their screen, as a JPEG). */
export const CUSTOM_PICTURE_KEY = "artcraft-glass-picture";

/** Sets Glass on <html>; returns the variable names it set, for the theme store to clear later. */
export function applyGlass(root: HTMLElement, c: SoulMarkGlass): string[] {
  const vars: Record<string, string> = {
    ...cssVariables({ ...c.mark, gradient: undefined }),
    ...glassVariables(c),
    "--glass-picture": pictureCss(c.seeds.picture),
  };
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  root.dataset.glass = c.seeds.kind;
  root.dataset.glassMatch = "";
  if (c.thin) root.dataset.glassThin = "";
  else delete root.dataset.glassThin;
  setSceneLines(c.seeds.lines === "dark" ? "#000000" : null);
  matchFills = { base: c.fill, stacked: c.stackedFill, total: c.overWorkFill, fg: c.mark.tokens.fg, under: c.mark.tokens.bg };
  markGlassOverWork();
  window.setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
  return Object.keys(vars);
}

/** Takes Glass off <html>. */
export function clearGlass(root: HTMLElement) {
  for (const k of ["glass", "glassMatch", "glassThin", "glassMatchReport"]) delete root.dataset[k];
  setSceneLines(null);
  matchPass();
}

/** The picture behind the glass, as CSS: a starter's file, a fade as a gradient, or one's own. */
function pictureCss(id: string): string {
  if (id === "custom") {
    try {
      const own = localStorage.getItem(CUSTOM_PICTURE_KEY);
      if (own && own.startsWith("data:image/jpeg;base64,")) return `url("${own}")`;
    } catch {
      // No storage: fall back to the starter below.
    }
    id = "quartz";
  }
  const p = GLASS_PICTURES.find((x) => x.id === id);
  if (p?.kind === "fade" && p.colors) return `linear-gradient(to bottom, ${p.colors.join(", ")})`;
  return `url("/glass/${p ? p.id : "quartz"}.jpg")`;
}

/**
 * A person's own picture, fitted to their screen: scaled to cover the window at its largest
 * (device pixels, at most 2560 wide), centered, saved as a JPEG on this device. Big uploads stay
 * light; small ones are scaled up. Readability never depends on it.
 */
export async function saveCustomPicture(file: File): Promise<void> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fail(new Error("That file isn't a picture this browser can open."));
      i.src = url;
    });
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.min(2560, Math.round(window.screen.width * scale));
    const h = Math.round((w * window.screen.height) / window.screen.width);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't fit the picture.");
    const cover = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * cover;
    const dh = img.naturalHeight * cover;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    localStorage.setItem(CUSTOM_PICTURE_KEY, canvas.toDataURL("image/jpeg", 0.82));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function setSceneLines(color: string | null) {
  const root = document.documentElement;
  const want = color ?? undefined;
  if (root.dataset.sceneLines === want) return;
  if (want) root.dataset.sceneLines = want;
  else delete root.dataset.sceneLines;
  window.dispatchEvent(new Event("artcraft:scene-line-color"));
}

/** Glass that can sit over work: never thinned, since anything can be under it. */
const GLASS_PANELS = '.bg-sidebar, [class*="bg-ui-panel"], .bg-background';
const WORK = "canvas, video, img";

/**
 * Marks glass panels that overlap someone's work (a canvas, video or picture that isn't inside
 * the panel itself) with data-glass-over-work, so the stacked thinning in styles.css skips them.
 * Rechecked whenever the page changes, at most every 300 ms.
 */
let watching = false;
function markGlassOverWork() {
  if (watching || typeof document === "undefined") return;
  watching = true;
  let pending = 0;
  const run = () => {
    pending = 0;
    const work = Array.from(document.querySelectorAll<HTMLElement>(WORK))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 40 && r.height > 40);
    for (const panel of Array.from(document.querySelectorAll<HTMLElement>(GLASS_PANELS))) {
      const p = panel.getBoundingClientRect();
      const over = work.some(({ el, r }) => !panel.contains(el) && !el.contains(panel)
        && r.left < p.right && r.right > p.left && r.top < p.bottom && r.bottom > p.top);
      if (over) panel.dataset.glassOverWork = "";
      else delete panel.dataset.glassOverWork;
    }
    matchPass();
  };
  const later = () => { if (!pending) pending = window.setTimeout(run, 300); };
  // Which page is open: a workspace (theme/workspace.ts), and which one.
  const mark = () => {
    const path = window.location.pathname;
    const root = document.documentElement;
    if (workspaceGrid(path) !== null) root.dataset.glassWorkspace = path.split("/")[1] ?? "";
    else delete root.dataset.glassWorkspace;
  };
  mark();
  window.setInterval(mark, 400);
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", later);
  window.addEventListener("scroll", later, true);
  run();
}

// ---------------------------------------------------------------------------------------------
// Every workspace surface as see-through as the menu (the owner's choice, round 4).

/** The fills the match pass uses, set by applyGlass. */
let matchFills = { base: 1, stacked: 1, total: 1, fg: "#FFFFFF" as Hex, under: "#000000" as Hex };

/**
 * Inside a workspace, every neutral surface (not pictures, video, canvases or colored buttons)
 * is set like the menu: the bottom layer keeps the page fill, so text never sits on the bare
 * picture; layers stacked on it take the menu's thin fill; and a surface straight over work
 * covers as much as the menu does in all. Each changed surface's text is measured over pure
 * black and white beneath; the lowest result is kept in html[data-glass-match-report].
 */
function matchPass() {
  const root = document.documentElement;
  const on = root.hasAttribute("data-glass-match") && root.hasAttribute("data-glass-workspace") && root.hasAttribute("data-glass-thin");
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-glass-orig]"))) {
    el.style.removeProperty("background-color");
    el.style.removeProperty("backdrop-filter");
    el.style.removeProperty("-webkit-backdrop-filter");
    delete el.dataset.glassOrig;
  }
  if (!on) { delete root.dataset.glassMatchReport; return; }
  const scope = document.querySelector("main")?.parentElement ?? document.body;
  const work = Array.from(document.querySelectorAll<HTMLElement>("canvas, video, img"))
    .map((el) => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.width > 40 && r.height > 40);
  const painted = new Set<Element>();
  let worst = 99, changed = 0, below = 0;
  for (const el of Array.from(scope.querySelectorAll<HTMLElement>("*"))) {
    if (/^(CANVAS|VIDEO|IMG|svg|path)$/i.test(el.tagName) || el.closest("[data-sidebar]")) continue;
    const b = el.getBoundingClientRect();
    if (b.width * b.height < 400) continue;
    const rgba = parseRgba(getComputedStyle(el).backgroundColor);
    if (!rgba || rgba[3] < 0.02) continue;
    const [r, g, bl] = rgba;
    if ((Math.max(r, g, bl) - Math.min(r, g, bl)) / 255 > 0.12) { painted.add(el); continue; } // colored: leave it
    // A neutral fill far from the glass (a dark "ink" button on light glass, a black video frame
    // or badge) carries text made for that fill: it stays solid.
    if (contrastRatio(hexOf(r, g, bl), matchFills.under) > 3) { painted.add(el); continue; }
    // Painted glass under this surface. Glass that also holds the work (the page glass around a
    // canvas) is drawn beneath the work, so over the work it doesn't count.
    const glassUnder: Element[] = [];
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (painted.has(p)) glassUnder.push(p);
    const overWork = work.some(({ el: w, r: wr }) => !el.contains(w) && !w.contains(el)
      && wr.left < b.right && wr.right > b.left && wr.top < b.bottom && wr.bottom > b.top
      && !glassUnder.some((g) => !g.contains(w)));
    const covered = !overWork && glassUnder.length > 0;
    const fill = overWork ? matchFills.total : covered ? matchFills.stacked : matchFills.base;
    const own = hexOf(r, g, bl);
    el.dataset.glassOrig = "";
    el.style.setProperty("background-color", `rgb(${r} ${g} ${bl} / ${fill})`, "important");
    el.style.setProperty("backdrop-filter", "blur(var(--glass-blur)) saturate(1.15)", "important");
    el.style.setProperty("-webkit-backdrop-filter", "blur(var(--glass-blur)) saturate(1.15)", "important");
    painted.add(el);
    changed++;
    if (el.innerText && el.innerText.trim()) {
      const ink = parseRgba(getComputedStyle(el).color);
      const fg = ink ? hexOf(ink[0], ink[1], ink[2]) : matchFills.fg;
      const c = Math.min(...(["#000000", "#FFFFFF"] as Hex[]).map((B) => {
        const under = covered ? mix(B, matchFills.under, matchFills.base) : B;
        return contrastRatio(mix(under, own, fill), fg);
      }));
      worst = Math.min(worst, c);
      if (c < AA) below++;
    }
  }
  root.dataset.glassMatchReport = JSON.stringify({ changed, worst: Math.round(worst * 100) / 100, below });
}

function parseRgba(css: string): [number, number, number, number] | null {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return [v[0], v[1], v[2], v[3] ?? 1];
}

function hexOf(r: number, g: number, b: number): Hex {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}` as Hex;
}

/**
 * 3D: while Glass is on, the scene's own background is cleared to see-through, so the grid, floor
 * lines and objects keep their full strength over the glass behind them. WebGL contexts are asked
 * for an alpha channel, and clears are made transparent on /edit-3d only while Glass is on.
 */
if (typeof window !== "undefined") {
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, attrs?: unknown) {
    // Only while Glass is on: every other theme's canvases are created exactly as before.
    const webgl = (type === "webgl" || type === "webgl2") && document.documentElement.hasAttribute("data-glass");
    const ctx = (getContext as (t: string, a?: unknown) => unknown).call(this, type, webgl ? { ...(attrs as object), alpha: true, premultipliedAlpha: true } : attrs);
    if (webgl && ctx && !(ctx as { __glassClear?: boolean }).__glassClear) {
      const gl = ctx as WebGLRenderingContext & { __glassClear?: boolean };
      const clearColor = gl.clearColor.bind(gl);
      gl.clearColor = (r, g, b, a) => {
        const see = document.documentElement.hasAttribute("data-glass") && window.location.pathname.startsWith("/edit-3d");
        return see ? clearColor(0, 0, 0, 0) : clearColor(r, g, b, a);
      };
      gl.__glassClear = true;
    }
    return ctx;
  } as typeof HTMLCanvasElement.prototype.getContext;
}


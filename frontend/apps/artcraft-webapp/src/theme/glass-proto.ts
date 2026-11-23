import { contrastRatio, type Hex, mix } from "./contrast";
import { composeGlass, GLASS_STARTER, type GlassSeeds, glassVariables, type SoulMarkGlass } from "./glass";
import { GLASS_PICTURES, GLASS_SIGNATURES } from "./glass-presets";
import { AA, cssVariables } from "./soul-mark";
import { workspaceGrid } from "./workspace";

/**
 * PROTOTYPE adapter for Soul Mark: Glass, for the owner's review. Every number comes from the
 * engine (glass.ts, copied from Soul-Mark-Themes): the glass color, each layer's fill, the
 * accent fitted to the glass, the blur and the smoke. What's left here is the app's side:
 * reading the setting from localStorage ("artcraft-glass-proto"; there is no picker card yet),
 * finding glass over work, and the match-the-menu pass for workspaces.
 */
export interface GlassProto extends Partial<GlassSeeds> {
  on: boolean;
  /** A signature look by name; its seeds come first, the other fields override them. */
  signature?: string;
  /** Inside a workspace, every neutral surface is set the way the menu is (owner's choice). */
  matchMenu?: boolean;
}

export const GLASS_PROTO_DEFAULTS: GlassProto = { on: false, matchMenu: true };

export function readGlassProto(): GlassProto {
  try {
    const raw = JSON.parse(localStorage.getItem("artcraft-glass-proto") ?? "null");
    return raw && typeof raw === "object" ? { ...GLASS_PROTO_DEFAULTS, ...raw } : GLASS_PROTO_DEFAULTS;
  } catch {
    return GLASS_PROTO_DEFAULTS;
  }
}

/** The seeds the prototype draws with: a signature's (if named), then any fields set. */
export function protoSeeds(g: GlassProto): GlassSeeds {
  const sig = g.signature ? GLASS_SIGNATURES.find((s) => s.name.toLowerCase() === g.signature!.toLowerCase()) : undefined;
  const { on: _on, signature: _s, matchMenu: _m, ...fields } = g;
  const { name: _name, ...sigSeeds } = sig ?? { name: "" };
  return { ...GLASS_STARTER, ...sigSeeds, ...fields } as GlassSeeds;
}

/** The picture behind the glass, as CSS: a starter's file, or a fade as a gradient. */
function pictureCss(id: string): string {
  const p = GLASS_PICTURES.find((x) => x.id === id);
  if (p?.kind === "fade" && p.colors) return `linear-gradient(to bottom, ${p.colors.join(", ")})`;
  return `url("/glass/${/^[a-z0-9-]{1,32}$/.test(id) ? id : "quartz"}.jpg")`;
}

/** Sets the glass on <html>. Returns false when the prototype is off. */
export function applyGlassProto(): boolean {
  const g = readGlassProto();
  const root = document.documentElement;
  if (!g.on) { delete root.dataset.glass; return false; }
  const c: SoulMarkGlass = composeGlass(protoSeeds(g));
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  for (const [name, value] of Object.entries({ ...cssVariables({ ...c.mark, gradient: undefined }), ...glassVariables(c) }))
    set(name, value);
  set("--glass-picture", pictureCss(c.seeds.picture));
  root.dataset.theme = "soul-mark";
  root.dataset.glass = c.seeds.kind;
  if (c.thin) root.dataset.glassThin = "";
  else delete root.dataset.glassThin;
  if (g.matchMenu !== false) root.dataset.glassMatch = "";
  else delete root.dataset.glassMatch;
  const dark = c.seeds.lines === "dark";
  const sceneLines = dark ? "#000000" : "#ffffff";
  if (root.dataset.sceneLines !== sceneLines) {
    if (dark) root.dataset.sceneLines = sceneLines; else delete root.dataset.sceneLines;
    window.dispatchEvent(new Event("artcraft:scene-line-color"));
  }
  matchFills = { base: c.fill, stacked: c.stackedFill, total: c.overWorkFill, fg: c.mark.tokens.fg, under: c.mark.tokens.bg };
  markGlassOverWork();
  window.setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
  root.dataset.glassReport = JSON.stringify({
    kind: c.seeds.kind, picture: c.seeds.picture, glass: c.glass, fill: c.fill, stackedFill: c.stackedFill,
    overWorkFill: c.overWorkFill, thin: c.thin, blur: c.blur, smoke: c.smoke, textFade: c.textFade,
    accentText: c.mark.tokens.accentText, notes: c.notes.length,
  });
  return true;
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
// EXPERIMENT (matchMenu): every workspace surface as see-through as the menu.

/** The fills the match pass uses, set by applyGlassProto. */
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
 * 3D: while the experiment is on, the scene's own background is cleared to see-through, so the
 * grid, floor lines and objects keep their full strength over the glass behind them. WebGL
 * contexts are asked for an alpha channel, and clears are made transparent on /edit-3d only.
 */
if (typeof window !== "undefined" && readGlassProto().on) {
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, attrs?: unknown) {
    const webgl = type === "webgl" || type === "webgl2";
    const ctx = (getContext as (t: string, a?: unknown) => unknown).call(this, type, webgl ? { ...(attrs as object), alpha: true, premultipliedAlpha: true } : attrs);
    if (webgl && ctx && !(ctx as { __glassClear?: boolean }).__glassClear) {
      const gl = ctx as WebGLRenderingContext & { __glassClear?: boolean };
      const clearColor = gl.clearColor.bind(gl);
      gl.clearColor = (r, g, b, a) => {
        const see = document.documentElement.hasAttribute("data-glass-match") && window.location.pathname.startsWith("/edit-3d");
        return see ? clearColor(0, 0, 0, 0) : clearColor(r, g, b, a);
      };
      gl.__glassClear = true;
    }
    return ctx;
  } as typeof HTMLCanvasElement.prototype.getContext;
}

// PROTOTYPE only: lets the screenshot tools change the glass live, so loaded work isn't lost.
if (typeof window !== "undefined") {
  (window as unknown as { __setGlassProto?: (g: Partial<GlassProto>) => void }).__setGlassProto = (g) => {
    localStorage.setItem("artcraft-glass-proto", JSON.stringify({ ...readGlassProto(), ...g }));
    applyGlassProto();
  };
}

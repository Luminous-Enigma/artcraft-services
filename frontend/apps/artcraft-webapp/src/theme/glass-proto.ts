import { channels, contrastRatio, type Hex, mix, rgbTriplet } from "./contrast";
import { AA, composeSoulMark, cssVariables, type SoulMark } from "./soul-mark";
import { workspaceGrid } from "./workspace";

/**
 * PROTOTYPE of Soul Mark: Glass, for the owner's first look. Not the engine: that comes to
 * Soul-Mark-Themes once the pictures decide where glass works. Read from localStorage
 * ("artcraft-glass-proto"); there is no picker card yet.
 *
 * Glass is a see-through fill over a picture. Frost is the blur only. Darkened is a smoke tint:
 * it darkens the glass and the background picture. The fill is never left to taste: it is the
 * least that keeps body text at AA over the darkest and the lightest thing that can be behind
 * (pure black and pure white; smoke and frost don't count), so it holds over any picture or work.
 */
export interface GlassProto {
  on: boolean;
  kind: "light" | "dark";
  frostOn: boolean;
  /** 0 to 100. */
  frost: number;
  darkOn: boolean;
  /** 0 to 100. */
  darkened: number;
  /** A starter picture's name (public/glass/<name>.jpg). */
  picture: string;
  /** Guard off: the fill is `fill` as given, and shortfalls are logged. */
  guard: boolean;
  fill?: number;
  /**
   * While frosted: how much more of the picture glass stacked on the page glass (the side menu,
   * workspace panels) covers than the page alone, 0 to 1. Unset = no thinning (two full layers).
   */
  stackLift?: number;
  /**
   * EXPERIMENT (owner's request, to look at): inside a workspace, every surface takes the menu's
   * fill, the floating tools and glass over work included, and the 3D scene itself turns as
   * see-through as the menu. Readability over work is then not promised; it is measured.
   */
  matchMenu?: boolean;
  /** 3D guide lines (grid, camera) on glass: the default light, or dark. */
  lines?: "light" | "dark";
}

export const GLASS_PROTO_DEFAULTS: GlassProto = {
  on: false, kind: "light", frostOn: true, frost: 30, darkOn: false, darkened: 50,
  picture: "quartz", guard: true,
};

const BASE: Record<GlassProto["kind"], Hex> = { light: "#F2F5F8", dark: "#2B2E33" };
const SMOKE: Hex = "#101214";
const ACCENT: Hex = "#3B82F6";
/** Blur at frost 100, in pixels. */
const MAX_BLUR = 40;
/** How much of what is behind the smoke can hide at Darkened 100. */
const MAX_SMOKE_BEHIND = 0.75;
/** How far the glass itself goes toward smoke at Darkened 100. */
const MAX_SMOKE_GLASS = 0.8;

export function readGlassProto(): GlassProto {
  try {
    const raw = JSON.parse(localStorage.getItem("artcraft-glass-proto") ?? "null");
    if (!raw || typeof raw !== "object") return GLASS_PROTO_DEFAULTS;
    const g = { ...GLASS_PROTO_DEFAULTS, ...raw } as GlassProto;
    g.frost = clamp(Number(g.frost), 0, 100);
    g.darkened = clamp(Number(g.darkened), 0, 100);
    g.kind = g.kind === "dark" ? "dark" : "light";
    g.picture = /^[a-z0-9-]{1,32}$/.test(String(g.picture)) ? g.picture : "quartz";
    return g;
  } catch {
    return GLASS_PROTO_DEFAULTS;
  }
}

export interface ComposedGlass {
  mark: SoulMark;
  glass: Hex;
  panel: Hex;
  fill: number;
  blur: number;
  smokeBehind: number;
  /** Body text over the glass at its worst spot (black or white behind). */
  worst: number;
  /** The fill of glass stacked on the page glass, and its text at the worst spot. */
  stackedFill: number;
  stackedWorst: number;
}

export function composeGlassProto(g: GlassProto): ComposedGlass {
  const d = g.darkOn ? g.darkened / 100 : 0;
  const glass = mix(BASE[g.kind], SMOKE, d * MAX_SMOKE_GLASS);
  const mark = composeSoulMark({ background: glass, accent: ACCENT, tint: 0.5, character: "cool" });
  const smokeBehind = d * MAX_SMOKE_BEHIND;
  // The smoke covers only the background picture. Glass that floats over work (a toolbar over
  // an image, a menu over a video) has no smoke under it, so, like frost, it isn't counted.
  const behind: Hex[] = ["#000000", "#FFFFFF"];
  const fg = mark.tokens.fg;
  const surfaces = [mark.tokens.bg, mark.tokens.panel];
  const worstAt = (fill: number) =>
    Math.min(...surfaces.flatMap((s) => behind.map((b) => contrastRatio(mix(b, s, fill), fg))));
  let fill = g.guard ? 1 : clamp(g.fill ?? 0.3, 0, 1);
  if (g.guard) {
    for (let f = 0; f <= 1.0001; f += 0.01) {
      if (worstAt(f) >= AA) { fill = Math.round(f * 100) / 100; break; }
    }
  }
  // Glass stacked on the page glass sees the picture through the page's fill too, so it can be
  // thinner and still keep its text readable over pure black or pure white beneath both layers.
  const { bg, panel } = mark.tokens;
  const stackedWorstAt = (p: number) =>
    Math.min(...behind.map((b) => contrastRatio(mix(mix(b, bg, fill), panel, p), fg)));
  const frosted = g.frostOn && g.frost > 0;
  let stackedFill = fill;
  if (frosted && g.stackLift != null) {
    const total = Math.min(1, fill + clamp(g.stackLift, 0, 1));
    stackedFill = fill >= 1 ? 0 : Math.max(0, 1 - (1 - total) / (1 - fill));
    while (g.guard && stackedFill < 1 && stackedWorstAt(stackedFill) < AA) stackedFill = Math.min(1, stackedFill + 0.01);
    stackedFill = Math.round(stackedFill * 100) / 100;
  }
  return {
    mark, glass, panel, fill,
    blur: g.frostOn ? (g.frost / 100) * MAX_BLUR : 0,
    smokeBehind, worst: worstAt(fill),
    stackedFill, stackedWorst: stackedWorstAt(stackedFill),
  };
}

/** Sets the glass on <html>. Returns false when the prototype is off. */
export function applyGlassProto(): boolean {
  const g = readGlassProto();
  const root = document.documentElement;
  if (!g.on) { delete root.dataset.glass; return false; }
  const c = composeGlassProto(g);
  for (const [name, value] of Object.entries(cssVariables({ ...c.mark, gradient: undefined })))
    root.style.setProperty(name, value);
  root.dataset.theme = "soul-mark";
  root.dataset.glass = g.kind;
  if (g.frostOn && g.frost > 0) root.dataset.glassFrosted = "";
  else delete root.dataset.glassFrosted;
  if (g.matchMenu) root.dataset.glassMatch = "";
  else delete root.dataset.glassMatch;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set("--glass-rgb", rgbTriplet(c.mark.tokens.bg));
  set("--glass-panel-rgb", rgbTriplet(c.panel));
  set("--glass-fill", String(c.fill));
  set("--glass-blur", `${c.blur.toFixed(1)}px`);
  set("--glass-smoke-rgb", rgbTriplet(SMOKE));
  set("--glass-smoke", String(c.smokeBehind));
  set("--glass-fill-stacked", String(c.stackedFill));
  const total = Math.round((1 - (1 - c.fill) * (1 - c.stackedFill)) * 100) / 100;
  set("--glass-fill-total", String(total));
  const dark = g.lines === "dark";
  set("--glass-line-rgb", dark ? "0 0 0" : rgbTriplet(c.mark.tokens.fg));
  const sceneLines = dark ? "#000000" : "#ffffff";
  if (root.dataset.sceneLines !== sceneLines) {
    if (dark) root.dataset.sceneLines = sceneLines; else delete root.dataset.sceneLines;
    window.dispatchEvent(new Event("artcraft:scene-line-color"));
  }
  matchFills = { base: c.fill, stacked: c.stackedFill, total, fg: c.mark.tokens.fg, under: c.mark.tokens.bg };
  set("--glass-picture", `url("/glass/${g.picture}.jpg")`);
  markGlassOverWork();
  window.setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
  root.dataset.glassReport = JSON.stringify({
    glass: c.glass, fill: c.fill, blur: c.blur, smoke: c.smokeBehind,
    worst: Math.round(c.worst * 100) / 100, guard: g.guard, fg: c.mark.tokens.fg,
    stackedFill: c.stackedFill, stackedWorst: Math.round(c.stackedWorst * 100) / 100,
    channels: channels(c.glass),
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

function clamp(v: number, lo: number, hi: number) {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
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
  const on = root.hasAttribute("data-glass-match") && root.hasAttribute("data-glass-workspace") && root.hasAttribute("data-glass-frosted");
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
    let covered = false;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (painted.has(p)) { covered = true; break; }
    const overWork = work.some(({ el: w, r: wr }) => !el.contains(w) && !w.contains(el) && !covered
      && wr.left < b.right && wr.right > b.left && wr.top < b.bottom && wr.bottom > b.top);
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

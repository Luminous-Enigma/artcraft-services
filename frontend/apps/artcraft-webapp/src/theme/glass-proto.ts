import { channels, contrastRatio, type Hex, mix, rgbTriplet } from "./contrast";
import { AA, composeSoulMark, cssVariables, type SoulMark } from "./soul-mark";

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
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set("--glass-rgb", rgbTriplet(c.mark.tokens.bg));
  set("--glass-panel-rgb", rgbTriplet(c.panel));
  set("--glass-fill", String(c.fill));
  set("--glass-blur", `${c.blur.toFixed(1)}px`);
  set("--glass-smoke-rgb", rgbTriplet(SMOKE));
  set("--glass-smoke", String(c.smokeBehind));
  set("--glass-fill-stacked", String(c.stackedFill));
  set("--glass-picture", `url("/glass/${g.picture}.jpg")`);
  markGlassOverWork();
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
  };
  const later = () => { if (!pending) pending = window.setTimeout(run, 300); };
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  window.addEventListener("resize", later);
  window.addEventListener("scroll", later, true);
  run();
}

function clamp(v: number, lo: number, hi: number) {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
}

// PROTOTYPE only: lets the screenshot tools change the glass live, so loaded work isn't lost.
if (typeof window !== "undefined") {
  (window as unknown as { __setGlassProto?: (g: Partial<GlassProto>) => void }).__setGlassProto = (g) => {
    localStorage.setItem("artcraft-glass-proto", JSON.stringify({ ...readGlassProto(), ...g }));
    applyGlassProto();
  };
}

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
  return {
    mark, glass, panel: mark.tokens.panel, fill,
    blur: g.frostOn ? (g.frost / 100) * MAX_BLUR : 0,
    smokeBehind, worst: worstAt(fill),
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
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set("--glass-rgb", rgbTriplet(c.mark.tokens.bg));
  set("--glass-panel-rgb", rgbTriplet(c.panel));
  set("--glass-fill", String(c.fill));
  set("--glass-blur", `${c.blur.toFixed(1)}px`);
  set("--glass-smoke-rgb", rgbTriplet(SMOKE));
  set("--glass-smoke", String(c.smokeBehind));
  set("--glass-picture", `url("/glass/${g.picture}.jpg")`);
  root.dataset.glassReport = JSON.stringify({
    glass: c.glass, fill: c.fill, blur: c.blur, smoke: c.smokeBehind,
    worst: Math.round(c.worst * 100) / 100, guard: g.guard, fg: c.mark.tokens.fg,
    channels: channels(c.glass),
  });
  return true;
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

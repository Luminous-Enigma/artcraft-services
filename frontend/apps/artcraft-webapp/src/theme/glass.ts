// Soul Mark: Glass. For people who want to explore how far the design and work limits of the app,
// their workspace and their own experience can go. Purely for fun, and because it's cool.
//
// True glass: the app's page, side menu, panels, menus and dialogs are see-through, over a
// picture (in a web app) or the desktop itself (in a desktop app). Built on top of the Solid Tones
// engine (soul-mark.ts), which it never changes: the glass color is composed like any background,
// so text, panels and accent come from composeSoulMark, and Glass adds how see-through each layer
// is, the frost, and the smoke.
//
// The readability promise holds here too. Glass is a see-through fill over something the theme
// doesn't control, so every text is measured against the glass over the darkest and the lightest
// thing that can be behind it: pure black and pure white. Frost (blur) and the smoke under
// Darkened are never counted, since glass can float over someone's work that neither reaches.
// - The page glass, straight over the picture, takes the least fill that keeps every text at AA
//   (faded captions are strengthened first, down to MIN_TEXT_FADE, before it gets thicker).
// - Glass stacked on the page glass (the side menu, workspace panels) takes the Transparency
//   setting, raised only as far as its text needs, measured over the page glass over black or
//   white.
// - Glass straight over work (a toolbar over an image) covers as much as the page and the menu do
//   together.
// With the guard off, everything is used as picked and what falls short is said.
//
// Apps: menus and dialogs can open over anything, so they take the page fill; and pictures,
// video, buttons, fields and colored fills are never made see-through.
import { contrastRatio, type Hex, isHex, mix, nearestLightness, rgbTriplet } from "./contrast";
import {
  AA,
  composeSoulMark,
  measureAccent,
  measureText,
  MIN_TEXT_FADE,
  NON_TEXT,
  type Shortfall,
  type SoulMark,
  type SoulMarkTokens,
  sanitizeSeeds,
} from "./soul-mark";

/** The two glasses: clear (light) and charcoal (dark). */
export const GLASS_BASE: Record<GlassKind, Hex> = { light: "#F2F5F8", dark: "#2B2E33" };
/** Darkened's smoke color. */
export const SMOKE: Hex = "#101214";
/** How far the glass itself goes toward smoke at Darkened 100. */
export const SMOKE_GLASS_MAX = 0.8;
/** How much of the picture the smoke covers at Darkened 100 (never counted for readability). */
export const SMOKE_BEHIND_MAX = 0.75;
/** Blur at Frost 100, in CSS pixels. */
export const FROST_MAX_BLUR = 40;
/** What can be behind the glass: anything, so the two extremes. */
export const BEHIND: Hex[] = ["#000000", "#FFFFFF"];
/** The steps the guard takes when it thickens the glass. */
const STEP = 0.01;

export type GlassKind = "light" | "dark";

export interface GlassSeeds {
  kind: GlassKind;
  /** Buttons, links and selection, fitted to the glass like any accent. */
  accent: Hex;
  /** The picture behind the glass: a starter's id (glass-presets.ts) or "custom". Not measured. */
  picture: string;
  /** Frost: the blur, 0 to 100. On at 30 by default. */
  frost: number;
  frostOn: boolean;
  /** Transparency: how much of the picture the stacked glass's own fill covers, 0 to 1. Default 0.09. */
  transparency: number;
  /** Transparency linked to Frost: it applies only while frosted. On by default. */
  linked: boolean;
  /** Darkened: a smoky tint, 0 to 100, like transition lenses but chosen. */
  darkened: number;
  darkOn: boolean;
  /** The 3D editor's guide lines: light (the default) or dark. Dark is offered on light glass only. */
  lines: "light" | "dark";
  /** The readability guard, on unless set to false. */
  guard?: boolean;
  /** Guard off only: the page glass's fill as picked, 0 to 1. */
  fill?: number;
}

export interface GlassNote {
  kind: "adjusted" | "warning" | "info";
  seed: "transparency" | "text" | "lines" | "fill";
  message: string;
  chosen: string;
  used: string;
}

export interface SoulMarkGlass {
  seeds: GlassSeeds;
  /** The theme composed on the glass color: text, panels, accent. Its surfaces are solid here. */
  mark: SoulMark;
  /** The glass color as used (Darkened mixes in the smoke). */
  glass: Hex;
  /** The page glass's fill, straight over the picture, 0 to 1. */
  fill: number;
  /** The fill of glass stacked on the page glass (side menu, workspace panels). */
  stackedFill: number;
  /** Glass straight over work: as much as the page and the menu cover together. */
  overWorkFill: number;
  /** Whether Transparency thins the stacked glass now (linked: only while frosted). */
  thin: boolean;
  /** Blur in CSS pixels. */
  blur: number;
  /** How much the smoke covers the picture, 0 to 1 (never counted for readability). */
  smoke: number;
  /** The 3D guide-line color. */
  lines: Hex;
  /** How faded text draws on glass (1 = as the app declares it). */
  textFade: number;
  notes: GlassNote[];
  /** With the guard off: what falls short. */
  shortfalls: Shortfall[];
}

export const GLASS_STARTER: GlassSeeds = {
  kind: "light",
  accent: "#2D81FF",
  picture: "quartz",
  frost: 30,
  frostOn: true,
  transparency: 0.09,
  linked: true,
  darkened: 50,
  darkOn: false,
  lines: "light",
  guard: true,
};

/** Turns stored or typed Glass seeds into valid ones; anything unusable falls back to the starter. */
export function sanitizeGlassSeeds(raw: unknown): GlassSeeds {
  const r = (raw ?? {}) as Partial<Record<keyof GlassSeeds, unknown>>;
  const num = (v: unknown, lo: number, hi: number, d: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
  const kind: GlassKind = r.kind === "dark" ? "dark" : "light";
  return {
    kind,
    accent: isHex(r.accent) ? (r.accent.toUpperCase() as Hex) : GLASS_STARTER.accent,
    picture: typeof r.picture === "string" && /^[a-z0-9-]{1,32}$/.test(r.picture) ? r.picture : GLASS_STARTER.picture,
    frost: Math.round(num(r.frost, 0, 100, GLASS_STARTER.frost)),
    frostOn: r.frostOn !== false,
    transparency: num(r.transparency, 0, 1, GLASS_STARTER.transparency),
    linked: r.linked !== false,
    darkened: Math.round(num(r.darkened, 0, 100, GLASS_STARTER.darkened)),
    darkOn: r.darkOn === true,
    lines: r.lines === "dark" ? "dark" : "light",
    guard: r.guard !== false,
    ...(r.guard === false && typeof r.fill === "number" ? { fill: num(r.fill, 0, 1, 1) } : {}),
  };
}

/** The whole Glass theme from its seeds. Pure, so what the tests measure is what ships. */
export function composeGlass(raw: GlassSeeds): SoulMarkGlass {
  const seeds = sanitizeGlassSeeds(raw);
  const guard = seeds.guard !== false;
  const d = seeds.darkOn ? seeds.darkened / 100 : 0;
  const glass = mix(GLASS_BASE[seeds.kind], SMOKE, d * SMOKE_GLASS_MAX);
  const mark = composeSoulMark({ ...sanitizeSeeds({}), background: glass, accent: seeds.accent, tint: 0.5, character: "cool", guard });
  const t = mark.tokens;
  const notes: GlassNote[] = [];
  const shortfalls: Shortfall[] = [...mark.shortfalls];
  const frosted = seeds.frostOn && seeds.frost > 0;
  const thin = !seeds.linked || frosted;

  // 1. The page glass: the least fill that keeps every text readable, faded captions strengthened
  //    first. Guard off: the fill as picked.
  //    The accent's text and lines keep their hue and move only in shade, to read on the glass at
  //    its worst, before the glass gets any thicker.
  let fill = 1;
  let textFade = t.textFade;
  let tokens = t;
  if (guard) {
    const found = leastFill(t, (f, fade) => pageMeasurements(fitAccent({ ...t, textFade: fade }, f), f));
    fill = found.fill;
    textFade = found.textFade;
    tokens = fitAccent({ ...t, textFade }, fill);
  } else {
    fill = seeds.fill ?? leastFill(t, (f, fade) => pageMeasurements(fitAccent({ ...t, textFade: fade }, f), f)).fill;
    tokens = { ...t, textFade };
  }

  // 2. Stacked glass: Transparency, raised only as far as its text needs (guard on). Not thinned:
  //    a full layer of its own, like the page.
  const want = thin ? seeds.transparency : fill;
  let stackedFill = want;
  const stackedPasses = (s: number) => passes(stackedMeasurements(tokens, fill, s));
  if (guard) {
    if (!stackedPasses(want)) stackedFill = leastStep(want, 1, stackedPasses) ?? 1;
    if (stackedFill !== want)
      notes.push({
        kind: "adjusted",
        seed: "transparency",
        chosen: pct(want),
        used: pct(stackedFill),
        message: `Menus and panels made a little thicker (${pct(want)} to ${pct(stackedFill)}) so their text stays readable.`,
      });
  }

  // 3. Over work: the page and the menu together. Already at least the page fill, so it passes too.
  const overWorkFill = round(1 - (1 - fill) * (1 - stackedFill));

  // 4. The 3D guide lines.
  let lines = seeds.lines === "dark" ? ("#000000" as Hex) : ("#FFFFFF" as Hex);
  if (seeds.lines === "dark" && seeds.kind === "dark")
    notes.push({
      kind: "info",
      seed: "lines",
      chosen: "dark",
      used: "dark",
      message: "Dark 3D lines are faint on dark glass; they're meant for light glass.",
    });

  if (!guard) {
    for (const m of [...pageMeasurements(tokens, fill), ...stackedMeasurements(tokens, fill, stackedFill)])
      if (m.ratio < m.floor - 1e-9) shortfalls.push({ label: m.what, ratio: m.ratio, floor: m.floor });
  }
  for (const k of ACCENT_KEYS)
    if (tokens[k] !== t[k])
      notes.push({
        kind: "adjusted",
        seed: "text",
        chosen: t[k],
        used: tokens[k],
        message: `The accent's ${k} is a shade ${shadeWord(t[k], tokens[k])} on glass so it stays readable.`,
      });
  if (textFade !== t.textFade)
    notes.push({
      kind: "adjusted",
      seed: "text",
      chosen: String(t.textFade),
      used: String(textFade),
      message: "Faded captions are drawn a little stronger on glass so they stay readable.",
    });
  lines = lines.toUpperCase() as Hex;

  return {
    seeds,
    mark: { ...mark, tokens },
    glass,
    fill,
    stackedFill,
    overWorkFill,
    thin,
    blur: frosted ? (seeds.frost / 100) * FROST_MAX_BLUR : 0,
    smoke: d * SMOKE_BEHIND_MAX,
    lines,
    textFade,
    notes,
    shortfalls: dedupe(shortfalls),
  };
}

// ── What is measured ──────────────────────────────────────────────────────────

/** Every text and accent pair on the page glass, over pure black and pure white behind it. */
export function pageMeasurements(t: SoulMarkTokens, fill: number) {
  return BEHIND.flatMap((b) => withTag(glassPairs(layer(t, (s) => mix(b, s, fill))), b === "#000000" ? "over black" : "over white"));
}

/** Every pair on glass stacked over the page glass, over pure black and pure white. */
export function stackedMeasurements(t: SoulMarkTokens, fill: number, stacked: number) {
  return BEHIND.flatMap((b) => {
    const page = mix(b, t.bg, fill);
    return withTag(glassPairs(layer(t, (s) => mix(page, s, stacked))), b === "#000000" ? "stacked, over black" : "stacked, over white");
  });
}

/** The pairs that depend on the surface: all text, accent text and accent lines. */
export function glassPairs(t: SoulMarkTokens) {
  const accent = measureAccent(t).filter((m) => !m.what.startsWith("white on accent") && !m.what.startsWith("button edge"));
  return [...measureText(t).filter((m) => m.what !== "white on black"), ...accent];
}

/**
 * The tokens with the glass surfaces (the page and panels) replaced by how they show through.
 * Buttons and fields (controls, sunken) stay solid, like colored buttons: accent text on them
 * can't stay readable on see-through glass.
 */
function layer(t: SoulMarkTokens, through: (surface: Hex) => Hex): SoulMarkTokens {
  return { ...t, bg: through(t.bg), panel: through(t.panel) };
}

/** The accent tokens that draw text or lines on the glass, with their floors. */
const ACCENT_KEYS = ["accentText", "accentInk", "accent300", "accent400", "accentLine"] as const;
const ACCENT_FLOOR: Record<(typeof ACCENT_KEYS)[number], number> = {
  accentText: AA,
  accentInk: AA,
  accent300: AA,
  accent400: AA,
  accentLine: NON_TEXT,
};

/**
 * The accent's text and lines, each moved only in shade (hue kept) as little as needed to read on
 * the page glass and panels at `fill` over black and over white. A color that can't is left as
 * close as it gets, and the fill search moves on.
 */
export function fitAccent(t: SoulMarkTokens, fill: number): SoulMarkTokens {
  const surfaces = BEHIND.flatMap((b) => [mix(b, t.bg, fill), mix(b, t.panel, fill)]);
  const out = { ...t };
  for (const k of ACCENT_KEYS) {
    const floor = ACCENT_FLOOR[k];
    const worst = (c: Hex) => Math.min(...surfaces.map((s) => contrastRatio(c, s)));
    if (worst(t[k]) >= floor - 1e-9) continue;
    out[k] = nearestLightness(t[k], (c) => worst(c) >= floor - 1e-9, worst).hex;
  }
  return out;
}

function shadeWord(from: Hex, to: Hex): string {
  const l = (h: Hex) => contrastRatio(h, "#000000");
  return l(to) < l(from) ? "deeper" : "lighter";
}

/**
 * The least fill (in STEPs) at which `pairs` all pass, then the least strengthening of faded text
 * that still passes there. More fill and stronger captions only ever help, so both are searched
 * by halving, which finds the same answer as trying every step.
 */
function leastFill(t: SoulMarkTokens, pairs: (fill: number, textFade: number) => { ratio: number; floor: number }[]) {
  const strongest = Math.min(t.textFade, MIN_TEXT_FADE);
  const fill = leastStep(0, 1, (f) => passes(pairs(f, strongest)));
  if (fill === null) return { fill: 1, textFade: strongest };
  const fades: number[] = [];
  for (let f = t.textFade; f > strongest + 1e-9; f = round(f - 0.05)) fades.push(f);
  fades.push(strongest);
  return { fill, textFade: fades.find((fade) => passes(pairs(fill, fade))) ?? strongest };
}

/** The smallest value from `lo` to `hi` (in STEPs) where `ok` holds, or null; `ok` only ever turns true. */
export function leastStep(lo: number, hi: number, ok: (v: number) => boolean): number | null {
  let a = Math.round(lo / STEP);
  let b = Math.round(hi / STEP);
  if (!ok(round(b * STEP))) return null;
  while (a < b) {
    const m = Math.floor((a + b) / 2);
    if (ok(round(m * STEP))) b = m;
    else a = m + 1;
  }
  return round(a * STEP);
}

function passes(ms: { ratio: number; floor: number }[]): boolean {
  return ms.every((m) => m.ratio >= m.floor - 1e-9);
}

function withTag<T extends { what: string }>(ms: T[], tag: string): T[] {
  return ms.map((m) => ({ ...m, what: `${m.what}, ${tag}` }));
}

function dedupe(s: Shortfall[]): Shortfall[] {
  const seen = new Map<string, Shortfall>();
  for (const x of s) if (!seen.has(x.label) || seen.get(x.label)!.ratio > x.ratio) seen.set(x.label, x);
  return [...seen.values()];
}

// ── For apps ──────────────────────────────────────────────────────────────────

/**
 * The CSS variables Glass adds to the base theme's (cssVariables(mark)): the glass and panel
 * colors as RGB triplets, each layer's fill, the blur, the smoke over the picture, and the 3D
 * line color. Numbers and composed colors only, never typed text.
 */
export function glassVariables(g: SoulMarkGlass): Record<string, string> {
  return {
    "--glass-rgb": rgbTriplet(g.mark.tokens.bg),
    "--glass-panel-rgb": rgbTriplet(g.mark.tokens.panel),
    "--glass-fill": String(g.fill),
    "--glass-fill-stacked": String(g.stackedFill),
    "--glass-fill-total": String(g.overWorkFill),
    "--glass-blur": `${Math.round(g.blur * 10) / 10}px`,
    "--glass-smoke-rgb": rgbTriplet(SMOKE),
    "--glass-smoke": String(Math.round(g.smoke * 1000) / 1000),
    "--glass-line-rgb": rgbTriplet(g.lines),
  };
}

// ── Sharing ───────────────────────────────────────────────────────────────────

/**
 * A short code for sharing: SM4-<l|d glass>-<accent>-<picture>-<frost 0-100>-<f|n frost on>-
 * <transparency 0-100>-<k|u linked>-<darkened 0-100 or x when off>-<l|d lines>, and -open on
 * the end when the guard is off.
 */
export function encodeGlass(raw: GlassSeeds): string {
  const s = sanitizeGlassSeeds(raw);
  return [
    "SM4",
    s.kind === "dark" ? "d" : "l",
    s.accent.slice(1),
    s.picture,
    s.frost,
    s.frostOn ? "f" : "n",
    Math.round(s.transparency * 100),
    s.linked ? "k" : "u",
    s.darkOn ? s.darkened : "x",
    s.lines === "dark" ? "d" : "l",
    ...(s.guard === false ? ["open"] : []),
  ].join("-");
}

/** The seeds in a code from encodeGlass, or null when it is not one. */
export function decodeGlass(code: string): GlassSeeds | null {
  const m = code
    .trim()
    .match(/^SM4-(l|d)-([0-9a-f]{6})-([a-z0-9]+(?:-[a-z][a-z0-9]*)*)-(\d{1,3})-(f|n)-(\d{1,3})-(k|u)-(\d{1,3}|x)-(l|d)(-open)?$/i);
  if (!m) return null;
  return sanitizeGlassSeeds({
    kind: m[1].toLowerCase() === "d" ? "dark" : "light",
    accent: `#${m[2]}`,
    picture: m[3].toLowerCase(),
    frost: Number(m[4]),
    frostOn: m[5].toLowerCase() === "f",
    transparency: Number(m[6]) / 100,
    linked: m[7].toLowerCase() === "k",
    darkOn: m[8].toLowerCase() !== "x",
    darkened: m[8].toLowerCase() === "x" ? GLASS_STARTER.darkened : Number(m[8]),
    lines: m[9].toLowerCase() === "d" ? "dark" : "light",
    guard: !m[10],
  });
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

// Soul Mark: Neon. For the futuristic digital craftsman: the grid of the people who build things
// (blueprints, drafting tables, a 3D workspace) and the neon of cyberpunk and a sci-fi engineer's
// holographic workshop. A near-black page, a
// glowing outline color on panels and buttons, and a faint grid. Built on top of the Solid Tones
// and Gradients engine (soul-mark.ts), which it never changes: the text, panels and accent come
// from composeSoulMark, and Neon adds the glow and the grid.
//
// The readability promise holds here too. The glow lights edges, never text, and:
// - the glow color must stand out from every surface it outlines (3:1, the floor for lines and
//   icons), so an outline you can't see is never called neon;
// - the glow's bloom spills onto the page next to panels, so text is measured on the page as
//   tinted by the bloom at its strongest;
// - the grid runs behind text, so text is measured on a grid line too.
// With the guard on, the glow keeps its hue and moves only in shade, and the bloom and grid are
// turned down until every text clears. With it off, everything is used as picked and what falls
// short is said.
//
// Apps: keep the grid out of anywhere people work on a picture, video or 3D scene (an editor, a
// canvas, a viewer). Lines behind someone's work get in the way; the glow on panels can stay.
import { contrastRatio, type Hex, isHex, mix, nearestLightness } from "./contrast";
import {
  AA,
  composeSoulMark,
  measureText,
  MIN_TEXT_FADE,
  NON_TEXT,
  type Shortfall,
  type SoulMark,
  type SoulMarkSeeds,
  type SoulMarkTokens,
  sanitizeSeeds,
  tokensAcrossGradient,
} from "./soul-mark";

/** How much of the glow color the bloom lays onto the page at full strength, at its brightest. */
export const BLOOM_MAX = 0.22;
/** How much of the glow color a grid line is at full strength. */
export const GRID_MAX = 0.14;
/** The steps the guard takes when it turns the bloom or the grid down. */
const TURN_DOWN_STEP = 0.05;
/** Glowing text, guard on: how far text is tinted toward the glow, and the strongest halo tried. */
export const TEXT_TINT = 0.2;
export const TEXT_HALO_MAX = 0.5;
/** Glowing text, guard off: a strong movie-HUD glow, used exactly as is. */
export const TEXT_GLOW_FULL = { tint: 0.45, halo: 0.8 };

export interface NeonSeeds extends SoulMarkSeeds {
  /** The neon color: outlines, the bloom around panels and buttons, and the grid. */
  glow: Hex;
  /** How strong the bloom and grid are, 0 (a plain line) to 1. Default 0.6. */
  strength: number;
  /** A faint grid behind the page, like a blueprint or a 3D workspace. */
  grid: boolean;
  /** Glowing text: every text tinted toward the glow, with a soft halo. Off unless set. */
  textGlow?: boolean;
  /** The grid also runs through menus, side menus and dialogs (needs the grid). Off unless set. */
  menuGrid?: boolean;
}

export interface NeonNote {
  kind: "adjusted" | "warning";
  seed: "glow" | "strength" | "grid" | "text" | "textGlow" | "menuGrid";
  message: string;
  chosen: string;
  used: string;
}

export interface SoulMarkNeon {
  seeds: NeonSeeds;
  /** The base theme underneath: text, panels, accent, and the fade when there is one. */
  mark: SoulMark;
  /** The glow color as used: the pick, or the nearest shade of it that stands out (guard on). */
  glow: Hex;
  /** The bloom's strength as used, 0 to 1 (the guard may turn it down). */
  bloom: number;
  /** The grid's strength as used, 0 when there's no grid. */
  grid: number;
  /** Glowing text as used: the text colors, how far they're tinted, and the halo's strongest point. */
  text: { tint: number; halo: number; ink: Hex; fg: Hex } | null;
  /** How much of the glow color a grid line in a menu is, 0 when menus have no grid. */
  menuGrid: number;
  /** Faded text (captions, hints) as drawn when the guard strengthened it for the glow or menu grid. */
  textFade: number | null;
  notes: NeonNote[];
  /** With the guard off: what falls short, the base theme's shortfalls included. */
  shortfalls: Shortfall[];
}

export const NEON_STARTER: NeonSeeds = {
  background: "#070B14",
  accent: "#00E5FF",
  glow: "#00E5FF",
  strength: 0.6,
  grid: true,
  tint: 0.5,
  character: "cool",
  guard: true,
};

/** Turns stored or typed Neon seeds into valid ones; anything unusable falls back to the starter. */
export function sanitizeNeonSeeds(raw: unknown): NeonSeeds {
  const r = (raw ?? {}) as Partial<Record<keyof NeonSeeds, unknown>>;
  const base = sanitizeSeeds({ ...NEON_STARTER, ...(raw as object) });
  const { color3: _c3, shape: _shape, ...rest } = base;
  const strength =
    typeof r.strength === "number" && Number.isFinite(r.strength) ? Math.min(1, Math.max(0, r.strength)) : NEON_STARTER.strength;
  return {
    ...rest,
    // A Neon fade runs top to bottom with two colors, like a blueprint.
    ...(rest.color2 ? { shape: "vertical" as const } : {}),
    glow: isHex(r.glow) ? (r.glow.toUpperCase() as Hex) : NEON_STARTER.glow,
    strength,
    grid: r.grid !== false,
    textGlow: r.textGlow === true,
    menuGrid: r.menuGrid === true,
  };
}

/** The whole Neon theme from its seeds. Pure, so what the tests measure is what ships. */
export function composeNeon(raw: NeonSeeds): SoulMarkNeon {
  const seeds = sanitizeNeonSeeds(raw);
  const { glow: _g, strength: _s, grid: _grid, textGlow: _t, menuGrid: _m, ...baseSeeds } = seeds;
  const mark = composeSoulMark(baseSeeds);
  const pages = pageTokens(mark);
  const outlined = [...new Set([...pages.map((t) => t.bg), ...pages.map((t) => t.panel)])];
  const notes: NeonNote[] = [];
  const shortfalls: Shortfall[] = [...mark.shortfalls];

  // 1. The glow must stand out from everything it outlines.
  const standsOut = (c: Hex) => outlined.every((s) => contrastRatio(c, s) >= NON_TEXT - 1e-9);
  const worstOutline = (c: Hex) => Math.min(...outlined.map((s) => contrastRatio(c, s)));
  let glow = seeds.glow;
  if (seeds.guard) {
    glow = nearestLightness(seeds.glow, standsOut, worstOutline).hex;
    if (glow !== seeds.glow) {
      notes.push({
        kind: "adjusted",
        seed: "glow",
        chosen: seeds.glow,
        used: glow,
        message: "Glow brightened so the outlines stand out from the page and panels. Same hue.",
      });
    }
  } else if (!standsOut(glow)) {
    shortfalls.push({ label: "Neon outlines", ratio: worstOutline(glow), floor: NON_TEXT });
  }

  // 2. The bloom tints the page beside panels and buttons; text there must still read.
  const wantBloom = seeds.strength;
  const bloom = fit(wantBloom, (s) => textClears(pages, glow, s * BLOOM_MAX), seeds.guard);
  if (bloom.used < wantBloom) {
    notes.push({
      kind: "adjusted",
      seed: "strength",
      chosen: pct(wantBloom),
      used: pct(bloom.used),
      message: "Glow turned down so text next to glowing panels stays readable.",
    });
  }
  if (!seeds.guard && !textClears(pages, glow, wantBloom * BLOOM_MAX)) {
    shortfalls.push({ label: "Text beside the glow", ...worstText(pages, glow, wantBloom * BLOOM_MAX) });
  }

  // 3. The grid runs behind text; text on a grid line must still read.
  const wantGrid = seeds.grid ? seeds.strength : 0;
  const grid = fit(wantGrid, (s) => textClears(pages, glow, s * GRID_MAX), seeds.guard);
  if (grid.used < wantGrid) {
    notes.push({
      kind: "adjusted",
      seed: "grid",
      chosen: pct(wantGrid),
      used: pct(grid.used),
      message: grid.used === 0 ? "Grid left out: text over it wouldn't stay readable." : "Grid made fainter so text over it stays readable.",
    });
  }
  if (!seeds.guard && wantGrid > 0 && !textClears(pages, glow, wantGrid * GRID_MAX)) {
    shortfalls.push({ label: "Text over the grid", ...worstText(pages, glow, wantGrid * GRID_MAX) });
  }

  // 4. Glowing text and the grid on menus, measured together with everything they sit on.
  const extras = composeGlowingText(seeds, mark, pages, glow, bloom.used, grid.used, notes, shortfalls);

  return { seeds, mark, glow, bloom: bloom.used, grid: grid.used, ...extras, notes, shortfalls };
}

/**
 * Glowing text and the grid on menus. The text is tinted toward the glow and given a halo; the
 * halo's strongest point is measured as a tint under the letters, on the page (over the grid or
 * bloom, whichever is stronger) and on panels (over the menu grid). With the guard on, captions
 * are drawn stronger first (down to MIN_TEXT_FADE); only then is the menu grid made fainter, and
 * the halo is the strongest that keeps every text readable. Labels on filled buttons stay as the
 * base theme made them: apps leave buttons out of the glow.
 */
function composeGlowingText(
  seeds: NeonSeeds,
  mark: SoulMark,
  pages: SoulMarkTokens[],
  glow: Hex,
  bloom: number,
  grid: number,
  notes: NeonNote[],
  shortfalls: Shortfall[],
): Pick<SoulMarkNeon, "text" | "menuGrid" | "textFade"> {
  const wantMenu = seeds.menuGrid && grid > 0 ? grid * GRID_MAX : 0;
  if (!seeds.textGlow && wantMenu === 0) return { text: null, menuGrid: 0, textFade: null };
  const under = Math.max(bloom * BLOOM_MAX, grid * GRID_MAX);
  const baseFade = Math.min(...pages.map((p) => p.textFade));
  // Filled buttons keep their own labels, untinted and without a halo (apps leave them out of the
  // glow), so they aren't part of this measurement.
  const ok = (o: GlowParts) => glowMeasurements(pages, glow, under, o).every((m) => m.ratio >= m.floor - 1e-9);

  if (!seeds.guard) {
    const o = { tint: seeds.textGlow ? TEXT_GLOW_FULL.tint : 0, halo: seeds.textGlow ? TEXT_GLOW_FULL.halo : 0, menu: wantMenu, fade: baseFade };
    const short = glowMeasurements(pages, glow, under, o).filter((m) => m.ratio < m.floor - 1e-9);
    if (short.length) {
      const w = short.reduce((a, b) => (b.ratio / b.floor < a.ratio / a.floor ? b : a));
      shortfalls.push({ label: seeds.textGlow ? "Glowing text" : "Text over the menu grid", ratio: w.ratio, floor: w.floor });
    }
    return { text: seeds.textGlow ? textColors(mark, glow, o) : null, menuGrid: wantMenu, textFade: null };
  }

  // The strongest captions needed (highest fade that passes), or null when even the strongest fail.
  const fadeFor = (o: Omit<GlowParts, "fade">): number | null => {
    if (!ok({ ...o, fade: MIN_TEXT_FADE })) return null;
    if (ok({ ...o, fade: baseFade })) return baseFade;
    let lo = MIN_TEXT_FADE, hi = baseFade; // ok(lo), !ok(hi)
    while (hi - lo > 0.005) { const mid = (lo + hi) / 2; if (ok({ ...o, fade: mid })) lo = mid; else hi = mid; }
    return Math.floor(lo * 1000) / 1000;
  };

  // The menu grid at the page's strength if captions can make room; fainter only if they can't.
  let menu = wantMenu;
  if (menu > 0 && fadeFor({ tint: 0, halo: 0, menu }) === null) {
    let lo = 0, hi = menu;
    while (hi - lo > 0.001) { const mid = (lo + hi) / 2; if (fadeFor({ tint: 0, halo: 0, menu: mid }) !== null) lo = mid; else hi = mid; }
    menu = Math.floor(lo * 1000) / 1000;
    notes.push({ kind: "adjusted", seed: "menuGrid", chosen: pct(wantMenu / GRID_MAX), used: pct(menu / GRID_MAX),
      message: menu === 0 ? "Grid left out of menus: text in them wouldn't stay readable." : "Grid in menus made fainter so text in them stays readable." });
  }

  // Glowing text: the tint first (as close to TEXT_TINT as reads), then the strongest halo.
  let text: SoulMarkNeon["text"] = null;
  let parts = { tint: 0, halo: 0, menu };
  if (seeds.textGlow) {
    let tint = TEXT_TINT;
    while (tint > 0 && fadeFor({ tint, halo: 0, menu }) === null) tint = Math.round((tint - 0.05) * 100) / 100;
    let lo = 0, hi = TEXT_HALO_MAX;
    if (fadeFor({ tint, halo: hi, menu }) !== null) lo = hi;
    else while (hi - lo > 0.005) { const mid = (lo + hi) / 2; if (fadeFor({ tint, halo: mid, menu }) !== null) lo = mid; else hi = mid; }
    parts = { tint, halo: Math.floor(lo * 100) / 100, menu };
    text = textColors(mark, glow, { ...parts, fade: baseFade });
    if (parts.halo === 0) {
      notes.push({ kind: "adjusted", seed: "textGlow", chosen: "on", used: "tint only",
        message: "Text tinted toward the glow, but left without a halo: a halo here would make it hard to read." });
    }
  }
  const fade = fadeFor(parts) ?? baseFade;
  if (fade < baseFade - 1e-9) {
    notes.push({ kind: "adjusted", seed: "text", chosen: pct(baseFade), used: pct(fade),
      message: "Captions and hints drawn stronger to make room for the glowing text and grid, so they stay readable." });
  }
  return { text, menuGrid: menu, textFade: fade < baseFade - 1e-9 ? fade : null };
}

interface GlowParts {
  tint: number;
  halo: number;
  menu: number;
  fade: number;
}

/** Every text measurement with glowing text and the menu grid applied, at every point of the page. */
export function glowMeasurements(pages: SoulMarkTokens[], glow: Hex, under: number, o: GlowParts) {
  const tinted = (c: Hex, a: number) => mix(mix(c, glow, a), glow, o.halo);
  return pages.flatMap((t) => {
    const g: SoulMarkTokens = {
      ...t,
      textFade: Math.min(t.textFade, o.fade),
      white: mix(t.white, glow, o.tint),
      fg: mix(t.fg, glow, o.tint),
      bg: tinted(t.bg, under),
      panel: tinted(t.panel, o.menu),
      controls: tinted(t.controls, o.menu),
      sunken: tinted(t.sunken, o.menu),
    };
    return measureText(g);
  });
}

function textColors(mark: SoulMark, glow: Hex, o: GlowParts): NonNullable<SoulMarkNeon["text"]> {
  return { tint: o.tint, halo: o.halo, ink: mix(mark.tokens.white, glow, o.tint), fg: mix(mark.tokens.fg, glow, o.tint) };
}

/**
 * The page's colors as the text sees them: one set of tokens for a solid page, one per point
 * along a fade (the same points the Gradients guard measures).
 */
export function pageTokens(mark: SoulMark): SoulMarkTokens[] {
  return mark.gradient ? tokensAcrossGradient(mark) : [mark.tokens];
}

/** Every text measurement on the page tinted by `amount` of the glow, at every point of the page. */
export function neonTextMeasurements(pages: SoulMarkTokens[], glow: Hex, amount: number) {
  return pages.flatMap((t) => measureText({ ...t, bg: mix(t.bg, glow, amount) }));
}

/** The CSS variables Neon adds to a theme's own (cssVariables in soul-mark.ts). */
export function neonVariables(n: SoulMarkNeon): Record<string, string> {
  const triplet = (h: Hex) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ");
  return {
    "--st-neon-glow-rgb": triplet(n.glow),
    "--st-neon-bloom": (n.bloom * BLOOM_MAX).toFixed(3),
    "--st-neon-grid": (n.grid * GRID_MAX).toFixed(3),
    "--st-neon-menu-grid": n.menuGrid.toFixed(3),
    ...(n.text
      ? {
          // Glowing text overrides the base theme's text colors (set after them).
          "--st-white-rgb": triplet(n.text.ink),
          "--st-fg-rgb": triplet(n.text.fg),
          "--st-fg": `rgb(${triplet(n.text.fg)})`,
          // Labels on filled buttons stay as the base theme made them.
          "--st-neon-label-rgb": triplet(n.mark.tokens.white),
          // Three halo layers whose combined strongest point is exactly the measured halo.
          "--st-neon-text-halo": (1 - Math.pow(1 - n.text.halo, 1 / 3)).toFixed(3),
        }
      : {}),
    ...(n.textFade !== null ? { "--st-text-fade": String(Math.round(n.textFade * 1000) / 1000) } : {}),
  };
}

/**
 * A short code for sharing: SM3-<background>-<fade color or x>-<accent>-<glow>-<strength 0-100>-
 * <g|n for grid>-<tint 0-100>-<tone>, then -t for glowing text and -m for the grid on menus when
 * they're on, and -open on the end when the guard is off.
 */
export function encodeNeon(raw: NeonSeeds): string {
  const s = sanitizeNeonSeeds(raw);
  return [
    "SM3",
    s.background.slice(1),
    s.color2 ? s.color2.slice(1) : "x",
    s.accent.slice(1),
    s.glow.slice(1),
    Math.round(s.strength * 100),
    s.grid ? "g" : "n",
    Math.round(s.tint * 100),
    s.character,
    ...(s.textGlow ? ["t"] : []),
    ...(s.menuGrid ? ["m"] : []),
    ...(s.guard ? [] : ["open"]),
  ].join("-");
}

/** The seeds in a code from encodeNeon, or null when it is not one. */
export function decodeNeon(code: string): NeonSeeds | null {
  const m = code
    .trim()
    .match(
      /^SM3-([0-9a-f]{6})-([0-9a-f]{6}|x)-([0-9a-f]{6})-([0-9a-f]{6})-(\d{1,3})-(g|n)-(\d{1,3})-(soft|warm|cool)(-t)?(-m)?(-open)?$/i,
    );
  if (!m) return null;
  if (m[2].toLowerCase() === m[1].toLowerCase()) return null;
  return sanitizeNeonSeeds({
    background: `#${m[1]}`,
    ...(m[2].toLowerCase() === "x" ? {} : { color2: `#${m[2]}` }),
    accent: `#${m[3]}`,
    glow: `#${m[4]}`,
    strength: Number(m[5]) / 100,
    grid: m[6].toLowerCase() === "g",
    tint: Number(m[7]) / 100,
    character: m[8].toLowerCase(),
    textGlow: !!m[9],
    menuGrid: !!m[10],
    guard: !m[11],
  });
}

function textClears(pages: SoulMarkTokens[], glow: Hex, amount: number): boolean {
  return neonTextMeasurements(pages, glow, amount).every((m) => m.ratio >= m.floor - 1e-9);
}

function worstText(pages: SoulMarkTokens[], glow: Hex, amount: number): { ratio: number; floor: number } {
  const worst = neonTextMeasurements(pages, glow, amount).reduce((a, b) => (b.ratio / b.floor < a.ratio / a.floor ? b : a));
  return { ratio: worst.ratio, floor: worst.floor ?? AA };
}

/** The strongest value up to `want` that passes, stepping down (guard on); `want` as is otherwise. */
function fit(want: number, passes: (v: number) => boolean, guard: boolean | undefined): { used: number } {
  if (!guard || want === 0) return { used: want };
  for (let v = want; v > 0; v = Math.round((v - TURN_DOWN_STEP) * 100) / 100) {
    if (passes(v)) return { used: v };
  }
  return { used: 0 };
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

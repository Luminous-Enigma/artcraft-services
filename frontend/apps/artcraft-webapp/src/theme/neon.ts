// Soul Mark: Neon. A heads-up display look, like glowing drafting lines: a near-black page, a
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

export interface NeonSeeds extends SoulMarkSeeds {
  /** The neon color: outlines, the bloom around panels and buttons, and the grid. */
  glow: Hex;
  /** How strong the bloom and grid are, 0 (a plain line) to 1. Default 0.6. */
  strength: number;
  /** A faint grid behind the page, like a blueprint or a 3D workspace. */
  grid: boolean;
}

export interface NeonNote {
  kind: "adjusted" | "warning";
  seed: "glow" | "strength" | "grid";
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
  };
}

/** The whole Neon theme from its seeds. Pure, so what the tests measure is what ships. */
export function composeNeon(raw: NeonSeeds): SoulMarkNeon {
  const seeds = sanitizeNeonSeeds(raw);
  const { glow: _g, strength: _s, grid: _grid, ...baseSeeds } = seeds;
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

  return { seeds, mark, glow, bloom: bloom.used, grid: grid.used, notes, shortfalls };
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
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(n.glow.slice(i, i + 2), 16));
  return {
    "--st-neon-glow-rgb": `${r} ${g} ${b}`,
    "--st-neon-bloom": (n.bloom * BLOOM_MAX).toFixed(3),
    "--st-neon-grid": (n.grid * GRID_MAX).toFixed(3),
  };
}

/**
 * A short code for sharing: SM3-<background>-<fade color or x>-<accent>-<glow>-<strength 0-100>-
 * <g|n for grid>-<tint 0-100>-<tone>, with -open on the end when the guard is off.
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
    ...(s.guard ? [] : ["open"]),
  ].join("-");
}

/** The seeds in a code from encodeNeon, or null when it is not one. */
export function decodeNeon(code: string): NeonSeeds | null {
  const m = code
    .trim()
    .match(
      /^SM3-([0-9a-f]{6})-([0-9a-f]{6}|x)-([0-9a-f]{6})-([0-9a-f]{6})-(\d{1,3})-(g|n)-(\d{1,3})-(soft|warm|cool)(-open)?$/i,
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
    guard: !m[9],
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

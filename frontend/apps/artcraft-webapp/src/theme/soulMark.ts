// Soul Mark: a theme the person composes from a few colours of their own.
//
// They choose the mood (background, accent, how strongly panels take the
// background's colour, the tone of the text). Every other colour is derived
// from those and measured, so no choice can make the app hard to read: text
// is never chosen directly, and a background that cannot carry readable text
// is moved in lightness only (its hue stays) until it can.
//
// The rule for "readable" is WCAG AA: 4.5:1 for every piece of text, at every
// opacity the app draws text at (down to its 40% captions), for button labels
// and for status colours like red errors; 3:1 for rings, lines and icons.
// That is stricter than the default theme in a few places (its faded captions,
// the label on its blue buttons, some red error text): a Soul Mark can be
// wilder than the default, but never harder to read.
//
// All of that is the readability guard, and it is on unless the person turns
// it off. With it off, their colours are used exactly as picked, nothing is
// nudged, and the result says what falls short and what the guard would use.

import {
  channels,
  contrastOfOverlay,
  contrastRatio,
  type Hex,
  hslTriplet,
  isHex,
  mix,
  nearestLightness,
  overlayContrast,
  rgbTriplet,
  toHsl,
} from "./contrast";
import { bandEdges, fitMeaningInks, type MeaningInk, meaningVariables } from "./meaning";

export const SOUL_MARK_STARTER: SoulMarkSeeds = {
  background: "#FDF2F7",
  accent: "#9B4DCA",
  tint: 0.5,
  character: "soft",
  guard: true,
};

/** The app's own colours, as declared in styles.css. Soul Mark's floors are measured on these. */
export const DEFAULT_TOKENS: SoulMarkTokens = {
  white: "#FFFFFF",
  black: "#000000",
  fg: "#F2F1EE",
  bg: "#121316",
  panel: "#101014",
  controls: "#1E1F22",
  sunken: "#060607",
  scrollTrack: "#0B0B0C",
  scrollThumb: "#2C2C2F",
  accent: "#2D81FF",
  accent300: "#8EC7FF",
  accent400: "#59A7FF",
  accent600: "#1B63F5",
  accent700: "#144EE1",
  accentInk: "#74AAFF",
  accentText: "#2D81FF",
  accentLine: "#2D81FF",
  scheme: "dark",
  textFade: 1,
};

/**
 * The opacities the app draws text at, as a colour (text-white/60) or on the
 * element (opacity-60). Below 40% it is decoration.
 */
export const TEXT_OPACITIES = [1, 0.9, 0.8, 0.75, 0.7, 0.6, 0.55, 0.5, 0.45, 0.4] as const;

/** The lowest text fade a theme may use: 40% text then draws at 76%, still lighter than full text. */
export const MIN_TEXT_FADE = 0.4;

export const AA = 4.5;
/** WCAG's floor for large text, icons, rings and the edges of controls. */
export const NON_TEXT = 3;
/**
 * Below this, a filled button would blend into the page. A labelled button
 * does not need 3:1 at its edge (WCAG 1.4.11: the label identifies it), so
 * Soul Mark aims for 3:1 and only warns below this.
 */
export const BUTTON_EDGE_MIN = 1.5;

export type Character = "soft" | "warm" | "cool";

export interface SoulMarkSeeds {
  background: Hex;
  accent: Hex;
  /** 0 = panels barely step off the background, 1 = bold steps. 0.5 matches the default theme. */
  tint: number;
  character: Character;
  /** The readability guard, on unless set to false. Off means every colour is used exactly as picked. */
  guard?: boolean;
}

export interface SoulMarkTokens {
  /** The ink hairlines and most text are drawn in (Tailwind's "white"). */
  white: Hex;
  /** The deepest surface, behind scrims and media (Tailwind's "black"). */
  black: Hex;
  /** Body text (base-fg). */
  fg: Hex;
  bg: Hex;
  panel: Hex;
  controls: Hex;
  sunken: Hex;
  scrollTrack: Hex;
  scrollThumb: Hex;
  /** Filled buttons (Generate, Export), which carry "white" text (bg-primary). */
  accent: Hex;
  accent300: Hex;
  accent400: Hex;
  accent600: Hex;
  accent700: Hex;
  /** ui-accent-ink text and the focus outline. */
  accentInk: Hex;
  /** text-primary: accent-coloured words. */
  accentText: Hex;
  /** ring-, border-, fill-, stroke-primary: selection rings, outlines, icons. */
  accentLine: Hex;
  scheme: "dark" | "light";
  /**
   * How see-through faded text is, 1 = exactly as the app declares it.
   * Faded text draws at 1 - (1 - opacity) * textFade, so a lower value makes
   * text-white/40 and friends stronger without touching fills or hairlines.
   * Light themes need it: dark text at 40% reads far worse on white than
   * light text at 40% does on black.
   */
  textFade: number;
}

export interface SoulMarkNote {
  /** adjusted: a colour was moved to stay readable. info: worth knowing. warning: worth changing. */
  kind: "adjusted" | "info" | "warning";
  seed: "background" | "accent" | "text";
  chosen: Hex;
  used: Hex;
  message: string;
  /** For a moved background: the nearest readable shade the other way (darker instead of lighter ...). */
  alternative?: Hex;
}

export interface SoulMark {
  seeds: SoulMarkSeeds;
  tokens: SoulMarkTokens;
  /** Status colours (errors, badges ...) fitted to this theme's surfaces. */
  meaning: MeaningInk[];
  notes: SoulMarkNote[];
  /** With the guard off: what falls below the readability line. Empty with it on. */
  shortfalls: Shortfall[];
  /** With the guard off: the theme the guard would have made from the same seeds. */
  guarded?: SoulMarkTokens;
}

/** One kind of text below the readability line, at its worst. */
export interface Shortfall {
  label: string;
  ratio: number;
  floor: number;
}

export interface Measurement {
  what: string;
  ratio: number;
  floor: number;
}

/** Turns stored or typed seeds into valid ones; anything unusable falls back to the starter. */
export function sanitizeSeeds(raw: unknown): SoulMarkSeeds {
  const r = (raw ?? {}) as Partial<Record<keyof SoulMarkSeeds, unknown>>;
  const tint = typeof r.tint === "number" && Number.isFinite(r.tint) ? r.tint : SOUL_MARK_STARTER.tint;
  return {
    background: isHex(r.background) ? (r.background.toUpperCase() as Hex) : SOUL_MARK_STARTER.background,
    accent: isHex(r.accent) ? (r.accent.toUpperCase() as Hex) : SOUL_MARK_STARTER.accent,
    tint: Math.min(1, Math.max(0, tint)),
    character: r.character === "warm" || r.character === "cool" ? r.character : "soft",
    guard: r.guard !== false,
  };
}

/**
 * A short code holding only the seeds, for sharing a Soul Mark or carrying it
 * to another Crafting App: SM1-<background>-<accent>-<tint 0-100>-<character>,
 * with -open on the end when the readability guard is off.
 */
export function encodeSeeds(seeds: SoulMarkSeeds): string {
  const s = sanitizeSeeds(seeds);
  const parts = ["SM1", s.background.slice(1), s.accent.slice(1), Math.round(s.tint * 100), s.character];
  return [...parts, ...(s.guard ? [] : ["open"])].join("-");
}

/** The seeds in a code from encodeSeeds, or null when it is not one. */
export function decodeSeeds(code: string): SoulMarkSeeds | null {
  const m = code.trim().match(/^SM1-([0-9a-f]{6})-([0-9a-f]{6})-(\d{1,3})-(soft|warm|cool)(-open)?$/i);
  if (!m) return null;
  return sanitizeSeeds({
    background: `#${m[1]}`,
    accent: `#${m[2]}`,
    tint: Number(m[3]) / 100,
    character: m[4].toLowerCase(),
    guard: !m[5],
  });
}

/**
 * The whole theme from the seeds. Pure: the picker, the page and the tests all
 * call this, so what the tests measure is what ships.
 */
export function composeSoulMark(rawSeeds: SoulMarkSeeds): SoulMark {
  const seeds = sanitizeSeeds(rawSeeds);
  if (!seeds.guard) return composeOpen(seeds);
  const notes: SoulMarkNote[] = [];

  const ground = fitGround(seeds);
  if (ground.tokens.textFade < 1) {
    notes.push({
      kind: "adjusted",
      seed: "text",
      chosen: ground.bg,
      used: ground.bg,
      message: "Faded text (captions, hints) drawn a little stronger so it stays readable on this background.",
    });
  }
  if (ground.bg !== seeds.background) {
    notes.push({
      kind: "adjusted",
      seed: "background",
      chosen: seeds.background,
      used: ground.bg,
      message: `Background ${ground.lighter ? "lightened" : "deepened"} so text on it stays readable. Same hue.`,
      alternative: ground.alternative,
    });
  }

  const accent = fitAccent(seeds.accent, ground, notes);
  const tokens: SoulMarkTokens = { ...ground.tokens, ...accent };
  const meaning = fitMeaningInks(textSurfaces(tokens).map(([, s]) => s), () => AA);
  return { seeds, tokens, meaning, notes, shortfalls: [] };
}

/**
 * The guard off: the background and accent exactly as picked. Two things are
 * still done, because neither changes a colour anyone picked: the text is
 * whichever of the light and dark inks reads better, and faded text is made
 * as strong as it needs to be (as far as it can go). What still falls short
 * is measured and said, next to what the guard would have used.
 */
function composeOpen(seeds: SoulMarkSeeds): SoulMark {
  const guarded = composeSoulMark({ ...seeds, guard: true });
  const ground = (["light", "dark"] as const)
    .map((pole) => withBestFade(buildGround(seeds.background, pole, seeds, 1)))
    .reduce((a, b) => (textMargin(b) > textMargin(a) ? b : a));
  const away: Hex = ground.scheme === "dark" ? "#000000" : "#FFFFFF";
  const a = seeds.accent;
  const tokens: SoulMarkTokens = {
    ...ground,
    accent: a,
    accent600: mix(a, away, 0.12),
    accent700: mix(a, away, 0.24),
    accentText: a,
    accentLine: a,
    accent400: mix(a, ground.fg, 0.12),
    accent300: mix(a, ground.fg, 0.25),
    accentInk: mix(a, ground.fg, 0.18),
  };
  const surfaces = textSurfaces(tokens).map(([, s]) => s);
  // Status colours exactly as Tailwind declares them: no surface is asked of them.
  const meaning = fitMeaningInks(surfaces, () => 0);
  const shortfalls = describeShortfalls(tokens, meaning);
  const notes: SoulMarkNote[] = [];
  if (guarded.tokens.bg !== seeds.background) {
    notes.push({
      kind: "warning",
      seed: "background",
      chosen: seeds.background,
      used: guarded.tokens.bg,
      message: "With the guard on, this background would be adjusted to the shade shown, so text on it reads.",
    });
  }
  if (guarded.tokens.accent !== seeds.accent) {
    notes.push({
      kind: "warning",
      seed: "accent",
      chosen: seeds.accent,
      used: guarded.tokens.accent,
      message: "With the guard on, buttons in this accent would use the shade shown, so their labels read.",
    });
  }
  return { seeds, tokens, meaning, notes, shortfalls, guarded: guarded.tokens };
}

/** Every measurement below its floor, grouped into the kinds of text a person would recognise. */
function describeShortfalls(t: SoulMarkTokens, meaning: MeaningInk[]): Shortfall[] {
  const groups: [string, (what: string) => boolean][] = [
    ["Body text", (w) => /^(white|fg)\/(100|90|80) /.test(w)],
    ["Faded captions and hints", (w) => /^(white|fg)\/(75|70|60|55|50|45|40) /.test(w)],
    ["Text over pictures", (w) => w === "white on black"],
    ["Button labels", (w) => w.startsWith("white on accent")],
    ["Accent-coloured text", (w) => /^accent(Text|Ink|300|400) /.test(w)],
    ["Selection rings and accent icons", (w) => w.startsWith("accentLine ")],
    ["Buttons against the page", (w) => w.startsWith("button edge ")],
  ];
  const all = [
    ...measureText(t),
    ...measureAccent(t),
    ...meaning.map((m) => ({ what: `status ${m.variable}`, ratio: m.ratio, floor: AA })),
  ];
  groups.push(["Error, warning and badge colours", (w) => w.startsWith("status ")]);
  const out: Shortfall[] = [];
  for (const [label, belongs] of groups) {
    const short = all.filter((m) => belongs(m.what) && m.ratio < m.floor - 1e-9);
    if (!short.length) continue;
    const worst = short.reduce((x, y) => (y.ratio / y.floor < x.ratio / x.floor ? y : x));
    out.push({ label, ratio: worst.ratio, floor: worst.floor });
  }
  return out;
}

/**
 * Every contrast pair the tokens promise, with its floor. Text pairs must
 * always clear; accent pairs clear whenever the chosen hue allows it, and
 * composeSoulMark adds a warning when it does not.
 */
export function measureText(t: SoulMarkTokens): Measurement[] {
  const out: Measurement[] = [];
  for (const [surfaceName, surface] of textSurfaces(t)) {
    for (const [inkName, ink] of [["white", t.white], ["fg", t.fg]] as const) {
      for (const opacity of TEXT_OPACITIES) {
        const drawn = 1 - (1 - opacity) * t.textFade;
        out.push({
          what: `${inkName}/${Math.round(opacity * 100)} on ${surfaceName}`,
          ratio: contrastOfOverlay(surface, ink, drawn),
          floor: TEXT_FLOORS[opacity],
        });
      }
    }
  }
  // Text on scrims over media (text-white on bg-black/60).
  out.push({ what: "white on black", ratio: contrastRatio(t.white, t.black), floor: AA });
  return out;
}

/**
 * Every accent pair. All must clear except "button edge", which only has to
 * reach BUTTON_EDGE_MIN; below 3:1 it comes with a warning.
 */
export function measureAccent(t: SoulMarkTokens): Measurement[] {
  const out: Measurement[] = [
    { what: "white on accent", ratio: contrastRatio(t.white, t.accent), floor: ACCENT_FILL_FLOOR },
    { what: "white on accent600", ratio: contrastRatio(t.white, t.accent600), floor: ACCENT_FILL_FLOOR },
    { what: "white on accent700", ratio: contrastRatio(t.white, t.accent700), floor: ACCENT_FILL_FLOOR },
  ];
  for (const [surfaceName, surface] of textSurfaces(t)) {
    out.push({ what: `button edge on ${surfaceName}`, ratio: contrastRatio(t.accent, surface), floor: BUTTON_EDGE_MIN });
    out.push({ what: `accentText on ${surfaceName}`, ratio: contrastRatio(t.accentText, surface), floor: AA });
    out.push({ what: `accentLine on ${surfaceName}`, ratio: contrastRatio(t.accentLine, surface), floor: NON_TEXT });
    out.push({ what: `accent400 on ${surfaceName}`, ratio: contrastRatio(t.accent400, surface), floor: AA });
    out.push({ what: `accent300 on ${surfaceName}`, ratio: contrastRatio(t.accent300, surface), floor: AA });
    out.push({ what: `accentInk on ${surfaceName}`, ratio: contrastRatio(t.accentInk, surface), floor: AA });
  }
  return out;
}

/** The CSS variables a theme sets on <html>, matching the defaults in styles.css. */
export function cssVariables(mark: Pick<SoulMark, "tokens" | "meaning">): Record<string, string> {
  const t = mark.tokens;
  const rgb = (name: string, hex: Hex) => [`--st-${name}-rgb`, rgbTriplet(hex)] as const;
  return Object.fromEntries([
    rgb("white", t.white),
    rgb("black", t.black),
    rgb("text", t.fg),
    rgb("bg", t.bg),
    rgb("panel", t.panel),
    rgb("control", t.controls),
    rgb("sunken", t.sunken),
    rgb("scroll-track", t.scrollTrack),
    rgb("scroll-thumb", t.scrollThumb),
    rgb("accent", t.accent),
    rgb("accent-300", t.accent300),
    rgb("accent-400", t.accent400),
    rgb("accent-600", t.accent600),
    rgb("accent-700", t.accent700),
    rgb("accent-ink", t.accentInk),
    rgb("accent-text", t.accentText),
    rgb("accent-line", t.accentLine),
    ["--st-color-scheme", t.scheme],
    ["--st-text-fade", String(Math.round(t.textFade * 1000) / 1000)],
    ["--st-icon-filter", t.scheme === "dark" ? "invert(1)" : "none"],
    // The white wordmark image: flipped to dark on light grounds, blue kept blue.
    ["--st-wordmark-filter", t.scheme === "dark" ? "none" : "invert(1) hue-rotate(180deg)"],
    ...meaningVariables(mark.meaning),
    // The desktop app's names, which shared libs (Moodboard, the lightbox,
    // PageDraw's history) read with fallbacks of their own. Left unset by
    // default; a theme sets them so those libs follow it too.
    ["--st-bg", `rgb(${rgbTriplet(t.bg)})`],
    ["--st-fg", `rgb(${rgbTriplet(t.fg)})`],
    ["--st-fg-rgb", rgbTriplet(t.fg)],
    ["--st-divider", `rgb(${rgbTriplet(t.white)} / 0.15)`],
    ["--st-controls-rgb", rgbTriplet(t.controls)],
    // shadcn tokens read by the video editor.
    ["--background", hslTriplet(t.bg)],
    ["--foreground", hslTriplet(t.fg)],
    ["--card", hslTriplet(t.panel)],
    ["--card-foreground", hslTriplet(t.fg)],
    ["--popover", hslTriplet(t.panel)],
    ["--popover-foreground", hslTriplet(t.fg)],
    ["--primary", hslTriplet(t.accent)],
    ["--primary-foreground", hslTriplet(t.white)],
    ["--secondary", hslTriplet(t.controls)],
    ["--secondary-foreground", hslTriplet(t.fg)],
    ["--muted", hslTriplet(t.controls)],
    ["--muted-foreground", hslTriplet(mix(t.controls, t.fg, 0.7))],
    ["--accent", hslTriplet(t.controls)],
    ["--accent-foreground", hslTriplet(t.fg)],
    ["--border", `${hslTriplet(t.white)} / 0.15`],
    ["--input", `${hslTriplet(t.white)} / 0.15`],
    ["--ring", hslTriplet(t.accentInk)],
  ]);
}

// ── How the ground (background, surfaces, inks) is fitted ──────────────────

interface Inks {
  light: { fg: Hex; white: Hex };
  dark: { fg: Hex; white: Hex };
}

const INKS: Record<Character, Inks> = {
  soft: { light: { fg: "#F2F1EE", white: "#FFFFFF" }, dark: { fg: "#1A1712", white: "#0B0B0C" } },
  warm: { light: { fg: "#F7EDE2", white: "#FFFAF3" }, dark: { fg: "#2A1D14", white: "#140D08" } },
  cool: { light: { fg: "#EEF3F8", white: "#F7FBFF" }, dark: { fg: "#141B24", white: "#070B12" } },
};

/** How far each surface steps off the background at tint 0.5, measured from the default theme. */
const STEPS = { panel: 0.11, sunken: 0.67, controls: 0.05, scrollTrack: 0.4, scrollThumb: 0.1 };

type Ground = Omit<
  SoulMarkTokens,
  "accent" | "accent300" | "accent400" | "accent600" | "accent700" | "accentInk" | "accentText" | "accentLine"
>;

interface FittedGround {
  bg: Hex;
  lighter: boolean;
  tokens: Ground;
  /** The readable background the other ink would have needed, when it differs. */
  alternative?: Hex;
}

/**
 * The background as chosen when text reads on it and on every surface built
 * from it, with faded text strengthened first if that is all it takes;
 * otherwise the smallest lightness move that makes it so. Both inks (light
 * text, dark text) are tried, and the one needing the smaller move wins, so a
 * mid-tone keeps as much of its colour as it can.
 */
function fitGround(seeds: SoulMarkSeeds): FittedGround {
  const [, , seedL] = toHsl(seeds.background);
  let best: (FittedGround & { move: number; margin: number }) | null = null;
  let other: Hex | undefined;
  for (const pole of ["light", "dark"] as const) {
    // A background is usable when text clears at the strongest fade allowed;
    // the exact fade is settled once, for the background that wins.
    const strongest = (bg: Hex) => buildGround(bg, pole, seeds, MIN_TEXT_FADE);
    const fit = nearestLightness(
      seeds.background,
      (bg) => textMargin(strongest(bg)) >= 1,
      (bg) => textMargin(strongest(bg)),
    );
    if (!fit.passed) continue;
    const tokens = withBestFade(buildGround(fit.hex, pole, seeds, 1));
    const move = Math.abs(toHsl(fit.hex)[2] - seedL);
    // On a tie, the pole that needs less fade change looks most like the app, then the safer one.
    const margin = tokens.textFade + textMargin(tokens) / 1000;
    if (!best || move < best.move - 1e-9 || (Math.abs(move - best.move) < 1e-9 && margin > best.margin)) {
      if (best) other = best.bg;
      best = { bg: fit.hex, lighter: toHsl(fit.hex)[2] > seedL, tokens, move, margin };
    } else {
      other = fit.hex;
    }
  }
  if (best && other && other !== best.bg) best.alternative = other;
  // Pure black always carries light text, so one pole always passes.
  return best ?? { bg: "#000000", lighter: false, tokens: buildGround("#000000", "light", seeds, 1) };
}

/** The ground with the highest text fade (closest to the app's own look) at which all text clears. */
function withBestFade(g: Ground): Ground {
  if (textMargin(g) >= 1) return g;
  const at = (textFade: number) => ({ ...g, textFade });
  if (textMargin(at(MIN_TEXT_FADE)) < 1) return at(MIN_TEXT_FADE);
  // Margin falls as fade rises, so bisect for the highest fade that still clears.
  let lo = MIN_TEXT_FADE;
  let hi = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (textMargin(at(mid)) >= 1) lo = mid;
    else hi = mid;
  }
  return at(Math.floor(lo * 1000) / 1000);
}

function buildGround(bg: Hex, pole: "light" | "dark", seeds: SoulMarkSeeds, textFade: number): Ground {
  const ink = INKS[seeds.character][pole];
  // "black" is the far end from the ink: the deepest surface, scrims, media letterbox.
  const deep: Hex = pole === "light" ? "#000000" : "#FFFFFF";
  const k = 0.5 + seeds.tint; // 0.5 .. 1.5, 1 at the default tint
  const step = (amount: number) => Math.min(0.95, amount * k);
  return {
    white: ink.white,
    black: deep,
    fg: ink.fg,
    bg,
    panel: mix(bg, deep, step(STEPS.panel)),
    sunken: mix(bg, deep, step(STEPS.sunken)),
    controls: mix(bg, ink.white, step(STEPS.controls)),
    scrollTrack: mix(bg, deep, step(STEPS.scrollTrack)),
    scrollThumb: mix(bg, ink.white, step(STEPS.scrollThumb)),
    scheme: pole === "light" ? "dark" : "light",
    textFade,
  };
}

/**
 * The worst text pair as a fraction of its floor: 1 or more means every text
 * pair clears. The same pairs as measureText, without the labels, because the
 * fitting searches call it thousands of times. It also asks that each status
 * colour family can reach AA within its band, so a ground that white text only
 * just reads on, and red errors could not, is not accepted.
 */
function textMargin(t: Ground): number {
  let worst = contrastRatio(t.white, t.black) / AA;
  const inks = [channels(t.white), channels(t.fg)];
  const edges = t.scheme === "dark" ? BAND_EDGES_LIGHT : BAND_EDGES_DARK;
  for (const [, surface] of textSurfaces(t)) {
    // Status colours (errors, badges) must be able to read here too.
    for (const edge of edges) {
      const m = contrastRatio(edge, surface) / AA;
      if (m < worst) worst = m;
    }
    const s = channels(surface);
    for (const ink of inks) {
      for (const opacity of TEXT_OPACITIES) {
        const drawn = 1 - (1 - opacity) * t.textFade;
        const m = overlayContrast(s, ink, drawn) / TEXT_FLOORS[opacity];
        if (m < worst) worst = m;
      }
    }
  }
  return worst;
}

function textSurfaces(t: Pick<SoulMarkTokens, "bg" | "panel" | "controls" | "sunken" | "white">) {
  return [
    ["page", t.bg],
    ["panel", t.panel],
    ["controls", t.controls],
    ["sunken", t.sunken],
    // Hovered rows and quiet fills: bg-white/10 over controls.
    ["hover", mix(t.controls, t.white, 0.1)],
  ] as const;
}

// ── How the accent is fitted ───────────────────────────────────────────────

type AccentTokens = Pick<
  SoulMarkTokens,
  "accent" | "accent300" | "accent400" | "accent600" | "accent700" | "accentInk" | "accentText" | "accentLine"
>;

function fitAccent(seed: Hex, ground: FittedGround, notes: SoulMarkNote[]): AccentTokens {
  const g = ground.tokens;
  const surfaces = textSurfaces(g).map(([, s]) => s);
  const worstOn = (c: Hex) => Math.min(...surfaces.map((s) => contrastRatio(c, s)));

  // The fill carries "white" text (always readable, first) and should stand
  // out from the panels (3:1, when this hue allows). Buttons take the same ink
  // as the page, so on some grounds the two pull opposite ways: then the label
  // wins and the shade with the most edge is used.
  const labelReads = (c: Hex) => contrastRatio(g.white, c) >= ACCENT_FILL_FLOOR;
  let fill = nearestLightness(seed, (c) => labelReads(c) && worstOn(c) >= NON_TEXT, () => 0);
  if (!fill.passed) {
    // No shade has a full 3:1 edge: the nearest one whose label reads and whose edge is visible.
    fill = nearestLightness(
      seed,
      (c) => labelReads(c) && worstOn(c) >= BUTTON_EDGE_MIN,
      (c) => (labelReads(c) ? 1 + worstOn(c) : contrastRatio(g.white, c) / ACCENT_FILL_FLOOR),
    );
  }
  if (!fill.passed || worstOn(fill.hex) < NON_TEXT) {
    const blends = !fill.passed || worstOn(fill.hex) < BUTTON_EDGE_MIN;
    notes.push({
      kind: blends ? "warning" : "info",
      seed: "accent",
      chosen: seed,
      used: fill.hex,
      message:
        blends
          ? "On this background, buttons in this accent barely stand out from the page. Their labels stay readable; another accent, or a darker or lighter background, gives them an edge."
          : "Buttons in this accent stand out from the page a little less than usual. Their labels stay readable.",
    });
  } else if (fill.hex !== seed) {
    notes.push({
      kind: "adjusted",
      seed: "accent",
      chosen: seed,
      used: fill.hex,
      message: "Accent shade adjusted so button text on it stays readable. Same hue.",
    });
  }
  if (sameFamily(fill.hex, g.bg)) {
    notes.push({
      kind: "warning",
      seed: "accent",
      chosen: seed,
      used: fill.hex,
      message: "Accent and background are the same colour family, so buttons stand out by brightness only.",
    });
  }

  // Deeper steps for hover: further from the "white" text, as in the default.
  const away: Hex = g.scheme === "dark" ? "#000000" : "#FFFFFF";
  const accent600 = mix(fill.hex, away, 0.12);
  const accent700 = mix(fill.hex, away, 0.24);

  // Accent as text and as lines: same hue, moved until it reads on every surface.
  const fitted = (c: Hex, floor: number) => nearestLightness(c, (x) => worstOn(x) >= floor, worstOn).hex;
  const accentText = fitted(seed, AA);
  return {
    accent: fill.hex,
    accent600,
    accent700,
    accentText,
    accentLine: fitted(seed, NON_TEXT),
    accent400: fitted(mix(accentText, g.fg, 0.12), AA),
    accent300: fitted(mix(accentText, g.fg, 0.25), AA),
    accentInk: fitted(mix(accentText, g.fg, 0.18), AA),
  };
}

function sameFamily(a: Hex, b: Hex): boolean {
  const [ha, sa] = toHsl(a);
  const [hb, sb] = toHsl(b);
  if (sa < 0.15 || sb < 0.15) return false;
  const d = Math.abs(ha - hb);
  return Math.min(d, 1 - d) < 0.04;
}

// ── Floors, measured once from the default theme ───────────────────────────

// ── Floors ─────────────────────────────────────────────────────────────────

const TEXT_FLOORS: Record<number, number> = Object.fromEntries(TEXT_OPACITIES.map((o) => [o, AA]));

/** Button labels are small bold caps, not large text, so they get the text floor. */
const ACCENT_FILL_FLOOR = AA;

const BAND_EDGES_LIGHT = bandEdges(true);
const BAND_EDGES_DARK = bandEdges(false);

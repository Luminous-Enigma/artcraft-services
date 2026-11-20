// Colour maths for themes: WCAG contrast, mixing and lightness search.
// Ported from Luminous-Enigma/twentyseven (mobile/src/theme.jsx), where the
// same functions guard that app's free-palette theme.

export type Hex = `#${string}`;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isHex(value: unknown): value is Hex {
  return typeof value === "string" && HEX_RE.test(value);
}

/** WCAG contrast ratio between two colours, from 1 (same) to 21 (black on white). */
export function contrastRatio(a: Hex, b: Hex): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: Hex): number {
  const cached = LUMINANCE.get(hex);
  if (cached !== undefined) return cached;
  const l = luminanceOfRgb(channels(hex));
  if (LUMINANCE.size > 50_000) LUMINANCE.clear();
  LUMINANCE.set(hex, l);
  return l;
}

const LUMINANCE = new Map<string, number>();

/** Linearised channel values, indexed by the 0-255 channel. */
const LINEAR = Array.from({ length: 256 }, (_, v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

function luminanceOfRgb([r, g, b]: Rgb): number {
  return 0.2126 * LINEAR[r] + 0.7152 * LINEAR[g] + 0.0722 * LINEAR[b];
}

/** Contrast between `ink` drawn at `opacity` over `surface` and the surface itself. */
export function contrastOfOverlay(
  surface: Hex,
  ink: Hex,
  opacity: number,
): number {
  return overlayContrast(channels(surface), channels(ink), opacity);
}

/** contrastOfOverlay on channel arrays, for loops that measure thousands of pairs. */
export function overlayContrast(s: Rgb, i: Rgb, opacity: number): number {
  const keep = 1 - opacity;
  const r = Math.round(s[0] * keep + i[0] * opacity);
  const g = Math.round(s[1] * keep + i[1] * opacity);
  const b = Math.round(s[2] * keep + i[2] * opacity);
  const ls =
    0.2126 * LINEAR[s[0]] + 0.7152 * LINEAR[s[1]] + 0.0722 * LINEAR[s[2]];
  const ld = 0.2126 * LINEAR[r] + 0.7152 * LINEAR[g] + 0.0722 * LINEAR[b];
  return ls > ld ? (ls + 0.05) / (ld + 0.05) : (ld + 0.05) / (ls + 0.05);
}

/** Mix two colours. amount 0 = a, 1 = b. Also how `b` at `amount` opacity lands on `a`. */
export function mix(a: Hex, b: Hex, amount: number): Hex {
  const ca = channels(a);
  const cb = channels(b);
  return hexOf(ca.map((v, i) => v * (1 - amount) + cb[i] * amount) as Rgb);
}

/**
 * The nearest version of `hex` (same hue and saturation, lightness moved as
 * little as possible) for which `passes` holds. Searches outward in both
 * directions, so the first answer is the smallest change; a colour that
 * already passes comes back untouched. When nothing passes it returns the
 * candidate that `score` rates highest, so the caller can report the
 * shortfall instead of pretending.
 */
export function nearestLightness(
  hex: Hex,
  passes: (candidate: Hex) => boolean,
  score: (candidate: Hex) => number,
): { hex: Hex; passed: boolean } {
  if (passes(hex)) return { hex, passed: true };
  const [h, s, l] = toHsl(hex);
  let best = hex;
  let bestScore = score(hex);
  for (let step = 1; step <= 200; step++) {
    const d = step / 200;
    for (const nl of [l - d, l + d]) {
      if (nl < 0 || nl > 1) continue;
      const candidate = fromHsl(h, s, nl);
      if (passes(candidate)) return { hex: candidate, passed: true };
      const sc = score(candidate);
      if (sc > bestScore) {
        best = candidate;
        bestScore = sc;
      }
    }
  }
  return { hex: best, passed: false };
}

/** "R G B", the form the --st-*-rgb CSS variables take. */
export function rgbTriplet(hex: Hex): string {
  return channels(hex).join(" ");
}

/** "H S% L%", the form the shadcn variables the video editor reads take. */
export function hslTriplet(hex: Hex): string {
  const [h, s, l] = toHsl(hex);
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function toHsl(hex: Hex): [number, number, number] {
  const [r, g, b] = channels(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return [h / 6, s, l];
}

export function fromHsl(h: number, s: number, l: number): Hex {
  if (s === 0) return hexOf([l * 255, l * 255, l * 255]);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return hexOf([f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]);
}

export type Rgb = [number, number, number];

export function channels(hex: Hex): Rgb {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function hexOf(rgb: Rgb): Hex {
  return ("#" +
    rgb
      .map((v) =>
        Math.round(Math.min(255, Math.max(0, v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()) as Hex;
}

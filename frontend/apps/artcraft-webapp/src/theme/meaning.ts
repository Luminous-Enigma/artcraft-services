// Colours that carry a meaning: red errors, amber BETA badges, green success,
// and the rest of the palette's text shades. On the default theme they are
// Tailwind's own; a theme fits each to its surfaces. The hue is the meaning,
// so it never changes, and lightness may only move within a band where red
// still reads as red rather than as black or white.

import colors from "tailwindcss/colors";
import {
  contrastRatio,
  fromHsl,
  type Hex,
  nearestLightness,
  rgbTriplet,
  toHsl,
} from "./contrast";

/** Must match MEANING_FAMILIES and MEANING_SHADES in tailwind.config.js. */
export const MEANING_FAMILIES = [
  "rose",
  "indigo",
  "red",
  "blue",
  "orange",
  "amber",
  "green",
  "emerald",
  "teal",
  "cyan",
  "yellow",
  "pink",
  "purple",
] as const;
export const MEANING_SHADES = [200, 300, 400, 500, 600] as const;

/** HSL lightness a meaning colour may use and still look like itself. */
export const MEANING_LIGHTNESS: [number, number] = [0.15, 0.85];
const EDGE_INSET = 0.01;

/** Every meaning colour as Tailwind declares it, with the CSS variable a theme overrides. */
export const MEANING_COLOURS: { variable: string; chosen: Hex }[] =
  MEANING_FAMILIES.flatMap((family) =>
    MEANING_SHADES.map((shade) => ({
      variable: `--st-${family}-${shade}-rgb`,
      chosen: (colors[family] as Record<number, string>)[
        shade
      ].toUpperCase() as Hex,
    })),
  );

export interface MeaningInk {
  variable: string;
  chosen: Hex;
  used: Hex;
  /** Worst contrast on the theme's surfaces. */
  ratio: number;
  floor: number;
}

/** Every meaning colour, fitted to read at its floor on all of `surfaces`. */
export function fitMeaningInks(
  surfaces: Hex[],
  floorOf: (variable: string) => number,
): MeaningInk[] {
  const worstOn = (c: Hex) =>
    Math.min(...surfaces.map((s) => contrastRatio(c, s)));
  const [lo, hi] = MEANING_LIGHTNESS;
  const inBand = (c: Hex) => {
    const l = toHsl(c)[2];
    return l >= lo && l <= hi;
  };
  return MEANING_COLOURS.map(({ variable, chosen }) => {
    const floor = floorOf(variable);
    const fit = nearestLightness(
      chosen,
      (c) => worstOn(c) >= floor && (inBand(c) || c === chosen),
      (c) => (inBand(c) ? worstOn(c) : 0),
    );
    return { variable, chosen, used: fit.hex, ratio: worstOn(fit.hex), floor };
  });
}

/**
 * The most readable each meaning colour can get within its band: for light
 * text (dark grounds) its lightest allowed shade, for dark text its darkest.
 * Every shade is listed, since each has its own saturation and so its own
 * reach. A ground where these clear is one where every meaning colour fits.
 */
export function bandEdges(lightInk: boolean): Hex[] {
  // A step inside the band: the fitting search samples lightness every 0.5%,
  // so what clears here is always within reach of one of its samples.
  const l = lightInk
    ? MEANING_LIGHTNESS[1] - EDGE_INSET
    : MEANING_LIGHTNESS[0] + EDGE_INSET;
  const edges = MEANING_COLOURS.map(({ chosen }) => {
    const [h, s] = toHsl(chosen);
    return fromHsl(h, s, l);
  });
  return [...new Set(edges)];
}

export function meaningVariables(inks: MeaningInk[]): [string, string][] {
  return inks.map((m) => [m.variable, rgbTriplet(m.used)]);
}

// Soul Mark's ready-made colours. Each background here is one Soul Mark uses
// exactly as shown, at every tint and text tone (soul-mark.spec.ts checks it);
// any other colour can still be picked, and is fitted if it needs to be.

import { type Hex, mix } from "./contrast";
import { DEFAULT_TOKENS } from "./soul-mark";

export const LIGHT_BACKGROUNDS: [string, Hex][] = [
  ["Paper", "#FFFFFF"],
  ["Blush", "#FDF2F7"],
  ["Rose", "#F9CADE"],
  ["Coral", "#FFCCC4"],
  ["Peach", "#FFD8A8"],
  ["Butter", "#FFE066"],
  ["Honey", "#F3D588"],
  ["Mint", "#BFE3C6"],
  ["Sky", "#BFDBF1"],
];

export const DEEP_BACKGROUNDS: [string, Hex][] = [
  ["ArtCraft", DEFAULT_TOKENS.bg],
  ["Night", "#0B0E14"],
  ["Midnight blue", "#101B44"],
  ["Deep blue", "#0D2661"],
  ["Royal blue", "#19206A"],
  ["Deep purple", "#391961"],
  ["Deep rose", "#521232"],
  ["Deep red", "#5D101B"],
  ["Reddish brown", "#441E13"],
  ["Brown", "#34241A"],
  ["Deep green", "#0C2F1C"],
];

export const ACCENTS: [string, Hex][] = [
  ["Blue", DEFAULT_TOKENS.accent],
  ["Purple", "#9B4DCA"],
  ["Pink", "#E86FA6"],
  ["Red", "#E23E57"],
  ["Amber", "#F59E0B"],
  ["Green", "#10B981"],
  ["Teal", "#1CB6BE"],
  ["Ink", "#111111"],
];

/**
 * The painter's colour wheel as accents: the primaries red, yellow and blue,
 * the secondaries mixed from them (orange, green, violet), and the six
 * tertiaries between each pair. Like any accent, the readability guard fits
 * each one to the background.
 */
export const WHEEL: [string, Hex][] = [
  ["Red", "#FE2712"],
  ["Red-orange", "#FC600A"],
  ["Orange", "#FB9902"],
  ["Yellow-orange", "#FCCC1A"],
  ["Yellow", "#FEFE33"],
  ["Yellow-green", "#B2D732"],
  ["Green", "#66B032"],
  ["Blue-green", "#347C98"],
  ["Blue", "#0247FE"],
  ["Blue-violet", "#4424D6"],
  ["Violet", "#8601AF"],
  ["Red-violet", "#C21460"],
];

/** Each wheel colour lighter: a tint, 45% of the way to white. */
export const WHEEL_LIGHT: [string, Hex][] = WHEEL.map(([name, hex]) => [
  `Light ${name.toLowerCase()}`,
  mix(hex, "#FFFFFF", 0.45),
]);

/** Each wheel colour deeper: a shade, 40% of the way to black. */
export const WHEEL_DEEP: [string, Hex][] = WHEEL.map(([name, hex]) => [
  `Deep ${name.toLowerCase()}`,
  mix(hex, "#000000", 0.4),
]);

/** Every ready-made accent, in the order the picker shows them. */
export const ALL_ACCENTS: [string, Hex][] = [
  ...ACCENTS,
  ...WHEEL,
  ...WHEEL_LIGHT,
  ...WHEEL_DEEP,
];

/**
 * Mid-tones the readability guard has to adjust: bright, saturated colours
 * that neither white nor dark text reads on everywhere the app draws text.
 * They are offered only with the guard off, marked as hard to read.
 */
export const BOLD_BACKGROUNDS: [string, Hex][] = [
  ["Red", "#E23E57"],
  ["Crimson", "#DC143C"],
  ["Burnt orange", "#CC5500"],
  ["Royal blue", "#4169E1"],
  ["Violet", "#7A4FBF"],
  ["Grey", "#777777"],
  ["Emerald", "#10B981"],
  ["Orange", "#F59E0B"],
  ["Hot pink", "#E86FA6"],
  ["Teal", "#1CB6BE"],
];

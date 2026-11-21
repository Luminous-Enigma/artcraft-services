// Soul Mark's ready-made colors. Each Light and Deep background is one Soul
// Mark uses exactly as shown, at every tint and text tone (soul-mark.spec.ts
// checks it); the Primaries are fitted where they need to be, like any other
// color someone picks. No color appears in more than one row.

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
  ["Deep space", "#0D1117"],
  ["Navy", "#011627"],
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
  ["Cobalt", "#0969DA"],
  ["Azure", "#1F6FEB"],
  ["Cerulean", "#219FD5"],
  ["Purple", "#9B4DCA"],
  ["Pink", "#E86FA6"],
  ["Red", "#E23E57"],
  ["Amber", "#F59E0B"],
  ["Green", "#10B981"],
  ["Teal", "#1CB6BE"],
  ["Ink", "#111111"],
];

/**
 * The painter's color wheel as accents: the primaries red, yellow and blue,
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

/**
 * The same twelve wheel hues as backgrounds, the first row of the Background
 * picker. Unlike the Light and Deep rows, some of these sit in the middle of
 * the lightness range where not every text reads on them: with the guard on,
 * Soul Mark keeps the hue and moves the shade, and says so; with it off, they
 * are used exactly as picked and marked hard to read where they fall short.
 */
export const PRIMARY_BACKGROUNDS: [string, Hex][] = WHEEL;

/** Each wheel color lighter: a tint, 45% of the way to white. */
export const WHEEL_LIGHT: [string, Hex][] = WHEEL.map(([name, hex]) => [
  `Light ${name.toLowerCase()}`,
  mix(hex, "#FFFFFF", 0.45),
]);

/** Each wheel color deeper: a shade, 40% of the way to black. */
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
 * Mid-tones the readability guard has to adjust: bright, saturated colors
 * that neither white nor dark text reads on everywhere the app draws text.
 * They are offered only with the guard off, marked as hard to read.
 */
export const BOLD_BACKGROUNDS: [string, Hex][] = [
  ["Red", "#E23E57"],
  ["Crimson", "#DC143C"],
  ["Burnt orange", "#CC5500"],
  ["Royal blue", "#4169E1"],
  ["Violet", "#7A4FBF"],
  ["Gray", "#777777"],
  ["Emerald", "#10B981"],
  ["Orange", "#F59E0B"],
  ["Hot pink", "#E86FA6"],
  ["Teal", "#1CB6BE"],
];

/**
 * Signature themes: whole looks picked in one tap, shown above the color
 * rows. Each is built only from colors in those rows, so anyone can also
 * make it by hand. The first three follow the most-installed editor themes
 * (see the theme-evidence research); the rest are the designer's picks.
 */
export const SIGNATURE_THEMES: {
  name: string;
  background: Hex;
  accent: Hex;
}[] = [
  { name: "Paper and Cobalt", background: "#FFFFFF", accent: "#0969DA" },
  { name: "Deep space and Azure", background: "#0D1117", accent: "#1F6FEB" },
  { name: "Navy and Cerulean", background: "#011627", accent: "#219FD5" },
  { name: "Midnight and Teal", background: "#101B44", accent: "#1CB6BE" },
  { name: "Sky and Blue", background: "#BFDBF1", accent: "#2D81FF" },
  { name: "Deep red and Red", background: "#5D101B", accent: "#E23E57" },
  { name: "Deep green and Green", background: "#0C2F1C", accent: "#10B981" },
  { name: "Night and Blue", background: "#0B0E14", accent: "#2D81FF" },
  {
    name: "Deep blue and Light blue",
    background: "#0D2661",
    accent: "#749AFE",
  },
  { name: "Royal blue and Teal", background: "#19206A", accent: "#1CB6BE" },
  { name: "Deep purple and Pink", background: "#391961", accent: "#E86FA6" },
  { name: "Deep rose and Pink", background: "#521232", accent: "#E86FA6" },
  { name: "Reddish brown and Amber", background: "#441E13", accent: "#F59E0B" },
  { name: "Brown and Orange", background: "#34241A", accent: "#FB9902" },
];

/**
 * The quick choices for what a gradient color fades to, shown above the full
 * palette for colors 2 and 3.
 */
export const GRADIENT_FADES: [string, Hex][] = [
  ["Black", "#000000"],
  ["White", "#FFFFFF"],
  ["Gray", "#4A4E55"],
  ["Midnight", "#101B44"],
];

/**
 * Signature gradients: whole looks in one tap, shown first. Each uses colors
 * from the picker's rows (or the quick fades), so anyone can also make it by
 * hand. Neon Deep is twentyseven's own look.
 */
export const SIGNATURE_GRADIENTS: {
  name: string;
  colors: Hex[];
  shape: "vertical" | "elliptical";
  accent: Hex;
}[] = [
  {
    name: "Neon Deep",
    colors: ["#0E1A2E", "#070B14"],
    shape: "vertical",
    accent: "#00E5FF",
  },
  {
    name: "Midnight and Teal",
    colors: ["#101B44", "#000000"],
    shape: "vertical",
    accent: "#1CB6BE",
  },
  {
    name: "Royal blue to black",
    colors: ["#19206A", "#000000"],
    shape: "vertical",
    accent: "#1F6FEB",
  },
  {
    name: "Deep red to black",
    colors: ["#5D101B", "#000000"],
    shape: "vertical",
    accent: "#E23E57",
  },
  {
    name: "Deep violet to black",
    colors: ["#500169", "#000000"],
    shape: "vertical",
    accent: "#E86FA6",
  },
  {
    name: "Deep green to black",
    colors: ["#0C2F1C", "#000000"],
    shape: "vertical",
    accent: "#10B981",
  },
  {
    name: "Sky to white",
    colors: ["#BFDBF1", "#FFFFFF"],
    shape: "vertical",
    accent: "#0969DA",
  },
  {
    name: "Rose to white",
    colors: ["#F9CADE", "#FFFFFF"],
    shape: "vertical",
    accent: "#C21460",
  },
  {
    name: "Aurora",
    colors: ["#0D2661", "#0C2F1C", "#0B0E14"],
    shape: "vertical",
    accent: "#1CB6BE",
  },
  {
    name: "Synthwave",
    colors: ["#391961", "#521232", "#0B0E14"],
    shape: "vertical",
    accent: "#E86FA6",
  },
  {
    name: "Event horizon",
    colors: ["#19206A", "#000000"],
    shape: "elliptical",
    accent: "#219FD5",
  },
];

/** What everyone sees the first time they choose Gradients: Neon Deep. */
export const GRADIENT_STARTER = {
  background: SIGNATURE_GRADIENTS[0].colors[0],
  color2: SIGNATURE_GRADIENTS[0].colors[1],
  shape: SIGNATURE_GRADIENTS[0].shape,
  accent: SIGNATURE_GRADIENTS[0].accent,
  tint: 0.5,
  character: "soft" as const,
  guard: true,
};

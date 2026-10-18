// Soul Mark's ready-made colours. Each background here is one Soul Mark uses
// exactly as shown, at every tint and text tone (soul-mark.spec.ts checks it);
// any other colour can still be picked, and is fitted if it needs to be.

import type { Hex } from "./contrast";
import { DEFAULT_TOKENS } from "./soul-mark";

export const LIGHT_BACKGROUNDS: [string, Hex][] = [
  ["Paper", "#FFFFFF"],
  ["Blush", "#FDF2F7"],
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
 * Mid-tones the readability guard has to adjust: bright, saturated colours
 * that neither white nor dark text reads on everywhere the app draws text.
 * They are offered only with the guard off, marked as hard to read.
 */
export const BOLD_BACKGROUNDS: [string, Hex][] = [
  ["Red", "#E23E57"],
  ["Royal blue", "#4169E1"],
  ["Violet", "#7A4FBF"],
  ["Grey", "#777777"],
  ["Emerald", "#10B981"],
  ["Orange", "#F59E0B"],
  ["Hot pink", "#E86FA6"],
  ["Teal", "#1CB6BE"],
];

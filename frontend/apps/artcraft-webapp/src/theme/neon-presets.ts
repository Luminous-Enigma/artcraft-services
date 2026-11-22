// Soul Mark: Neon's ready-made colors and signature looks. The glows are the Watchers app's
// neon colors; the backgrounds are the near-blacks its glass and screens use. Every signature is
// built only from these rows, so anyone can also make it by hand, and its page, fade, glow, bloom
// and grid hold exactly as picked (neon.spec.ts checks it). Like any accent, a bright neon button
// fill may be deepened so its white label reads; the glow keeps the neon color itself.
import type { Hex } from "./contrast";
import type { NeonSeeds } from "./neon";

/** The neon colors, from the Watchers app's design system. */
export const NEON_GLOWS: [string, Hex][] = [
  ["Cyan", "#00E5FF"],
  ["Green", "#39FF88"],
  ["Amber", "#FFB020"],
  ["Magenta", "#FF2BD6"],
  ["Violet", "#9B6BFF"],
  ["Lime", "#B6FF3B"],
  ["Red", "#FF4D6A"],
];

/** Near-black pages: Neon is a dark look, like a heads-up display. */
export const NEON_BACKGROUNDS: [string, Hex][] = [
  ["Void", "#000000"],
  ["Deep", "#03060C"],
  ["Glass", "#070B14"],
  ["Night", "#0B0E14"],
  ["Deep space", "#0D1117"],
  ["Midnight", "#101B44"],
];

/**
 * The page fades: the top color, then what it fades to. The first is the Watchers screen's fade,
 * its top one step deeper (#1C3D6E there) so text reads all the way down and the guard keeps it.
 */
export const NEON_FADES: [string, Hex, Hex][] = [
  ["Watchers screen", "#162F56", "#03060C"],
  ["Midnight to void", "#101B44", "#000000"],
];

/** Signature looks, shown first. Each is one tap. */
export const NEON_SIGNATURES: ({ name: string } & NeonSeeds)[] = [
  sig("Watchers HUD", "#162F56", "#00E5FF", "#00E5FF", { color2: "#03060C" }),
  sig("Workshop", "#03060C", "#FFB020", "#00E5FF"),
  sig("Green terminal", "#000000", "#39FF88", "#39FF88"),
  sig("Amber console", "#0B0E14", "#FFB020", "#FFB020", { grid: false }),
  sig("Synth", "#0D1117", "#9B6BFF", "#FF2BD6"),
  sig("Violet night", "#101B44", "#FF2BD6", "#9B6BFF"),
  sig("Lime radar", "#070B14", "#B6FF3B", "#B6FF3B"),
  sig("Red alert", "#000000", "#FF4D6A", "#FF4D6A", { grid: false }),
  sig("Quiet void", "#000000", "#00E5FF", "#00E5FF", { grid: false, strength: 0.3 }),
];

function sig(
  name: string,
  background: Hex,
  accent: Hex,
  glow: Hex,
  more: Partial<NeonSeeds> = {},
): { name: string } & NeonSeeds {
  return { name, background, accent, glow, strength: 0.6, grid: true, tint: 0.5, character: "cool", guard: true, ...more };
}

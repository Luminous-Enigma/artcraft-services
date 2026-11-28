// Soul Mark: Glass's ready-made pictures and signature looks. Every signature is built only from
// these rows and the Solid Tones accents, so anyone can also make it by hand (glass.spec.ts
// checks it). The pictures are original art made for Glass; the fades are the three-color
// signature gradients, shown as pictures. Readability never depends on the picture: the glass is
// measured over pure black and pure white, so it holds over any picture, uploads included.
import type { Hex } from "./contrast";
import type { GlassSeeds } from "./glass";
import { ACCENTS, SIGNATURE_GRADIENTS } from "./presets";

export interface GlassPicture {
  id: string;
  name: string;
  /** "image": a picture file (glass/<id>.jpg in an app); "fade": a top-to-bottom gradient. */
  kind: "image" | "fade";
  /** For a fade: its colors, top first. */
  colors?: Hex[];
}

/** Glass's own names for the three-color fades (Glass doesn't say where they came from). */
const FADE_NAMES: Record<string, string> = {
  Borealis: "Northern lights",
  Synthwave: "Neon dusk",
  Nebula: "Cosmos",
  Ember: "Hearth",
  Twilight: "Evening",
};

/** The starter pictures: original art, light to dark, plus the three-color fades. */
export const GLASS_PICTURES: GlassPicture[] = [
  { id: "quartz", name: "Quartz", kind: "image" },
  { id: "dusk", name: "Dusk", kind: "image" },
  { id: "shore", name: "Shore", kind: "image" },
  { id: "sunrise", name: "Sunrise", kind: "image" },
  { id: "marble", name: "Marble", kind: "image" },
  { id: "confetti", name: "Confetti", kind: "image" },
  { id: "aurora", name: "Polar lights", kind: "image" },
  { id: "ink", name: "Ink", kind: "image" },
  { id: "night-city", name: "Night city", kind: "image" },
  ...SIGNATURE_GRADIENTS.filter((g) => g.colors.length === 3).map(
    (g): GlassPicture => ({ id: `fade-${slug(fadeName(g.name))}`, name: fadeName(g.name), kind: "fade", colors: g.colors }),
  ),
];

/** The accents Glass offers first: Solid Tones' own rows. */
export const GLASS_ACCENTS: [string, Hex][] = ACCENTS;

/** Signature looks, shown first. Each is one tap; Quartz leads. */
export const GLASS_SIGNATURES: ({ name: string } & GlassSeeds)[] = [
  sig("Quartz", "light", "quartz", accent("Blue")),
  sig("Smoked quartz", "light", "quartz", accent("Blue"), { darkOn: true, darkened: 60 }),
  sig("Dusk", "light", "dusk", accent("Pink")),
  sig("Shore", "light", "shore", accent("Teal")),
  sig("Sunrise", "light", "sunrise", accent("Amber")),
  sig("Marble", "light", "marble", accent("Ink")),
  sig("Polar lights", "dark", "aurora", accent("Green")),
  sig("Ink", "dark", "ink", accent("Cerulean")),
  sig("Night city", "dark", "night-city", accent("Purple")),
  ...GLASS_PICTURES.filter((p) => p.kind === "fade").map((p) =>
    sig(p.name, "dark", p.id, SIGNATURE_GRADIENTS.find((g) => FADE_NAMES[g.name] === p.name)!.accent),
  ),
];

function sig(
  name: string,
  kind: "light" | "dark",
  picture: string,
  accentHex: Hex,
  more: Partial<GlassSeeds> = {},
): { name: string } & GlassSeeds {
  return {
    name,
    kind,
    accent: accentHex,
    picture,
    frost: 30,
    frostOn: true,
    transparency: 0.09,
    linked: true,
    darkened: 50,
    darkOn: false,
    lines: "light",
    guard: true,
    ...more,
  };
}

function accent(name: string): Hex {
  const row = ACCENTS.find(([n]) => n === name);
  if (!row) throw new Error(`no accent ${name}`);
  return row[1];
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function fadeName(gradient: string): string {
  const name = FADE_NAMES[gradient];
  if (!name) throw new Error(`no Glass name for the fade ${gradient}`);
  return name;
}

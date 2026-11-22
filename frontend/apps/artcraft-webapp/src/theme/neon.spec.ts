// Soul Mark: Neon keeps the readability promise: the glow stands out, and no text loses its
// contrast to the glow's bloom or the grid, for every ready-made combination.
import { contrastRatio, type Hex, toHsl } from "./contrast";
import {
  BLOOM_MAX,
  composeNeon,
  decodeNeon,
  encodeNeon,
  GRID_MAX,
  NEON_STARTER,
  type NeonSeeds,
  neonTextMeasurements,
  neonVariables,
  pageTokens,
  type SoulMarkNeon,
} from "./neon";
import { NEON_BACKGROUNDS, NEON_FADES, NEON_GLOWS, NEON_SIGNATURES } from "./neon-presets";
import { NON_TEXT } from "./soul-mark";

describe("Soul Mark: Neon", () => {
  describe("the readability sweep", () => {
    it(
      "keeps every combination readable: glow stands out, text clears beside the glow and over the grid",
      () => {
        const pages: Pick<NeonSeeds, "background" | "color2">[] = [
          ...NEON_BACKGROUNDS.map(([, background]) => ({ background })),
          ...NEON_FADES.map(([, background, color2]) => ({ background, color2 })),
        ];
        let checked = 0;
        for (const page of pages)
          for (const [, glow] of NEON_GLOWS)
            for (const [, accent] of NEON_GLOWS)
              for (const grid of [true, false])
                for (const strength of [0.3, 0.6, 1]) {
                  const seeds = { ...NEON_STARTER, ...page, glow, accent, grid, strength };
                  expectReadable(composeNeon(seeds), seeds);
                  checked++;
                }
        expect(checked).toBe(8 * 7 * 7 * 2 * 3);
      },
      600_000,
    );
  });

  describe("signature looks", () => {
    it("are each built from the Neon rows", () => {
      const glows = NEON_GLOWS.map(([, h]) => h);
      const pages = [...NEON_BACKGROUNDS.map(([, h]) => h), ...NEON_FADES.map(([, h]) => h)];
      for (const s of NEON_SIGNATURES) {
        expect(glows, s.name).toContain(s.glow);
        expect(glows, s.name).toContain(s.accent);
        expect(pages, s.name).toContain(s.background);
      }
      expect(new Set(NEON_SIGNATURES.map((s) => s.name)).size).toBe(NEON_SIGNATURES.length);
    });

    it("hold exactly as picked: the guard changes no glow, bloom or grid", () => {
      for (const s of NEON_SIGNATURES) {
        const n = composeNeon(s);
        expect(n.notes, s.name).toEqual([]);
        // The base theme keeps the page and fade exactly too. Like any accent, a bright neon button
        // fill may be deepened so its label reads; the glow keeps the neon color itself.
        const moved = n.mark.notes.filter((x) => x.kind === "adjusted" && (x.seed === "background" || x.seed === "gradient"));
        expect(moved, s.name).toEqual([]);
        expect(n.glow, s.name).toBe(s.glow);
        expect(n.bloom, s.name).toBe(s.strength);
        expect(n.grid, s.name).toBe(s.grid ? s.strength : 0);
        expectReadable(n, s);
      }
    });

    it("start with Blueprint", () => {
      expect(NEON_SIGNATURES[0].name).toBe("Blueprint");
      expect(composeNeon(NEON_STARTER).notes).toEqual([]);
    });
  });

  describe("the guard", () => {
    it("brightens a glow too dim to see, keeping its hue", () => {
      const dim: NeonSeeds = { ...NEON_STARTER, background: "#000000", glow: "#003A40" };
      const n = composeNeon(dim);
      expect(n.glow).not.toBe(dim.glow);
      expect(Math.abs(toHsl(n.glow)[0] - toHsl(dim.glow)[0])).toBeLessThan(2);
      expect(contrastRatio(n.glow, n.mark.tokens.bg)).toBeGreaterThanOrEqual(NON_TEXT);
      expect(n.notes.map((x) => x.seed)).toContain("glow");
    });

    it("turns the glow and grid down rather than let text fade", () => {
      // A light page: a strong colored bloom and grid would wash out dark text.
      const light: NeonSeeds = { ...NEON_STARTER, background: "#FFFFFF", glow: "#0057FF", accent: "#0057FF", strength: 1 };
      const n = composeNeon(light);
      expect(n.bloom).toBeLessThan(1);
      expectReadable(n, light);
    });

    it("off: uses everything as picked and says what falls short", () => {
      const open: NeonSeeds = { ...NEON_STARTER, background: "#000000", glow: "#003A40", guard: false };
      const n = composeNeon(open);
      expect(n.glow).toBe("#003A40");
      expect(n.shortfalls.map((s) => s.label)).toContain("Neon outlines");
    });
  });

  describe("theme codes", () => {
    it("round-trip every signature and the starter", () => {
      for (const s of [NEON_STARTER, ...NEON_SIGNATURES]) {
        const { name: _n, ...seeds } = s as NeonSeeds & { name?: string };
        const code = encodeNeon(seeds);
        expect(code).toMatch(/^SM3-/);
        expect(decodeNeon(code), code).toEqual(composeNeon(seeds).seeds);
      }
    });

    it("say the guard is off with -open", () => {
      const code = encodeNeon({ ...NEON_STARTER, guard: false });
      expect(code.endsWith("-open")).toBe(true);
      expect(decodeNeon(code)?.guard).toBe(false);
    });

    it("refuse what isn't a Neon code", () => {
      expect(decodeNeon("SM1-101B44-1CB6BE-50-soft")).toBeNull();
      expect(decodeNeon("SM3-000000-000000-00E5FF-00E5FF-60-g-50-cool")).toBeNull();
      expect(decodeNeon("SM3-000000-x-00E5FF-00E5FF-60-q-50-cool")).toBeNull();
    });
  });

  it("CSS variables carry the glow as RGB, and the bloom and grid as opacities", () => {
    const n = composeNeon(NEON_STARTER);
    expect(neonVariables(n)).toEqual({
      "--st-neon-glow-rgb": "0 229 255",
      "--st-neon-bloom": (0.6 * BLOOM_MAX).toFixed(3),
      "--st-neon-grid": (0.6 * GRID_MAX).toFixed(3),
    });
  });
});

/** Measured here again, independently of composeNeon's own checks. */
function expectReadable(n: SoulMarkNeon, seeds: Partial<NeonSeeds>) {
  const label = JSON.stringify(seeds);
  expect(n.shortfalls, label).toEqual([]);
  const pages = pageTokens(n.mark);
  for (const t of pages) {
    for (const surface of [t.bg, t.panel]) {
      expect(contrastRatio(n.glow, surface), `${label} glow on ${surface}`).toBeGreaterThanOrEqual(NON_TEXT - 1e-9);
    }
  }
  for (const [what, amount] of [
    ["bloom", n.bloom * BLOOM_MAX],
    ["grid", n.grid * GRID_MAX],
  ] as const) {
    const short = neonTextMeasurements(pages, n.glow as Hex, amount).filter((m) => m.ratio < m.floor - 1e-9);
    expect(short, `${label} text beside the ${what}`).toEqual([]);
  }
}

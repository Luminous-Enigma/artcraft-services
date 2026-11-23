// Soul Mark: Glass keeps the readability promise: every text, faded captions and accent text
// included, reads on every glass surface over the darkest and the lightest thing that can be
// behind it, for every ready-made combination. Measured here by this file's own code.
import { contrastOfOverlay, contrastRatio, type Hex, mix } from "./contrast";
import {
  composeGlass,
  decodeGlass,
  encodeGlass,
  GLASS_STARTER,
  type GlassSeeds,
  sanitizeGlassSeeds,
  type SoulMarkGlass,
} from "./glass";
import { GLASS_ACCENTS, GLASS_PICTURES, GLASS_SIGNATURES } from "./glass-presets";
import { ALL_ACCENTS } from "./presets";
import { AA, MIN_TEXT_FADE, NON_TEXT, TEXT_OPACITIES } from "./soul-mark";

const BLACK = "#000000" as Hex;
const WHITE = "#FFFFFF" as Hex;

describe("Soul Mark: Glass", () => {
  // One test per glass, darkness and transparency, so a slow machine still reports between them;
  // together they cover 2 × every accent × 6 darkness settings × 4 transparencies × 3 frost links.
  describe("the readability sweep: every combination stays readable over black and white", () => {
    for (const kind of ["light", "dark"] as const)
      for (const darkened of [null, 20, 40, 60, 80, 100])
        for (const transparency of [0, 0.09, 0.3, 1])
          it(`${kind} glass, darkened ${darkened ?? "off"}, transparency ${transparency}`, () => {
            let checked = 0;
            for (const [, accent] of ALL_ACCENTS)
              for (const [linked, frost] of [[true, 30], [true, 0], [false, 0]] as const) {
                const seeds: GlassSeeds = {
                  ...GLASS_STARTER, kind, accent, transparency, linked, frost, frostOn: frost > 0,
                  darkOn: darkened !== null, darkened: darkened ?? 50,
                };
                expectReadable(composeGlass(seeds), seeds);
                checked++;
              }
            expect(checked).toBe(ALL_ACCENTS.length * 3);
          }, 300_000);
  });

  describe("the layers", () => {
    it("menus and panels take Transparency while frosted, raised only as text needs", () => {
      const g = composeGlass({ ...GLASS_STARTER, transparency: 0.09 });
      expect(g.thin).toBe(true);
      expect(g.stackedFill).toBeGreaterThanOrEqual(0.09);
      expect(g.stackedFill).toBeLessThan(g.fill);
    });

    it("linked to Frost: at Frost 0, menus are a full layer like the page", () => {
      const g = composeGlass({ ...GLASS_STARTER, linked: true, frost: 0, frostOn: false });
      expect(g.thin).toBe(false);
      expect(g.stackedFill).toBe(g.fill);
    });

    it("unlinked: Transparency applies at Frost 0 too", () => {
      const g = composeGlass({ ...GLASS_STARTER, linked: false, frost: 0, frostOn: false });
      expect(g.thin).toBe(true);
      expect(g.stackedFill).toBeLessThan(g.fill);
    });

    it("glass over work covers what the page and the menu cover together", () => {
      const g = composeGlass(GLASS_STARTER);
      expect(g.overWorkFill).toBeCloseTo(1 - (1 - g.fill) * (1 - g.stackedFill), 2);
      expect(g.overWorkFill).toBeGreaterThanOrEqual(g.fill);
    });

    it("Frost only blurs, and never changes a fill", () => {
      const a = composeGlass({ ...GLASS_STARTER, frost: 0, frostOn: false, linked: false });
      const b = composeGlass({ ...GLASS_STARTER, frost: 100, linked: false });
      expect([a.fill, a.stackedFill]).toEqual([b.fill, b.stackedFill]);
      expect(a.blur).toBe(0);
      expect(b.blur).toBe(40);
    });

    it("Darkened smokes the glass and the picture; the smoke never thins the glass", () => {
      const g = composeGlass({ ...GLASS_STARTER, darkOn: true, darkened: 100 });
      expect(contrastRatio(g.glass, BLACK)).toBeLessThan(contrastRatio(composeGlass(GLASS_STARTER).glass, BLACK));
      expect(g.smoke).toBeCloseTo(0.75, 5);
      expectReadable(g, g.seeds);
    });

    it("faded captions never go below the engine's floor", () => {
      for (const kind of ["light", "dark"] as const) expect(composeGlass({ ...GLASS_STARTER, kind }).textFade).toBeGreaterThanOrEqual(MIN_TEXT_FADE - 1e-9);
    });

    it("say what moved in plain words, once for the accent", () => {
      const g = composeGlass(GLASS_STARTER);
      const accent = g.notes.filter((n) => n.message.includes("accent"));
      expect(accent).toHaveLength(1);
      for (const n of g.notes) expect(n.message, n.message).not.toMatch(/accent(Text|Ink|Line|300|400)|textFade/);
    });

    it("dark 3D lines on dark glass come with a note", () => {
      const g = composeGlass({ ...GLASS_STARTER, kind: "dark", lines: "dark" });
      expect(g.lines).toBe("#000000");
      expect(g.notes.some((n) => n.seed === "lines")).toBe(true);
    });
  });

  describe("guard off", () => {
    it("uses the fill as picked and says what falls short", () => {
      const g = composeGlass({ ...GLASS_STARTER, guard: false, fill: 0.1 });
      expect(g.fill).toBe(0.1);
      expect(g.shortfalls.length).toBeGreaterThan(0);
    });
  });

  describe("signature looks", () => {
    it("are each built from the Glass rows", () => {
      const pictures = GLASS_PICTURES.map((p) => p.id);
      const accents = GLASS_ACCENTS.map(([, h]) => h);
      for (const s of GLASS_SIGNATURES) {
        expect(pictures, s.name).toContain(s.picture);
        expect(accents, s.name).toContain(s.accent);
      }
      expect(new Set(GLASS_SIGNATURES.map((s) => s.name)).size).toBe(GLASS_SIGNATURES.length);
      expect(GLASS_SIGNATURES[0].name).toBe("Quartz");
    });

    it("are readable, at the 9% menu and Frost 30 they ship with", () => {
      for (const s of GLASS_SIGNATURES) {
        const g = composeGlass(s);
        expectReadable(g, s);
        expect(g.stackedFill, s.name).toBeLessThanOrEqual(0.2);
        expect(g.blur, s.name).toBe(12);
      }
    });

    it("include all five three-color fades, none named after Gradients", () => {
      const fades = GLASS_PICTURES.filter((p) => p.kind === "fade");
      expect(fades).toHaveLength(5);
      for (const f of fades) expect(f.colors).toHaveLength(3);
      expect(new Set(GLASS_PICTURES.map((p) => p.name)).size).toBe(GLASS_PICTURES.length);
    });
  });

  describe("codes", () => {
    it("round-trip every signature and the starter", () => {
      for (const s of [GLASS_STARTER, ...GLASS_SIGNATURES]) {
        const { name: _n, ...seeds } = s as GlassSeeds & { name?: string };
        const code = encodeGlass(seeds);
        expect(code.startsWith("SM4-")).toBe(true);
        expect(decodeGlass(code)).toEqual(sanitizeGlassSeeds(seeds));
      }
    });

    it("round-trip every switch, guard off and unlinked included", () => {
      const seeds = sanitizeGlassSeeds({ ...GLASS_STARTER, kind: "dark", frostOn: false, linked: false, darkOn: true, darkened: 80, lines: "dark", guard: false, transparency: 0.25 });
      expect(decodeGlass(encodeGlass(seeds))).toEqual({ ...seeds, fill: undefined });
    });

    it("reject what isn't a Glass code", () => {
      for (const bad of ["", "SM3-000000-x-00E5FF-00E5FF-60-g-50-cool", "SM4-l-zzzzzz-quartz-30-f-9-k-x-l", "SM4-q-2D81FF-quartz-30-f-9-k-x-l"])
        expect(decodeGlass(bad)).toBeNull();
    });
  });

  describe("sanitizing", () => {
    it("clamps numbers and refuses odd pictures", () => {
      const s = sanitizeGlassSeeds({ frost: 400, transparency: -2, darkened: 1000, picture: "../etc" });
      expect(s.frost).toBe(100);
      expect(s.transparency).toBe(0);
      expect(s.darkened).toBe(100);
      expect(s.picture).toBe(GLASS_STARTER.picture);
    });
  });
});

// ── This file's own measurement ───────────────────────────────────────────────

/** Every glass layer, over black and white: text at every fade, accent text and accent lines. */
function expectReadable(g: SoulMarkGlass, seeds: GlassSeeds): void {
  if (seeds.guard === false) return;
  const t = g.mark.tokens;
  const layers: [string, (b: Hex, s: Hex) => Hex][] = [
    ["page", (b, s) => mix(b, s, g.fill)],
    ["stacked", (b, s) => mix(mix(b, t.bg, g.fill), s, g.stackedFill)],
    ["over work", (b, s) => mix(b, s, g.overWorkFill)],
  ];
  for (const [layer, through] of layers)
    for (const behind of [BLACK, WHITE])
      for (const surface of [t.bg, t.panel]) {
        const s = through(behind, surface);
        const where = `${encodeGlass(seeds)} ${layer} over ${behind} on ${surface}`;
        for (const ink of [t.fg, t.white])
          for (const opacity of TEXT_OPACITIES) {
            const drawn = 1 - (1 - opacity) * g.textFade;
            expect(contrastOfOverlay(s, ink, drawn), `${where}: ${ink}/${opacity}`).toBeGreaterThanOrEqual(AA - 1e-9);
          }
        for (const ink of [t.accentText, t.accentInk, t.accent300, t.accent400])
          expect(contrastRatio(ink, s), `${where}: accent ${ink}`).toBeGreaterThanOrEqual(AA - 1e-9);
        expect(contrastRatio(t.accentLine, s), `${where}: line`).toBeGreaterThanOrEqual(NON_TEXT - 1e-9);
      }
}

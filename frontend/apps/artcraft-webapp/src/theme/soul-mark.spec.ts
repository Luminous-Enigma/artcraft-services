import { contrastRatio, fromHsl, type Hex, mix, toHsl } from "./contrast";
import { MEANING_LIGHTNESS } from "./meaning";
import { BOLD_BACKGROUNDS, DEEP_BACKGROUNDS, LIGHT_BACKGROUNDS } from "./presets";
import {
  type Character,
  composeSoulMark,
  decodeSeeds,
  DEFAULT_TOKENS,
  encodeSeeds,
  measureAccent,
  measureText,
  NON_TEXT,
  sanitizeSeeds,
  SOUL_MARK_STARTER,
  type SoulMarkSeeds,
} from "./soul-mark";

const SWEEP_TIMEOUT = 600_000;

// Colours that are known to be hard: mid grey, saturated mid-tones, the
// extremes, and the default's own background.
const TROUBLEMAKERS: Hex[] = [
  "#777777", "#808080", "#E23E57", "#7A4FBF", "#9B4DCA", "#2D81FF", "#00FF00",
  "#FFFF00", "#FF00FF", "#00FFFF", "#000000", "#FFFFFF", "#121316", "#FDF2F7",
];

describe("contrast", () => {
  it("measures the WCAG extremes", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("mixes as opacity does", () => {
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });

  it("round-trips through HSL", () => {
    for (const hex of TROUBLEMAKERS) expect(fromHsl(...toHsl(hex))).toBe(hex);
  });
});

describe("ArtCraft's own colours as seeds", () => {
  it("keep their background, and only strengthen what falls short of AA", () => {
    const mark = composeSoulMark({ background: "#121316", accent: "#2D81FF", tint: 0.5, character: "soft" });
    expect(mark.tokens.bg).toBe(DEFAULT_TOKENS.bg);
    // The default's 40% captions and the label on its blue buttons are below
    // 4.5:1, so Soul Mark strengthens the one and deepens the other.
    expect(mark.tokens.textFade).toBeLessThan(1);
    expect(contrastRatio(DEFAULT_TOKENS.white, DEFAULT_TOKENS.accent)).toBeLessThan(4.5);
    expect(contrastRatio(mark.tokens.white, mark.tokens.accent)).toBeGreaterThanOrEqual(4.5);
    expect(failures(measureText(mark.tokens))).toEqual([]);
  });
});

describe("seeds", () => {
  it("replace anything unusable with the starter's values", () => {
    expect(sanitizeSeeds({ background: "red", accent: "#12345", tint: Infinity, character: "loud" }))
      .toEqual(SOUL_MARK_STARTER);
    expect(sanitizeSeeds(null)).toEqual(SOUL_MARK_STARTER);
  });

  it("keep a background that already reads, untouched", () => {
    const mark = composeSoulMark({ ...SOUL_MARK_STARTER, background: "#0B0E14" });
    expect(mark.tokens.bg).toBe("#0B0E14");
    expect(mark.notes.filter((n) => n.seed === "background")).toEqual([]);
  });

  it("move a background only in lightness, keeping its hue", () => {
    const mark = composeSoulMark({ ...SOUL_MARK_STARTER, background: "#E23E57" });
    const [hueChosen] = toHsl("#E23E57");
    const [hueUsed] = toHsl(mark.tokens.bg);
    expect(Math.abs(hueChosen - hueUsed)).toBeLessThan(0.01);
    expect(mark.notes.some((n) => n.seed === "background" && n.kind === "adjusted")).toBe(true);
  });
});

describe("presets", () => {
  it("are used exactly as shown, at every tint and text tone", () => {
    const moved: string[] = [];
    for (const [name, background] of [...LIGHT_BACKGROUNDS, ...DEEP_BACKGROUNDS])
      for (const tint of [0, 0.5, 1])
        for (const character of ["soft", "warm", "cool"] as const) {
          const mark = composeSoulMark({ background, accent: "#2D81FF", tint, character });
          if (mark.tokens.bg !== background) moved.push(`${name} at tint ${tint}, ${character}`);
        }
    expect(moved).toEqual([]);
  }, SWEEP_TIMEOUT);
});

describe("the other way", () => {
  it("is offered for a moved background, and is kept exactly when taken", () => {
    const moved = composeSoulMark({ ...SOUL_MARK_STARTER, background: "#E23E57" });
    const note = moved.notes.find((n) => n.seed === "background");
    expect(note?.alternative).toBeDefined();
    const taken = composeSoulMark({ ...SOUL_MARK_STARTER, background: note!.alternative! });
    expect(taken.tokens.bg).toBe(note!.alternative);
    expect(taken.notes.filter((n) => n.seed === "background")).toEqual([]);
  });
});

describe("status colours", () => {
  it("keep their hue, and stay within the lightness band where they still look like themselves", () => {
    const mark = composeSoulMark({ ...SOUL_MARK_STARTER, background: "#FDF2F7" });
    for (const m of mark.meaning) {
      const [hc, sc] = toHsl(m.chosen);
      const [hu, , lu] = toHsl(m.used);
      if (m.used !== m.chosen) {
        if (sc > 0.05) expect(Math.min(Math.abs(hc - hu), 1 - Math.abs(hc - hu))).toBeLessThan(0.02);
        expect(lu).toBeGreaterThanOrEqual(MEANING_LIGHTNESS[0]);
        expect(lu).toBeLessThanOrEqual(MEANING_LIGHTNESS[1]);
      }
    }
  });

  it("are left exactly as Tailwind's wherever they already read", () => {
    const mark = composeSoulMark({ background: "#121316", accent: "#2D81FF", tint: 0.5, character: "soft" });
    for (const m of mark.meaning) if (m.used !== m.chosen) expect(m.ratio).toBeGreaterThanOrEqual(4.5);
    const red300 = mark.meaning.find((m) => m.variable === "--st-red-300-rgb");
    expect(red300?.used).toBe(red300?.chosen);
  });
});

describe("the readability guard switched off", () => {
  it("is on unless it is set to false", () => {
    expect(sanitizeSeeds({}).guard).toBe(true);
    expect(sanitizeSeeds({ guard: "no" }).guard).toBe(true);
    expect(sanitizeSeeds({ guard: false }).guard).toBe(false);
  });

  it("uses the background and accent exactly as picked", () => {
    const mark = composeSoulMark(open("#777777", "#E86FA6"));
    expect(mark.tokens.bg).toBe("#777777");
    expect(mark.tokens.accent).toBe("#E86FA6");
    expect(mark.tokens.accentText).toBe("#E86FA6");
  });

  it("says what falls short, and what the guard would use instead", () => {
    const mark = composeSoulMark(open("#777777"));
    expect(mark.shortfalls.length).toBeGreaterThan(0);
    for (const f of mark.shortfalls) expect(f.ratio).toBeLessThan(f.floor);
    expect(mark.guarded).toEqual(composeSoulMark({ ...open("#777777"), guard: true }).tokens);
    const note = mark.notes.find((n) => n.seed === "background");
    expect(note?.chosen).toBe("#777777");
    expect(note?.used).toBe(mark.guarded?.bg);
  });

  it("still picks whichever text colour reads better", () => {
    const light = composeSoulMark(open("#4169E1"));
    const lightFg = contrastRatio(light.tokens.fg, "#4169E1");
    const other = light.tokens.scheme === "dark" ? "#1A1712" : "#F2F1EE";
    expect(lightFg).toBeGreaterThanOrEqual(contrastRatio(other, "#4169E1") * 0.9);
  });

  it("still strengthens faded text, which is no colour anyone picked", () => {
    const mark = composeSoulMark(open("#0B0E14", "#9B4DCA"));
    expect(mark.tokens.textFade).toBeLessThan(1);
    expect(mark.shortfalls.find((f) => f.label.startsWith("Faded"))).toBeUndefined();
  });

  it("marks every Bold preset honestly: each one falls short without the guard", () => {
    const fine = BOLD_BACKGROUNDS.filter(([, hex]) => composeSoulMark(open(hex)).shortfalls.length === 0);
    expect(fine).toEqual([]);
  });

  it("gives back the full guarantees as soon as it is on again", () => {
    for (const [, hex] of BOLD_BACKGROUNDS) {
      const mark = composeSoulMark({ ...open(hex), guard: true });
      expect(mark.shortfalls).toEqual([]);
      expect(failures(measureText(mark.tokens))).toEqual([]);
    }
  });

  function open(background: Hex, accent: Hex = "#2D81FF"): SoulMarkSeeds {
    return { background, accent, tint: 0.5, character: "soft", guard: false };
  }
});

describe("theme codes", () => {
  it("round-trip the seeds", () => {
    const seeds: SoulMarkSeeds = { background: "#0B0E14", accent: "#E86FA6", tint: 0.8, character: "warm", guard: true };
    expect(encodeSeeds(seeds)).toBe("SM1-0B0E14-E86FA6-80-warm");
    expect(decodeSeeds(encodeSeeds(seeds))).toEqual(seeds);
    const open = { ...seeds, guard: false };
    expect(encodeSeeds(open)).toBe("SM1-0B0E14-E86FA6-80-warm-open");
    expect(decodeSeeds(encodeSeeds(open))).toEqual(open);
  });

  it("refuse anything that is not a code", () => {
    for (const bad of ["", "SM1-red-blue-50-soft", "SM2-0B0E14-E86FA6-80-warm", "SM1-0B0E14-E86FA6-80-loud;color:red"])
      expect(decodeSeeds(bad)).toBeNull();
  });
});

describe("every combination", () => {
  // Backgrounds: 12 hues x 4 saturations x 7 lightnesses, plus the troublemakers.
  const backgrounds: Hex[] = [
    ...TROUBLEMAKERS,
    ...[...LIGHT_BACKGROUNDS, ...DEEP_BACKGROUNDS].map(([, hex]) => hex),
  ];
  for (let h = 0; h < 12; h++)
    for (const s of [0, 0.4, 0.8, 1])
      for (const l of [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]) backgrounds.push(fromHsl(h / 12, s, l));

  // Accents: 6 hues x 2 lightnesses, the troublemakers, and "same as background".
  const accents = (bg: Hex): Hex[] => {
    const list: Hex[] = [...TROUBLEMAKERS, bg];
    for (let h = 0; h < 6; h++) for (const l of [0.4, 0.65]) list.push(fromHsl(h / 6, 0.85, l));
    return list;
  };

  const characters: Character[] = ["soft", "warm", "cool"];
  const tints = [0, 0.5, 1];

  it("keeps all text readable, status colours included, with no exception", async () => {
    const bad: string[] = [];
    for (const background of backgrounds)
      for (const character of characters)
        for (const tint of tints) {
          await breathe();
          const seeds: SoulMarkSeeds = { background, accent: "#2D81FF", tint, character };
          const mark = composeSoulMark(seeds);
          for (const f of failures(measureText(mark.tokens))) bad.push(`${describeSeeds(seeds)}: ${f}`);
          for (const m of mark.meaning)
            if (m.ratio < m.floor - 1e-9)
              bad.push(`${describeSeeds(seeds)}: ${m.variable} ${m.ratio.toFixed(2)} < ${m.floor.toFixed(2)}`);
        }
    expect(bad.slice(0, 20)).toEqual([]);
  }, SWEEP_TIMEOUT);

  it("keeps accent labels and accent text readable, and says so when a button's edge is soft", async () => {
    const silent: string[] = [];
    let combos = 0;
    let warned = 0;
    for (const background of backgrounds)
      for (const accent of accents(background)) {
        combos++;
        await breathe();
        const seeds: SoulMarkSeeds = { background, accent, tint: 0.5, character: "soft" };
        const mark = composeSoulMark(seeds);
        const failed = failures(measureAccent(mark.tokens));
        const hasWarning = mark.notes.some((n) => n.kind === "warning" && n.seed === "accent");
        const told = mark.notes.some((n) => n.kind !== "adjusted" && n.seed === "accent");
        if (hasWarning) warned++;
        // Every accent pair clears its floor. A button edge under 3:1 is
        // allowed (its floor is BUTTON_EDGE_MIN) but never without a note.
        const quietEdge = !told && measureAccent(mark.tokens).some(
          (m) => m.what.startsWith("button edge") && m.ratio < NON_TEXT,
        );
        const unflagged = quietEdge ? [...failed, "button edge under 3:1 without a warning"] : failed;
        for (const f of unflagged) silent.push(`${describeSeeds(seeds)}: ${f}`);
      }
    expect(silent.slice(0, 20)).toEqual([]);
    // A warning should be the exception, not the rule.
    expect(warned / combos).toBeLessThan(0.1);
  }, SWEEP_TIMEOUT);
});

// The sweeps are long; yielding now and then keeps the test worker responsive.
let sinceBreath = 0;
async function breathe() {
  if (++sinceBreath % 200 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
}

function failures(measurements: { what: string; ratio: number; floor: number }[]): string[] {
  return measurements
    .filter((m) => m.ratio < m.floor - 1e-9)
    .map((m) => `${m.what} ${m.ratio.toFixed(2)} < ${m.floor.toFixed(2)}`);
}

function describeSeeds(s: SoulMarkSeeds): string {
  return `bg ${s.background} accent ${s.accent} tint ${s.tint} ${s.character}`;
}

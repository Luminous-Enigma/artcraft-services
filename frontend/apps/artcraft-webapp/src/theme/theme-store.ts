import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  composeNeon,
  NEON_STARTER,
  type NeonSeeds,
  neonVariables,
  sanitizeNeonSeeds,
  type SoulMarkNeon,
} from "./neon";
import { GRADIENT_STARTER } from "./presets";
import {
  composeSoulMark,
  cssVariables,
  sanitizeSeeds,
  solidSeeds,
  SOUL_MARK_STARTER,
  type SoulMark,
  type SoulMarkSeeds,
} from "./soul-mark";

/** ArtCraft's own look, or one of the Soul Mark themes: Solid Tones, Gradients or Neon. */
export type ThemeMode = "default" | "soul-mark" | "gradients" | "neon";

interface ThemeStore {
  mode: ThemeMode;
  /** Soul Mark's seeds: solid, never a gradient. Only seeds are stored; colors are derived on load. */
  seeds: SoulMarkSeeds;
  /** Gradients' seeds: always with a color 2. Kept apart, so switching themes keeps both. */
  gradientSeeds: SoulMarkSeeds;
  /** Neon's seeds: a glow on a near-black page. Kept apart too. */
  neonSeeds: NeonSeeds;
  setMode: (mode: ThemeMode) => void;
  setSeeds: (seeds: Partial<SoulMarkSeeds>) => void;
  resetSeeds: () => void;
  setGradientSeeds: (seeds: Partial<SoulMarkSeeds>) => void;
  resetGradientSeeds: () => void;
  setNeonSeeds: (seeds: Partial<NeonSeeds>) => void;
  resetNeonSeeds: () => void;
}

/** Gradients' seeds, sanitized; anything without a usable color 2 falls back to the starter. */
export function sanitizeGradientSeeds(raw: unknown): SoulMarkSeeds {
  const s = sanitizeSeeds(raw);
  return s.color2 ? s : sanitizeSeeds(GRADIENT_STARTER);
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: "default",
      seeds: SOUL_MARK_STARTER,
      gradientSeeds: sanitizeGradientSeeds(GRADIENT_STARTER),
      neonSeeds: NEON_STARTER,
      setMode: (mode) => set({ mode }),
      setSeeds: (seeds) =>
        set((s) => ({ seeds: solidSeeds({ ...s.seeds, ...seeds }) })),
      resetSeeds: () => set({ seeds: SOUL_MARK_STARTER }),
      setGradientSeeds: (seeds) =>
        set((s) => ({
          gradientSeeds: sanitizeGradientSeeds({
            ...s.gradientSeeds,
            ...seeds,
          }),
        })),
      resetGradientSeeds: () =>
        set({ gradientSeeds: sanitizeGradientSeeds(GRADIENT_STARTER) }),
      setNeonSeeds: (seeds) =>
        set((s) => ({
          neonSeeds: sanitizeNeonSeeds({ ...s.neonSeeds, ...seeds }),
        })),
      resetNeonSeeds: () => set({ neonSeeds: NEON_STARTER }),
    }),
    {
      name: "artcraft-theme",
      // A stored value is never trusted as colors: it goes back through
      // sanitizing, and only composed hex values reach the page.
      merge: (stored, current) => {
        const s = (stored ?? {}) as Partial<ThemeStore>;
        const seeds = sanitizeSeeds(s.seeds);
        // A Soul Mark saved with a gradient (from before Gradients had its own card) moves there.
        const moved = s.mode === "soul-mark" && !!seeds.color2;
        const mode: ThemeMode =
          s.mode === "gradients" || moved
            ? "gradients"
            : s.mode === "soul-mark"
              ? "soul-mark"
              : s.mode === "neon"
                ? "neon"
                : "default";
        return {
          ...current,
          mode,
          seeds: solidSeeds(seeds),
          gradientSeeds: sanitizeGradientSeeds(moved ? seeds : s.gradientSeeds),
          neonSeeds: sanitizeNeonSeeds(s.neonSeeds),
        };
      },
    },
  ),
);

/** The seeds the current theme draws with (Solid Tones', Gradients' or Neon's). */
export function activeSeeds(
  s: Pick<ThemeStore, "mode" | "seeds" | "gradientSeeds" | "neonSeeds">,
): SoulMarkSeeds | NeonSeeds {
  return s.mode === "gradients"
    ? s.gradientSeeds
    : s.mode === "neon"
      ? s.neonSeeds
      : s.seeds;
}

/** The composed theme for the active seeds, recomputed only when they change. */
export function useSoulMark(): SoulMark {
  return soulMarkFor(useThemeStore(activeSeeds));
}

/** Soul Mark's own composed theme, whichever theme is active (for its card). */
export function useSolidMark(): SoulMark {
  return soulMarkFor(useThemeStore((s) => s.seeds));
}

/** Gradients' own composed theme, whichever theme is active (for its card). */
export function useGradientMark(): SoulMark {
  return soulMarkFor(useThemeStore((s) => s.gradientSeeds));
}

/** Neon's own composed theme, whichever theme is active (for its card and panel). */
export function useNeonMark(): SoulMarkNeon {
  return neonFor(useThemeStore((s) => s.neonSeeds));
}

const neonCache = new Map<NeonSeeds, SoulMarkNeon>();
function neonFor(seeds: NeonSeeds): SoulMarkNeon {
  let neon = neonCache.get(seeds);
  if (!neon) {
    if (neonCache.size > 8) neonCache.clear();
    neon = composeNeon(seeds);
    neonCache.set(seeds, neon);
  }
  return neon;
}

const cache = new Map<SoulMarkSeeds, SoulMark>();
function soulMarkFor(seeds: SoulMarkSeeds): SoulMark {
  let mark = cache.get(seeds);
  if (!mark) {
    if (cache.size > 8) cache.clear();
    mark = composeSoulMark(seeds);
    cache.set(seeds, mark);
  }
  return mark;
}

let applied: string[] = [];

/**
 * Writes the theme's variables onto <html>, or removes them for the default,
 * whose values live in styles.css. Values are composed hex triplets and
 * gradients built from them only, set one property at a time; nothing the
 * person typed is used as CSS.
 */
export function applyTheme(mode: ThemeMode, seeds: SoulMarkSeeds | NeonSeeds) {
  const root = document.documentElement;
  for (const name of applied) root.style.removeProperty(name);
  applied = [];
  root.dataset.theme = mode;
  delete root.dataset.gradient;
  delete root.dataset.neon;
  if (mode === "default") return;
  if (mode === "neon") {
    applyNeon(root, neonFor(seeds as NeonSeeds));
    return;
  }
  const mark = soulMarkFor(seeds);
  // The gradient rules in styles.css apply only while this is set.
  if (mode === "gradients" && mark.gradient)
    root.dataset.gradient = mark.gradient.shape;
  const vars = cssVariables(
    mode === "gradients" ? mark : { ...mark, gradient: undefined },
  );
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
    applied.push(name);
  }
}

/** Neon: the base theme's variables (and its fade, if any), plus the glow, bloom and grid. */
function applyNeon(root: HTMLElement, neon: SoulMarkNeon) {
  // The neon rules in styles.css apply only while this is set.
  root.dataset.neon = neon.grid > 0 ? "grid" : "glow";
  if (neon.mark.gradient) root.dataset.gradient = neon.mark.gradient.shape;
  const vars = { ...cssVariables(neon.mark), ...neonVariables(neon) };
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
    applied.push(name);
  }
}

/** Applies the stored theme now (before the first render) and whenever it changes. */
export function startTheming() {
  const s = useThemeStore.getState();
  applyTheme(s.mode, activeSeeds(s));
  useThemeStore.subscribe((s, prev) => {
    const seeds = activeSeeds(s);
    if (s.mode !== prev.mode || seeds !== activeSeeds(prev))
      applyTheme(s.mode, seeds);
  });
}

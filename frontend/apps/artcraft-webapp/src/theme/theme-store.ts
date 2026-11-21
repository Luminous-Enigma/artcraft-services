import { create } from "zustand";
import { persist } from "zustand/middleware";
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

/** ArtCraft's own look, Soul Mark (solid colors) or Gradients: two themes from one engine. */
export type ThemeMode = "default" | "soul-mark" | "gradients";

interface ThemeStore {
  mode: ThemeMode;
  /** Soul Mark's seeds: solid, never a gradient. Only seeds are stored; colors are derived on load. */
  seeds: SoulMarkSeeds;
  /** Gradients' seeds: always with a color 2. Kept apart, so switching themes keeps both. */
  gradientSeeds: SoulMarkSeeds;
  setMode: (mode: ThemeMode) => void;
  setSeeds: (seeds: Partial<SoulMarkSeeds>) => void;
  resetSeeds: () => void;
  setGradientSeeds: (seeds: Partial<SoulMarkSeeds>) => void;
  resetGradientSeeds: () => void;
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
              : "default";
        return {
          ...current,
          mode,
          seeds: solidSeeds(seeds),
          gradientSeeds: sanitizeGradientSeeds(moved ? seeds : s.gradientSeeds),
        };
      },
    },
  ),
);

/** The seeds the current theme draws with (Soul Mark's or Gradients'). */
export function activeSeeds(
  s: Pick<ThemeStore, "mode" | "seeds" | "gradientSeeds">,
) {
  return s.mode === "gradients" ? s.gradientSeeds : s.seeds;
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
export function applyTheme(mode: ThemeMode, seeds: SoulMarkSeeds) {
  const root = document.documentElement;
  for (const name of applied) root.style.removeProperty(name);
  applied = [];
  root.dataset.theme = mode;
  delete root.dataset.gradient;
  if (mode === "default") return;
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

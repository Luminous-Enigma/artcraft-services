import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  composeSoulMark,
  cssVariables,
  sanitizeSeeds,
  SOUL_MARK_STARTER,
  type SoulMark,
  type SoulMarkSeeds,
} from "./soul-mark";

export type ThemeMode = "default" | "soul-mark";

interface ThemeStore {
  mode: ThemeMode;
  /** Only the seeds are stored; every colour is derived again on load. */
  seeds: SoulMarkSeeds;
  setMode: (mode: ThemeMode) => void;
  setSeeds: (seeds: Partial<SoulMarkSeeds>) => void;
  resetSeeds: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: "default",
      seeds: SOUL_MARK_STARTER,
      setMode: (mode) => set({ mode }),
      setSeeds: (seeds) =>
        set((s) => ({ seeds: sanitizeSeeds({ ...s.seeds, ...seeds }) })),
      resetSeeds: () => set({ seeds: SOUL_MARK_STARTER }),
    }),
    {
      name: "artcraft-theme",
      // A stored value is never trusted as colours: it goes back through
      // sanitizeSeeds, and only composed hex values reach the page.
      merge: (stored, current) => {
        const s = (stored ?? {}) as Partial<ThemeStore>;
        return {
          ...current,
          mode: s.mode === "soul-mark" ? "soul-mark" : "default",
          seeds: sanitizeSeeds(s.seeds),
        };
      },
    },
  ),
);

/** The composed Soul Mark for the current seeds, recomputed only when they change. */
export function useSoulMark(): SoulMark {
  return soulMarkFor(useThemeStore((s) => s.seeds));
}

let lastSeeds: SoulMarkSeeds | null = null;
let lastMark: SoulMark | null = null;
function soulMarkFor(seeds: SoulMarkSeeds): SoulMark {
  if (seeds !== lastSeeds || !lastMark) {
    lastSeeds = seeds;
    lastMark = composeSoulMark(seeds);
  }
  return lastMark;
}

let applied: string[] = [];

/**
 * Writes the theme's variables onto <html>, or removes them for the default,
 * whose values live in styles.css. Values are composed hex triplets only,
 * set one property at a time; nothing the person typed is used as CSS.
 */
export function applyTheme(mode: ThemeMode, seeds: SoulMarkSeeds) {
  const root = document.documentElement;
  for (const name of applied) root.style.removeProperty(name);
  applied = [];
  root.dataset.theme = mode;
  if (mode !== "soul-mark") return;
  const vars = cssVariables(soulMarkFor(seeds));
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
    applied.push(name);
  }
}

/** Applies the stored theme now (before the first render) and whenever it changes. */
export function startTheming() {
  const { mode, seeds } = useThemeStore.getState();
  applyTheme(mode, seeds);
  useThemeStore.subscribe((s, prev) => {
    if (s.mode !== prev.mode || s.seeds !== prev.seeds)
      applyTheme(s.mode, s.seeds);
  });
}

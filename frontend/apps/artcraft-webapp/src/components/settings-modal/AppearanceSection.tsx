import { useEffect, useMemo, useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  InfoIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  WandIcon,
} from "lucide-react";
import { Switch } from "@storyteller/ui-switch";
import { twMerge } from "tailwind-merge";
import { isHex, type Hex, toHsl } from "../../theme/contrast";
import {
  type Character,
  composeSoulMark,
  decodeSeeds,
  DEFAULT_TOKENS,
  encodeSeeds,
  gradientCss,
  type GradientShape,
  type Shortfall,
  type SoulMarkNote,
  type SoulMarkSeeds,
  themeForSeeds,
} from "../../theme/soul-mark";
import {
  ACCENTS,
  ALL_ACCENTS,
  BOLD_BACKGROUNDS,
  DEEP_BACKGROUNDS,
  GRADIENT_FADES,
  LIGHT_BACKGROUNDS,
  PRIMARY_BACKGROUNDS,
  SIGNATURE_GRADIENTS,
  SIGNATURE_THEMES,
  WHEEL,
  WHEEL_DEEP,
  WHEEL_LIGHT,
} from "../../theme/presets";
import {
  decodeNeon,
  encodeNeon,
  type NeonNote,
  type NeonSeeds,
} from "../../theme/neon";
import {
  NEON_BACKGROUNDS,
  NEON_FADES,
  NEON_GLOWS,
  NEON_SIGNATURES,
} from "../../theme/neon-presets";
import {
  type ThemeMode,
  useGradientMark,
  useNeonMark,
  useSolidMark,
  useSoulMark,
  useThemeStore,
} from "../../theme/theme-store";

const CHARACTERS: [Character, string][] = [
  ["soft", "Soft"],
  ["warm", "Warm"],
  ["cool", "Cool"],
];

export function AppearanceSection() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div className="space-y-5 text-base-fg">
      <div className="flex flex-col gap-2 pt-3">
        <Label
          title="Theme"
          hint="Applies instantly, to every screen. Saved on this device."
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ModeCard
            mode="default"
            active={mode === "default"}
            onSelect={setMode}
            title="ArtCraft"
            subtitle="The standard look"
            swatch={[
              DEFAULT_TOKENS.bg,
              DEFAULT_TOKENS.controls,
              DEFAULT_TOKENS.accent,
            ]}
          />
          <SoulMarkCard active={mode === "soul-mark"} onSelect={setMode} />
          <GradientsCard active={mode === "gradients"} onSelect={setMode} />
          <NeonCard active={mode === "neon"} onSelect={setMode} />
        </div>
      </div>
      {mode === "soul-mark" && <SoulMarkControls kind="solid" />}
      {mode === "gradients" && <SoulMarkControls kind="gradient" />}
      {mode === "neon" && <NeonControls />}
    </div>
  );
}

function SoulMarkCard({
  active,
  onSelect,
}: {
  active: boolean;
  onSelect: (m: ThemeMode) => void;
}) {
  const { tokens } = useSolidMark();
  return (
    <ModeCard
      mode="soul-mark"
      active={active}
      onSelect={onSelect}
      title="Soul Mark: Solid Tones"
      subtitle="Solid colors"
      swatch={[tokens.bg, tokens.controls, tokens.accent]}
    />
  );
}

function GradientsCard({
  active,
  onSelect,
}: {
  active: boolean;
  onSelect: (m: ThemeMode) => void;
}) {
  const { tokens, gradient } = useGradientMark();
  return (
    <ModeCard
      mode="gradients"
      active={active}
      onSelect={onSelect}
      title="Soul Mark: Gradients"
      subtitle="Flowing colors"
      swatch={[tokens.bg, tokens.controls, tokens.accent]}
      firstSwatch={
        gradient ? gradientCss("vertical", gradient.stops) : undefined
      }
    />
  );
}

function ModeCard({
  mode,
  active,
  onSelect,
  title,
  subtitle,
  swatch,
  firstSwatch,
}: {
  mode: ThemeMode;
  active: boolean;
  onSelect: (m: ThemeMode) => void;
  title: string;
  subtitle: string;
  swatch: Hex[];
  /** A gradient for the first part of the swatch, when the theme has one. */
  firstSwatch?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(mode)}
      className={twMerge(
        "flex items-center gap-3 border p-2.5 text-left transition-colors",
        active
          ? "border-primary bg-white/10"
          : "border-white/15 hover:bg-white/[0.06]",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/15">
        {swatch.map((c, i) => (
          <span
            key={i}
            className="h-full flex-1"
            style={{ background: i === 0 && firstSwatch ? firstSwatch : c }}
          />
        ))}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium leading-tight text-white">
          {/* "Soul Mark: Solid Tones" breaks after the colon, never inside the name. */}
          {title.split(/(?<=:) /).map((part) => (
            <span key={part} className="block">
              {part}
            </span>
          ))}
        </span>
        <span className="truncate text-xs text-white/60">{subtitle}</span>
      </span>
      {active && (
        <CheckIcon className="ms-auto h-4 w-4 shrink-0 text-primary" />
      )}
    </button>
  );
}

/**
 * The picker for either theme. Soul Mark: solid colors. Gradients: the same
 * controls plus the gradient's colors and shape. Each theme keeps its own colors.
 */
function SoulMarkControls({ kind }: { kind: "solid" | "gradient" }) {
  const gradientTheme = kind === "gradient";
  const seeds = useThemeStore((s) =>
    gradientTheme ? s.gradientSeeds : s.seeds,
  );
  const setSeeds = useThemeStore((s) =>
    gradientTheme ? s.setGradientSeeds : s.setSeeds,
  );
  const resetSeeds = useThemeStore((s) =>
    gradientTheme ? s.resetGradientSeeds : s.resetSeeds,
  );
  const { notes, shortfalls } = useSoulMark();
  const guard = seeds.guard !== false;
  const hardBackgrounds = useHardColors(
    guard ? [] : [...PRIMARY_BACKGROUNDS, ...BOLD_BACKGROUNDS],
    seeds,
    "background",
  );
  const hardAccents = useHardColors(guard ? [] : ALL_ACCENTS, seeds, "accent");

  return (
    <div className="space-y-5 border-t border-white/15 pt-4">
      {gradientTheme ? (
        <SignatureGradients
          seeds={seeds}
          onPick={(g) =>
            setSeeds({
              background: g.colors[0],
              color2: g.colors[1],
              color3: g.colors[2],
              shape: g.shape,
              accent: g.accent,
            })
          }
        />
      ) : (
        <SignatureThemes
          background={seeds.background}
          accent={seeds.accent}
          onPick={(background, accent) => setSeeds({ background, accent })}
        />
      )}
      <div className="flex flex-col gap-0.5 border-t border-white/15 pt-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
          Mark it with your own taste
        </p>
        <p className="text-xs opacity-70">
          {gradientTheme
            ? "Or make your own: pick the colors your background flows through, and an accent."
            : "Or make your own: pick any background and accent below."}
        </p>
      </div>
      <GuardSwitch guard={guard} setGuard={(on) => setSeeds({ guard: on })} />
      <ColorField
        title={gradientTheme ? "Color 1" : "Background"}
        hint={
          gradientTheme
            ? "Where the gradient starts, at the top. Panels and fields are built from it."
            : "The color behind everything. Panels and fields are built from it."
        }
        value={seeds.background}
        presets={[
          ["Primaries", PRIMARY_BACKGROUNDS],
          ["Light", LIGHT_BACKGROUNDS],
          ["Deep", DEEP_BACKGROUNDS],
          ...(guard
            ? []
            : ([["Bold", BOLD_BACKGROUNDS]] as [string, [string, Hex][]][])),
        ]}
        hard={hardBackgrounds}
        onChange={(background) =>
          setSeeds(
            background === seeds.color2
              ? { background, color2: seeds.background }
              : { background },
          )
        }
      />
      {gradientTheme && <GradientFields seeds={seeds} setSeeds={setSeeds} />}
      <ColorField
        title="Accent"
        hint="Buttons like Generate, selections and highlights."
        value={seeds.accent}
        presets={[
          ["Classic", ACCENTS],
          ["Wheel", WHEEL],
          ["Light", WHEEL_LIGHT],
          ["Deep", WHEEL_DEEP],
        ]}
        hard={hardAccents}
        onChange={(accent) => setSeeds({ accent })}
      />
      <div className="flex flex-col gap-2">
        <Label
          title="Panel tint"
          hint="How strongly panels and controls step off the background."
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60">Subtle</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(seeds.tint * 100)}
            onChange={(e) => setSeeds({ tint: Number(e.target.value) / 100 })}
            aria-label="Panel tint"
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-white/60">Bold</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label
          title="Text tone"
          hint="The color of text is always chosen for you, so it can be read. This sets its tone."
        />
        <div className="flex gap-2">
          {CHARACTERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={seeds.character === id}
              onClick={() => setSeeds({ character: id })}
              className={twMerge(
                "h-8 border px-3 text-xs transition-colors",
                seeds.character === id
                  ? "border-primary bg-white/10 text-white"
                  : "border-white/15 text-white/70 hover:bg-white/[0.06]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {!guard && <Shortfalls shortfalls={shortfalls} />}
      <Notes notes={notes} guard={guard} setSeeds={setSeeds} />
      <ThemeCode seeds={seeds} />
      <button
        type="button"
        onClick={resetSeeds}
        className="flex h-8 items-center gap-2 border border-white/15 px-3 text-xs text-white/70 hover:bg-white/[0.06]"
      >
        <WandIcon className="h-3.5 w-3.5" />
        {gradientTheme
          ? "Start again from Neon Deep"
          : "Start again from the starter colors"}
      </button>
      {gradientTheme ? <AboutGradients /> : <AboutSoulMark />}
    </div>
  );
}

/** The background's whole palette, for a gradient's colors 2 and 3 too. */
const BACKGROUND_ROWS: [string, [string, Hex][]][] = [
  ["Primaries", PRIMARY_BACKGROUNDS],
  ["Light", LIGHT_BACKGROUNDS],
  ["Deep", DEEP_BACKGROUNDS],
];

/**
 * The gradient's own controls: its shape, color 2 (what color 1 fades to) and
 * an optional color 3 after that.
 */
function GradientFields({
  seeds,
  setSeeds,
}: {
  seeds: SoulMarkSeeds;
  setSeeds: (s: Partial<SoulMarkSeeds>) => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-l-2 border-white/15 pl-3">
      <ShapePicker
        shape={seeds.shape ?? "vertical"}
        onChange={(shape) => setSeeds({ shape })}
      />
      <ColorField
        title="Color 2"
        hint="What color 1 fades to. Any color but color 1."
        value={seeds.color2}
        quick={GRADIENT_FADES}
        presets={BACKGROUND_ROWS}
        exclude={seeds.background}
        onChange={(color2) => setSeeds({ color2 })}
      />
      {seeds.color3 ? (
        <>
          <ColorField
            title="Color 3"
            hint="Where the gradient ends, after color 2."
            value={seeds.color3}
            quick={GRADIENT_FADES}
            presets={BACKGROUND_ROWS}
            onChange={(color3) => setSeeds({ color3 })}
          />
          <button
            type="button"
            onClick={() => setSeeds({ color3: undefined })}
            className="flex h-8 w-fit items-center border border-white/15 px-3 text-xs text-white/70 hover:bg-white/[0.06]"
          >
            Remove color 3
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() =>
            setSeeds({
              color3:
                GRADIENT_FADES.find(([, h]) => h !== seeds.color2)?.[1] ??
                "#000000",
            })
          }
          className="flex h-8 w-fit items-center border border-white/15 px-3 text-xs text-white/70 hover:bg-white/[0.06]"
        >
          Add a third color
        </button>
      )}
    </div>
  );
}

function ShapePicker({
  shape,
  onChange,
}: {
  shape: GradientShape;
  onChange: (s: GradientShape) => void;
}) {
  const options: [GradientShape, string][] = [
    ["vertical", "Top to bottom"],
    ["elliptical", "Elliptical glow"],
  ];
  return (
    <div className="flex flex-col gap-2">
      <Label title="Shape" hint="How the colors flow." />
      <div className="flex gap-2">
        {options.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={shape === id}
            onClick={() => onChange(id)}
            className={twMerge(
              "flex h-8 items-center gap-2 border px-3 text-xs transition-colors",
              shape === id
                ? "border-primary bg-white/10 text-white"
                : "border-white/15 text-white/70 hover:bg-white/[0.06]",
            )}
          >
            <span
              aria-hidden
              className="h-4 w-6 border border-white/15"
              style={{ background: gradientCss(id, ["#1CB6BE", "#101B44"]) }}
            />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Ready-made gradients in one tap: colors, shape and accent together. */
function SignatureGradients({
  seeds,
  onPick,
}: {
  seeds: SoulMarkSeeds;
  onPick: (g: (typeof SIGNATURE_GRADIENTS)[number]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label
        title="Signature gradients"
        hint="Ready-made gradients. Tap one to use it; change any color after."
      />
      <div className="flex flex-wrap gap-2">
        {SIGNATURE_GRADIENTS.map((g) => {
          const on =
            seeds.background === g.colors[0] &&
            seeds.color2 === g.colors[1] &&
            seeds.color3 === g.colors[2] &&
            (seeds.shape ?? "vertical") === g.shape &&
            seeds.accent === g.accent;
          return (
            <button
              key={g.name}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(g)}
              className={twMerge(
                "flex items-center gap-2 rounded-[3px] border border-white/15 py-1.5 pl-1.5 pr-3 text-xs text-white/80 transition-colors hover:bg-white/10",
                on && "border-primary bg-white/10 text-white",
              )}
            >
              <span
                aria-hidden
                className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white/15"
                style={{ background: gradientCss(g.shape, g.colors) }}
              >
                <span
                  className="absolute bottom-0 right-0 h-3 w-3 rounded-tl-full"
                  style={{ background: g.accent }}
                />
              </span>
              {g.name}
              {g.colors.length === 3 && (
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/60">
                  3 colors
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Why Soul Mark exists, in a few words, at the very bottom of the panel. */
function AboutSoulMark() {
  return (
    <div className="flex flex-col gap-1 border-t border-white/15 pt-4">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
        About Soul Mark: Solid Tones
      </p>
      <p className="text-xs leading-relaxed opacity-70">
        Most apps give you black, white or dark blue. Soul Mark puts every solid
        color back in your hands, so whoever you are, everyday user or creator,
        ArtCraft can look like you. Every combination is checked so text stays
        easy to read. Be bold; make it yours.
      </p>
    </div>
  );
}

/** Why Gradients exists, in a few words, at the very bottom of its panel. */
function AboutGradients() {
  return (
    <div className="flex flex-col gap-1 border-t border-white/15 pt-4">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
        About Soul Mark: Gradients
      </p>
      <p className="text-xs leading-relaxed opacity-70">
        Your background flows from one color into the next, behind every page,
        panel and menu. Text is checked at every point of the flow, so it stays
        easy to read from top to bottom.
      </p>
    </div>
  );
}

/** Whole looks in one tap: each sets the background and the accent together. */
function SignatureThemes({
  background,
  accent,
  onPick,
}: {
  background: Hex;
  accent: Hex;
  onPick: (background: Hex, accent: Hex) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label
        title="Signature themes"
        hint="Ready-made looks. Tap one to use it; change any color after."
      />
      <div className="flex flex-wrap gap-2">
        {SIGNATURE_THEMES.map((t) => {
          const on = t.background === background && t.accent === accent;
          return (
            <button
              key={t.name}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(t.background, t.accent)}
              className={twMerge(
                "flex items-center gap-2 rounded-[3px] border border-white/15 py-1.5 pl-1.5 pr-3 text-xs text-white/80 transition-colors hover:bg-white/10",
                on && "border-primary bg-white/10 text-white",
              )}
            >
              <span
                aria-hidden
                className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white/15"
                style={{ background: t.background }}
              >
                <span
                  className="absolute bottom-0 right-0 h-3 w-3 rounded-tl-full"
                  style={{ background: t.accent }}
                />
              </span>
              {t.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorField({
  title,
  hint,
  value,
  presets,
  hard,
  onChange,
  exclude,
  quick,
}: {
  title: string;
  hint: string;
  value: Hex | undefined;
  /** Rows of swatches, each with an optional label. */
  presets: [string, [string, Hex][]][];
  /** Swatches to mark as hard to read (only ever filled with the guard off). */
  hard?: Set<Hex>;
  onChange: (hex: Hex) => void;
  /** A color that can't be picked here (a gradient's color 2 can't repeat color 1). */
  exclude?: Hex;
  /** One-tap choices shown above the rows, as labelled buttons. */
  quick?: [string, Hex][];
}) {
  const [draft, setDraft] = useState<string>(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  const pick = (hex: Hex) => {
    if (hex !== exclude) onChange(hex);
  };
  const commit = () => {
    const v = draft.startsWith("#") ? draft : `#${draft}`;
    if (isHex(v) && v.toUpperCase() !== exclude) pick(v.toUpperCase() as Hex);
    else setDraft(value ?? "");
  };

  return (
    <div className="flex flex-col gap-2">
      <Label title={title} hint={hint} />
      {quick && (
        <div className="flex flex-wrap gap-1.5">
          {quick.map(([name, hex]) => (
            <button
              key={hex}
              type="button"
              disabled={hex === exclude}
              aria-pressed={value === hex}
              onClick={() => pick(hex)}
              className={twMerge(
                "flex h-8 items-center gap-2 border border-white/15 px-2.5 text-xs text-white/80 transition-colors hover:bg-white/[0.06] disabled:opacity-30",
                value === hex && "border-primary bg-white/10 text-white",
              )}
            >
              <Chip hex={hex} />
              Fade to {name.toLowerCase()}
            </button>
          ))}
        </div>
      )}
      {presets.map(([rowLabel, row]) => (
        <div key={rowLabel} className="flex items-center gap-2">
          {rowLabel && (
            <span className="w-16 shrink-0 text-xs text-white/60">
              {rowLabel}
            </span>
          )}
          <div className="flex flex-wrap gap-1.5">
            {row.map(([name, hex]) => {
              const isHard = hard?.has(hex) ?? false;
              const taken = hex === exclude;
              const label = taken
                ? `${name}, already color 1`
                : isHard
                  ? `${name}, hard to read`
                  : name;
              return (
                <button
                  key={hex}
                  type="button"
                  title={label}
                  aria-label={`${title}: ${label}`}
                  aria-pressed={value === hex}
                  disabled={taken}
                  onClick={() => pick(hex)}
                  className={twMerge(
                    "relative h-7 w-7 rounded-full border border-white/15 disabled:cursor-not-allowed disabled:opacity-25",
                    value === hex &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-ui-panel",
                  )}
                  style={{ background: hex }}
                >
                  {isHard && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/15 bg-ui-panel">
                      <TriangleAlertIcon className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={(value ?? "#000000").toLowerCase()}
          onChange={(e) => pick(e.target.value.toUpperCase() as Hex)}
          aria-label={`${title}: any color`}
          className="h-8 w-10 cursor-pointer border border-white/15 bg-transparent p-0.5"
        />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          aria-label={`${title}: hex code`}
          spellCheck={false}
          className="h-8 w-28 border border-white/15 bg-ui-sunken px-2 font-mono text-xs uppercase text-white"
        />
      </div>
    </div>
  );
}

/**
 * The colors in `list` that the guard would change, under the current
 * seeds: the ones that are hard to read with the guard off.
 */
function useHardColors(
  list: [string, Hex][],
  seeds: SoulMarkSeeds,
  field: "background" | "accent",
): Set<Hex> {
  const { background, accent, tint, character, color2, color3, shape } = seeds;
  // A background's fit never depends on the accent, so changing the accent
  // does not recompute the background marks.
  const gradientKey = `${color2}|${color3}|${shape}`;
  const key =
    field === "background"
      ? `${tint}|${character}|${gradientKey}`
      : `${background}|${tint}|${character}|${gradientKey}`;
  return useMemo(() => {
    const base = {
      background,
      accent,
      tint,
      character,
      guard: true,
      color2,
      color3,
      shape,
    };
    return new Set(
      list
        .map(([, hex]) => hex)
        .filter((hex) => {
          const t = composeSoulMark({ ...base, [field]: hex }).tokens;
          return (field === "background" ? t.bg : t.accent) !== hex;
        }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, field, key]);
}

function GuardSwitch({
  guard,
  setGuard,
}: {
  guard: boolean;
  setGuard: (on: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <Label
          title="Readability guard"
          hint={
            guard
              ? "On: where a color would make text hard to read, Soul Mark nudges its shade (never its hue) so everything reads at the WCAG AA standard."
              : "Off: your colors are used exactly as picked, and nothing is nudged. Some text may be hard to read, for you or for others using this screen. Turn it back on any time."
          }
        />
        <Switch
          enabled={guard}
          setEnabled={setGuard}
          offClassName="bg-white/20"
        />
      </div>
      {!guard && (
        <p className="flex items-center gap-2 text-xs text-white/80">
          <TriangleAlertIcon className="h-3.5 w-3.5 shrink-0" />
          Colors marked with this sign are hard to read on their own. The Bold
          row shows the hardest.
        </p>
      )}
    </div>
  );
}

function Shortfalls({ shortfalls }: { shortfalls: Shortfall[] }) {
  if (!shortfalls.length) {
    return (
      <p className="flex items-center gap-2 text-xs text-white/70">
        <ShieldCheckIcon className="h-3.5 w-3.5 text-primary" />
        Nothing falls short: these colors read well even without the guard.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Label
        title="Below the readability line"
        hint="Measured contrast for what falls short, against what the WCAG AA standard asks for."
      />
      <ul className="flex flex-col border border-white/15">
        {shortfalls.map((f) => (
          <li
            key={f.label}
            className="flex items-center justify-between gap-3 border-b border-white/15 px-2 py-1.5 text-xs last:border-b-0"
          >
            <span className="text-white/80">{f.label}</span>
            <span className="font-mono text-white">
              {f.ratio.toFixed(1)} : 1{" "}
              <span className="text-white/60">
                (needs {f.floor.toFixed(1)})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Notes({
  notes,
  guard,
  setSeeds,
}: {
  notes: SoulMarkNote[];
  guard: boolean;
  setSeeds: (s: Partial<SoulMarkSeeds>) => void;
}) {
  if (!guard && !notes.length) return null;
  if (!notes.length) {
    return (
      <p className="flex items-center gap-2 text-xs text-white/70">
        <CheckIcon className="h-3.5 w-3.5 text-primary" />
        Every color is used exactly as you chose it.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {guard ? (
        <Label
          title="Readability"
          hint="What Soul Mark did so your colors stay easy to read."
        />
      ) : (
        <Label
          title="With the guard on"
          hint="What the readability guard would change. Your colors are used as picked."
        />
      )}
      <ul className="flex flex-col gap-1.5">
        {notes.map((n, i) => (
          <li
            key={i}
            className="flex items-start gap-2 border border-white/15 bg-white/[0.03] p-2 text-xs"
          >
            {n.kind === "warning" ? (
              <TriangleAlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white" />
            ) : (
              <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/70" />
            )}
            <span className="flex flex-1 flex-col items-start gap-1.5 text-white/80">
              {n.message}
              {n.alternative && (
                <button
                  type="button"
                  onClick={() =>
                    n.alternative && setSeeds({ background: n.alternative })
                  }
                  className="flex h-7 items-center gap-1.5 border border-white/15 px-2 text-white/80 hover:bg-white/[0.06]"
                >
                  <Chip hex={n.alternative} />
                  {toHsl(n.alternative)[2] > toHsl(n.used)[2]
                    ? "Use a lighter shade instead"
                    : "Use a deeper shade instead"}
                </button>
              )}
            </span>
            {n.chosen !== n.used && (
              <span
                className="flex shrink-0 items-center gap-1"
                title={`${n.chosen} → ${n.used}`}
              >
                <Chip hex={n.chosen} />
                <span className="text-white/60">→</span>
                <Chip hex={n.used} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chip({ hex }: { hex: Hex }) {
  return (
    <span
      className="h-4 w-4 rounded-full border border-white/15"
      style={{ background: hex }}
    />
  );
}

function ThemeCode({ seeds }: { seeds: SoulMarkSeeds | NeonSeeds }) {
  const setSeeds = useThemeStore((s) => s.setSeeds);
  const setGradientSeeds = useThemeStore((s) => s.setGradientSeeds);
  const setMode = useThemeStore((s) => s.setMode);
  const code =
    "glow" in seeds ? encodeNeon(seeds as NeonSeeds) : encodeSeeds(seeds);
  const [pasted, setPasted] = useState("");
  const [copied, setCopied] = useState(false);
  const setNeonSeeds = useThemeStore((s) => s.setNeonSeeds);
  const decoded = pasted ? decodeSeeds(pasted) : null;
  const decodedNeon = pasted ? decodeNeon(pasted) : null;

  return (
    <div className="flex flex-col gap-2">
      <Label
        title="Theme code"
        hint="Share your Soul Mark, or paste someone else's."
      />
      <div className="flex items-center gap-2">
        <code className="flex h-8 items-center border border-white/15 bg-ui-sunken px-2 font-mono text-xs text-white">
          {code}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="flex h-8 items-center gap-1.5 border border-white/15 px-2.5 text-xs text-white/70 hover:bg-white/[0.06]"
        >
          {copied ? (
            <CheckIcon className="h-3.5 w-3.5" />
          ) : (
            <CopyIcon className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="SM1-…, SM2-… or SM3-…"
          aria-label="Paste a theme code"
          spellCheck={false}
          className="h-8 w-56 border border-white/15 bg-ui-sunken px-2 font-mono text-xs text-white placeholder:text-white/40"
        />
        <button
          type="button"
          disabled={!decoded && !decodedNeon}
          onClick={() => {
            // A neon code (SM3) opens Neon; a gradient code (SM2) opens Gradients; a solid one (SM1) opens Soul Mark.
            if (decodedNeon) {
              setNeonSeeds(decodedNeon);
              setMode("neon");
            } else if (decoded && themeForSeeds(decoded) === "gradients") {
              setGradientSeeds(decoded);
              setMode("gradients");
            } else if (decoded) {
              setSeeds(decoded);
              setMode("soul-mark");
            }
            setPasted("");
          }}
          className="h-8 border border-white/15 px-2.5 text-xs text-white/70 enabled:hover:bg-white/[0.06] disabled:opacity-40"
        >
          Use code
        </button>
        {pasted && !decoded && !decodedNeon && (
          <span className="text-xs text-white/60">Not a Soul Mark code</span>
        )}
      </div>
    </div>
  );
}

function Label({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
        {title}
      </p>
      <p className="text-xs opacity-70">{hint}</p>
    </div>
  );
}

function NeonCard({
  active,
  onSelect,
}: {
  active: boolean;
  onSelect: (m: ThemeMode) => void;
}) {
  const { mark, glow } = useNeonMark();
  return (
    <ModeCard
      mode="neon"
      active={active}
      onSelect={onSelect}
      title="Soul Mark: Neon"
      subtitle="Glowing lines"
      swatch={[mark.tokens.bg, glow, mark.tokens.accent]}
      firstSwatch={
        mark.gradient
          ? gradientCss("vertical", mark.gradient.stops)
          : undefined
      }
    />
  );
}

/** The Deep row without the near-blacks the Neon row already has: no color appears twice. */
const NEON_DEEP_BACKGROUNDS: [string, Hex][] = DEEP_BACKGROUNDS.filter(
  ([, hex]) => !NEON_BACKGROUNDS.some(([, n]) => n === hex),
);

/** The fades' top colors that aren't already in the rows above. */
const NEON_FADE_TOPS: [string, Hex][] = NEON_FADES.map(
  ([name, top]): [string, Hex] => [name, top],
).filter(
  ([, hex]) =>
    ![...NEON_BACKGROUNDS, ...NEON_DEEP_BACKGROUNDS].some(([, n]) => n === hex),
);

/** What a Neon fade can run down to: none, or one of the near-blacks. */
const NEON_FADE_ENDS: [string, Hex][] = [
  ["Void", "#000000"],
  ["Deep", "#03060C"],
  ["Glass", "#070B14"],
];

function NeonControls() {
  const seeds = useThemeStore((s) => s.neonSeeds);
  const setSeeds = useThemeStore((s) => s.setNeonSeeds);
  const resetSeeds = useThemeStore((s) => s.resetNeonSeeds);
  const neon = useNeonMark();
  const guard = seeds.guard !== false;

  return (
    <div className="space-y-5 border-t border-white/15 pt-4">
      <SignatureNeon seeds={seeds} onPick={(n) => setSeeds(n)} />
      <div className="flex flex-col gap-0.5 border-t border-white/15 pt-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
          Mark it with your own taste
        </p>
        <p className="text-xs opacity-70">
          Or make your own: a dark page, the color your lines glow, and an
          accent.
        </p>
      </div>
      <GuardSwitch guard={guard} setGuard={(on) => setSeeds({ guard: on })} />
      <ColorField
        title="Background"
        hint="The page behind the glow. Neon reads best near black."
        value={seeds.background}
        presets={[
          ["Neon", NEON_BACKGROUNDS],
          ["Deep", NEON_DEEP_BACKGROUNDS],
          ["Fade tops", NEON_FADE_TOPS],
        ]}
        onChange={(background) =>
          setSeeds(
            background === seeds.color2
              ? { background, color2: undefined }
              : { background },
          )
        }
      />
      <div className="flex flex-col gap-2">
        <Label
          title="Fade"
          hint="Let the page fade down to a deeper black, like a blueprint."
        />
        <div className="flex flex-wrap gap-1.5">
          {([["None", undefined], ...NEON_FADE_ENDS] as [string, Hex | undefined][]).map(
            ([name, hex]) => (
              <button
                key={name}
                type="button"
                disabled={hex === seeds.background}
                aria-pressed={seeds.color2 === hex}
                onClick={() => setSeeds({ color2: hex })}
                className={twMerge(
                  "flex h-7 items-center gap-1.5 border border-white/15 px-2.5 text-xs text-white/70 transition-colors hover:bg-white/[0.06] disabled:opacity-40",
                  seeds.color2 === hex && "border-primary bg-white/10 text-white",
                )}
              >
                {hex && (
                  <span
                    aria-hidden
                    className="h-3.5 w-3.5 rounded-full border border-white/20"
                    style={{ background: hex }}
                  />
                )}
                {name}
              </button>
            ),
          )}
        </div>
      </div>
      <ColorField
        title="Glow"
        hint="The color your panels, menus and buttons glow. It lights edges, never text."
        value={seeds.glow}
        presets={[
          ["Neon", NEON_GLOWS],
          ["Wheel", WHEEL],
        ]}
        onChange={(glow) => setSeeds({ glow })}
      />
      <ColorField
        title="Accent"
        hint="Buttons like Generate, selections and highlights. A neon color matches the glow."
        value={seeds.accent}
        presets={[
          ["Neon", NEON_GLOWS],
          ["Classic", ACCENTS],
        ]}
        onChange={(accent) => setSeeds({ accent })}
      />
      <div className="flex flex-col gap-2">
        <Label
          title="Glow strength"
          hint="How far the glow blooms around panels and buttons, and how bright the grid is."
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60">A line</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(seeds.strength * 100)}
            onChange={(e) =>
              setSeeds({ strength: Number(e.target.value) / 100 })
            }
            aria-label="Glow strength"
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-white/60">Bright</span>
        </div>
      </div>
      <div className="flex items-start justify-between gap-4">
        <Label
          title="Grid"
          hint="A faint grid behind the page, like a blueprint or a 3D workspace. It stays off where you edit images, video and 3D, so it never gets in the way of your work."
        />
        <Switch
          enabled={seeds.grid}
          setEnabled={(grid) => setSeeds({ grid })}
          offClassName="bg-white/20"
        />
      </div>
      {!guard && <Shortfalls shortfalls={neon.shortfalls} />}
      <NeonNotes notes={neon.notes} />
      <Notes notes={neon.mark.notes} guard={guard} setSeeds={setSeeds} />
      <ThemeCode seeds={seeds} />
      <button
        type="button"
        onClick={resetSeeds}
        className="flex h-8 items-center gap-2 border border-white/15 px-3 text-xs text-white/70 hover:bg-white/[0.06]"
      >
        <WandIcon className="h-3.5 w-3.5" />
        Start again from the starter glow
      </button>
      <AboutNeon />
    </div>
  );
}

/** Whole Neon looks in one tap. */
function SignatureNeon({
  seeds,
  onPick,
}: {
  seeds: NeonSeeds;
  onPick: (n: Partial<NeonSeeds>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label
        title="Signature looks"
        hint="Ready-made neon looks. Tap one to use it; change any color after."
      />
      <div className="flex flex-wrap gap-2">
        {NEON_SIGNATURES.map(({ name, ...n }) => {
          const on =
            seeds.background === n.background &&
            seeds.color2 === n.color2 &&
            seeds.glow === n.glow &&
            seeds.accent === n.accent &&
            seeds.grid === n.grid &&
            seeds.strength === n.strength;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => onPick({ color2: undefined, ...n })}
              className={twMerge(
                "flex items-center gap-2 rounded-[3px] border border-white/15 py-1.5 pl-1.5 pr-3 text-xs text-white/80 transition-colors hover:bg-white/10",
                on && "border-primary bg-white/10 text-white",
              )}
            >
              <span
                aria-hidden
                className="h-6 w-6 shrink-0 rounded-full"
                style={{
                  background: n.color2
                    ? gradientCss("vertical", [n.background, n.color2])
                    : n.background,
                  boxShadow: `0 0 0 1px ${n.glow}, 0 0 8px ${n.glow}`,
                }}
              />
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** What the guard did to the glow, its bloom or the grid, in plain words. */
function NeonNotes({ notes }: { notes: NeonNote[] }) {
  if (!notes.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {notes.map((n) => (
        <p
          key={n.seed}
          className="flex items-start gap-2 text-xs text-white/80"
        >
          <ShieldCheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {n.message}{" "}
            <span className="font-mono text-white/60">
              {n.chosen} → {n.used}
            </span>
          </span>
        </p>
      ))}
    </div>
  );
}

/** Why Neon exists, in a few words, at the very bottom of its panel. */
function AboutNeon() {
  return (
    <div className="flex flex-col gap-1 border-t border-white/15 pt-4">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
        About Soul Mark: Neon
      </p>
      <p className="text-xs leading-relaxed opacity-70">
        A heads-up display for your workspace: glowing edges on a dark page,
        with an optional grid. The glow lights the edges, never the words, and
        every text is checked beside it and over the grid, so it stays easy to
        read.
      </p>
    </div>
  );
}

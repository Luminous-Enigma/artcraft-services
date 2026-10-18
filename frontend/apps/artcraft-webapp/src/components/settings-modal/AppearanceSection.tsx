import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, InfoIcon, TriangleAlertIcon, WandIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { isHex, type Hex, toHsl } from "../../theme/contrast";
import {
  type Character,
  decodeSeeds,
  DEFAULT_TOKENS,
  encodeSeeds,
  type SoulMarkNote,
} from "../../theme/soulMark";
import { ACCENTS, DEEP_BACKGROUNDS, LIGHT_BACKGROUNDS } from "../../theme/presets";
import { type ThemeMode, useSoulMark, useThemeStore } from "../../theme/themeStore";

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
        <div className="grid grid-cols-2 gap-2">
          <ModeCard
            mode="default"
            active={mode === "default"}
            onSelect={setMode}
            title="ArtCraft"
            subtitle="The standard look"
            swatch={[DEFAULT_TOKENS.bg, DEFAULT_TOKENS.controls, DEFAULT_TOKENS.accent]}
          />
          <SoulMarkCard active={mode === "soul-mark"} onSelect={setMode} />
        </div>
      </div>
      {mode === "soul-mark" && <SoulMarkControls />}
    </div>
  );
}

function SoulMarkCard({ active, onSelect }: { active: boolean; onSelect: (m: ThemeMode) => void }) {
  const { tokens } = useSoulMark();
  return (
    <ModeCard
      mode="soul-mark"
      active={active}
      onSelect={onSelect}
      title="Soul Mark"
      subtitle="Your own colours, always readable"
      swatch={[tokens.bg, tokens.controls, tokens.accent]}
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
}: {
  mode: ThemeMode;
  active: boolean;
  onSelect: (m: ThemeMode) => void;
  title: string;
  subtitle: string;
  swatch: Hex[];
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(mode)}
      className={twMerge(
        "flex items-center gap-3 border p-2.5 text-left transition-colors",
        active ? "border-primary bg-white/10" : "border-white/15 hover:bg-white/[0.06]",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/15">
        {swatch.map((c, i) => (
          <span key={i} className="h-full flex-1" style={{ background: c }} />
        ))}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-white">{title}</span>
        <span className="truncate text-xs text-white/60">{subtitle}</span>
      </span>
      {active && <CheckIcon className="ms-auto h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

function SoulMarkControls() {
  const seeds = useThemeStore((s) => s.seeds);
  const setSeeds = useThemeStore((s) => s.setSeeds);
  const resetSeeds = useThemeStore((s) => s.resetSeeds);
  const { notes } = useSoulMark();

  return (
    <div className="space-y-5 border-t border-white/15 pt-4">
      <ColourField
        title="Background"
        hint="The colour behind everything. Panels and fields are built from it."
        value={seeds.background}
        presets={[
          ["Light", LIGHT_BACKGROUNDS],
          ["Deep", DEEP_BACKGROUNDS],
        ]}
        onChange={(background) => setSeeds({ background })}
      />
      <ColourField
        title="Accent"
        hint="Buttons like Generate, selections and highlights."
        value={seeds.accent}
        presets={[["", ACCENTS]]}
        onChange={(accent) => setSeeds({ accent })}
      />
      <div className="flex flex-col gap-2">
        <Label title="Panel tint" hint="How strongly panels and controls step off the background." />
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
        <Label title="Text tone" hint="The colour of text is always chosen for you, so it can be read. This sets its tone." />
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
      <Notes notes={notes} />
      <ThemeCode />
      <button
        type="button"
        onClick={resetSeeds}
        className="flex h-8 items-center gap-2 border border-white/15 px-3 text-xs text-white/70 hover:bg-white/[0.06]"
      >
        <WandIcon className="h-3.5 w-3.5" />
        Start again from the starter colours
      </button>
    </div>
  );
}

function ColourField({
  title,
  hint,
  value,
  presets,
  onChange,
}: {
  title: string;
  hint: string;
  value: Hex;
  /** Rows of swatches, each with an optional label. */
  presets: [string, [string, Hex][]][];
  onChange: (hex: Hex) => void;
}) {
  const [draft, setDraft] = useState<string>(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const v = draft.startsWith("#") ? draft : `#${draft}`;
    if (isHex(v)) onChange(v.toUpperCase() as Hex);
    else setDraft(value);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label title={title} hint={hint} />
      {presets.map(([rowLabel, row]) => (
        <div key={rowLabel} className="flex items-center gap-2">
          {rowLabel && <span className="w-9 shrink-0 text-xs text-white/60">{rowLabel}</span>}
          <div className="flex flex-wrap gap-1.5">
            {row.map(([name, hex]) => (
              <button
                key={hex}
                type="button"
                title={name}
                aria-label={`${title}: ${name}`}
                aria-pressed={value === hex}
                onClick={() => onChange(hex)}
                className={twMerge(
                  "h-7 w-7 rounded-full border border-white/15",
                  value === hex && "ring-2 ring-primary ring-offset-2 ring-offset-ui-panel",
                )}
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.toLowerCase()}
          onChange={(e) => onChange(e.target.value.toUpperCase() as Hex)}
          aria-label={`${title}: any colour`}
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

function Notes({ notes }: { notes: SoulMarkNote[] }) {
  const setSeeds = useThemeStore((s) => s.setSeeds);
  if (!notes.length) {
    return (
      <p className="flex items-center gap-2 text-xs text-white/70">
        <CheckIcon className="h-3.5 w-3.5 text-primary" />
        Every colour is used exactly as you chose it.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Label title="Readability" hint="What Soul Mark did so your colours stay easy to read." />
      <ul className="flex flex-col gap-1.5">
        {notes.map((n, i) => (
          <li key={i} className="flex items-start gap-2 border border-white/15 bg-white/[0.03] p-2 text-xs">
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
                  onClick={() => n.alternative && setSeeds({ background: n.alternative })}
                  className="flex h-7 items-center gap-1.5 border border-white/15 px-2 text-white/80 hover:bg-white/[0.06]"
                >
                  <Chip hex={n.alternative} />
                  {toHsl(n.alternative)[2] > toHsl(n.used)[2] ? "Use a lighter shade instead" : "Use a deeper shade instead"}
                </button>
              )}
            </span>
            {n.chosen !== n.used && (
              <span className="flex shrink-0 items-center gap-1" title={`${n.chosen} → ${n.used}`}>
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
  return <span className="h-4 w-4 rounded-full border border-white/15" style={{ background: hex }} />;
}

function ThemeCode() {
  const seeds = useThemeStore((s) => s.seeds);
  const setSeeds = useThemeStore((s) => s.setSeeds);
  const code = encodeSeeds(seeds);
  const [pasted, setPasted] = useState("");
  const [copied, setCopied] = useState(false);
  const decoded = pasted ? decodeSeeds(pasted) : null;

  return (
    <div className="flex flex-col gap-2">
      <Label title="Theme code" hint="Share your Soul Mark, or paste someone else's." />
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
          {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="SM1-…"
          aria-label="Paste a theme code"
          spellCheck={false}
          className="h-8 w-56 border border-white/15 bg-ui-sunken px-2 font-mono text-xs text-white placeholder:text-white/40"
        />
        <button
          type="button"
          disabled={!decoded}
          onClick={() => {
            if (decoded) setSeeds(decoded);
            setPasted("");
          }}
          className="h-8 border border-white/15 px-2.5 text-xs text-white/70 enabled:hover:bg-white/[0.06] disabled:opacity-40"
        >
          Use code
        </button>
        {pasted && !decoded && <span className="text-xs text-white/60">Not a Soul Mark code</span>}
      </div>
    </div>
  );
}

function Label({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">{title}</p>
      <p className="text-xs opacity-70">{hint}</p>
    </div>
  );
}

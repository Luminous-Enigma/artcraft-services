# Soul Mark: a theme you make yourself that is always readable

Soul Mark is a theme for ArtCraft's web app that the person makes from their
own colours. Pick any background and any accent and the app takes them on.
What you can't do is make it hard to read, and that is on purpose.

This page explains how it works in plain words. It is written so you can take
the idea, or the code, and put it in your own project, here or anywhere else.
Take it, change it, improve it, share it back. That's how the web got good.

---

## The idea in one paragraph

**You choose the mood. The app works out every colour you have to read.**
You never pick a text colour, a border or a button-label colour directly. You
pick a few *seeds* (a background, an accent, how strongly panels are tinted,
and a warm, cool or soft tone for the text). Everything else is calculated
from those seeds and then *measured*. If a measurement comes up short, the
colour is nudged, keeping its hue and changing only its lightness, until it
passes. So the theme can be as wild as you like, but never unreadable.

---

## What "readable" means here

Readability can be measured. The standard everyone uses is **contrast ratio**,
from the WCAG guidelines. It compares how bright two colours are:

| Ratio    | Means                                                     |
|----------|-----------------------------------------------------------|
| 1 : 1    | the same colour, invisible                                |
| 3 : 1    | enough for large text, icons, outlines and rings          |
| 4.5 : 1  | enough for ordinary text ("AA", the usual target)         |
| 21 : 1   | black on white, the most there is                         |

Soul Mark's promise:

- **4.5 : 1 for all text**: body text, faded captions (down to the app's
  40% grey), button labels, and coloured status text like red errors and the
  BETA badge.
- **3 : 1 for lines**: selection rings, outlines, accent-coloured icons.
- A filled button's *shape* should stand out from the page too. Soul Mark aims
  for 3 : 1 there and says so when it can only get between 1.5 and 3. The
  button's label still reads at 4.5 : 1.

That is stricter than ArtCraft's own default theme in a few spots (its 40%
captions, the white label on its blue buttons at 3.7 : 1, some red error
text). A Soul Mark can be wilder than the default, but never harder to read.

The maths lives in `contrast.ts`: `contrastRatio(a, b)`, plus `mix(a, b, t)`,
which is also how a colour at `t` opacity lands on another.

---

## How a Soul Mark is made, step by step

All of this is one function, `composeSoulMark(seeds)` in `soulMark.ts`. It has
no side effects, so the page, the settings panel and the tests all call the
same thing.

### 1. The seeds

```ts
{ background: "#0C2F1C", accent: "#F59E0B", tint: 0.5, character: "warm" }
```

Only these four values are ever saved. Every colour is worked out again from
them each time the app loads, so when the calculation improves, old saved
themes improve with it.

### 2. Pick the text colour by measuring, not guessing

There are two inks to choose from: a light one (near-white) and a dark one
(near-black). The *character* seed picks their tone (soft, warm, cool). Soul
Mark tries **both** inks and measures each one. It doesn't guess with a rule
like "dark backgrounds get white text", because that kind of rule fails on
saturated mid-tones.

### 3. Build the surfaces from the background

The background generates the whole family of surfaces the app uses:

| Surface   | Made by                                  | Used for                     |
|-----------|------------------------------------------|------------------------------|
| page      | the background itself                    | behind everything            |
| panel     | background, stepped 11% away from the ink | top bar, side panels, modals |
| controls  | background, stepped 5% toward the ink     | buttons, prompt box, sidebar |
| sunken    | background, stepped 67% away from the ink | text fields                  |
| hover     | controls with 10% ink over them          | hovered rows                 |

The percentages are measured from ArtCraft's own default theme, so a Soul Mark
has the same structure as the app's normal look. *Tint* scales all the steps
(subtle 0.5×, bold 1.5×).

### 4. Check every pair, and fix what falls short

For every surface, every ink, and every opacity the app draws text at (100%,
90%, … down to 40%), Soul Mark measures the contrast. If something falls
short, it fixes it in this order, the gentlest fix first:

1. **Strengthen faded text.** The app makes captions grey by drawing white at
   40% or 60%. Soul Mark can make faded text less see-through with a single
   variable, `--st-text-fade`, without touching anything else. This is the fix
   light themes usually need: dark text at 40% reads far worse on white than
   white text at 40% does on black.
2. **Move the background's lightness, keeping its hue.** A red stays red; it
   only gets lighter or deeper, by the smallest step that works. The settings
   panel says so and offers the other direction ("use a deeper shade
   instead").

A background is only accepted if the **status colours** can read on it too.
That's step 6, but the check happens here: there's no point keeping a
background that white text reads on and red error text doesn't.

### 5. Fit the accent, three ways

One accent colour does three jobs, and each gets its own shade:

- **fill**, the Generate button: its label must read at 4.5 : 1. The button's
  edge against the page is best effort.
- **text**, accent-coloured words: 4.5 : 1 on every surface.
- **lines**, selection rings, outlines and accent icons: 3 : 1 on every surface.

Same hue each time, lightness moved as little as possible (`nearestLightness`
in `contrast.ts` searches outward from the chosen colour and stops at the
first shade that passes).

### 6. Fit the status colours

Red errors, amber BETA badges, green success and the rest keep their **hue**,
because the hue is the meaning. They may only move in lightness between 15%
and 85%. Past that, red, amber and green all turn into the same near-black or
near-white, and the meaning is lost. (`meaning.ts`)

### 7. Hand the result to the page

The result is a set of CSS variables (`--st-bg-rgb`, `--st-accent-rgb`, …),
written onto `<html>` one at a time with `style.setProperty`. Only computed hex
values go in, never anything the person typed, so a saved theme can't inject
CSS.

---

## How the app is wired to take a theme

Before Soul Mark, ArtCraft's colours were written directly into the code. Now
every one of them reads a variable whose default is the old value, so the
normal look didn't change at all. That was checked by screenshot, pixel by
pixel. The useful trick for a Tailwind app: in this design "white" always
means *the ink* and "black" always means *the deepest surface*, so
remapping Tailwind's `white` and `black` themed over a thousand
`text-white` / `bg-black` / `border-white/15` uses without editing one of them.
See `tailwind.config.js`.

### Surfaces that stay dark on purpose

Some parts of an app are branded artwork, not interface: ArtCraft's pricing
cards are dark cards with green, purple and orange glows. Repainting them
would change the brand. Give such an element the class `st-keep-dark`: inside
it every theme variable goes back to the app's defaults, so its text is the
light text it was designed with, whatever theme is on. (Defined in
`tailwind.config.js` as a small plugin.)

The one trap: text that sets no colour of its own inherits the page's colour,
which was worked out before the island reset anything, so the island sets
its own text colour too.

---

## Notes the panel shows

| Kind     | Means                                                                    |
|----------|--------------------------------------------------------------------------|
| adjusted | a colour was moved to stay readable (with the before → after swatches)   |
| info     | worth knowing, e.g. buttons stand out a little less than usual           |
| warning  | worth changing, e.g. accent and background are the same colour family    |

The rule is **warn, don't block**: it's their screen. The one thing there's no
way around is that text is always readable.

---

## Sharing a Soul Mark

A theme code holds just the seeds:

```
SM1-0C2F1C-F59E0B-50-warm
    background  accent  tint  text tone
```

Because only seeds travel, any app that runs the same calculation (ArtCraft,
PhotoCraft, yours) turns the code into a theme that's right for *its* surfaces.

---

## How it's tested

`npx vitest run src/theme` runs a sweep that composes tens of thousands of
combinations (backgrounds across the whole colour wheel × text tones × tints
× accents, plus known troublemakers like mid grey `#777777`) and measures
every promised pair. The rule is zero shortfalls. Every preset in `presets.ts`
is also checked to be used exactly as shown.

---

## Taking it to your own project

You need four things, and none of them are ArtCraft-specific:

1. **Colours as variables.** Make every colour in your UI read a CSS variable
   (or your platform's equivalent) whose default is today's colour.
2. **The maths.** `contrast.ts` is small and has no dependencies: contrast
   ratio, mixing, and the lightness search.
3. **The recipe.** Copy `composeSoulMark` and change two lists: your surfaces
   (step 3) and the opacities you draw text at (step 4). Everything else
   carries over.
4. **The sweep test.** Keep it. It's what lets you promise "always readable"
   instead of hoping.

The contrast functions started life in Luminous-Enigma's twentyseven app,
whose free-palette theme ("Petal") first used the rule *pick freely, and what
you have to read can always be read*. Soul Mark grew from that.

Built together, for everyone. If you improve it, pass it on.

# Theme evidence for storytold/artcraft-services

Evidence for [#166](https://github.com/storytold/artcraft-services/pull/166) (part 1: colours as theme
variables) and for part 2 (the Soul Mark theme, branch
[`soul-mark-theme`](https://github.com/Luminous-Enigma/artcraft-services/tree/soul-mark-theme)).
It answers the review on #166: before and after screenshots of each page in light and dark, a script
that compares the rendered pages, every variable with its fallback, the hard-coded colours left for
part 2, and whether third-party components follow the variables.

This branch holds evidence only. It shares no history with the code.

## How it was made

- Each version is the web app's production build with its own shared libraries. Part 1's two
  versions were built in two separate checkouts, each with its own install; part 2's in one checkout,
  one after the other.
- No real account. Both builds get the same stand-in answers from the server: a signed-in test user
  with 2,500 credits and an empty library. Sign-in pages are shown signed out.
- Fonts are downloaded once and given to both builds byte for byte; the clock and random numbers are
  fixed; animation is off. 1440x900 screenshots.
- Scripts are in [`tools/`](tools). `visual-compare.mjs` needs only Node 18+ and Playwright.

```
node tools/visual-compare.mjs --before <dist A> --after <dist B> --out <dir>
```

## Part 1 (#166): nothing changed

All 28 pages of `src/app/app.tsx`, built just before #166 (`5547585a~1`) and just after it
(`5547585a`), each with the browser set to dark and to light: 56 views per build.

- **44 of 56 views are identical to the pixel.**
- In the other 12, some pixels are 1 shade apart (of 255), on smoothed edges of see-through
  colours that now come from a variable: the prompt box's resize grip on the Create pages, and the
  corners of the filter buttons on Media. Nobody can see this; it is listed, not hidden.
- **Control:** the same build compared with itself gives 0 differing pixels, so the method adds no
  noise ([`part1/control/report.md`](part1/control/report.md)).
- Before part 2 the app has one look and ignores the browser's light or dark setting. Shooting both
  settings shows #166 did not start reacting to it; part 2 is what adds a light theme.

| Page             | Browser | Pixels that differ | Largest difference |
|------------------|---------|--------------------|--------------------|
| `/create-image`  | dark    |                  9 | 1/255              |
| `/create-image`  | light   |                  9 | 1/255              |
| `/create-video`  | dark    |                  9 | 1/255              |
| `/create-video`  | light   |                  9 | 1/255              |
| `/create-audio`  | dark    |                  9 | 1/255              |
| `/create-audio`  | light   |                  9 | 1/255              |
| `/create-object` | dark    |                  9 | 1/255              |
| `/create-object` | light   |                  9 | 1/255              |
| `/create-world`  | dark    |                  9 | 1/255              |
| `/create-world`  | light   |                  9 | 1/255              |
| `/media`         | dark    |                140 | 1/255              |
| `/media`         | light   |                140 | 1/255              |

Full report: [`part1/report.md`](part1/report.md). Screenshots: [`part1/before`](part1/before),
[`part1/after`](part1/after), and [`part1/difference`](part1/difference) (changed pixels in magenta
on a dimmed copy of the page).

| Where                | Before                 | After                  | Differs                |
|----------------------|------------------------|------------------------|------------------------|
| Create, resize grip  | ![](part1/grip-b.png)  | ![](part1/grip-a.png)  | ![](part1/grip-d.png)  |
| Media, button corner | ![](part1/chips-b.png) | ![](part1/chips-a.png) | ![](part1/chips-d.png) |

## Variables and fallbacks

Every `--st-*` variable the web app and the libraries it uses refer to, read from the code and then
asked of the running page ([`audit/variables.md`](audit/variables.md)). The variables #166 adds are
all declared on `:root` with today's colours, so each always has a value.

| Variable                | Value on :root | Status                                           |
|-------------------------|----------------|--------------------------------------------------|
| `--st-accent-300-rgb`   | 142 199 255    | always set on :root                              |
| `--st-accent-400-rgb`   | 89 167 255     | always set on :root                              |
| `--st-accent-600-rgb`   | 27 99 245      | always set on :root                              |
| `--st-accent-700-rgb`   | 20 78 225      | always set on :root                              |
| `--st-accent-ink-rgb`   | 116 170 255    | always set on :root                              |
| `--st-accent-line-rgb`  | 45 129 255     | always set on :root                              |
| `--st-accent-rgb`       | 45 129 255     | always set on :root                              |
| `--st-accent-text-rgb`  | 45 129 255     | always set on :root                              |
| `--st-bg`               | (not set)      | unset on purpose; every use has its own fallback |
| `--st-bg-rgb`           | 18 19 22       | always set on :root                              |
| `--st-black-rgb`        | 0 0 0          | always set on :root                              |
| `--st-color-scheme`     | (not set)      | unset on purpose; every use has its own fallback |
| `--st-control-rgb`      | 30 31 34       | always set on :root                              |
| `--st-controls-rgb`     | (not set)      | MISSING: used without a value or fallback        |
| `--st-divider`          | (not set)      | MISSING: used without a value or fallback        |
| `--st-fg`               | (not set)      | MISSING: used without a value or fallback        |
| `--st-icon-filter`      | invert(1)      | always set on :root                              |
| `--st-panel-rgb`        | 16 16 20       | always set on :root                              |
| `--st-scroll-thumb-rgb` | 44 44 47       | always set on :root                              |
| `--st-scroll-track-rgb` | 11 11 12       | always set on :root                              |
| `--st-sunken-rgb`       | 6 6 7          | always set on :root                              |
| `--st-text-fade`        | 1              | always set on :root                              |
| `--st-text-rgb`         | 242 241 238    | always set on :root                              |
| `--st-white-rgb`        | 255 255 255    | always set on :root                              |
| `--st-wordmark-filter`  | (not set)      | unset on purpose; every use has its own fallback |

**A correction to #166.** Its comment says the desktop app's names are read by shared libraries "with
fallbacks of their own". For three of them that is wrong: `--st-divider` and `--st-fg`
(`pagedraw/HistoryStack.tsx`) and `--st-controls-rgb` (`lightbox-modal.tsx`) have no fallback, and
the web app never sets them, so the Edit Image history dividers and spinner ring and the lightbox
button backgrounds are drawn with no colour. This predates #166 and #166 does not change it; part 2
should give them values.

## Colours still written into the code

199 places in the web app ([`audit/hardcoded.md`](audit/hardcoded.md), by file). #166 already sends
text in the palette's status colours through variables (`MEANING_FAMILIES` in `tailwind.config.js`),
so those are themed; part 2 fits them to each theme without changing their hue.

| Group                                         | Places | Examples                              | For part 2                                          |
|-----------------------------------------------|-------:|---------------------------------------|-----------------------------------------------------|
| Text in a themed family and shade             |     66 | `text-red-500` `text-amber-300`       | Already themed                                      |
| Background or border tints                    |    109 | `bg-red-500/10` `border-red-500/20`   | See-through over themed surfaces; can stay          |
| Text outside the themed families or shades    |      5 | `text-violet-400` `text-amber-100`    | Add `violet` and shade 100 to the themed set        |
| Literal colours                               |     19 | `#0b0b0c` `#000000` Google, Discord   | Near-blacks onto the variables; brand colours stay  |

The status variables, `--st-<family>-<shade>-rgb`, are built in `tailwind.config.js` and every use
carries Tailwind's own colour as its fallback.

## Third-party components

There are no charts: the web app uses no chart library. What draws colour:

- **Follows the variables:** menus, dialogs and tooltips (Radix UI, Headless UI) are styled with the
  app's own Tailwind classes; icons (Lucide, Hugeicons) take the text colour.
- **Does not, and should in part 2:** the Edit Image canvas (Konva) draws its guide lines in fixed
  `#333`, `#444`, `#555`. The 3D scene (three.js) has a transparent background, so it shows the theme;
  its cyan selection highlight is fixed, which is fine.
- **Should not:** the Google sign-in button (Google's brand rules) and the colour picker.

## Part 2: Soul Mark

Updated onto main of today; adds the painter's colour wheel: 12 hues as accents, each also lighter
and deeper (36 more accents), and the same 12 hues as a Primaries row of backgrounds. No colour
appears in more than one row. The tests pass, including a sweep of every ready-made background with
every ready-made accent at every panel tint and text tone: 12,672 combinations, all text readable.
With the guard on, Soul Mark keeps each primary's hue and moves its shade where text would not read
(only Yellow reads as it is); with the guard off they are used exactly and marked where they fall short.

**Theme off, the app is unchanged.**

| Page | Browser set to | Signed in | Pixels that differ | Largest difference (of 255) |
|---|---|---|---|---|
| `/login` | dark | no | 0 of 1,296,000 | 0 |
| `/login` | light | no | 0 of 1,296,000 | 0 |
| `/signup` | dark | no | 0 of 1,296,000 | 0 |
| `/signup` | light | no | 0 of 1,296,000 | 0 |
| `/forgot-password` | dark | no | 0 of 1,296,000 | 0 |
| `/forgot-password` | light | no | 0 of 1,296,000 | 0 |
| `/forgot-password/verify` | dark | no | 0 of 1,296,000 | 0 |
| `/forgot-password/verify` | light | no | 0 of 1,296,000 | 0 |
| `/set-password` (shows `/`) | dark | no | 0 of 1,296,000 | 0 |
| `/set-password` (shows `/`) | light | no | 0 of 1,296,000 | 0 |
| `/login/desktop` | dark | no | 0 of 1,296,000 | 0 |
| `/login/desktop` | light | no | 0 of 1,296,000 | 0 |
| `/` | dark | yes | 0 of 1,296,000 | 0 |
| `/` | light | yes | 0 of 1,296,000 | 0 |
| `/create-image` | dark | yes | 0 of 1,296,000 | 0 |
| `/create-image` | light | yes | 0 of 1,296,000 | 0 |
| `/create-video` | dark | yes | 0 of 1,296,000 | 0 |
| `/create-video` | light | yes | 0 of 1,296,000 | 0 |
| `/create-audio` | dark | yes | 0 of 1,296,000 | 0 |
| `/create-audio` | light | yes | 0 of 1,296,000 | 0 |
| `/create-object` | dark | yes | 0 of 1,296,000 | 0 |
| `/create-object` | light | yes | 0 of 1,296,000 | 0 |
| `/create-world` | dark | yes | 0 of 1,296,000 | 0 |
| `/create-world` | light | yes | 0 of 1,296,000 | 0 |
| `/background-change` | dark | yes | 0 of 1,296,000 | 0 |
| `/background-change` | light | yes | 0 of 1,296,000 | 0 |
| `/frame-extractor` | dark | yes | 0 of 1,296,000 | 0 |
| `/frame-extractor` | light | yes | 0 of 1,296,000 | 0 |
| `/moodboard` | dark | yes | 0 of 1,296,000 | 0 |
| `/moodboard` | light | yes | 0 of 1,296,000 | 0 |
| `/edit-3d` | dark | yes | 0 of 1,296,000 | 0 |
| `/edit-3d` | light | yes | 0 of 1,296,000 | 0 |
| `/edit-image` | dark | yes | 13 of 1,296,000 | 4 |
| `/edit-image` | light | yes | 0 of 1,296,000 | 0 |
| `/support` | dark | yes | 0 of 1,296,000 | 0 |
| `/support` | light | yes | 0 of 1,296,000 | 0 |
| `/pricing` | dark | yes | 0 of 1,296,000 | 0 |
| `/pricing` | light | yes | 0 of 1,296,000 | 0 |
| `/welcome` | dark | yes | 0 of 1,296,000 | 0 |
| `/welcome` | light | yes | 0 of 1,296,000 | 0 |
| `/video-editor` | dark | yes | 0 of 1,296,000 | 0 |
| `/video-editor` | light | yes | 0 of 1,296,000 | 0 |
| `/media` | dark | yes | 0 of 1,296,000 | 0 |
| `/media` | light | yes | 0 of 1,296,000 | 0 |
| `/library` | dark | yes | 0 of 1,296,000 | 0 |
| `/library` | light | yes | 0 of 1,296,000 | 0 |
| `/library/folders` | dark | yes | 0 of 1,296,000 | 0 |
| `/library/folders` | light | yes | 0 of 1,296,000 | 0 |
| `/referrals` (shows `/`) | dark | yes | 0 of 1,296,000 | 0 |
| `/referrals` (shows `/`) | light | yes | 0 of 1,296,000 | 0 |
| `/onboarding` (shows `/pricing`) | dark | yes | 0 of 1,296,000 | 0 |
| `/onboarding` (shows `/pricing`) | light | yes | 0 of 1,296,000 | 0 |
| `/checkout/success` | dark | yes | 0 of 1,296,000 | 0 |
| `/checkout/success` | light | yes | 0 of 1,296,000 | 0 |
| `/checkout/cancel` | dark | yes | 0 of 1,296,000 | 0 |
| `/checkout/cancel` | light | yes | 0 of 1,296,000 | 0 |


The only page with differences is Edit Image, whose canvas is not repeatable: the same build
photographed twice differed by 41 pixels once and 0 the next time.

### Text contrast, measured

axe-core's colour-contrast rule (WCAG 2 AA) on 12 pages per theme. "On the plan colours" is white
text on the green, purple and orange plan colours, which part 2 leaves as designed; it falls short in
today's app too, and slightly darker plan colours would fix it.

| Theme                   | Text below AA | On the plan colours |
|-------------------------|---------------|---------------------|
| Today's app             |            14 |                  17 |
| Soul Mark Light         |             0 |                  15 |
| Soul Mark Dark          |             0 |                  17 |
| Starter (Blush, Purple) |             0 |                  15 |
| Midnight blue, Teal     |             0 |                  17 |
| Sky, Blue               |             0 |                  15 |
| Mint, Green             |             0 |                  15 |
| Deep purple, Pink       |             0 |                  17 |
| Peach, Red-orange       |             0 |                  15 |
| Crimson, guard on       |             0 |                  17 |
| Crimson, guard off      |           332 |                  17 |

### Light and dark, every page

Left: today. Middle: Soul Mark Light (Paper `#FFFFFF`, Blue `#2D81FF`). Right: Soul Mark Dark
(Night `#0B0E14`, Blue `#2D81FF`).

| Page | Today | Soul Mark Light | Soul Mark Dark |
|------|-------|-----------------|----------------|
| `background-change` | ![today](part2/full/background-change--today.png) | ![light](part2/full/background-change--soul-mark-light.png) | ![dark](part2/full/background-change--soul-mark-dark.png) |
| `checkout-cancel` | ![today](part2/full/checkout-cancel--today.png) | ![light](part2/full/checkout-cancel--soul-mark-light.png) | ![dark](part2/full/checkout-cancel--soul-mark-dark.png) |
| `checkout-success` | ![today](part2/full/checkout-success--today.png) | ![light](part2/full/checkout-success--soul-mark-light.png) | ![dark](part2/full/checkout-success--soul-mark-dark.png) |
| `create-audio` | ![today](part2/full/create-audio--today.png) | ![light](part2/full/create-audio--soul-mark-light.png) | ![dark](part2/full/create-audio--soul-mark-dark.png) |
| `create-image` | ![today](part2/full/create-image--today.png) | ![light](part2/full/create-image--soul-mark-light.png) | ![dark](part2/full/create-image--soul-mark-dark.png) |
| `create-object` | ![today](part2/full/create-object--today.png) | ![light](part2/full/create-object--soul-mark-light.png) | ![dark](part2/full/create-object--soul-mark-dark.png) |
| `create-video` | ![today](part2/full/create-video--today.png) | ![light](part2/full/create-video--soul-mark-light.png) | ![dark](part2/full/create-video--soul-mark-dark.png) |
| `create-world` | ![today](part2/full/create-world--today.png) | ![light](part2/full/create-world--soul-mark-light.png) | ![dark](part2/full/create-world--soul-mark-dark.png) |
| `edit-3d` | ![today](part2/full/edit-3d--today.png) | ![light](part2/full/edit-3d--soul-mark-light.png) | ![dark](part2/full/edit-3d--soul-mark-dark.png) |
| `edit-image` | ![today](part2/full/edit-image--today.png) | ![light](part2/full/edit-image--soul-mark-light.png) | ![dark](part2/full/edit-image--soul-mark-dark.png) |
| `forgot-password` | ![today](part2/full/forgot-password--today.png) | ![light](part2/full/forgot-password--soul-mark-light.png) | ![dark](part2/full/forgot-password--soul-mark-dark.png) |
| `forgot-password-verify` | ![today](part2/full/forgot-password-verify--today.png) | ![light](part2/full/forgot-password-verify--soul-mark-light.png) | ![dark](part2/full/forgot-password-verify--soul-mark-dark.png) |
| `frame-extractor` | ![today](part2/full/frame-extractor--today.png) | ![light](part2/full/frame-extractor--soul-mark-light.png) | ![dark](part2/full/frame-extractor--soul-mark-dark.png) |
| `home` | ![today](part2/full/home--today.png) | ![light](part2/full/home--soul-mark-light.png) | ![dark](part2/full/home--soul-mark-dark.png) |
| `library` | ![today](part2/full/library--today.png) | ![light](part2/full/library--soul-mark-light.png) | ![dark](part2/full/library--soul-mark-dark.png) |
| `library-folders` | ![today](part2/full/library-folders--today.png) | ![light](part2/full/library-folders--soul-mark-light.png) | ![dark](part2/full/library-folders--soul-mark-dark.png) |
| `login` | ![today](part2/full/login--today.png) | ![light](part2/full/login--soul-mark-light.png) | ![dark](part2/full/login--soul-mark-dark.png) |
| `login-desktop` | ![today](part2/full/login-desktop--today.png) | ![light](part2/full/login-desktop--soul-mark-light.png) | ![dark](part2/full/login-desktop--soul-mark-dark.png) |
| `media` | ![today](part2/full/media--today.png) | ![light](part2/full/media--soul-mark-light.png) | ![dark](part2/full/media--soul-mark-dark.png) |
| `moodboard` | ![today](part2/full/moodboard--today.png) | ![light](part2/full/moodboard--soul-mark-light.png) | ![dark](part2/full/moodboard--soul-mark-dark.png) |
| `onboarding` | ![today](part2/full/onboarding--today.png) | ![light](part2/full/onboarding--soul-mark-light.png) | ![dark](part2/full/onboarding--soul-mark-dark.png) |
| `pricing` | ![today](part2/full/pricing--today.png) | ![light](part2/full/pricing--soul-mark-light.png) | ![dark](part2/full/pricing--soul-mark-dark.png) |
| `referrals` | ![today](part2/full/referrals--today.png) | ![light](part2/full/referrals--soul-mark-light.png) | ![dark](part2/full/referrals--soul-mark-dark.png) |
| `set-password` | ![today](part2/full/set-password--today.png) | ![light](part2/full/set-password--soul-mark-light.png) | ![dark](part2/full/set-password--soul-mark-dark.png) |
| `signup` | ![today](part2/full/signup--today.png) | ![light](part2/full/signup--soul-mark-light.png) | ![dark](part2/full/signup--soul-mark-dark.png) |
| `support` | ![today](part2/full/support--today.png) | ![light](part2/full/support--soul-mark-light.png) | ![dark](part2/full/support--soul-mark-dark.png) |
| `video-editor` | ![today](part2/full/video-editor--today.png) | ![light](part2/full/video-editor--soul-mark-light.png) | ![dark](part2/full/video-editor--soul-mark-dark.png) |
| `welcome` | ![today](part2/full/welcome--today.png) | ![light](part2/full/welcome--soul-mark-light.png) | ![dark](part2/full/welcome--soul-mark-dark.png) |

### Other palettes, guard on and off, the settings panel

[`part2/palettes`](part2/palettes) has six common pairings on eight key pages, and Crimson with the
readability guard off and on. [`part2/panel`](part2/panel) shows Settings › Appearance.

---

Disclosure: built with help from Claude (Anthropic's AI coding assistant); reviewed and owned by
Luminous-Enigma.

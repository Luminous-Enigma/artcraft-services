# Which palettes people are most likely to pick

The "most likely palettes" in the part 2 evidence are taken from published data, not from
taste. Three kinds of source were looked for; this file says what each one gave, with links,
dates and sample sizes, and where the data stops.

## 1. ArtCraft's own usage data

**Not available.** Soul Mark has not shipped, so nobody has picked a Soul Mark theme yet, and
ArtCraft's analytics are not public. Once it ships, the maintainers can count which themes
people actually choose; that would replace everything below for ArtCraft's own users.

## 2. Themes people already install

Source: the Visual Studio Code Marketplace's public extension query, category Themes, sorted
by installs, read on 2026-11-21 at 00:21 UTC. The raw response is saved here as
[`vscode-marketplace-themes-2026-11-21.json`](vscode-marketplace-themes-2026-11-21.json).

The ten most-installed **color** themes (icon themes, and two entries that are language
packs rather than color themes, left out):

| Rank | Theme                  |       Installs | Background      | Accent    |
|-----:|------------------------|---------------:|-----------------|-----------|
|    1 | GitHub Theme (dark)    |     20,682,637 | `#0D1117`       | `#1F6FEB` |
|      | GitHub Theme (light)   | (same install) | `#FFFFFF`       | `#0969DA` |
|    2 | One Dark Pro           |     12,940,933 | `#282C34`       | `#61AFEF` |
|    3 | Dracula Theme Official |     11,165,334 | `#282A36`       | `#BD93F9` |
|    4 | Atom One Dark          |      7,426,171 | `#282C34`       | `#528BFF` |
|    5 | Material Theme         |      4,302,366 | deprecated      | not used  |
|    6 | Ayu                    |      4,251,571 | not checked     | not used  |
|    7 | Monokai Pro            |      4,203,217 | not checked     | not used  |
|    8 | Winter is Coming       |      3,776,706 | `#011627`       | `#219FD5` |
|    9 | Night Owl              |      3,616,506 | `#011627`       | `#7E57C2` |
|   10 | Tokyo Night            |      3,035,883 | `#1A1B26`       | `#3D59A1` |

The most-installed light-only theme is Atom One Light, 1,464,335 installs: background
`#FAFAFA`, accent `#526FFF`.

Each color is read from the theme's own source file (saved in [`theme-sources/`](theme-sources)):

- GitHub: `@primer/primitives` 11.10.0 on npm, `dist/css/functional/themes/dark.css` and
  `light.css` (`--bgColor-default`, `--bgColor-accent-emphasis`); the GitHub VS Code theme is
  built from these.
- One Dark Pro: [Binaryify/OneDark-Pro `themes/OneDark-Pro.json`](https://github.com/Binaryify/OneDark-Pro/blob/master/themes/OneDark-Pro.json)
  (`editor.background`, `textLink.foreground`).
- Dracula: [dracula/visual-studio-code `src/dracula.yml`](https://github.com/dracula/visual-studio-code/blob/master/src/dracula.yml)
  (`BG`, `PURPLE`).
- Atom One Dark and Light: [akamud/vscode-theme-onedark](https://github.com/akamud/vscode-theme-onedark/blob/master/themes/OneDark.json),
  [akamud/vscode-theme-onelight](https://github.com/akamud/vscode-theme-onelight/blob/master/themes/OneLight.json)
  (`editor.background`, `focusBorder`).
- Winter is Coming: [johnpapa/vscode-winteriscoming](https://github.com/johnpapa/vscode-winteriscoming/blob/master/themes/WinterIsComing-dark-blue-color-theme.json)
  (`editor.background`, `focusBorder`).
- Night Owl: [sdras/night-owl-vscode-theme](https://github.com/sdras/night-owl-vscode-theme/blob/main/themes/Night%20Owl-color-theme.json)
  (`editor.background`, `button.background`).
- Tokyo Night: [enkia/tokyo-night-vscode-theme](https://github.com/enkia/tokyo-night-vscode-theme/blob/master/themes/tokyo-night-color-theme.json)
  (`editor.background`, `activityBarBadge.background`).

**Limits.** These are installs by software developers, not ArtCraft's users. An install is not
daily use. VS Code's built-in themes need no install, so they are not counted at all, and
GitHub Theme's one count covers its light and dark variants together.

## 3. What people say they prefer

**Favorite color.** YouGov, ["Why is blue the world's favorite color?"](https://yougov.com/en-us/articles/12335-why-blue-worlds-favorite-color),
12 May 2015: a survey in 10 countries on four continents (Australia, China, Germany, Hong Kong,
Indonesia, Malaysia, Singapore, Thailand, the UK and the US). Blue was the most popular color
in every one, chosen by 23% (Indonesia) to 33% (Britain) of people, 8 to 18 points ahead of
any other. Second place was green (Thailand, China, US), red (Indonesia, Singapore, Germany,
Britain) or purple (Hong Kong).

YouGov, ["America's favorite color"](https://yougov.com/en-us/articles/10735-americas-favorite-color),
22 October 2014: blue 34%, red 13%, green 12%. Least favorite: brown 19%, orange 16%.

**Dark or light.** Nielsen Norman Group, ["Dark Mode: How Users Think About It and Issues to
Avoid"](https://www.nngroup.com/articles/dark-mode-users-issues/), 27 August 2023: of 115
mobile users, roughly a third keep their phone in dark mode, a third in light mode, and a third
use both.

Android Authority, ["Just about everyone uses dark mode"](https://www.androidauthority.com/dark-mode-poll-results-1090716/),
7 March 2020: of 2,514 readers who voted, 81.9% use dark mode, 9.9% switch between the two, and
8.2% don't use it. This is a self-selected poll of a tech site's readers, so it leans toward
dark mode more than the general public.

## What the palettes are, and why

| Palette          | Background | Accent    | Based on                                                               |
|------------------|------------|-----------|------------------------------------------------------------------------|
| GitHub Light     | `#FFFFFF`  | `#0969DA` | Most-installed theme, light variant; a third of people use light mode  |
| GitHub Dark      | `#0D1117`  | `#1F6FEB` | Most-installed theme, dark variant                                     |
| One Dark         | `#282C34`  | `#61AFEF` | Shared by the 2nd and 4th most installed (One Dark Pro, Atom One Dark) |
| Dracula          | `#282A36`  | `#BD93F9` | 3rd most installed; purple is a common second-favorite color           |
| Winter is Coming | `#011627`  | `#219FD5` | 8th; with Night Owl (9th) this navy is in 7.4M installs                |
| One Light        | `#FAFAFA`  | `#526FFF` | The most-installed light-only theme                                    |

Blue is the accent in four of the six, which matches the surveys. The starter colors (Blush
and Purple) are shown separately, because they are what everyone sees first, not because they
are popular.

Soul Mark runs each palette through its readability guard like any other choice, so where a
theme's accent is too dark or too light for button text, its shade is adjusted and its hue kept.

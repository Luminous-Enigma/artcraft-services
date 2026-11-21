#!/usr/bin/env bash
# Palettes taken from the most-installed VS Code color themes (Marketplace, 2026-11-21),
# each theme's own background and accent from its source files.
set -u
cd "$(dirname "$0")"
B=${BEFORE:-../b2/main-today}; A=${AFTER:-../b4/soulmark}; OUT=${OUT:-../setD}
KEY="home,create-image,library,pricing,login,edit-image,moodboard,support"
AXE=${AXE:-/home/user/artcraft-services/frontend/node_modules/axe-core/axe.min.js}
run () { # name background accent
  local st="{\"artcraft-theme\":\"{\\\"state\\\":{\\\"mode\\\":\\\"soul-mark\\\",\\\"seeds\\\":{\\\"background\\\":\\\"$2\\\",\\\"accent\\\":\\\"$3\\\",\\\"tint\\\":0.5,\\\"character\\\":\\\"soft\\\",\\\"guard\\\":true}},\\\"version\\\":0}\"}"
  echo "== $1"
  node visual-compare.mjs --before $B --after $A --out $OUT/$1 --before-label main-today --after-label "$1" \
    --after-storage "$st" --schemes dark --pages $KEY 2>&1 | tail -1
  node contrast-check.mjs --dist $A --axe $AXE --label "$1" --out ../contrast/$1.json --storage "$st" 2>&1 | tail -1
}
run github-light "#FFFFFF" "#0969DA"
run github-dark  "#0D1117" "#1F6FEB"
run one-dark     "#282C34" "#61AFEF"
run dracula      "#282A36" "#BD93F9"
run winter-is-coming "#011627" "#219FD5"
run one-light    "#FAFAFA" "#526FFF"

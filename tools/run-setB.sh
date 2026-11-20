#!/usr/bin/env bash
# Set B: today's main vs Part 2 with Soul Mark on, one run per colour combination.
set -u
cd "$(dirname "$0")"
B=${BEFORE:-../b2/main-today}; A=${AFTER:-../b2/soulmark}; OUT=${OUT:-../setB}
KEY="home,create-image,library,pricing,login,edit-image,moodboard,support"
run () { # name background accent pages
  local st="{\"artcraft-theme\":\"{\\\"state\\\":{\\\"mode\\\":\\\"soul-mark\\\",\\\"seeds\\\":{\\\"background\\\":\\\"$2\\\",\\\"accent\\\":\\\"$3\\\",\\\"tint\\\":0.5,\\\"character\\\":\\\"soft\\\",\\\"guard\\\":${5:-true}}},\\\"version\\\":0}\"}"
  echo "== $1"
  node visual-compare.mjs --before $B --after $A --out $OUT/$1 --before-label main-today --after-label "$1" \
    --after-storage "$st" --schemes dark ${4:+--pages $4} 2>&1 | tail -1
}
run light          "#FFFFFF" "#2D81FF" ""
run dark           "#0B0E14" "#2D81FF" ""
run starter        "#FDF2F7" "#9B4DCA" "$KEY"
run midnight-teal  "#101B44" "#1CB6BE" "$KEY"
run sky-blue       "#BFDBF1" "#2D81FF" "$KEY"
run mint-green     "#BFE3C6" "#10B981" "$KEY"
run purple-pink    "#391961" "#E86FA6" "$KEY"
run peach-redorange "#FFD8A8" "#FC600A" "$KEY"
run guard-on       "#DC143C" "#2D81FF" "home,pricing" true
run guard-off      "#DC143C" "#2D81FF" "home,pricing" false

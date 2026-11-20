#!/usr/bin/env bash
set -u
cd "$(dirname "$0")"
AXE=${AXE:-../frontend/node_modules/axe-core/axe.min.js}
c () { # name background accent guard
  local st="{\"artcraft-theme\":\"{\\\"state\\\":{\\\"mode\\\":\\\"soul-mark\\\",\\\"seeds\\\":{\\\"background\\\":\\\"$2\\\",\\\"accent\\\":\\\"$3\\\",\\\"tint\\\":0.5,\\\"character\\\":\\\"soft\\\",\\\"guard\\\":${4:-true}}},\\\"version\\\":0}\"}"
  node contrast-check.mjs --dist ${AFTER:-../b2/soulmark} --axe $AXE --label "$1" --out ../contrast/$1.json --storage "$st" 2>&1 | tail -1
}
c light           "#FFFFFF" "#2D81FF"
c dark            "#0B0E14" "#2D81FF"
c starter         "#FDF2F7" "#9B4DCA"
c midnight-teal   "#101B44" "#1CB6BE"
c sky-blue        "#BFDBF1" "#2D81FF"
c mint-green      "#BFE3C6" "#10B981"
c purple-pink     "#391961" "#E86FA6"
c peach-redorange "#FFD8A8" "#FC600A"
c guard-off       "#DC143C" "#2D81FF" false
c guard-on        "#DC143C" "#2D81FF" true

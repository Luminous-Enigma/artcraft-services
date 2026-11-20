#!/usr/bin/env node
// Theme variable audit for the ArtCraft webapp.
//
//   node variable-audit.mjs --repo <frontend dir> --dist <built webapp dir> --out <dir>
//
// 1. Reads every var(--st-...) the webapp and the libs it uses refer to, and
//    checks each one is either declared on :root in styles.css (so it always
//    has a value) or written with an inline fallback, var(--x, value).
// 2. Opens the built app and asks the browser for every --st-* value on the
//    page root, proving each declared variable resolves to a real value.
// 3. Lists colours still written directly into the code (hex, rgb(), and
//    Tailwind palette classes such as text-gray-400 that no variable controls).
//
// Output: <out>/variables.json, <out>/variables.md, <out>/hardcoded.json, <out>/hardcoded.md

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) =>
  (x.startsWith("--") && a.push([x.slice(2), all[i + 1]]), a), []));
const REPO = path.resolve(args.repo);
const DIST = path.resolve(args.dist);
const OUT = path.resolve(args.out);
fs.mkdirSync(OUT, { recursive: true });

const APP = path.join(REPO, "apps/artcraft-webapp");
const SCAN_DIRS = [path.join(APP, "src"), path.join(REPO, "libs")];
const EXTRA_FILES = [path.join(APP, "tailwind.config.js")];
const EXT = /\.(tsx?|jsx?|css)$/;
const SKIP = /node_modules|\/dist\/|\.spec\.|\.test\.|__tests__|stories/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.test(p)) continue;
    if (e.isDirectory()) walk(p, out);
    else if (EXT.test(e.name)) out.push(p);
  }
  return out;
}
const files = [...SCAN_DIRS.flatMap((d) => walk(d)), ...EXTRA_FILES];
const rel = (p) => path.relative(REPO, p);

// --- 1. Declared on :root -------------------------------------------------
const stylesCss = fs.readFileSync(path.join(APP, "src/styles.css"), "utf8");
const rootBlock = stylesCss.slice(stylesCss.indexOf(":root"), stylesCss.indexOf("}", stylesCss.indexOf(":root")));
const declared = new Map();
for (const m of rootBlock.matchAll(/(--st-[\w-]+)\s*:\s*([^;]+);/g)) declared.set(m[1], m[2].trim());

// --- Uses ------------------------------------------------------------------
// var(--st-name) or var(--st-name, fallback). The fallback may itself contain
// parentheses, so read it by counting brackets.
const uses = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const re = /var\(\s*(--st-[\w-]+)\s*(,)?/g;
  let m;
  while ((m = re.exec(src))) {
    let fallback = null;
    if (m[2]) {
      let depth = 1, i = re.lastIndex, s = i;
      while (i < src.length && depth) { if (src[i] === "(") depth++; else if (src[i] === ")") depth--; i++; }
      fallback = src.slice(s, i - 1).trim();
    }
    const line = src.slice(0, m.index).split("\n").length;
    if (!uses.has(m[1])) uses.set(m[1], []);
    uses.get(m[1]).push({ file: rel(f), line, fallback });
  }
}

// --- 2. Live values from the built page -------------------------------------
const server = await new Promise((res) => {
  const s = http.createServer((q, r) => {
    let f = path.join(DIST, decodeURIComponent(q.url.split("?")[0]));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
    r.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : f.endsWith(".css") ? "text/css" : "text/html" });
    fs.createReadStream(f).pipe(r);
  }).listen(0, "127.0.0.1", () => res(s));
});
const browser = await chromium.launch();
const tab = await browser.newPage();
await tab.route("**/*", (r) => new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue()
  : new URL(r.request().url()).pathname === "/v1/session" ? r.fulfill({ json: { success: true, logged_in: false } })
  : r.abort());
await tab.goto(`http://127.0.0.1:${server.address().port}/login`);
await tab.waitForTimeout(1500);
const live = await tab.evaluate((names) => {
  const cs = getComputedStyle(document.documentElement);
  return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim()]));
}, [...new Set([...declared.keys(), ...uses.keys()])]);
await browser.close(); server.close();

// --- Verdict per variable ---------------------------------------------------
const rows = [...new Set([...declared.keys(), ...uses.keys()])].sort().map((name) => {
  const u = uses.get(name) ?? [];
  const withFallback = u.filter((x) => x.fallback !== null).length;
  const isDeclared = declared.has(name);
  const liveValue = live[name] || "";
  let status;
  if (isDeclared && liveValue) status = "always set on :root";
  else if (u.length && withFallback === u.length) status = "unset on purpose; every use has its own fallback";
  else if (!u.length) status = "declared, not used yet";
  else status = "MISSING: used without a value or fallback";
  return { name, declaredValue: declared.get(name) ?? null, liveValue: liveValue || null,
    uses: u.length, usesWithInlineFallback: withFallback,
    fallbacks: [...new Set(u.filter((x) => x.fallback).map((x) => x.fallback))],
    files: [...new Set(u.map((x) => x.file))], status };
});
fs.writeFileSync(path.join(OUT, "variables.json"), JSON.stringify(rows, null, 2));

// --- 3. Colours still written into the code ---------------------------------
const PALETTE = "slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const patterns = [
  ["hex", /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g],
  ["rgb()/hsl()", /\b(?:rgba?|hsla?)\(\s*\d[^)]*\)/g],
  ["Tailwind palette class", new RegExp(`\\b(?:text|bg|border|ring|from|via|to|fill|stroke|outline|divide|placeholder|shadow|accent|caret|decoration)-(?:${PALETTE})-\\d{2,3}(?:\\/\\d+)?\\b`, "g")],
];
const appFiles = files.filter((f) => f.startsWith(APP) && !f.endsWith("styles.css") && !f.endsWith("tailwind.config.js"));
const hard = [];
for (const f of appFiles) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments
    for (const [kind, re] of patterns) for (const m of line.matchAll(re)) {
      if (kind === "hex" && /&#|url\(|href=|#[0-9a-f]{3,8}["']?\s*\}/i.test(line) && !/color|fill|stroke|bg|background|border|shadow/i.test(line)) continue;
      hard.push({ file: rel(f), line: i + 1, kind, value: m[0] });
    }
  });
}
// Text colours in tailwind.config.js's MEANING_FAMILIES / MEANING_SHADES already read
// --st-<family>-<shade>-rgb, so a theme fits them: they are not hard-coded.
const tw = fs.readFileSync(path.join(APP, "tailwind.config.js"), "utf8");
const fam = new Set((tw.match(/MEANING_FAMILIES = \[([^\]]*)\]/)?.[1] ?? "").match(/[a-z]+/g) ?? []);
const shades = new Set((tw.match(/MEANING_SHADES = \[([^\]]*)\]/)?.[1] ?? "").match(/\d+/g) ?? []);
for (const h of hard) {
  const m = h.value.match(/^(\w+)-([a-z]+)-(\d+)/);
  if (h.kind !== "Tailwind palette class") h.group = "literal colour";
  else if (m[1] === "text" && fam.has(m[2]) && shades.has(m[3])) h.group = "themed text";
  else if (m[1] === "text") h.group = "text outside the themed families or shades";
  else h.group = "background or border tint";
}
fs.writeFileSync(path.join(OUT, "hardcoded.json"), JSON.stringify(hard, null, 2));

// --- Markdown summaries (space-padded, per the repo's Markdown rule) ---------
function table(head, body) {
  const w = head.map((h, c) => Math.max(h.length, ...body.map((r) => String(r[c]).length)));
  const fmt = (r) => "| " + r.map((v, c) => String(v).padEnd(w[c])).join(" | ") + " |";
  return [fmt(head), "|" + w.map((n) => "-".repeat(n + 2)).join("|") + "|", ...body.map(fmt)].join("\n");
}
const missing = rows.filter((r) => r.status.startsWith("MISSING"));
fs.writeFileSync(path.join(OUT, "variables.md"),
  `# Theme variables\n\n${rows.length} variables. ${missing.length} used without a value or fallback.\n\n` +
  table(["Variable", "Value on :root", "Value in the browser", "Uses", "Status"],
    rows.map((r) => [`\`${r.name}\``, r.declaredValue ?? "(not set)", r.liveValue ?? "(empty)", r.uses, r.status])) + "\n");
const byFile = {};
for (const h of hard) (byFile[h.file] ??= []).push(h);
const groups = {};
for (const h of hard) (groups[h.group] ??= []).push(h);
const groupTable = table(["Group", "Places", "Examples"], Object.entries(groups).map(([g, hs]) =>
  [g, hs.length, [...new Set(hs.map((h) => h.value))].slice(0, 4).join(" ")]));
fs.writeFileSync(path.join(OUT, "hardcoded.md"),
  `# Colours written into the webapp's code\n\n${hard.length} places in ${Object.keys(byFile).length} files. ` +
  `"Themed text" already reads a theme variable (tailwind.config.js, MEANING_FAMILIES); the rest do not.\n\n` +
  groupTable + "\n\n## By file\n\n" +
  table(["File", "Hex", "rgb()/hsl()", "Palette classes", "Examples"],
    Object.entries(byFile).sort((a, b) => b[1].length - a[1].length).map(([f, hs]) => [
      `\`${f.replace("apps/artcraft-webapp/src/", "")}\``,
      hs.filter((h) => h.kind === "hex").length, hs.filter((h) => h.kind === "rgb()/hsl()").length,
      hs.filter((h) => h.kind === "Tailwind palette class").length,
      [...new Set(hs.map((h) => h.value))].slice(0, 3).join(" ")])) + "\n");

console.log(`${rows.length} variables; ${missing.length} missing a value or fallback.`);
for (const r of missing) console.log("  MISSING", r.name, r.files.join(", "));
console.log(`${hard.length} colour uses in ${Object.keys(byFile).length} webapp files:`);
for (const [g, hs] of Object.entries(groups)) console.log(`  ${g}: ${hs.length}`);

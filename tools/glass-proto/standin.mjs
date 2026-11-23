// Stand-in "work" for the workspace pictures: original images drawn here, no real account.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";
const OUT = process.argv[2];
let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; const R = (a, b) => a + rnd() * (b - a);
const pal = [["#0B132B","#1C2541","#3A506B","#5BC0BE","#E0FBFC"],["#2D1E2F","#5C3D46","#F7B05B","#F7934C","#FFF3E0"],
  ["#0F3D3E","#100F0F","#E2DCC8","#3F7D20","#A1C181"],["#22223B","#4A4E69","#9A8C98","#C9ADA7","#F2E9E4"],
  ["#03045E","#0077B6","#00B4D8","#90E0EF","#CAF0F8"],["#370617","#9D0208","#DC2F02","#F48C06","#FFBA08"]];
const scene = (p, i, w, h) => {
  const kind = i % 4;
  if (kind === 0) return `<rect width="${w}" height="${h}" fill="${p[4]}"/><circle cx="${w*.7}" cy="${h*.3}" r="${h*.12}" fill="${p[3]}"/>` +
    [0,1,2].map(k=>`<path d="M0 ${h*(.55+k*.12)} Q ${w*.3} ${h*(.4+k*.12)} ${w*.6} ${h*(.58+k*.1)} T ${w} ${h*(.5+k*.12)} V ${h} H0Z" fill="${p[2-k]}"/>`).join("");
  if (kind === 1) return `<rect width="${w}" height="${h}" fill="${p[0]}"/>` + Array.from({length:40},()=>`<circle cx="${R(0,w)}" cy="${R(0,h)}" r="${R(10,h*.25)}" fill="${p[1+Math.floor(R(0,4))]}" opacity="${R(.4,.9)}"/>`).join("");
  if (kind === 2) return `<rect width="${w}" height="${h}" fill="${p[1]}"/><g transform="translate(${w/2} ${h*.55})">` +
    `<ellipse rx="${h*.22}" ry="${h*.28}" fill="${p[3]}"/><circle cy="${-h*.38}" r="${h*.13}" fill="${p[4]}"/><circle cx="${-h*.04}" cy="${-h*.4}" r="${h*.015}" fill="${p[0]}"/><circle cx="${h*.04}" cy="${-h*.4}" r="${h*.015}" fill="${p[0]}"/></g>`;
  return `<rect width="${w}" height="${h}" fill="${p[0]}"/>` + Array.from({length:12},(_,k)=>`<rect x="${k*w/12}" y="${h - R(.2,.9)*h}" width="${w/12-6}" height="${h}" fill="${p[1+(k%4)]}"/>`).join("") +
    Array.from({length:60},()=>`<rect x="${R(0,w)}" y="${R(h*.2,h)}" width="6" height="9" fill="${p[4]}" opacity=".8"/>`).join("");
};
const browser = await chromium.launch(); const page = await browser.newPage();
const sizes = [[1536,1024],[1024,1024],[1024,1536]];
for (let i = 0; i < 12; i++) {
  const [w, h] = sizes[i % 3]; await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${scene(pal[i % 6], i, w, h)}</svg></body>`);
  await page.screenshot({ path: `${OUT}/work-${String(i + 1).padStart(2, "0")}.jpg`, type: "jpeg", quality: 85 });
}
await browser.close(); console.log("ok");

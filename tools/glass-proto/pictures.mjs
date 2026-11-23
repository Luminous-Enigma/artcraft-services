// Draws the six starter pictures for the Glass prototype (original art, made here).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const W = 2560, H = 1440;
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
const R = (a, b) => a + rnd() * (b - a);
const blobs = (n, colors, rMin, rMax, op) => Array.from({ length: n }, (_, i) =>
  `<circle cx="${R(0, W)}" cy="${R(0, H)}" r="${R(rMin, rMax)}" fill="${colors[i % colors.length]}" opacity="${op}"/>`).join("");
const facets = (n, colors) => Array.from({ length: n }, (_, i) => {
  const x = R(-200, W), y = R(-200, H), s = R(250, 700);
  return `<polygon points="${x},${y} ${x + s * R(.4, 1)},${y + s * R(.1, .5)} ${x + s * R(.2, .8)},${y + s} ${x - s * R(0, .3)},${y + s * R(.4, .9)}" fill="${colors[i % colors.length]}" opacity="${R(.25, .6)}"/>`;
}).join("");
const svg = (defs, body, blur = 0) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>${defs}<filter id="b"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>${body}</svg>`;
const PICS = {
  quartz: svg(`<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EDE7F6"/><stop offset=".5" stop-color="#F8F4FB"/><stop offset="1" stop-color="#E3EEF7"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#g)"/><g filter="url(#b)">${facets(26, ["#C9B8E8", "#F3D9E6", "#BFD8EF", "#FFFFFF", "#D8CCEF"])}</g>`, 6),
  dusk: svg(`<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1B4A"/><stop offset=".45" stop-color="#C0516B"/><stop offset=".7" stop-color="#F2A65A"/><stop offset="1" stop-color="#3A2440"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#g)"/><circle cx="${W * .62}" cy="${H * .62}" r="190" fill="#FFD9A0" opacity=".85"/>
     <path d="M0 ${H * .78} Q ${W * .25} ${H * .62} ${W * .5} ${H * .76} T ${W} ${H * .7} V ${H} H 0Z" fill="#2B1A33"/>
     <path d="M0 ${H * .88} Q ${W * .3} ${H * .78} ${W * .6} ${H * .9} T ${W} ${H * .84} V ${H} H 0Z" fill="#160D1E"/>`),
  aurora: svg(`<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03141C"/><stop offset="1" stop-color="#071F2B"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#g)"/><g filter="url(#b)">
     <path d="M-100 ${H * .55} C ${W * .2} ${H * .2}, ${W * .45} ${H * .7}, ${W * .7} ${H * .3} S ${W + 200} ${H * .4}, ${W + 200} ${H * .2}" stroke="#36F5A8" stroke-width="140" fill="none" opacity=".55"/>
     <path d="M-100 ${H * .7} C ${W * .25} ${H * .4}, ${W * .5} ${H * .85}, ${W * .8} ${H * .45} S ${W + 200} ${H * .6}, ${W + 200} ${H * .5}" stroke="#2EC5FF" stroke-width="110" fill="none" opacity=".45"/>
     <path d="M-100 ${H * .35} C ${W * .3} ${H * .15}, ${W * .55} ${H * .5}, ${W + 200} ${H * .15}" stroke="#A77BFF" stroke-width="90" fill="none" opacity=".35"/></g>
     ${Array.from({ length: 180 }, () => `<circle cx="${R(0, W)}" cy="${R(0, H * .6)}" r="${R(.8, 2.4)}" fill="#fff" opacity="${R(.3, .9)}"/>`).join("")}`, 40),
  shore: svg(`<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE8F5"/><stop offset=".5" stop-color="#7EC4DA"/><stop offset=".62" stop-color="#3E9CB8"/><stop offset=".66" stop-color="#F4E6CC"/><stop offset="1" stop-color="#EAD6B2"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#g)"/><g filter="url(#b)">${blobs(14, ["#FFFFFF"], 80, 220, .55).replace(/cy="([\d.]+)"/g, (m, y) => `cy="${(+y) * .35}"`)}</g>
     <path d="M0 ${H * .66} Q ${W * .25} ${H * .63} ${W * .5} ${H * .67} T ${W} ${H * .65}" stroke="#FFFFFF" stroke-width="10" fill="none" opacity=".8"/>`, 30),
  ink: svg(`<radialGradient id="g" cx=".3" cy=".3" r="1"><stop offset="0" stop-color="#1C1F26"/><stop offset="1" stop-color="#07080A"/></radialGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#g)"/><g filter="url(#b)">${blobs(10, ["#2F3A55", "#3D2C4F", "#1E4A4A"], 200, 520, .6)}</g>`, 70),
  confetti: svg(``,
    `<rect width="${W}" height="${H}" fill="#FFFFFF"/>${Array.from({ length: 70 }, (_, i) => {
      const c = ["#000000", "#FFFFFF", "#FF2D55", "#FFD60A", "#0A84FF", "#30D158", "#000000"][i % 7];
      return `<rect x="${R(-100, W)}" y="${R(-100, H)}" width="${R(80, 420)}" height="${R(80, 420)}" fill="${c}" transform="rotate(${R(0, 90)} ${R(0, W)} ${R(0, H)})"/>`;
    }).join("")}`),
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
for (const [name, s] of Object.entries(PICS)) {
  await page.setContent(`<html><body style="margin:0">${s}</body></html>`);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 82 });
  console.log(name, fs.statSync(`${OUT}/${name}.jpg`).size);
}
await browser.close();

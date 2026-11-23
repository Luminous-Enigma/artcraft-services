// Three more test pictures for the 9% charcoal: bright, night lights, light detail (original art).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const OUT = process.argv[2]; const W = 2560, H = 1440;
let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const R = (a, b) => a + rnd() * (b - a);
const PICS = {
  sunrise: `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE7A3"/><stop offset=".5" stop-color="#FFC07A"/><stop offset="1" stop-color="#FF8F6B"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#s)"/><circle cx="${W * .5}" cy="${H * .58}" r="260" fill="#FFFBEA"/>
    <path d="M0 ${H * .7} Q ${W * .3} ${H * .6} ${W * .55} ${H * .72} T ${W} ${H * .66} V ${H} H0Z" fill="#7FB069"/>
    <path d="M0 ${H * .82} Q ${W * .35} ${H * .74} ${W * .7} ${H * .86} T ${W} ${H * .8} V ${H} H0Z" fill="#4E8F5A"/>`,
  "night-city": `<rect width="${W}" height="${H}" fill="#05060D"/>` + Array.from({ length: 34 }, (_, i) => {
      const w = R(50, 140), h = R(200, 900), x = i * 76; let win = "";
      for (let y = H - h + 20; y < H - 20; y += 34) for (let xx = x + 10; xx < x + w - 10; xx += 22) if (rnd() > .55) win += `<rect x="${xx}" y="${y}" width="9" height="14" fill="${["#FFE08A", "#9FE7FF", "#FF7AD9"][Math.floor(R(0, 3))]}"/>`;
      return `<rect x="${x}" y="${H - h}" width="${w}" height="${h}" fill="#10131F"/>${win}`; }).join("")
    + Array.from({ length: 120 }, () => `<circle cx="${R(0, W)}" cy="${R(0, H * .4)}" r="${R(.8, 2)}" fill="#fff" opacity="${R(.3, 1)}"/>`).join(""),
  marble: `<defs><filter id="t"><feTurbulence type="fractalNoise" baseFrequency="0.0025 0.006" numOctaves="5" seed="4"/><feColorMatrix values="0 0 0 0 0.62  0 0 0 0 0.62  0 0 0 0 0.66  0 0 0 -2.2 1.25"/></filter></defs>
    <rect width="${W}" height="${H}" fill="#F4F3F1"/><rect width="${W}" height="${H}" filter="url(#t)"/>`,
};
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: H } });
for (const [n, s] of Object.entries(PICS)) {
  await p.setContent(`<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${s}</svg></body>`);
  await p.screenshot({ path: `${OUT}/${n}.jpg`, type: "jpeg", quality: 85 }); console.log(n);
}
await b.close();

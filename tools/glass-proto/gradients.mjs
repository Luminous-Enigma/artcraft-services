// The five three-color signature fades as Glass background pictures (top to bottom).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const OUT = process.argv[2];
const G = { "grad-aurora": ["#0D2661", "#0C2F1C", "#0B0E14"], "grad-synthwave": ["#391961", "#521232", "#0B0E14"],
  "grad-nebula": ["#19206A", "#391961", "#0B0E14"], "grad-ember": ["#5D101B", "#441E13", "#0B0E14"],
  "grad-twilight": ["#521232", "#391961", "#101B44"] };
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2560, height: 1440 } });
for (const [n, c] of Object.entries(G)) {
  await p.setContent(`<body style="margin:0;height:1440px;background:linear-gradient(to bottom, ${c.join(",")})"></body>`);
  await p.screenshot({ path: `${OUT}/${n}.jpg`, type: "jpeg", quality: 90 }); console.log(n);
}
await b.close();

// Genera hoja-de-sprites.html con todos los sprites del pixel art,
// ampliados y con su nombre, para revisarlos en el navegador.
//
//   npm run sprites

import { writeFileSync } from 'node:fs';
import { PALETA, type Dibujo } from '../src/escenas/pixel/paleta.ts';
import { GRUPOS } from '../src/escenas/pixel/catalogo.ts';

const ESCALA = 4;
const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

function svg(d: Dibujo, escala: number): string {
  const rects: string[] = [];
  d.forEach((fila, y) => [...fila].forEach((p, x) => p !== '.' && rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${css(PALETA[p]!)}"/>`)));
  const w = d[0]!.length;
  const h = d.length;
  return `<svg width="${w * escala}" height="${h * escala}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${rects.join('')}</svg>`;
}

const secciones = Object.entries(GRUPOS).map(
  ([grupo, sprites]) =>
    `<h2>${grupo} (${Object.keys(sprites).length})</h2><div class="g">${Object.entries(sprites)
      .map(([id, d]) => `<figure>${svg(d, ESCALA)}<figcaption>${id}</figcaption></figure>`)
      .join('')}</div>`,
);
writeFileSync(
  new URL('../hoja-de-sprites.html', import.meta.url),
  `<!doctype html><meta charset="utf-8"><title>Sprites de PokCam</title><style>
body{background:#0d0e13;color:#e8e9ef;font:13px system-ui;margin:16px}
.g{display:flex;flex-wrap:wrap;gap:10px}figure{margin:0;width:104px;text-align:center;background:#1a1c25;padding:8px 2px;border-radius:6px}
figcaption{margin-top:4px;font-size:11px;color:#8a8fa3;word-break:break-all}h2{font-weight:500}</style>${secciones.join('')}`,
);
console.log('Listo: hoja-de-sprites.html');

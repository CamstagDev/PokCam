// Formas que se repiten en muchos sprites: los palos, monedas, cartas,
// dados… Todas dibujan sobre un Lienzo.

import type { Palo } from '../../juego/cartas.ts';
import { dibujo, type Dibujo } from './paleta.ts';
import { Lienzo, lienzo } from './lienzo.ts';

const PALOS_7: Readonly<Record<Palo, Dibujo>> = {
  picas: dibujo(`
    ...#...
    ..###..
    .#####.
    #######
    #######
    ##.#.##
    ..###..`),
  corazones: dibujo(`
    .##.##.
    #######
    #######
    #######
    .#####.
    ..###..
    ...#...`),
  diamantes: dibujo(`
    ...#...
    ..###..
    .#####.
    #######
    .#####.
    ..###..
    ...#...`),
  treboles: dibujo(`
    ..###..
    ..###..
    ##.#.##
    #######
    ##.#.##
    ...#...
    ..###..`),
};

const PALOS_5: Readonly<Record<Palo, Dibujo>> = {
  picas: dibujo(`
    ..#..
    .###.
    #####
    ..#..
    .###.`),
  corazones: dibujo(`
    ##.##
    #####
    #####
    .###.
    ..#..`),
  diamantes: dibujo(`
    ..#..
    .###.
    #####
    .###.
    ..#..`),
  treboles: dibujo(`
    .###.
    .###.
    #####
    ..#..
    .###.`),
};

export const COLOR_PALO: Readonly<Record<Palo, string>> = { picas: 'n', treboles: 'n', corazones: 'r', diamantes: 'r' };

export function palo(l: Lienzo, cual: Palo, x: number, y: number, tamano: 5 | 7 = 7, color = COLOR_PALO[cual]): Lienzo {
  return l.pegar(tamano === 7 ? PALOS_7[cual] : PALOS_5[cual], x, y, color);
}

export function forma(cual: Palo, tamano: 5 | 7): Dibujo {
  return tamano === 7 ? PALOS_7[cual] : PALOS_5[cual];
}

// Una moneda de oro: el borde más oscuro y un brillo.
export function moneda(l: Lienzo, cx: number, cy: number, r: number): Lienzo {
  l.circulo(cx, cy, r, 'G').circulo(cx, cy, r - 1, 'g');
  if (r >= 4) l.anillo(cx, cy, r - 2, 1, 'G').circulo(cx - 0.5, cy - 0.5, Math.max(0.6, r - 3.5), 'g');
  return l.punto(Math.round(cx - r / 2), Math.round(cy - r / 2), 'y');
}

// Una carta de pie con el rango arriba y el palo en el medio.
export function carta(l: Lienzo, x: number, y: number, w: number, h: number, rango?: string, p?: Palo): Lienzo {
  l.rect(x, y, w, h, 'w').rect(x + w - 1, y + 1, 1, h - 1, 'l').rect(x + 1, y + h - 1, w - 1, 1, 'l');
  if (rango) l.texto(rango, x + 1, y + 1, p ? COLOR_PALO[p] : 'n');
  if (p) palo(l, p, x + Math.floor((w - 5) / 2) + (rango ? 1 : 0), y + Math.floor((h - 5) / 2) + (rango ? 2 : 0), 5);
  return l;
}

// Un dado visto de frente con `puntos` (1 a 6).
export function dado(l: Lienzo, x: number, y: number, lado: number, puntos: number, cara = 'W', punto = 'n'): Lienzo {
  l.rect(x, y, lado, lado, cara).rect(x + lado - 1, y + 1, 1, lado - 1, 'l').rect(x + 1, y + lado - 1, lado - 1, 1, 'l');
  const a = x + 1;
  const b = x + Math.floor(lado / 2) - (lado % 2 === 0 ? 1 : 0);
  const c = x + lado - 3;
  const arriba = y + 1;
  const medio = y + Math.floor(lado / 2) - (lado % 2 === 0 ? 1 : 0);
  const abajo = y + lado - 3;
  const marcas: Record<number, [number, number][]> = {
    1: [[b, medio]],
    2: [[a, arriba], [c, abajo]],
    3: [[a, arriba], [b, medio], [c, abajo]],
    4: [[a, arriba], [c, arriba], [a, abajo], [c, abajo]],
    5: [[a, arriba], [c, arriba], [b, medio], [a, abajo], [c, abajo]],
    6: [[a, arriba], [c, arriba], [a, medio], [c, medio], [a, abajo], [c, abajo]],
  };
  for (const [px, py] of marcas[puntos] ?? []) l.punto(px, py, punto);
  return l;
}

// Una ficha de póker de frente: rayas blancas en el borde.
export function ficha(l: Lienzo, cx: number, cy: number, r: number, color: string, oscuro: string): Lienzo {
  l.circulo(cx, cy, r, color).anillo(cx, cy, r - 2, 1, oscuro);
  const rayas = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (const [dx, dy] of rayas) l.punto(Math.round(cx + dx! * (r - 0.5)), Math.round(cy + dy! * (r - 0.5)), 'W');
  return l;
}

// Un sprite de `tamano` hecho con `pintar`, con volumen y contorno.
export function sprite(tamano: number, pintar: (l: Lienzo) => void, { volumen = true, contorno = true, alto = tamano } = {}): Dibujo {
  const l = lienzo(tamano, alto);
  pintar(l);
  if (volumen) l.volumen();
  if (contorno) l.contorno();
  return l.dibujo();
}

// Los iconos de las baratijas, de 16 × 16, dibujados con formas simples
// (ver lienzo.ts) a los que se les da volumen y contorno. Las de un mismo
// set llevan además el emblema del set en la esquina (ver EMBLEMAS).

import type { Dibujo } from './paleta.ts';
import { dibujo } from './paleta.ts';
import { carta, dado, ficha, moneda, palo, sprite } from './formas.ts';
import type { Lienzo } from './lienzo.ts';

const s = (pintar: (l: Lienzo) => void, opciones?: { volumen?: boolean; contorno?: boolean }) => sprite(16, pintar, opciones);

// Un corazón grande (8 a 13 de ancho) para varias baratijas.
function corazon(l: Lienzo, x: number, y: number, c: string): Lienzo {
  return l.circulo(x + 3, y + 3, 3, c).circulo(x + 9, y + 3, 3, c).poligono([[x, y + 4], [x + 13, y + 4], [x + 6.5, y + 11]], c);
}

function bolsa(l: Lienzo, c: string, oscuro: string): Lienzo {
  l.elipse(7.5, 10, 6, 4.6, c).poligono([[5, 2], [10, 2], [9, 6], [6, 6]], c).rect(5, 5, 6, 1, oscuro);
  return l;
}

function flecha(l: Lienzo, x0: number, y0: number, x1: number, y1: number, c: string): Lienzo {
  l.linea(x0, y0, x1, y1, c);
  const dx = Math.sign(x1 - x0);
  const dy = Math.sign(y1 - y0);
  return l.punto(x1 - dx, y1, c).punto(x1, y1 - dy, c).punto(x1 - dx * 2, y1, c).punto(x1, y1 - dy * 2, c);
}

function rayo(l: Lienzo, x: number, y: number, c: string): Lienzo {
  return l.poligono([[x + 3, y], [x + 6, y], [x + 4, y + 3], [x + 6, y + 3], [x + 1, y + 9], [x + 2.5, y + 5], [x + 0.5, y + 5]], c);
}

function reloj(l: Lienzo, cx: number, cy: number, r: number): Lienzo {
  l.circulo(cx, cy, r, 'w').anillo(cx, cy, r, 1, 'e');
  return l.linea(Math.round(cx), Math.round(cy), Math.round(cx), Math.round(cy - r + 2), 'n').linea(Math.round(cx), Math.round(cy), Math.round(cx + r - 3), Math.round(cy), 'n');
}

function relojDeArena(l: Lienzo, x: number, arena: 'arriba' | 'abajo' | 'ambas'): Lienzo {
  l.rect(x, 1, 10, 2, 'u').rect(x, 13, 10, 2, 'u');
  l.poligono([[x + 1, 3], [x + 9, 3], [x + 5.5, 8], [x + 4.5, 8]], 'c').poligono([[x + 4.5, 8], [x + 5.5, 8], [x + 9, 13], [x + 1, 13]], 'c');
  if (arena !== 'abajo') l.poligono([[x + 2.5, 4], [x + 7.5, 4], [x + 5, 7.5]], 'g');
  if (arena !== 'arriba') l.poligono([[x + 5, 9.5], [x + 8, 13], [x + 2, 13]], 'g');
  return l.punto(x + 5, 8, 'g');
}

function persona(l: Lienzo, x: number, cuerpo: string, pelo = 'U'): Lienzo {
  l.circulo(x + 3, 4.5, 2.6, 's').rect(x + 1, 2, 5, 1, pelo).punto(x + 1, 3, pelo).punto(x + 5, 3, pelo);
  l.poligono([[x, 14], [x + 1, 8.5], [x + 6, 8.5], [x + 7, 14]], cuerpo);
  return l.puntos('n', x + 2, 4, x + 4, 4);
}

function lupa(l: Lienzo): Lienzo {
  l.linea(9, 9, 13, 13, 'u').linea(10, 9, 14, 13, 'u');
  return l.circulo(6, 6, 4.5, 'e').circulo(6, 6, 3.3, 'c').punto(5, 4, 'W');
}

function corona(l: Lienzo, x: number, y: number, c: string): Lienzo {
  l.poligono([[x, y + 2], [x + 3, y + 5], [x + 5.5, y], [x + 8, y + 5], [x + 11, y + 2], [x + 10, y + 8], [x + 1, y + 8]], c);
  return l.rect(x + 1, y + 8, 10, 2, c === 'g' ? 'G' : c).puntos('r', x + 5, y + 6).puntos('b', x + 2, y + 9, x + 8, y + 9);
}

function grafico(l: Lienzo, sube: boolean): Lienzo {
  l.rect(1, 2, 14, 12, 'w').rect(2, 12, 12, 1, 'e').rect(2, 3, 1, 10, 'e');
  const c = sube ? 'v' : 'r';
  const puntos = sube ? [3, 11, 6, 8, 8, 9, 12, 4] : [3, 4, 6, 7, 8, 6, 12, 11];
  for (let i = 0; i + 3 < puntos.length; i += 2) l.linea(puntos[i]!, puntos[i + 1]!, puntos[i + 2]!, puntos[i + 3]!, c);
  return l;
}

export const ICONOS_BARATIJAS: Readonly<Record<string, Dibujo>> = {
  // ── Caridad ──
  materialista: s((l) => bolsa(l, 'g', 'G').texto('$', 6, 7, 'G')),
  altruista: s((l) => corazon(l, 1, 2, 'i').rect(7, 2, 2, 11, 'g').rect(1, 6, 14, 2, 'g')),
  'robin-hood': s((l) => {
    l.anillo(3, 8, 7, 1, 'u').linea(3, 1, 3, 15, 'e');
    flecha(l, 1, 13, 13, 3, 'l');
    l.puntos('r', 1, 14, 2, 14, 1, 13);
  }),
  // ── Jardín ──
  'flower-power': s((l) => {
    for (const [x, y] of [[7.5, 3.5], [3.5, 7.5], [11.5, 7.5], [7.5, 11.5], [4.5, 4.5], [10.5, 4.5], [4.5, 10.5], [10.5, 10.5]] as const) l.circulo(x, y, 2.4, 'i');
    l.circulo(7.5, 7.5, 2.2, 'g');
  }),
  'grass-mower': s((l) => {
    l.linea(12, 1, 8, 7, 'e').rect(1, 7, 11, 4, 'r').rect(2, 8, 2, 1, 'm');
    l.circulo(3.5, 11.5, 2, 'n').circulo(10.5, 11.5, 2, 'n').puntos('e', 3, 11, 10, 11);
    l.puntos('v', 0, 15, 2, 14, 5, 15, 7, 14, 8, 15, 13, 14, 15, 15);
  }),
  jardinero: s((l) => {
    l.rect(4, 10, 8, 5, 'o').rect(3, 9, 10, 2, 'R');
    l.linea(8, 9, 8, 4, 'V').elipse(5, 4, 2.5, 1.5, 'v').elipse(11, 3, 2.5, 1.5, 'v');
  }),
  // ── Sin set, comunes ──
  subsidio: s((l) => {
    l.poligono([[1, 5], [8, 1], [15, 5]], 'w').rect(1, 5, 14, 1, 'l');
    for (const x of [2, 6, 9, 12]) l.rect(x, 6, 2, 6, 'w');
    l.rect(1, 12, 14, 2, 'l').punto(8, 3, 'g');
  }),
  'no-gracias': s((l) => {
    l.circulo(7.5, 7.5, 7, 'r').circulo(7.5, 7.5, 5, 'W');
    l.linea(3, 4, 11, 12, 'r').linea(4, 3, 12, 11, 'r');
  }, { volumen: false }),
  'mano-de-hierro': s((l) => {
    l.rect(4, 6, 8, 7, 'l').rect(4, 2, 2, 5, 'l').rect(6, 1, 2, 6, 'l').rect(8, 2, 2, 5, 'l').rect(10, 3, 2, 4, 'l').rect(2, 7, 2, 4, 'l');
    l.rect(5, 13, 6, 2, 'e').puntos('e', 6, 4, 8, 4, 10, 5, 6, 9, 9, 10);
  }),
  'calcetin-de-la-suerte': s((l) => {
    l.rect(5, 1, 6, 9, 'r').poligono([[5, 9], [11, 9], [11, 12], [8, 15], [2, 15], [2, 12]], 'r');
    l.rect(5, 1, 6, 2, 'W').rect(5, 5, 6, 1, 'W').texto('7', 7, 9, 'W');
  }),
  parejita: s((l) => {
    corazon(l, 0, 1, 'r');
    corazon(l, 4, 4, 'i');
  }),
  'a-la-tercera-va-la-vencida': s((l) => {
    l.poligono([[4, 1], [11, 1], [9, 6], [6, 6]], 'b').poligono([[5, 1], [7, 1], [8, 5]], 'r');
    l.circulo(7.5, 10, 4.5, 'o').circulo(7.5, 10, 3, 'u').texto('3', 6, 8, 'y');
  }),
  'escalera-de-mano': s((l) => {
    l.linea(3, 1, 3, 14, 'u').linea(4, 1, 4, 14, 'u').linea(11, 1, 11, 14, 'u').linea(12, 1, 12, 14, 'u');
    for (const y of [3, 6, 9, 12]) l.rect(5, y, 6, 1, 'o');
  }),
  'brocha-gorda': s((l) => {
    l.poligono([[3, 5], [13, 5], [12, 14], [4, 14]], 'e').rect(2, 4, 12, 2, 'l');
    l.anillo(8, 5, 5, 1, 'E').rect(4, 6, 8, 3, 'b').punto(6, 10, 'b').punto(10, 9, 'b');
  }),
  'casa-llena': s((l) => {
    l.poligono([[0.5, 7.5], [8, 1], [15.5, 7.5]], 'r').rect(2, 7, 12, 7, 'w');
    l.rect(7, 9, 3, 5, 'u').rect(3, 9, 3, 2, 'c').rect(11, 9, 2, 2, 'c');
  }),
  solitario: s((l) => {
    carta(l, 4, 1, 9, 13, 'A', 'picas');
  }),
  calderilla: s((l) => {
    moneda(l, 4.5, 10.5, 3.5);
    moneda(l, 11, 5, 3.5);
    l.texto('2', 10, 3, 'G').texto('2', 3, 9, 'G');
  }),
  propina: s((l) => {
    l.rect(1, 9, 14, 5, 'v').rect(2, 10, 12, 3, 'V').circulo(8, 11.5, 1.5, 'v');
    moneda(l, 5, 5, 3.5);
    moneda(l, 11, 4, 3);
  }),
  'descarte-rapido': s((l) => {
    carta(l, 7, 2, 8, 11, '5', 'treboles');
    l.rect(1, 4, 5, 1, 'c').rect(0, 7, 6, 1, 'c').rect(2, 10, 4, 1, 'c');
  }),
  'cartas-marcadas': s((l) => {
    carta(l, 2, 1, 10, 14);
    l.elipse(7, 8, 4.5, 3, 'W').circulo(7, 8, 2, 'b').punto(7, 8, 'n').punto(6, 7, 'W');
    l.linea(11, 2, 14, 5, 'r');
  }),
  cupon: s((l) => {
    l.rect(1, 4, 14, 8, 'o').rect(5, 4, 1, 8, 'y').puntos('.', 0, 7, 0, 8, 15, 7, 15, 8);
    l.texto('%', 9, 6, 'R');
  }),
  'mapa-del-tesoro': s((l) => {
    l.poligono([[1, 3], [6, 1], [10, 3], [15, 1], [15, 13], [10, 15], [6, 13], [1, 15]], 'y');
    l.linea(3, 12, 6, 9, 'G').linea(6, 9, 8, 10, 'G').linea(10, 5, 13, 8, 'r').linea(13, 5, 10, 8, 'r');
  }),
  'cobro-de-piso': s((l) => {
    for (let y = 2; y < 14; y += 3) {
      const corrido = (y / 3) % 2 === 0 ? 0 : 3;
      for (let x = -3 + corrido; x < 16; x += 6) l.rect(x, y, 5, 2, 'o');
    }
  }),
  'trebol-de-cuatro-hojas': dibujo(`
    ................
    ...kkk..kkk.....
    ..kvvvkkvvvk....
    .kvyvvVkvyvvk...
    .kvvvvVkvvvvk...
    .kvvvVkkVvvvk...
    ..kkkkVVkkkk....
    .kvvvVkkVvvvk...
    .kvyvvVkvyvvk...
    .kvvvvVkvvvvk...
    ..kVVVkkVVVkkk..
    ...kkk..kkkVVk..
    ...........kVVk.
    ............kVk.
    .............k..
    ................`),
  'par-perfecto': s((l) => {
    carta(l, 1, 2, 8, 12, '9', 'corazones');
    carta(l, 7, 1, 8, 12, '9', 'picas');
  }),
  'ciega-pequena': s((l) => ficha(l, 7.5, 7.5, 5, 'b', 'B')),
  paciencia: s((l) => {
    l.elipse(8, 8.5, 5.5, 4, 'V').elipse(8, 8, 4, 3, 'v').puntos('V', 6, 7, 9, 7, 8, 9);
    l.circulo(13, 9, 2, 's').punto(14, 8, 'n').rect(3, 12, 2, 2, 's').rect(10, 12, 2, 2, 's');
  }),
  'lienzo-en-blanco': s((l) => {
    l.linea(2, 15, 6, 5, 'u').linea(13, 15, 9, 5, 'u');
    l.rect(3, 1, 10, 10, 'W').rect(12, 2, 1, 9, 'l');
  }),
  // ── Sin set, infrecuentes ──
  broker: s((l) => grafico(l, true)),
  callo: s((l) => {
    l.rect(4, 6, 8, 7, 's').rect(4, 2, 2, 5, 's').rect(6, 1, 2, 6, 's').rect(8, 2, 2, 5, 's').rect(10, 3, 2, 4, 's').rect(2, 7, 2, 4, 's');
    l.circulo(8, 9, 1.6, 'y').rect(5, 13, 6, 2, 'S');
  }),
  coleccionista: s((l) => {
    l.circulo(4, 3.5, 2, 'u').circulo(11, 3.5, 2, 'u').circulo(7.5, 7, 4.5, 'u').elipse(7.5, 12.5, 4.5, 3, 'u');
    l.puntos('n', 6, 6, 9, 6).elipse(7.5, 8.5, 1.5, 1, 'o').punto(7, 8, 'n');
  }),
  veterano: s((l) => {
    l.poligono([[4, 0], [11, 0], [9, 6], [6, 6]], 'b').rect(7, 0, 1, 6, 'r');
    l.poligono([[7.5, 5], [9, 8.5], [13, 9], [10, 11.5], [11, 15], [7.5, 13], [4, 15], [5, 11.5], [2, 9], [6, 8.5]], 'g');
  }),
  minimalista: s((l) => {
    l.linea(3, 14, 12, 2, 'e');
    l.poligono([[12, 1], [14, 2], [10, 10], [5, 12], [7, 7]], 'w').linea(12, 2, 5, 12, 'l');
  }),
  'as-bajo-la-manga': s((l) => {
    l.poligono([[0, 6], [10, 6], [10, 15], [0, 15]], 'P').rect(9, 5, 2, 10, 'W');
    carta(l, 8, 1, 7, 10, 'A', 'picas');
  }),
  faroleo: s((l) => {
    l.poligono([[1, 3], [14, 3], [13, 10], [7.5, 14], [2, 10]], 'W');
    l.elipse(5, 7, 2, 1.3, 'n').elipse(10, 7, 2, 1.3, 'n').linea(5, 11, 10, 11, 'n').puntos('n', 4, 10, 11, 10);
  }),
  cambiazo: s((l) => {
    carta(l, 1, 1, 7, 10, 'K', 'corazones');
    carta(l, 8, 5, 7, 10, '2', 'picas');
    l.puntos('v', 10, 2, 11, 2, 12, 2, 12, 3, 3, 12, 3, 13, 4, 13, 5, 13);
  }),
  'cuenta-atras': s((l) => {
    reloj(l, 7.5, 8.5, 6);
    l.rect(6, 0, 3, 2, 'e').texto('3', 9, 9, 'r');
  }),
  reciclaje: s((l) => {
    l.anillo(7.5, 7.5, 6, 2, 'v').rect(0, 6, 4, 3, '.').rect(12, 6, 4, 3, '.');
    l.poligono([[0, 6], [5, 6], [2.5, 9.5]], 'v').poligono([[11, 9], [16, 9], [13.5, 5.5]], 'v');
  }),
  eco: s((l) => {
    l.poligono([[1, 6], [4, 6], [8, 2], [8, 14], [4, 10], [1, 10]], 'e');
    l.anillo(8, 8, 4, 1, 'c').anillo(8, 8, 7, 1, 'b').rect(0, 0, 9, 16, '.');
    l.poligono([[1, 6], [4, 6], [8, 2], [8, 14], [4, 10], [1, 10]], 'e');
  }),
  'doble-filo': s((l) => {
    l.poligono([[7, 0], [9, 0], [9, 10], [7, 10]], 'l').punto(8, 1, 'W');
    l.rect(4, 10, 8, 2, 'G').rect(7, 12, 2, 3, 'u').rect(6, 15, 4, 1, 'G');
  }),
  monocromo: s((l) => {
    l.circulo(7.5, 7.5, 6.5, 'n').circulo(7.5, 7.5, 6.5, 'n');
    l.poligono([[7.5, 0], [16, 0], [16, 16], [7.5, 16]], '.').circulo(7.5, 7.5, 6.5, 'n');
    l.rect(8, 1, 7, 14, '.').elipse(7.5, 7.5, 6.5, 6.5, 'n');
    for (let y = 0; y < 16; y++) for (let x = 8; x < 16; x++) if (l.get(x, y) === 'n') l.punto(x, y, 'w');
  }, { volumen: false }),
  'escalera-corta': s((l) => {
    l.rect(1, 6, 14, 5, 'g').rect(1, 6, 14, 1, 'y');
    for (let x = 2; x < 15; x += 2) l.rect(x, 7, 1, x % 4 === 2 ? 3 : 2, 'G');
  }),
  puente: s((l) => {
    l.anillo(7.5, 13, 7, 2, 'u').rect(0, 13, 16, 3, '.');
    l.rect(0, 7, 16, 2, 'u').rect(1, 9, 2, 6, 'U').rect(13, 9, 2, 6, 'U');
    l.rect(0, 13, 16, 3, 'b');
  }),
  arqueologo: s((l) => {
    l.linea(3, 12, 12, 3, 'w').linea(4, 12, 13, 3, 'w');
    l.circulo(2.5, 11.5, 1.5, 'w').circulo(4.5, 13.5, 1.5, 'w').circulo(11.5, 2.5, 1.5, 'w').circulo(13.5, 4.5, 1.5, 'w');
  }),
  gemelos: s((l) => {
    persona(l, 1, 'b');
    persona(l, 8, 'b');
  }),
  inversion: s((l) => {
    grafico(l, true);
    moneda(l, 11, 11, 3.5);
  }),
  'vista-de-lince': s((l) => {
    l.poligono([[1, 2], [5, 5], [11, 5], [15, 2], [14, 11], [8, 15], [2, 11]], 'o');
    l.elipse(5, 8, 1.6, 1.2, 'v').elipse(11, 8, 1.6, 1.2, 'v').puntos('n', 5, 8, 11, 8).poligono([[7, 11], [9, 11], [8, 12.5]], 'i');
    l.puntos('U', 7, 6, 8, 6, 9, 6, 3, 10, 13, 10);
  }),
  'descuento-de-veterano': s((l) => {
    l.poligono([[1, 8], [7, 2], [14, 2], [14, 9], [8, 15]], 'y').circulo(11, 5, 1.2, 'k');
    l.texto('%', 6, 7, 'r');
  }),
  seguro: s((l) => {
    l.elipse(7.5, 7, 7, 6, 'b').rect(0, 7, 16, 9, '.').linea(7, 1, 7, 13, 'e');
    l.puntos('B', 3, 6, 5, 6, 9, 6, 11, 6).rect(5, 13, 3, 1, 'e').punto(5, 12, 'e');
  }),
  precision: s((l) => {
    l.poligono([[1, 1], [1, 15], [15, 15]], 'g').poligono([[4, 7], [4, 12], [9, 12]], '.');
    for (const y of [3, 6, 9, 12]) l.rect(1, y, 2, 1, 'G');
  }),
  // ── Sin set, raras ──
  diversidad: s((l) => {
    palo(l, 'picas', 1, 1, 5);
    palo(l, 'corazones', 9, 1, 5);
    palo(l, 'treboles', 1, 9, 5);
    palo(l, 'diamantes', 9, 9, 5);
    l.rect(7, 2, 1, 12, 'g').rect(2, 7, 12, 1, 'g');
  }),
  'bola-de-nieve': s((l) => {
    l.circulo(7.5, 9, 6, 'W').circulo(5, 7, 1.2, 'c').circulo(10, 11, 1, 'c');
    l.puntos('c', 2, 1, 13, 2, 8, 0, 14, 5);
  }),
  'obra-maestra': s((l) => {
    l.rect(0, 1, 16, 14, 'G').rect(2, 3, 12, 10, 'c').rect(2, 9, 12, 4, 'v');
    l.circulo(10, 6, 1.5, 'y').poligono([[2, 10], [6, 5], [10, 10]], 'V');
  }),
  especialista: s((l) => {
    l.circulo(7.5, 7.5, 7, 'W').circulo(7.5, 7.5, 5.5, 'r').circulo(7.5, 7.5, 4, 'W').circulo(7.5, 7.5, 2.5, 'r');
    l.linea(15, 1, 8, 8, 'u').puntos('r', 13, 1, 14, 1, 14, 2, 15, 2, 15, 3);
  }, { volumen: false }),
  'fichas-al-fuego': s((l) => {
    l.poligono([[3, 15], [2, 8], [5, 10], [6, 3], [9, 8], [11, 1], [14, 9], [13, 15]], 'o');
    l.poligono([[5, 15], [6, 11], [8, 12], [9, 8], [11, 15]], 'g');
    ficha(l, 8, 13, 3, 'r', 'R');
  }),
  vampiro: s((l) => {
    l.poligono([[0, 15], [3, 7], [7.5, 10], [12, 7], [15, 15]], 'n').poligono([[3, 7], [5, 13], [7.5, 10]], 'R').poligono([[12, 7], [10, 13], [7.5, 10]], 'R');
    l.circulo(7.5, 6, 4.5, 'l').rect(3, 1, 9, 2, 'n').punto(7, 3, 'n').puntos('r', 5, 6, 10, 6).puntos('W', 6, 9, 9, 9);
  }),
  espiral: s((l) => {
    l.anillo(7.5, 7.5, 7, 1, 'p').anillo(7.5, 7.5, 4.5, 1, 'p').anillo(7.5, 7.5, 2, 1, 'p');
    l.rect(8, 0, 1, 8, '.').rect(8, 2, 1, 3, 'p').rect(8, 5, 1, 1, 'p');
  }, { volumen: false }),
  'duo-dinamico': s((l) => {
    persona(l, 1, 'r');
    persona(l, 8, 'b');
    l.rect(0, 0, 16, 2, '.').poligono([[1, 2], [7, 2], [4, 0]], 'k').poligono([[8, 2], [14, 2], [11, 0]], 'k');
  }),
  'tormenta-perfecta': s((l) => {
    l.circulo(5, 5, 3.5, 'e').circulo(10, 4, 4, 'e').rect(2, 5, 12, 3, 'e');
    rayo(l, 6, 7, 'g');
    l.puntos('c', 2, 10, 3, 12, 12, 10, 13, 12);
  }),
  clonador: s((l) => {
    for (let y = 0; y < 16; y++) {
      const fase = Math.sin(y / 2.4) * 3.5;
      l.punto(Math.round(7.5 + fase), y, 'b').punto(Math.round(7.5 - fase), y, 'r');
      if (y % 3 === 1) l.linea(Math.round(7.5 + fase), y, Math.round(7.5 - fase), y, 'l');
    }
  }, { volumen: false }),
  iman: s((l) => {
    l.anillo(7.5, 7, 6, 4, 'r').rect(0, 7, 16, 9, '.');
    l.rect(2, 7, 4, 5, 'r').rect(10, 7, 4, 5, 'r').rect(2, 12, 4, 3, 'l').rect(10, 12, 4, 3, 'l');
  }),
  recompensa: s((l) => {
    l.poligono([[3, 1], [13, 1], [12, 7], [8, 10], [4, 7]], 'g').anillo(2.5, 4, 2, 1, 'g').anillo(13.5, 4, 2, 1, 'g');
    l.rect(7, 10, 2, 3, 'G').rect(4, 13, 8, 2, 'u');
  }),
  telescopio: s((l) => {
    l.poligono([[1, 9], [12, 2], [14, 5], [3, 12]], 'B').poligono([[10, 3], [12, 2], [14, 5], [12, 6]], 'g');
    l.linea(7, 8, 4, 15, 'u').linea(7, 8, 11, 15, 'u');
  }),
  comodin: s((l) => {
    l.poligono([[2, 6], [4, 0], [7.5, 5], [11, 0], [13, 6]], 'p').poligono([[7, 5], [8, 5], [9, 1], [6, 1]], 'g');
    l.circulo(7.5, 9.5, 4.5, 'W').puntos('n', 6, 8, 9, 8).linea(5, 11, 10, 11, 'r').puntos('r', 4, 10, 11, 10);
    l.puntos('g', 4, 0, 11, 0);
  }),
  'contrato-con-el-diablo': s((l) => {
    l.rect(3, 2, 10, 13, 'y').rect(12, 3, 1, 12, 'g');
    for (const y of [4, 6, 8]) l.rect(4, y, 7, 1, 'G');
    l.linea(5, 12, 10, 11, 'r').poligono([[10, 0], [14, 0], [12, 3]], 'r');
  }),
  bancarrota: s((l) => grafico(l, false)),
  'segunda-oportunidad': s((l) => {
    l.anillo(7.5, 7.5, 6, 2, 't').rect(8, 0, 8, 7, '.');
    l.poligono([[9, 0], [9, 7], [14, 3.5]], 't').texto('2', 6, 6, 'y');
  }),
  'lavado-de-dinero': s((l) => {
    l.rect(2, 6, 12, 8, 'i').rect(3, 7, 10, 2, 'W');
    l.circulo(4, 4, 2, 'c').circulo(9, 3, 2.5, 'c').circulo(13, 4, 1.5, 'c').punto(8, 2, 'W');
  }),
  // ── Apostador empedernido ──
  'all-in': s((l) => {
    for (const [y, c, o] of [[12, 'r', 'R'], [9, 'b', 'B'], [6, 'v', 'V'], [3, 'n', 'E']] as const) {
      l.elipse(7.5, y + 1, 6, 1.6, o).elipse(7.5, y, 6, 1.6, c).puntos('W', 3, y, 7, y + 1, 11, y);
    }
  }, { volumen: false }),
  tasador: s((l) => lupa(l)),
  racha: s((l) => {
    l.poligono([[3, 15], [2, 8], [5, 10], [6, 3], [9, 8], [11, 1], [14, 9], [13, 15]], 'r');
    l.poligono([[5, 15], [5, 11], [7, 12], [8, 7], [11, 15]], 'o').poligono([[7, 15], [8, 11], [9, 15]], 'y');
  }),
  'ruleta-de-la-suerte': s((l) => {
    l.circulo(7.5, 7.5, 7, 'u').circulo(7.5, 7.5, 5.5, 'r');
    l.poligono([[7.5, 7.5], [7.5, 2], [11, 3.5]], 'n').poligono([[7.5, 7.5], [13, 7.5], [11.5, 11.5]], 'n').poligono([[7.5, 7.5], [7.5, 13], [4, 11.5]], 'n').poligono([[7.5, 7.5], [2, 7.5], [3.5, 4]], 'n');
    l.circulo(7.5, 7.5, 1.5, 'g').punto(10, 4, 'W');
  }, { volumen: false }),
  'ficha-de-la-suerte': s((l) => {
    ficha(l, 7.5, 7.5, 7, 'v', 'V');
    trebolChico(l);
  }),
  // ── Artista ──
  'claire-obscure': s((l) => {
    l.elipse(7.5, 8, 7, 6, 'y').circulo(10, 11, 1.6, '.');
    l.circulo(4, 6, 1.3, 'r').circulo(7, 4.5, 1.3, 'b').circulo(11, 5, 1.3, 'v').circulo(4, 10, 1.3, 'p');
    l.linea(15, 0, 9, 9, 'u').puntos('n', 9, 9, 9, 10, 10, 9);
  }),
  paleta: s((l) => {
    l.linea(2, 13, 9, 2, 'r').linea(3, 13, 10, 2, 'r').linea(3, 14, 10, 3, 'r');
    l.linea(6, 14, 13, 3, 'b').linea(7, 14, 14, 3, 'b').linea(7, 15, 14, 4, 'b');
    l.puntos('w', 9, 1, 10, 1, 13, 2, 14, 2).puntos('n', 9, 0, 14, 1);
  }),
  // ── TOC TOC TOC ──
  estetico: s((l) => {
    l.poligono([[0, 2], [7, 6], [7, 9], [0, 13]], 'i').poligono([[15, 2], [8, 6], [8, 9], [15, 13]], 'i');
    l.rect(6, 5, 4, 5, 'm').linea(6, 10, 4, 15, 'i').linea(9, 10, 11, 15, 'i');
  }),
  simetrico: s((l) => {
    l.elipse(7.5, 6.5, 5.5, 6, 'G').elipse(7.5, 6.5, 4.5, 5, 'c').linea(5, 3, 7, 1, 'W');
    l.rect(7, 12, 2, 3, 'G').rect(4, 14, 8, 2, 'G');
  }),
  ordenado: s((l) => {
    l.rect(1, 3, 14, 11, 'o').rect(2, 1, 5, 3, 'o').rect(1, 6, 14, 1, 'G');
    l.rect(4, 2, 1, 1, 'y').rect(9, 3, 4, 2, 'W').rect(3, 4, 3, 1, 'W');
  }),
  // ── Realeza ──
  'el-rey': s((l) => corona(l, 2, 3, 'g')),
  'la-reina': s((l) => {
    l.poligono([[3, 7], [5, 3], [7.5, 6], [10, 3], [12, 7]], 'g').circulo(7.5, 2, 1.2, 'i');
    l.circulo(7.5, 10, 4, 's').rect(3, 7, 9, 2, 'y').rect(3, 7, 2, 7, 'y').rect(10, 7, 2, 7, 'y').puntos('n', 6, 10, 9, 10).punto(7, 12, 'r').punto(8, 12, 'r');
  }),
  'la-jota': s((l) => {
    l.rect(3, 3, 10, 4, 'r').rect(2, 5, 12, 2, 'r').circulo(13, 3, 1.5, 'W');
    l.circulo(7.5, 10, 4, 's').rect(3, 7, 10, 1, 'U').puntos('n', 6, 10, 9, 10).linea(6, 12, 9, 12, 'S');
  }),
  // ── Bajos fondos ──
  soborno: s((l) => {
    l.rect(0, 6, 4, 6, 'b').rect(12, 6, 4, 6, 'n');
    l.rect(3, 7, 10, 4, 's').rect(5, 6, 6, 1, 's').puntos('S', 6, 9, 8, 9, 10, 9);
    l.rect(6, 2, 4, 4, 'v').punto(7, 3, 'V');
  }),
  // ── Supersticioso ──
  'gato-negro': s((l) => {
    l.poligono([[2, 1], [5, 5], [10, 5], [13, 1], [14, 10], [7.5, 15], [1, 10]], 'n');
    l.elipse(5, 8, 1.5, 1.2, 'g').elipse(10, 8, 1.5, 1.2, 'g').puntos('k', 5, 8, 10, 8).punto(7, 11, 'i').punto(8, 11, 'i');
  }, { volumen: false }),
  'martes-13': s((l) => {
    l.rect(1, 2, 14, 13, 'W').rect(1, 2, 14, 4, 'r').rect(4, 0, 1, 4, 'e').rect(11, 0, 1, 4, 'e');
    l.texto('13', 4, 8, 'n');
  }),
  'espejo-roto': s((l) => {
    l.elipse(7.5, 7.5, 6, 7, 'G').elipse(7.5, 7.5, 4.5, 5.5, 'c');
    l.linea(5, 2, 8, 7, 'W').linea(8, 7, 6, 13, 'W').linea(8, 7, 11, 9, 'W');
  }),
  // ── Matemático ──
  'numeros-primos': s((l) => {
    l.rect(1, 1, 14, 14, 'b').texto('7', 2, 2, 'W').texto('3', 9, 2, 'W').texto('5', 2, 9, 'W').texto('2', 9, 9, 'W');
  }),
  pi: s((l) => {
    l.elipse(7.5, 9, 7, 5, 'o').elipse(7.5, 8, 6, 3.5, 'y');
    l.rect(4, 6, 8, 1, 'R').rect(5, 6, 1, 4, 'R').rect(9, 6, 1, 4, 'R').punto(10, 9, 'R');
  }),
  fibonacci: dibujo(`
    ................
    .....kkkkkk.....
    ...kkiiiiiikk...
    ..kiimmmmmmiik..
    .kiimiiiiiimiik.
    .kimiimmmmimiik.
    kiimimiiimimiik.
    kimimimkimimiik.
    kimimiimmimiimk.
    kimiimmiimiimk..
    kiimiiiimmiimk..
    .kiimmmmiiimk...
    .kiiiiiiimmk....
    ..kkiiiiikk.....
    ....kkkkk.......
    ................`),
  // ── Torneo ──
  'ciega-grande': s((l) => ficha(l, 7.5, 7.5, 7, 'B', 'n').texto('2', 6, 6, 'W')),
  'boton-del-crupier': s((l) => {
    l.circulo(7.5, 7.5, 7, 'W').anillo(7.5, 7.5, 6, 1, 'l');
    l.texto('D', 6, 6, 'n');
  }, { volumen: false }),
  // ── Tiempo ──
  prisa: s((l) => {
    l.elipse(7, 10, 5, 4, 'W').circulo(12, 7, 2.5, 'W').elipse(12, 2.5, 1, 3, 'W').elipse(14, 3, 1, 2.5, 'W');
    l.punto(13, 7, 'n').punto(14, 8, 'i').circulo(2, 10, 1.3, 'W').rect(5, 13, 3, 2, 'W').rect(10, 13, 3, 2, 'W');
  }),
  'reloj-de-arena': s((l) => relojDeArena(l, 3, 'ambas')),
  // ── Legendarias ──
  'tarjeta-de-credito': s((l) => {
    l.rect(0, 3, 16, 10, 'B').rect(0, 5, 16, 2, 'n').rect(2, 8, 3, 2, 'g').rect(7, 10, 6, 1, 'l');
  }),
  'crypto-monedas': s((l) => {
    moneda(l, 7.5, 7.5, 7);
    l.texto('$', 6, 5, 'o').rect(0, 0, 16, 1, '.');
  }),
  'de-zero-a-heroe': s((l) => {
    l.poligono([[2, 6], [13, 6], [15, 15], [0, 15]], 'r');
    l.circulo(7.5, 4, 3.3, 's').rect(4, 2, 7, 2, 'n').rect(3, 8, 10, 6, 'b').poligono([[5, 9], [10, 9], [7.5, 13]], 'g');
  }),
  'rey-midas': s((l) => {
    l.rect(4, 6, 8, 7, 'g').rect(4, 2, 2, 5, 'g').rect(6, 1, 2, 6, 'g').rect(8, 2, 2, 5, 'g').rect(10, 3, 2, 4, 'g').rect(2, 7, 2, 4, 'g');
    l.rect(5, 13, 6, 2, 'G').puntos('y', 6, 3, 9, 8);
  }),
  'la-banca-siempre-gana': s((l) => {
    l.poligono([[0.5, 5], [8, 1], [15.5, 5]], 'g').rect(1, 5, 14, 1, 'G');
    for (const x of [2, 6, 9, 12]) l.rect(x, 6, 2, 6, 'g');
    l.rect(1, 12, 14, 3, 'G').texto('$', 6, 7, 'G');
  }),
  'mano-de-dios': s((l) => {
    l.anillo(7.5, 3, 5, 1, 'g').rect(0, 3, 16, 13, '.');
    l.rect(4, 7, 8, 6, 's').rect(4, 3, 2, 5, 's').rect(6, 2, 2, 6, 's').rect(8, 3, 2, 5, 's').rect(10, 4, 2, 4, 's').rect(2, 8, 2, 3, 's');
    l.rect(5, 13, 6, 2, 'W').puntos('S', 6, 5, 8, 5, 10, 6);
  }),
  'gemelo-malvado': s((l) => {
    l.circulo(7.5, 8.5, 6, 'p').poligono([[2, 4], [1, 0], [5, 3]], 'p').poligono([[13, 4], [14, 0], [10, 3]], 'p');
    l.linea(4, 6, 6, 7, 'n').linea(11, 6, 9, 7, 'n').puntos('g', 5, 8, 10, 8).linea(5, 11, 10, 11, 'n').puntos('W', 6, 12, 9, 12);
  }),
  'tiempo-extra': s((l) => {
    relojDeArena(l, 1, 'arriba');
    l.rect(11, 9, 1, 5, 'v').rect(9, 11, 5, 1, 'v');
  }),
  fenix: s((l) => {
    l.poligono([[7.5, 4], [15, 1], [12, 8], [7.5, 9], [3, 8], [0, 1]], 'o').poligono([[5, 9], [10, 9], [7.5, 15]], 'r');
    l.circulo(7.5, 4, 2.5, 'g').punto(8, 3, 'n').poligono([[10, 4], [12, 5], [10, 5]], 'G').poligono([[3, 3], [6, 7], [2, 6]], 'y').poligono([[12, 3], [9, 7], [13, 6]], 'y');
  }),
  alquimista: s((l) => {
    l.rect(6, 1, 4, 5, 'c').rect(5, 0, 6, 1, 'l');
    l.poligono([[6, 5], [10, 5], [15, 14], [1, 14]], 'c').poligono([[4, 10], [12, 10], [14.5, 14], [1.5, 14]], 'v').puntos('W', 7, 11, 10, 12);
  }),
  'corona-del-tahur': s((l) => {
    corona(l, 2, 1, 'p');
    l.poligono([[7.5, 11], [10, 13], [7.5, 16], [5, 13]], 'c');
  }),
};

// El trébol chico de la Ficha de la suerte.
function trebolChico(l: Lienzo): Lienzo {
  return l.pegar(dibujo(`
    .ww.ww.
    .wwwww.
    ..www..
    .wwwww.
    .ww.ww.
    ...w...
    ..w....`), 4, 4, 'W');
}

// Emblemas de 6 × 6 para la esquina de abajo a la derecha, uno por set.
export const EMBLEMAS: Readonly<Record<string, Dibujo>> = {
  caridad: sprite(6, (l) => l.circulo(2.5, 2.5, 2.5, 'g').punto(2, 2, 'y'), { volumen: false }),
  jardin: sprite(6, (l) => l.elipse(2.5, 2.5, 1.6, 2.6, 'v'), { volumen: false }),
  artista: sprite(6, (l) => l.puntos('r', 1, 1, 2, 1).puntos('b', 3, 1, 4, 1).puntos('g', 1, 2, 1, 3).puntos('v', 4, 2, 4, 3).puntos('p', 2, 4, 3, 4).rect(2, 2, 2, 2, 'w'), { volumen: false }),
  'apostador-empedernido': sprite(6, (l) => dado(l, 1, 1, 4, 4), { volumen: false }),
  'toc-toc-toc': sprite(6, (l) => l.rect(1, 1, 4, 1, 't').rect(1, 3, 4, 1, 't').rect(1, 5, 4, 1, 't').rect(1, 1, 1, 5, 't'), { volumen: false, contorno: false }),
  realeza: sprite(6, (l) => l.puntos('g', 0, 1, 2, 1, 4, 1).rect(0, 2, 5, 2, 'g'), { volumen: false }),
  'bajos-fondos': sprite(6, (l) => l.rect(0, 3, 6, 1, 'E').rect(1, 1, 4, 2, 'E').rect(1, 2, 4, 1, 'r'), { volumen: false }),
  supersticioso: sprite(6, (l) => l.elipse(2.5, 2.5, 2.6, 1.6, 'W').punto(2, 2, 'p').punto(3, 2, 'p'), { volumen: false }),
  matematico: sprite(6, (l) => l.rect(2, 0, 2, 6, 'b').rect(0, 2, 6, 2, 'b'), { volumen: false }),
  torneo: sprite(6, (l) => l.circulo(2.5, 2.5, 2.5, 'b').punto(2, 2, 'W').punto(3, 3, 'W'), { volumen: false }),
  tiempo: sprite(6, (l) => l.rect(1, 0, 4, 1, 'u').rect(1, 5, 4, 1, 'u').puntos('g', 1, 1, 2, 1, 3, 1, 4, 1, 2, 2, 3, 2, 2, 3, 3, 3).puntos('c', 1, 4, 2, 4, 3, 4, 4, 4), { volumen: false }),
};

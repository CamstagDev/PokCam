// Los sprites de la interfaz: los nodos del mapa, los iconos de los
// botones y marcadores, las barajas y los retratos de los personajes.

import { carta, dado, ficha, moneda, palo, sprite } from './formas.ts';
import type { Lienzo } from './lienzo.ts';
import type { Dibujo } from './paleta.ts';

const s = (pintar: (l: Lienzo) => void, opciones?: { volumen?: boolean; contorno?: boolean }) => sprite(16, pintar, opciones);

function calavera(l: Lienzo, c = 'w'): Lienzo {
  l.circulo(7.5, 6.5, 5.5, c).rect(5, 10, 6, 4, c);
  l.rect(4, 6, 3, 3, 'k').rect(9, 6, 3, 3, 'k').punto(7, 10, 'k').punto(8, 10, 'k');
  return l.puntos('k', 6, 13, 8, 13, 10, 13);
}

function mano(l: Lienzo, c: string, sombra: string): Lienzo {
  l.rect(4, 7, 8, 6, c).rect(4, 3, 2, 5, c).rect(6, 2, 2, 6, c).rect(8, 3, 2, 5, c).rect(10, 4, 2, 4, c).rect(2, 8, 2, 3, c);
  return l.rect(5, 13, 6, 2, sombra);
}

function tijeras(l: Lienzo): Lienzo {
  l.linea(3, 2, 12, 11, 'l').linea(4, 2, 13, 11, 'l').linea(12, 2, 3, 11, 'l').linea(13, 2, 4, 11, 'l');
  return l.anillo(3, 12.5, 2.5, 1, 'r').anillo(12, 12.5, 2.5, 1, 'r');
}

function pincel(l: Lienzo): Lienzo {
  l.linea(13, 1, 6, 8, 'u').linea(14, 2, 7, 9, 'u').rect(5, 8, 3, 3, 'l');
  return l.poligono([[5, 9], [8, 11], [4, 15], [1, 15], [2, 12]], 'o');
}

// ── Nodos del mapa (van en el centro de la ficha) ──
export const SPRITES_NODOS: Readonly<Record<string, Dibujo>> = {
  inicio: s((l) => l.poligono([[1, 8], [8, 1], [15, 8]], 'r').rect(3, 8, 10, 6, 'w').rect(7, 10, 3, 4, 'u')),
  combate: s((l) => palo(l, 'picas', 4, 4, 7, 'W')),
  elite: s((l) => {
    l.poligono([[1, 4], [4, 8], [7.5, 2], [11, 8], [14, 4], [13, 13], [2, 13]], 'g');
    l.rect(2, 11, 12, 2, 'G').puntos('r', 7, 9, 8, 9).puntos('W', 1, 3, 7, 1, 8, 1, 14, 3);
  }),
  jefe: s((l) => calavera(l)),
  vendedor: s((l) => {
    l.elipse(7.5, 10, 6, 4.6, 'g').poligono([[5, 2], [10, 2], [9, 6], [6, 6]], 'g').rect(5, 5, 6, 1, 'G');
    l.texto('$', 6, 7, 'G');
  }),
  tienda: s((l) => {
    carta(l, 1, 2, 8, 11, 'A', 'corazones');
    carta(l, 7, 3, 8, 11, 'K', 'picas');
  }),
  eliminador: s((l) => tijeras(l)),
  manoNegra: s((l) => mano(l, 'E', 'n')),
  pintor: s((l) => pincel(l)),
  evento: s((l) => {
    l.rect(2, 6, 12, 8, 'p').rect(1, 4, 14, 3, 'p').rect(7, 4, 2, 10, 'g');
    l.poligono([[8, 4], [3, 0], [3, 4]], 'g').poligono([[8, 4], [13, 0], [13, 4]], 'g');
  }),
  descanso: s((l) => {
    l.rect(2, 6, 9, 8, 'W').anillo(11.5, 9.5, 2.5, 1, 'W').rect(3, 7, 7, 2, 'u');
    l.puntos('l', 4, 1, 5, 2, 4, 3, 5, 4, 7, 1, 8, 2, 7, 3, 8, 4).rect(1, 14, 12, 1, 'l');
  }),
};

// ── Interfaz ──
export const SPRITES_UI: Readonly<Record<string, Dibujo>> = {
  oro: s((l) => moneda(l, 7.5, 7.5, 7).texto('$', 6, 5, 'G')),
  riesgo: s((l) => {
    l.poligono([[7.5, 0.5], [15, 14.5], [0, 14.5]], 'g').poligono([[7.5, 3], [13, 13], [2, 13]], 'r');
    l.rect(7, 6, 2, 4, 'W').rect(7, 11, 2, 1, 'W');
  }, { volumen: false }),
  baratijas: s((l) => {
    l.poligono([[1, 6], [15, 6], [13, 15], [3, 15]], 'u').rect(0, 4, 16, 3, 'o').rect(6, 8, 4, 3, 'g');
    l.anillo(7.5, 4, 4, 1, 'U').rect(0, 4, 16, 3, 'o');
  }),
  mazo: s((l) => {
    carta(l, 1, 4, 9, 11);
    l.rect(1, 4, 9, 11, 'r').rect(2, 5, 7, 9, 'R');
    carta(l, 6, 1, 9, 12, 'A', 'picas');
  }),
  manos: s((l) => {
    l.rect(2, 1, 12, 14, 'w').rect(13, 2, 1, 13, 'l');
    for (const y of [3, 6, 9, 12]) l.rect(4, y, 1, 1, 'r').rect(6, y, 6, 1, 'e');
  }),
  fichas: s((l) => ficha(l, 7.5, 7.5, 7, 'b', 'B'), { volumen: false }),
  multi: s((l) => ficha(l, 7.5, 7.5, 7, 'r', 'R'), { volumen: false }),
  estrella: s((l) => l.poligono([[7.5, 0], [9.5, 5.5], [15, 5.5], [10.5, 9], [12.5, 15], [7.5, 11.5], [2.5, 15], [4.5, 9], [0, 5.5], [5.5, 5.5]], 'g')),
  candado: s((l) => {
    l.anillo(7.5, 6, 4.5, 2, 'l').rect(0, 6, 16, 10, '.');
    l.rect(2, 7, 12, 8, 'g').rect(7, 9, 2, 4, 'U');
  }),
  apostar: s((l) => {
    ficha(l, 6, 9, 5.5, 'r', 'R');
    moneda(l, 11, 5, 4);
  }),
  valor: s((l) => {
    l.texto('A', 1, 1, 'W').texto('2', 1, 9, 'W');
    l.rect(11, 1, 2, 11, 'W').poligono([[9, 10], [15, 10], [12, 15]], 'W');
  }, { volumen: false }),
  palo: s((l) => {
    palo(l, 'picas', 0, 1, 7, 'W');
    palo(l, 'corazones', 8, 7, 7, 'm');
  }, { volumen: false }),
  dado: s((l) => dado(l, 2, 2, 12, 5)),
};

// ── Las barajas ──
function mazoDe(l: Lienzo, cara: string, sombra: string, adorno: (l: Lienzo) => void): Lienzo {
  l.rect(4, 3, 10, 12, sombra).rect(2, 1, 10, 12, cara).marco(3, 2, 8, 10, 'g');
  adorno(l);
  return l;
}

export const SPRITES_BARAJAS: Readonly<Record<string, Dibujo>> = {
  clasica: s((l) => mazoDe(l, 'r', 'R', (m) => palo(m, 'picas', 4, 5, 5, 'g'))),
  tahur: s((l) => mazoDe(l, 'n', 'E', (m) => m.texto('7', 5, 4, 'g'))),
  fortuna: s((l) => mazoDe(l, 'v', 'V', (m) => moneda(m, 7, 7, 2.5))),
  apostador: s((l) => mazoDe(l, 'B', 'n', (m) => dado(m, 4, 4, 6, 3))),
  artista: s((l) => mazoDe(l, 'y', 'G', (m) => m.puntos('r', 5, 5, 6, 5).puntos('b', 8, 5, 8, 6).puntos('v', 5, 8, 6, 9).puntos('p', 8, 8, 9, 9))),
  bicolor: s((l) => mazoDe(l, 'w', 'l', (m) => palo(m.rect(3, 2, 4, 10, 'n'), 'corazones', 5, 5, 5, 'r'))),
  maldita: s((l) => mazoDe(l, 'P', 'n', (m) => m.rect(5, 4, 4, 4, 'w').puntos('k', 5, 5, 8, 5).rect(6, 8, 2, 2, 'w'))),
};

// ── Retratos de 20 × 20 ──
// La base: cara, ojos y torso; cada uno pone encima su sombrero y detalles.
function retrato(pintar: (l: Lienzo) => void): Dibujo {
  return sprite(20, pintar, { volumen: false });
}

function cara(l: Lienzo, saco: string, camisa: string, corbata: string): Lienzo {
  l.poligono([[1, 20], [2, 16], [18, 16], [19, 20]], saco).rect(8, 16, 4, 4, camisa).rect(9, 16, 2, 4, corbata);
  l.rect(5, 6, 10, 10, 's').rect(5, 15, 10, 1, 'S').rect(4, 9, 1, 3, 's').rect(15, 9, 1, 3, 's');
  return l.rect(7, 9, 2, 1, 'n').rect(11, 9, 2, 1, 'n').rect(9, 10, 2, 2, 'S');
}

export const SPRITES_RETRATOS: Readonly<Record<string, Dibujo>> = {
  // Raimundo, el vendedor: bombín, bigote y un diente de oro.
  raimundo: retrato((l) => {
    cara(l, 'R', 'W', 'r');
    l.rect(5, 1, 10, 5, 'P').rect(3, 5, 14, 2, 'P').rect(5, 4, 10, 1, 'g');
    l.rect(6, 12, 8, 2, 'U').rect(5, 13, 1, 1, 'U').rect(14, 13, 1, 1, 'U').punto(9, 14, 'g').punto(10, 14, 'n');
  }),
  // Gustavo, el pintor austriaco: boina, bigote fino y pañuelo.
  gustavo: retrato((l) => {
    cara(l, 'b', 'W', 'o');
    l.elipse(10, 5, 7, 2.6, 'r').punto(10, 2, 'r').rect(4, 6, 12, 1, 'R');
    l.rect(7, 12, 6, 1, 'U').puntos('U', 6, 11, 13, 11).rect(9, 14, 2, 1, 'R');
  }),
  // Edmundo manos de cinceles: pelo revuelto, cicatriz y tijeras.
  edmundo: retrato((l) => {
    cara(l, 'n', 'E', 'n');
    l.rect(4, 3, 12, 4, 'n').puntos('n', 4, 2, 7, 1, 10, 2, 13, 1, 16, 3, 3, 6, 16, 7, 4, 8, 15, 8);
    l.cambiar('s', 'w').cambiar('S', 'l').linea(6, 12, 8, 14, 'r').rect(9, 13, 2, 1, 'E');
    l.linea(0, 19, 3, 14, 'l').linea(1, 19, 4, 14, 'l').linea(19, 19, 16, 14, 'l').linea(18, 19, 15, 14, 'l');
  }),
  // Helman O'Grande, la mano negra: sombrero de ala ancha y una mano oscura.
  helman: retrato((l) => {
    cara(l, 'n', 'E', 'R');
    l.rect(5, 1, 10, 5, 'n').rect(2, 5, 16, 2, 'n').rect(5, 5, 10, 1, 'R');
    l.rect(6, 12, 8, 1, 'E').rect(7, 9, 2, 1, 'r').rect(11, 9, 2, 1, 'r');
    l.rect(14, 12, 5, 5, 'E').rect(14, 9, 1, 4, 'E').rect(16, 9, 1, 4, 'E').rect(18, 10, 1, 3, 'E');
  }),
  // El Tahúr: visera verde, chaleco, cigarro y una carta en la mano.
  tahur: retrato((l) => {
    cara(l, 'V', 'W', 'n');
    l.rect(5, 3, 10, 3, 'n').rect(4, 5, 12, 2, 'v').rect(4, 6, 12, 1, 'V');
    l.rect(7, 13, 6, 1, 'U').rect(13, 13, 4, 1, 'w').punto(17, 13, 'o').puntos('l', 17, 11, 18, 10);
    l.rect(15, 15, 4, 5, 'w').texto('A', 16, 15, 'r');
  }),
};

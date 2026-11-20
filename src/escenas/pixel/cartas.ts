// Las cartas en pixel art, de 22 × 31: el rango arriba a la izquierda (y
// dado vuelta abajo a la derecha), el palo chico debajo del rango y uno
// grande en el medio; las figuras llevan en el medio su retrato. También
// el dorso.

import { PALOS, RANGOS, nombreRango, type Palo, type Rango } from '../../juego/cartas.ts';
import { COLOR_PALO, forma } from './formas.ts';
import { lienzo, type Lienzo } from './lienzo.ts';
import type { Dibujo } from './paleta.ts';

export const ANCHO_CARTA = 22;
export const ALTO_CARTA = 31;

// El cuerpo: esquinas redondeadas, contorno oscuro y sombra abajo a la derecha.
function cuerpo(l: Lienzo, cara: string, sombra: string): Lienzo {
  const w = ANCHO_CARTA;
  const h = ALTO_CARTA;
  l.rect(1, 1, w - 2, h - 2, cara).rect(w - 2, 2, 1, h - 3, sombra).rect(2, h - 2, w - 3, 1, sombra);
  l.rect(2, 0, w - 4, 1, 'k').rect(2, h - 1, w - 4, 1, 'k').rect(0, 2, 1, h - 4, 'k').rect(w - 1, 2, 1, h - 4, 'k');
  return l.puntos('k', 1, 1, w - 2, 1, 1, h - 2, w - 2, h - 2);
}

function rango(l: Lienzo, r: Rango, color: string, x: number, y: number): Lienzo {
  const texto = nombreRango(r);
  // El 10 va apretado: el 1 de 2 de ancho.
  if (texto === '10') return l.rect(x, y, 1, 5, color).punto(x - 1, y + 1, color).texto('0', x + 2, y, color);
  return l.texto(texto, x, y, color);
}

// La figura de la J, la Q o la K: cara, pelo, corona o sombrero y el
// cuerpo del color del palo.
function figura(l: Lienzo, r: 11 | 12 | 13, palo: Palo): Lienzo {
  const ropa = COLOR_PALO[palo] === 'r' ? 'r' : 'B';
  const x = 6;
  const y = 7;
  // Cuerpo y hombros.
  l.poligono([[x, y + 17], [x + 1, y + 11], [x + 9, y + 11], [x + 10, y + 17]], ropa).rect(x + 4, y + 11, 2, 6, 'g');
  // Cara.
  l.rect(x + 2, y + 4, 6, 6, 's').rect(x + 2, y + 9, 6, 1, 'S').puntos('n', x + 3, y + 6, x + 6, y + 6);
  if (r === 13) {
    l.rect(x + 2, y + 8, 6, 3, 'u').rect(x + 4, y + 8, 2, 1, 'r'); // barba y boca
    l.rect(x + 1, y + 1, 8, 3, 'g').puntos('g', x + 1, y, x + 4, y, x + 5, y, x + 8, y).punto(x + 4, y + 2, 'r').punto(x + 5, y + 2, 'r');
  } else if (r === 12) {
    l.rect(x + 1, y + 3, 1, 8, 'o').rect(x + 8, y + 3, 1, 8, 'o').rect(x + 2, y + 3, 6, 1, 'o'); // pelo
    l.rect(x + 2, y + 1, 6, 2, 'g').puntos('g', x + 2, y, x + 4, y, x + 5, y, x + 7, y).punto(x + 4, y + 1, 'i').punto(x + 5, y + 1, 'i');
    l.punto(x + 4, y + 8, 'r').punto(x + 5, y + 8, 'r');
  } else {
    l.rect(x + 2, y + 3, 6, 1, 'U').rect(x + 1, y + 4, 1, 4, 'U').rect(x + 8, y + 4, 1, 4, 'U'); // pelo
    l.rect(x + 1, y + 1, 8, 2, ropa).rect(x + 7, y, 3, 1, 'W').punto(x + 9, y + 1, 'W'); // gorro con pluma
    l.rect(x + 4, y + 8, 2, 1, 'S');
  }
  return l;
}

function cara(r: Rango, palo: Palo): Dibujo {
  const l = cuerpo(lienzo(ANCHO_CARTA, ALTO_CARTA), 'w', 'l');
  const color = COLOR_PALO[palo];
  rango(l, r, color, 2, 2);
  l.pegar(forma(palo, 5), 1, 8, color);
  // El rango de abajo, dado vuelta.
  const abajo = lienzo(5, 5);
  rango(abajo, r, color, 1, 0);
  const girado = abajo.dibujo().map((fila) => [...fila].reverse().join('')).reverse();
  l.pegar(girado, ANCHO_CARTA - 6, ALTO_CARTA - 7);
  if (r === 11 || r === 12 || r === 13) return figura(l, r, palo).dibujo();
  // El As lleva el palo con un marco dorado.
  if (r === 14) l.elipse(10.5, 15.5, 6, 6, 'y').elipse(10.5, 15.5, 5, 5, 'w');
  return l.pegar(forma(palo, 7), 7, 12, color).dibujo();
}

function dorso(): Dibujo {
  const l = cuerpo(lienzo(ANCHO_CARTA, ALTO_CARTA), 'r', 'R');
  l.marco(2, 2, ANCHO_CARTA - 4, ALTO_CARTA - 4, 'g');
  for (let y = 4; y < ALTO_CARTA - 4; y++) {
    for (let x = 4; x < ANCHO_CARTA - 4; x++) if ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) l.punto(x, y, 'R');
  }
  l.pegar(forma('picas', 7), 7, 12, 'g');
  return l.dibujo();
}

export const SPRITES_CARTAS: Readonly<Record<string, Dibujo>> = {
  ...Object.fromEntries(PALOS.flatMap((palo) => RANGOS.map((r) => [`${palo}-${r}`, cara(r, palo)]))),
  dorso: dorso(),
};

// Los palos solos, de 7 × 7 con contorno (para la mesa y los botones).
export const SPRITES_PALOS: Readonly<Record<string, Dibujo>> = Object.fromEntries(
  PALOS.map((palo) => {
    const l = lienzo(9, 9).pegar(forma(palo, 7), 1, 1, COLOR_PALO[palo] === 'r' ? 'r' : 'E');
    return [palo, l.contorno().dibujo()];
  }),
);

// Los nodos del mapa como fichas de póker en pixel art, acostadas sobre el
// paño: un canto más oscuro abajo (se ve el grosor al inclinar el
// tablero) con sus rayas, la cara del color del tipo de nodo, rayas
// blancas en el borde y el icono en el centro, aplastado como la ficha
// para que se vea pintado encima. Las que se pueden elegir llevan una luz
// en el borde que se prende al pasar el mouse por encima.
//
// Se pintan píxel por píxel en la lámina del mapa (ver pixel/lamina.ts),
// con el mismo tamaño de píxel que el paño.

import type { TipoNodo } from '../mapa/mapa.ts';
import { SPRITES_NODOS } from './pixel/interfaz.ts';
import { escalarColor, mezclarColor, type Lamina } from './pixel/lamina.ts';
import { CONTORNO, PALETA, pixeles } from './pixel/paleta.ts';

export const COLOR_DE_FICHA: Record<TipoNodo, number> = {
  inicio: 0xe9e4d8,
  combate: 0xc63a32,
  elite: 0x7b3fb0,
  jefe: 0x26272e,
  vendedor: 0x2f6fd6,
  tienda: 0x2b9a58,
  eliminador: 0x7c858d,
  manoNegra: 0x15161b,
  pintor: 0xe0822a,
  evento: 0xd9b230,
  descanso: 0x1c9e95,
};

const RAYAS = 6;
const ANCHO_RAYA = Math.PI / (RAYAS * 1.4);
const RAYAS_CANTO = [-0.72, -0.2, 0.32, 0.8];
const GROSOR = 0.42; // el alto del canto, en radios
const LUZ = 0xfff1b8;
const VACIO = -1;

export interface OpcionesFicha {
  x: number; // el centro, en píxeles de la lámina
  y: number;
  radio: number; // en píxeles de la lámina
  aplastado: number; // cuánto se achata de alto al acostarla (1 = de frente)
  alfa: number;
  luz: boolean; // con la luz del borde prendida
  borde?: number; // un aro de color en el borde (la ficha actual)
}

// Las rayas, blancas salvo en las fichas claras.
function blancoDeRayas(tipo: TipoNodo): number {
  return tipo === 'inicio' || tipo === 'evento' ? 0x8a6d3b : 0xf6f3ea;
}

const iconos = new Map<TipoNodo, readonly (readonly (number | null)[])[]>();
function icono(tipo: TipoNodo) {
  let filas = iconos.get(tipo);
  if (!filas) iconos.set(tipo, (filas = pixeles(SPRITES_NODOS[tipo]!)));
  return filas;
}

// El icono achicado a `ancho` × `alto` sin suavizar. Al aplastarlo, de
// cada grupo de filas que se juntan en una se queda con un píxel de color
// antes que con el contorno, para que no se pierda el dibujo.
export function iconoAplastado(tipo: TipoNodo, ancho: number, alto: number): (number | null)[][] {
  const filas = icono(tipo);
  const lado = filas.length;
  return Array.from({ length: alto }, (_, b) => {
    const desde = Math.floor((b * lado) / alto);
    const hasta = Math.max(desde + 1, Math.ceil(((b + 1) * lado) / alto));
    return Array.from({ length: ancho }, (_, a) => {
      const sx = Math.min(lado - 1, Math.floor(((a + 0.5) * lado) / ancho));
      let elegido: number | null = null;
      for (let sy = desde; sy < hasta && sy < lado; sy++) {
        const c = filas[sy]![sx]!;
        if (c === null) continue;
        if (c !== CONTORNO) return c;
        elegido ??= c;
      }
      return elegido;
    });
  });
}

export function pintarFicha(lamina: Lamina, tipo: TipoNodo, o: OpcionesFicha): void {
  const r = o.radio;
  const q = o.aplastado;
  const margen = Math.ceil(r * 0.25) + 3;
  const ox = Math.floor(o.x - r) - margen;
  const oy = Math.floor(o.y - r * q) - margen;
  const ancho = Math.ceil(2 * r) + 2 * margen + 1;
  const alto = Math.ceil(r * q * (2 + GROSOR)) + 2 * margen + 1;
  const u = (i: number) => (ox + i + 0.5 - o.x) / r;
  const v = (j: number) => (oy + j + 0.5 - o.y) / (r * q);
  // La distancia al centro (en radios) de cada píxel, calculada una vez.
  const distancias = new Float32Array(ancho * alto);
  for (let j = 0; j < alto; j++) {
    const y = v(j);
    for (let i = 0; i < ancho; i++) {
      const x = u(i);
      distancias[j * ancho + i] = Math.sqrt(x * x + y * y);
    }
  }
  const d = (i: number, j: number) => (i < 0 || j < 0 || i >= ancho || j >= alto ? 9 : distancias[j * ancho + i]!);
  const esCara = (i: number, j: number) => d(i, j) <= 1;
  const esCanto = (i: number, j: number) => {
    const x = u(i);
    const y = v(j);
    return x * x + (y - GROSOR) ** 2 <= 1 || (Math.abs(x) <= 1 && y >= 0 && y <= GROSOR);
  };
  const vecinos = (i: number, j: number, cumple: (i: number, j: number) => boolean) =>
    !cumple(i - 1, j) || !cumple(i + 1, j) || !cumple(i, j - 1) || !cumple(i, j + 1);

  const color = COLOR_DE_FICHA[tipo];
  const blanco = blancoDeRayas(tipo);
  const adentro = escalarColor(color, 0.85);
  const px = new Int32Array(ancho * alto).fill(VACIO);
  for (let j = 0; j < alto; j++) {
    for (let i = 0; i < ancho; i++) {
      let c = VACIO;
      if (esCara(i, j)) {
        const dist = d(i, j);
        if (dist > 0.79) {
          const angulo = (Math.atan2(v(j), u(i)) + Math.PI * 2) % ((Math.PI * 2) / RAYAS);
          c = angulo < ANCHO_RAYA ? blanco : color;
        } else c = dist <= 0.64 ? adentro : color;
        // El anillo fino del círculo de adentro.
        if (dist <= 0.64 && dist > 0.5 && vecinos(i, j, (a, b) => d(a, b) <= 0.64)) c = mezclarColor(adentro, blanco, 0.8);
        // Luz arriba y sombra abajo, en el borde de la cara.
        if (!esCara(i, j - 1)) c = escalarColor(c, 1.25);
        else if (!esCara(i, j + 1)) c = escalarColor(c, 0.75);
        if (o.borde !== undefined && dist > 0.8 && vecinos(i, j, esCara)) c = o.borde;
      } else if (esCanto(i, j)) {
        const x = u(i);
        c = escalarColor(color, Math.abs(x) > 0.8 ? 0.4 : 0.55);
        if (v(j) >= GROSOR * 0.6 && RAYAS_CANTO.some((raya) => Math.abs(x - raya) < 0.075)) c = escalarColor(blanco, 0.85);
      }
      px[j * ancho + i] = c;
    }
  }

  // El icono en el centro, aplastado como la ficha.
  const anchoIcono = Math.max(4, Math.round(r * 1.05));
  const altoIcono = Math.max(2, Math.round(anchoIcono * q));
  const izquierda = Math.round(o.x - anchoIcono / 2) - ox;
  const arriba = Math.round(o.y - altoIcono / 2) - oy;
  iconoAplastado(tipo, anchoIcono, altoIcono).forEach((fila, b) =>
    fila.forEach((c, a) => {
      if (c !== null) px[(arriba + b) * ancho + izquierda + a] = c;
    }),
  );

  // El contorno oscuro alrededor de toda la ficha.
  const lleno = (i: number, j: number) => i >= 0 && j >= 0 && i < ancho && j < alto && px[j * ancho + i] !== VACIO;
  const contorno: number[] = [];
  for (let j = 0; j < alto; j++) {
    for (let i = 0; i < ancho; i++) {
      if (!lleno(i, j) && (lleno(i - 1, j) || lleno(i + 1, j) || lleno(i, j - 1) || lleno(i, j + 1))) contorno.push(j * ancho + i);
    }
  }
  for (const n of contorno) px[n] = o.luz && v(Math.floor(n / ancho)) < 0.2 ? LUZ : CONTORNO;

  for (let j = 0; j < alto; j++) {
    for (let i = 0; i < ancho; i++) {
      const c = px[j * ancho + i]!;
      if (c !== VACIO) lamina.mezclar(ox + i, oy + j, c, o.alfa);
    }
  }

  if (!o.luz) return;
  // La luz: un aro tramado alrededor y un brillo en el borde de arriba.
  for (let j = 0; j < alto; j++) {
    for (let i = 0; i < ancho; i++) {
      const dist = d(i, j);
      if (px[j * ancho + i] === VACIO && dist > 1 && dist <= 1.22) {
        lamina.sumar(ox + i, oy + j, LUZ, (i + j) % 2 === 0 ? 0.55 : 0.25);
      } else if (esCara(i, j) && dist > 0.86 && v(j) < -0.3) {
        lamina.sumar(ox + i, oy + j, PALETA.W!, 0.35);
      }
    }
  }
}

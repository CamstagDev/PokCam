// El fondo del mapa, en tres piezas que se cambian por separado: el
// entorno (lo que se ve alrededor de la mesa), la baranda (el borde del
// tablero) y el paño (la superficie donde van los caminos y los nodos).
// Cada pieza tiene un catálogo; FONDO_MAPA dice cuál se usa de cada una.
// Para un fondo nuevo basta con sumar una entrada al catálogo de esa pieza
// y elegirla en FONDO_MAPA (más adelante, la partida podrá elegirla).
//
// Todo va en pixel art: cada pieza pinta píxel por píxel en la lámina del
// mapa (ver pixel/lamina.ts), con los degradados tramados en bandas.

import { tramar, type Lamina } from './pixel/lamina.ts';

export interface Punto {
  x: number;
  y: number;
}

// Lo que las piezas ven del tablero en el cuadro actual (en coordenadas de
// pantalla; la lámina las divide por su escala).
export interface Tablero {
  ancho: number; // de pantalla
  alto: number;
  // De un punto del plano del tablero a la pantalla (`s` es su escala).
  proyectar(xPlano: number, yPlano: number): Punto & { s: number };
  // Al revés: qué y del plano se ve en una fila de la pantalla, y con qué
  // escala (la x del plano es centroX + (x - ancho / 2) / s). Nada si esa
  // fila queda más allá del horizonte.
  fila(yPantalla: number): { yPlano: number; s: number } | undefined;
  // Cuánto se desplazó la vista: lo que se pinta sobre el paño se mueve
  // con él.
  desplazamiento: number;
  centroX: number; // la x del centro del tablero en el plano
  mitad: number; // la mitad del ancho del tablero en el plano
  cerca: number; // la y del plano del borde de adelante
  lejos: number; // y la del borde del fondo
}

export interface Entorno {
  // Se pinta una sola vez, quieto, detrás de todo.
  pintar(lamina: Lamina): void;
}

export interface Baranda {
  grosor: number; // en el plano, por fuera del paño
  pintar(lamina: Lamina, tablero: Tablero): void;
}

export interface Pano {
  camino: number; // color de los caminos sin recorrer (tiza)
  pintar(lamina: Lamina, tablero: Tablero): void;
}

// Un número al azar fijo para cada celda (para motas y nudos que no
// parpadean de un cuadro al otro).
export function azar(a: number, b: number): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// La luz de la lámpara sobre la mesa: 1 en el centro de adelante, 0 lejos.
export function luzDeMesa(tablero: Tablero, xPlano: number, yPlano: number): number {
  const radio = tablero.mitad * 0.98;
  const dx = (xPlano - tablero.centroX) / radio;
  const dy = (yPlano - (tablero.cerca - 250)) / (radio * 1.6);
  return Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
}

// Recorre los píxeles de la lámina que caen en el plano del tablero
// agrandado `margen` hacia los costados y el fondo, con sus coordenadas
// del plano.
function recorrer(
  lamina: Lamina,
  tablero: Tablero,
  margen: number,
  pintar: (px: number, py: number, xPlano: number, yPlano: number) => void,
): void {
  const e = lamina.escala;
  const mitad = tablero.mitad + margen;
  for (let py = 0; py < lamina.alto; py++) {
    const fila = tablero.fila((py + 0.5) * e);
    if (!fila || fila.yPlano < tablero.lejos - margen || fila.yPlano > tablero.cerca + margen) continue;
    const desde = Math.max(0, Math.floor((tablero.ancho / 2 - mitad * fila.s) / e));
    const hasta = Math.min(lamina.ancho - 1, Math.ceil((tablero.ancho / 2 + mitad * fila.s) / e));
    for (let px = desde; px <= hasta; px++) {
      const xPlano = tablero.centroX + ((px + 0.5) * e - tablero.ancho / 2) / fila.s;
      if (Math.abs(xPlano - tablero.centroX) <= mitad) pintar(px, py, xPlano, fila.yPlano);
    }
  }
}

// Una mesa de madera oscura en un cuarto en penumbra: abajo se ve la
// madera en tablones, y hacia arriba se pierde en lo oscuro.
const CUARTO = [0x060608, 0x0b0909, 0x110d0b, 0x17100b, 0x1e140d, 0x26190f];
const MESA_DE_MADERA: Entorno = {
  pintar(lamina) {
    for (let py = 0; py < lamina.alto; py++) {
      const t = py / lamina.alto;
      const tablon = Math.floor(py / 9);
      for (let px = 0; px < lamina.ancho; px++) {
        let v = t * (CUARTO.length - 1.2);
        // La junta entre tablones, y vetas largas a lo ancho.
        if (py % 9 === 0) v -= 1.2;
        else if (azar(Math.floor(px / 14) + tablon * 31, tablon) < 0.25 && py % 9 === 4) v -= 0.6;
        lamina.punto(px, py, tramar(CUARTO, v, px, py));
      }
    }
  },
};

// Baranda de madera, como la de una mesa de póker: madera con veta a lo
// largo, un brillo arriba del canto y un labio oscuro contra el paño.
const MADERA = [0x1d1209, 0x3b2212, 0x4f2f18, 0x5e3a1f, 0x74482a, 0x8c5a34, 0xa8713f];
const BARANDA_DE_MADERA: Baranda = {
  grosor: 75,
  pintar(lamina, tablero) {
    const grosor = this.grosor;
    recorrer(lamina, tablero, grosor, (px, py, xPlano, yPlano) => {
      const fuera = Math.max(Math.abs(xPlano - tablero.centroX) - tablero.mitad, tablero.lejos - yPlano, yPlano - tablero.cerca);
      if (fuera <= 0) return; // eso es paño
      let color: number;
      if (fuera < 11) color = MADERA[0]!; // el labio contra el paño
      else if (fuera > grosor - 5) color = MADERA[1]!; // el borde de afuera
      else {
        // A lo largo de la baranda: en los costados, la y del mundo (se
        // mueve al arrastrar); en el fondo, la x.
        const costado = Math.abs(xPlano - tablero.centroX) - tablero.mitad > tablero.lejos - yPlano;
        const largo = costado ? yPlano + tablero.desplazamiento : xPlano;
        const veta = fuera + 4 * Math.sin(largo * 0.013 + fuera * 0.12) + 2 * Math.sin(largo * 0.047);
        let v = 3 + (Math.floor(veta / 7) % 3) * 0.45 + luzDeMesa(tablero, xPlano, yPlano) * 1.4 - 0.4;
        if (veta / 7 - Math.floor(veta / 7) < 0.16) v -= 1.1; // la línea de la veta
        if (fuera > grosor - 18 && fuera < grosor - 10) v += 1.6; // el brillo del canto
        if (fuera < 15) v -= 0.8; // la sombra del labio
        color = tramar(MADERA, v, px, py);
      }
      lamina.punto(px, py, color);
    });
  },
};

// Paño verde de mesa de póker: más claro en el centro de adelante, donde
// da la luz (en bandas tramadas), y con motas fijas en el paño que se
// mueven con él al arrastrar.
const VERDES = [0x08291a, 0x0f4029, 0x135033, 0x18603d, 0x1e7147, 0x248451];
const PANO_VERDE: Pano = {
  camino: 0xd8e8dc,
  pintar(lamina, tablero) {
    recorrer(lamina, tablero, 0, (px, py, xPlano, yPlano) => {
      let v = 0.75 + luzDeMesa(tablero, xPlano, yPlano) * 3.6;
      // Hacia el fondo, más oscuro.
      v -= Math.max(0, (tablero.cerca - 900 - yPlano) / 900);
      const mota = azar(Math.floor(xPlano / 5), Math.floor((yPlano + tablero.desplazamiento) / 5));
      if (mota < 0.04) v += 1;
      else if (mota > 0.96) v -= 1;
      lamina.punto(px, py, tramar(VERDES, v, px, py));
    });
  },
};

export const ENTORNOS = { mesaDeMadera: MESA_DE_MADERA } satisfies Record<string, Entorno>;
export const BARANDAS = { madera: BARANDA_DE_MADERA } satisfies Record<string, Baranda>;
export const PANOS = { verde: PANO_VERDE } satisfies Record<string, Pano>;

export const FONDO_MAPA: { entorno: Entorno; baranda: Baranda; pano: Pano } = {
  entorno: ENTORNOS.mesaDeMadera,
  baranda: BARANDAS.madera,
  pano: PANOS.verde,
};

// El fondo del mapa, en tres piezas que se cambian por separado: el
// entorno (lo que se ve alrededor de la mesa), la baranda (el borde del
// tablero) y el paño (la superficie donde van los caminos y los nodos).
// Cada pieza tiene un catálogo; FONDO_MAPA dice cuál se usa de cada una.
// Para un fondo nuevo basta con sumar una entrada al catálogo de esa pieza
// y elegirla en FONDO_MAPA (más adelante, la partida podrá elegirla).

import Phaser from 'phaser';
import { crearAleatorio } from '../juego/aleatorio.ts';

export interface Punto {
  x: number;
  y: number;
}

// Lo que las piezas ven del tablero en el cuadro actual.
export interface Tablero {
  ancho: number; // de pantalla
  alto: number;
  // Las esquinas del tablero en pantalla, agrandado `margen` en el plano
  // hacia los costados (y hacia el fondo y el frente).
  contorno(margen: number): Punto[];
  // De un punto del plano del tablero a la pantalla (`s` es su escala).
  proyectar(xPlano: number, yPlano: number): Punto & { s: number };
  // Cuánto se desplazó la vista: lo que se pinta sobre el paño se mueve
  // con él.
  desplazamiento: number;
  centroX: number; // la x del centro del tablero en el plano
  mitad: number; // la mitad del ancho del tablero en el plano
  cerca: number; // la y del plano del borde de adelante
}

export interface Entorno {
  // Se dibuja una sola vez, quieto, detrás de todo.
  dibujar(g: Phaser.GameObjects.Graphics, ancho: number, alto: number): void;
}

export interface Baranda {
  grosor: number; // en el plano, por fuera del paño
  dibujar(g: Phaser.GameObjects.Graphics, tablero: Tablero): void;
}

export interface Pano {
  camino: number; // color de los caminos sin recorrer
  dibujar(g: Phaser.GameObjects.Graphics, tablero: Tablero): void;
}

function poligono(g: Phaser.GameObjects.Graphics, puntos: Punto[]): void {
  g.fillPoints(puntos.map(({ x, y }) => new Phaser.Math.Vector2(x, y)), true);
}

function contornoCerrado(g: Phaser.GameObjects.Graphics, puntos: Punto[]): void {
  g.strokePoints(puntos.map(({ x, y }) => new Phaser.Math.Vector2(x, y)), true);
}

// Una mesa de madera oscura en un cuarto en penumbra: abajo se ve la
// madera con su veta, y hacia arriba se pierde en lo oscuro.
const MESA_DE_MADERA: Entorno = {
  dibujar(g, ancho, alto) {
    const aleatorio = crearAleatorio(11);
    const franjas = 24;
    for (let i = 0; i < franjas; i++) {
      const t = i / (franjas - 1);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x060608),
        Phaser.Display.Color.ValueToColor(0x1c120b),
        franjas - 1,
        i,
      );
      g.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b)).fillRect(0, t * alto - 1, ancho, alto / franjas + 2);
    }
    for (let i = 0; i < 70; i++) {
      const y = alto * 0.2 + aleatorio() * alto * 0.85;
      g.lineStyle(1 + aleatorio() * 3, 0x5a3418, 0.04 + aleatorio() * 0.07).lineBetween(0, y, ancho, y + aleatorio() * 10 - 5);
    }
  },
};

// Baranda acolchada de madera, como la de una mesa de póker: madera con
// veta a lo largo, un brillo y un labio oscuro contra el paño.
const BARANDA_DE_MADERA: Baranda = {
  grosor: 75,
  dibujar(g, tablero) {
    g.fillStyle(0x5e3a1f);
    poligono(g, tablero.contorno(this.grosor));
    for (let veta = 0; veta < 9; veta++) {
      const margen = 16 + (veta * (this.grosor - 20)) / 9;
      g.lineStyle(veta % 3 === 0 ? 2 : 1, 0x2a160a, 0.18 + (veta % 2) * 0.08);
      contornoCerrado(g, tablero.contorno(margen));
    }
    g.lineStyle(2, 0xffd7a0, 0.28);
    contornoCerrado(g, tablero.contorno(this.grosor - 13));
    g.fillStyle(0x1d1209);
    poligono(g, tablero.contorno(12));
  },
};

// Motas fijas sobre el paño, en coordenadas del plano: le dan textura y se
// mueven con él al arrastrar. Se repiten cada MOTAS_ALTO de alto.
const MOTAS_ALTO = 1400;
const MOTAS = (() => {
  const aleatorio = crearAleatorio(7);
  return Array.from({ length: 900 }, () => ({ x: aleatorio() * 2 - 1, y: aleatorio() * MOTAS_ALTO, claro: aleatorio() < 0.5 }));
})();

// Paño verde de mesa de póker: más claro en el centro de abajo, donde da
// la luz, y con motas que le dan textura.
const PANO_VERDE: Pano = {
  camino: 0xd8e8dc,
  dibujar(g, tablero) {
    g.fillStyle(0x0f4029);
    poligono(g, tablero.contorno(0));
    // Más claro hacia el centro de adelante: aros cada vez más chicos en
    // el plano, uno sobre otro.
    const aros = 18;
    for (let aro = 0; aro < aros; aro++) {
      const radio = tablero.mitad * (1 - aro / aros) * 0.98;
      const centroY = tablero.cerca - 250;
      const puntos: Punto[] = [];
      for (let paso = 0; paso <= 40; paso++) {
        const angulo = (paso / 40) * Math.PI * 2;
        puntos.push(tablero.proyectar(tablero.centroX + Math.cos(angulo) * radio, centroY + Math.sin(angulo) * radio * 1.6));
      }
      g.fillStyle(0x24854f, 0.065);
      poligono(g, puntos);
    }
    for (const mota of MOTAS) {
      const yPlano = ((((mota.y - tablero.desplazamiento) % MOTAS_ALTO) + MOTAS_ALTO) % MOTAS_ALTO) + tablero.cerca - MOTAS_ALTO;
      const { x, y, s } = tablero.proyectar(tablero.centroX + mota.x * tablero.mitad, yPlano);
      g.fillStyle(mota.claro ? 0x9fd9b4 : 0x04140c, 0.12);
      g.fillRect(x, y, 2.2 * s, 1.6 * s);
    }
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

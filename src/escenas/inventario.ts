// Los dos botones redondos de abajo a la izquierda, presentes en el mapa,
// la mesa, el vendedor y la recompensa del élite: uno muestra las
// baratijas del jugador y el otro su mazo.

import Phaser from 'phaser';
import { baratijasDe, type Baratija } from '../juego/baratijas.ts';
import { PALOS, SIMBOLO_PALO, nombreRango, ordenarMano, type Carta } from '../juego/cartas.ts';
import type { Partida } from '../juego/partida.ts';
import { crearBotonRedondo } from './boton.ts';
import { abrirCapa } from './capa.ts';
import { COLORES, estiloTexto } from './estilo.ts';

// Lee la partida al tocar, para mostrar siempre lo último (por ejemplo,
// recién comprada una baratija).
export function mostrarBotonesInventario(escena: Phaser.Scene, partida: () => Partida): Phaser.GameObjects.Container[] {
  const y = escena.scale.height - 60;
  return [
    crearBotonRedondo(escena, 50, y, '✦', 'Baratijas', () => verBaratijas(escena, partida())),
    crearBotonRedondo(escena, 120, y, '▤', 'Mazo', () => verMazo(escena, partida())),
  ].map((boton) => boton.setDepth(60));
}

function verBaratijas(escena: Phaser.Scene, partida: Partida): void {
  const { width, height } = escena.scale;
  const baratijas = baratijasDe(partida.baratijas);
  const capa = abrirCapa(escena, `Tus baratijas (${baratijas.length})`);
  if (baratijas.length === 0) {
    capa.add(escena.add.text(width / 2, height / 2, 'Todavía no tienes baratijas.', estiloTexto(26, COLORES.textoSuave)).setOrigin(0.5));
    return;
  }
  // En filas de 4 fichas.
  const ancho = 280;
  const alto = 150;
  const porFila = 4;
  baratijas.forEach((baratija, i) => {
    const fila = Math.floor(i / porFila);
    const enFila = Math.min(porFila, baratijas.length - fila * porFila);
    const x = width / 2 + ((i % porFila) - (enFila - 1) / 2) * (ancho + 20);
    const y = 200 + fila * (alto + 20);
    capa.add(fichaDeBaratija(escena, x, y, baratija, ancho, alto));
  });
}

// La ficha de una baratija: icono, nombre y descripción. La usan también
// el vendedor y la recompensa del élite.
export function fichaDeBaratija(
  escena: Phaser.Scene,
  x: number,
  y: number,
  baratija: Baratija,
  ancho = 280,
  alto = 150,
): Phaser.GameObjects.Container {
  const fondo = escena.add.rectangle(0, 0, ancho, alto, COLORES.panel).setStrokeStyle(2, COLORES.borde);
  const icono = escena.add.text(-ancho / 2 + 20, -alto / 2 + 16, baratija.icono, estiloTexto(34)).setOrigin(0, 0);
  const nombre = escena.add.text(-ancho / 2 + 72, -alto / 2 + 22, baratija.nombre, estiloTexto(22)).setOrigin(0, 0);
  const descripcion = escena.add
    .text(-ancho / 2 + 20, -alto / 2 + 72, baratija.descripcion, { ...estiloTexto(18, COLORES.textoSuave), wordWrap: { width: ancho - 40 } })
    .setOrigin(0, 0);
  return escena.add.container(x, y, [fondo, icono, nombre, descripcion]).setSize(ancho, alto);
}

function verMazo(escena: Phaser.Scene, partida: Partida): void {
  const { width } = escena.scale;
  const capa = abrirCapa(escena, `Tu mazo (${partida.mazo.length} cartas)`);
  // Una fila por palo, de mayor a menor.
  const ordenadas = ordenarMano(partida.mazo, 'palo');
  const ancho = 62;
  const alto = 86;
  const separacion = ancho + 6;
  PALOS.forEach((palo, fila) => {
    const cartas = ordenadas.filter((c) => c.palo === palo);
    const inicio = width / 2 - ((cartas.length - 1) * separacion) / 2;
    cartas.forEach((carta, i) => capa.add(cartaChica(escena, inicio + i * separacion, 160 + fila * (alto + 18), carta, ancho, alto)));
  });
}

function cartaChica(escena: Phaser.Scene, x: number, y: number, carta: Carta, ancho: number, alto: number): Phaser.GameObjects.Container {
  const roja = carta.palo === 'corazones' || carta.palo === 'diamantes';
  const color = roja ? COLORES.cartaRoja : COLORES.cartaNegra;
  const fondo = escena.add.graphics();
  fondo.fillStyle(COLORES.carta).fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, 6);
  const rango = escena.add.text(-ancho / 2 + 6, -alto / 2 + 4, nombreRango(carta.rango), estiloTexto(18, color));
  const simbolo = escena.add.text(0, 10, SIMBOLO_PALO[carta.palo], estiloTexto(30, color)).setOrigin(0.5);
  return escena.add.container(x, y, [fondo, rango, simbolo]);
}

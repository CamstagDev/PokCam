// Antes de empezar una partida nueva se elige la baraja (ver
// juego/barajas.ts). Las bloqueadas se ven en gris con el logro que las
// desbloquea; los desbloqueos valen para todas las ranuras.

import Phaser from 'phaser';
import { BARAJAS, type Baraja } from '../juego/barajas.ts';
import { leerBarajas } from '../juego/guardado.ts';
import { crearPartida } from '../juego/partida.ts';
import { crearBoton } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { almacen, irAPartida, jugarPartida } from './sesion.ts';
import { pixelArt } from './pixel/texturas.ts';

const ANCHO = 280;
const ALTO = 262;
const SEPARACION = 20;
const POR_FILA = 4;

export class EscenaBarajas extends Phaser.Scene {
  private ranura = 0;

  constructor() {
    super('barajas');
  }

  init(datos: { ranura: number }): void {
    this.ranura = datos.ranura;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.text(width / 2, 50, 'Elige tu baraja', estiloTexto(40)).setOrigin(0.5);
    const desbloqueadas = leerBarajas(almacen);
    BARAJAS.forEach((baraja, i) => {
      const fila = Math.floor(i / POR_FILA);
      const enFila = Math.min(POR_FILA, BARAJAS.length - fila * POR_FILA);
      const columna = i % POR_FILA;
      const x = width / 2 + (columna - (enFila - 1) / 2) * (ANCHO + SEPARACION);
      const y = 105 + ALTO / 2 + fila * (ALTO + SEPARACION);
      this.dibujarBaraja(baraja, x, y, desbloqueadas.includes(baraja.id));
    });
    crearBoton(this, width / 2, height - 40, 'Volver', COLORES.borde, () => this.scene.start('ranuras', { modo: 'nueva' }));
  }

  private dibujarBaraja(baraja: Baraja, x: number, y: number, libre: boolean): void {
    const fondo = this.add.rectangle(x, y, ANCHO, ALTO, COLORES.panel).setStrokeStyle(3, libre ? COLORES.acento : COLORES.borde);
    const arriba = y - ALTO / 2;
    const ancho = ANCHO - 30;
    const alfa = libre ? 1 : 0.45;
    pixelArt(this, x, arriba + 28, libre ? 'baraja' : 'ui', libre ? baraja.id : 'candado', 48);
    this.add.text(x, arriba + 66, baraja.nombre, { ...estiloTexto(20), fontStyle: 'bold' }).setOrigin(0.5).setAlpha(alfa);
    this.add
      .text(x, arriba + 92, `✔ ${baraja.ventaja}`, { ...estiloTexto(14, COLORES.acento), wordWrap: { width: ancho } })
      .setOrigin(0.5, 0)
      .setAlpha(alfa);
    this.add
      .text(x, arriba + 160, `✘ ${baraja.costo}`, { ...estiloTexto(14, COLORES.multi), wordWrap: { width: ancho } })
      .setOrigin(0.5, 0)
      .setAlpha(alfa);
    if (!libre) {
      this.add
        .text(x, arriba + ALTO - 14, baraja.desbloqueo, { ...estiloTexto(14, COLORES.oro), wordWrap: { width: ancho }, align: 'center' })
        .setOrigin(0.5, 1);
      return;
    }
    fondo.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.empezar(baraja));
    fondo.on('pointerover', () => fondo.setFillStyle(COLORES.borde));
    fondo.on('pointerout', () => fondo.setFillStyle(COLORES.panel));
  }

  private empezar(baraja: Baraja): void {
    const partida = crearPartida(Date.now(), baraja.id);
    jugarPartida(this, partida, this.ranura);
    irAPartida(this, partida);
  }
}

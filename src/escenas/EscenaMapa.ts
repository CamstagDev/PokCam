// El mapa de la partida. Se recorre de izquierda (inicio) a derecha (jefe);
// los nodos a los que se puede ir laten. Tocar uno avanza: si es un
// combate abre la mesa, y el resto (tienda, evento, descanso) por ahora
// solo avanza.

import Phaser from 'phaser';
import { avanzar, nodosDisponibles, type Partida } from '../juego/partida.ts';
import { buscarNodo, type Nodo, type TipoNodo } from '../mapa/mapa.ts';
import { COLORES, estiloTexto } from './estilo.ts';

const ICONOS: Record<TipoNodo, string> = {
  inicio: '⌂',
  combate: '♠',
  elite: '♛',
  tienda: '$',
  evento: '?',
  descanso: '☕',
  jefe: '☠',
};

export const TIPOS_DE_COMBATE: readonly TipoNodo[] = ['combate', 'elite', 'jefe'];

export class EscenaMapa extends Phaser.Scene {
  constructor() {
    super('mapa');
  }

  create(): void {
    const partida = this.registry.get('partida') as Partida;
    const { width, height } = this.scale;
    const margenX = 110;
    const margenY = 130;
    const pisos = partida.mapa.pisos.length;

    const posicion = (nodo: Nodo) => ({
      x: margenX + (nodo.piso * (width - 2 * margenX)) / (pisos - 1),
      y: margenY + (nodo.columna * (height - margenY - 80)) / (partida.mapa.columnas - 1),
    });

    this.add.text(width / 2, 50, 'Elige tu camino', estiloTexto(30)).setOrigin(0.5);

    const caminos = this.add.graphics();
    for (const fila of partida.mapa.pisos) {
      for (const nodo of fila) {
        const desde = posicion(nodo);
        for (const id of nodo.siguientes) {
          const hasta = posicion(buscarNodo(partida.mapa, id));
          const recorrido = partida.visitados.includes(nodo.id) && partida.visitados.includes(id);
          caminos.lineStyle(recorrido ? 5 : 3, recorrido ? COLORES.acento : COLORES.borde);
          caminos.lineBetween(desde.x, desde.y, hasta.x, hasta.y);
        }
      }
    }

    const disponibles = new Set(nodosDisponibles(partida).map((n) => n.id));
    for (const fila of partida.mapa.pisos) {
      for (const nodo of fila) {
        const { x, y } = posicion(nodo);
        const actual = nodo.id === partida.nodoActual;
        const visitado = partida.visitados.includes(nodo.id);
        const relleno = actual ? COLORES.acento : visitado ? COLORES.borde : COLORES.panel;
        const circulo = this.add.circle(x, y, 30, relleno).setStrokeStyle(3, disponibles.has(nodo.id) ? COLORES.acento : COLORES.borde);
        this.add.text(x, y, ICONOS[nodo.tipo], estiloTexto(26, visitado && !actual ? COLORES.textoSuave : COLORES.texto)).setOrigin(0.5);

        if (disponibles.has(nodo.id)) {
          this.tweens.add({ targets: circulo, scale: 1.15, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          circulo.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.ir(partida, nodo));
        }
      }
    }
  }

  private ir(partida: Partida, nodo: Nodo): void {
    this.registry.set('partida', avanzar(partida, nodo.id));
    if (TIPOS_DE_COMBATE.includes(nodo.tipo)) {
      this.scene.start('mesa', { tipo: nodo.tipo });
    } else {
      this.scene.restart();
    }
  }
}

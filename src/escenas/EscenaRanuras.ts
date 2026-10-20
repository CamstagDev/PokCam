// Las 3 ranuras de guardado, en dos modos:
//   'nueva'      se elige dónde empezar; si la ranura está ocupada se pide
//                confirmar antes de sobrescribirla.
//   'continuar'  se elige qué partida seguir, o se borra una.

import Phaser from 'phaser';
import { RANURAS, borrar, cargar, resumirTodas, type Resumen } from '../juego/guardado.ts';
import { crearPartida, nodoActual } from '../juego/partida.ts';
import { crearBoton } from './boton.ts';
import { confirmar } from './confirmar.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { almacen, jugarPartida } from './sesion.ts';

type Modo = 'nueva' | 'continuar';

const ANCHO_RANURA = 320;
const ALTO_RANURA = 240;

export class EscenaRanuras extends Phaser.Scene {
  private modo: Modo = 'nueva';

  constructor() {
    super('ranuras');
  }

  init(datos: { modo: Modo }): void {
    this.modo = datos.modo;
  }

  create(): void {
    const { width, height } = this.scale;
    const titulo = this.modo === 'nueva' ? 'Elige dónde guardar' : 'Continuar partida';
    this.add.text(width / 2, 80, titulo, estiloTexto(40)).setOrigin(0.5);

    const resumenes = resumirTodas(almacen);
    const separacion = ANCHO_RANURA + 50;
    for (let ranura = 0; ranura < RANURAS; ranura++) {
      const x = width / 2 + (ranura - (RANURAS - 1) / 2) * separacion;
      this.dibujarRanura(ranura, x, height / 2, resumenes[ranura] ?? null);
    }

    crearBoton(this, width / 2, height - 70, 'Volver', COLORES.borde, () => this.scene.start('menu'));
  }

  private dibujarRanura(ranura: number, x: number, y: number, resumen: Resumen | null): void {
    const usable = this.modo === 'nueva' || resumen !== null;
    const fondo = this.add.rectangle(x, y, ANCHO_RANURA, ALTO_RANURA, COLORES.panel).setStrokeStyle(3, usable ? COLORES.acento : COLORES.borde);
    this.add.text(x, y - 70, `Ranura ${ranura + 1}`, estiloTexto(30)).setOrigin(0.5);

    if (resumen) {
      this.add.text(x, y - 15, `Piso ${resumen.piso} de ${resumen.pisos - 1}`, estiloTexto(24)).setOrigin(0.5);
      this.add.text(x, y + 22, `${resumen.oro} de oro`, estiloTexto(22, COLORES.oro)).setOrigin(0.5);
      this.add.text(x, y + 60, fecha(resumen.guardadoEn), estiloTexto(18, COLORES.textoSuave)).setOrigin(0.5);
    } else {
      this.add.text(x, y + 10, 'Vacía', estiloTexto(24, COLORES.textoSuave)).setOrigin(0.5);
    }

    if (usable) {
      fondo.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.elegir(ranura, resumen));
      fondo.on('pointerover', () => fondo.setFillStyle(COLORES.borde));
      fondo.on('pointerout', () => fondo.setFillStyle(COLORES.panel));
    }

    if (this.modo === 'continuar' && resumen) {
      crearBoton(this, x, y + ALTO_RANURA / 2 + 50, 'Borrar', COLORES.multi, () =>
        confirmar(this, `¿Borrar la partida de la ranura ${ranura + 1}?\nNo se puede deshacer.`, 'Borrar', COLORES.multi, () => {
          borrar(almacen, ranura);
          this.scene.restart();
        }),
      );
    }
  }

  private elegir(ranura: number, resumen: Resumen | null): void {
    if (this.modo === 'continuar') {
      const guardado = cargar(almacen, ranura);
      if (!guardado) return;
      jugarPartida(this, guardado.partida, ranura);
      const { partida } = guardado;
      if (partida.combatePendiente) this.scene.start('mesa', { tipo: nodoActual(partida).tipo });
      else this.scene.start('mapa');
      return;
    }

    const empezar = () => {
      jugarPartida(this, crearPartida(Date.now()), ranura);
      this.scene.start('mapa');
    };
    if (resumen) {
      confirmar(this, `La ranura ${ranura + 1} ya tiene una partida.\n¿Sobrescribirla?`, 'Sobrescribir', COLORES.multi, empezar);
    } else {
      empezar();
    }
  }
}

function fecha(ms: number): string {
  return new Date(ms).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

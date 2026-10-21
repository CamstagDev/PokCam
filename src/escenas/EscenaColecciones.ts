// La colección, desde el menú principal: todas las baratijas del juego.
// Las que nunca se consiguieron se ven en sombra, sin nombre ni
// descripción; las conseguidas alguna vez (en cualquier ranura) se ven
// completas.

import Phaser from 'phaser';
import { CATALOGO, DATOS_RAREZA, RAREZAS } from '../juego/baratijas.ts';
import { leerColeccion } from '../juego/guardado.ts';
import { crearBotonRedondo } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { fichaDeBaratija } from './inventario.ts';
import { almacen } from './sesion.ts';

const ANCHO = 300;
const ALTO = 170;
const POR_FILA = 3;

export class EscenaColecciones extends Phaser.Scene {
  constructor() {
    super('colecciones');
  }

  create(): void {
    const { width } = this.scale;
    const coleccion = leerColeccion(almacen);
    // De común a legendaria.
    const todas = [...CATALOGO].sort((a, b) => RAREZAS.indexOf(a.rareza) - RAREZAS.indexOf(b.rareza));
    const conseguidas = todas.filter((b) => coleccion.includes(b.id)).length;

    this.add.text(width / 2, 60, 'Colección de baratijas', estiloTexto(40)).setOrigin(0.5);
    this.add.text(width / 2, 105, `${conseguidas} de ${todas.length} descubiertas`, estiloTexto(20, COLORES.textoSuave)).setOrigin(0.5);

    todas.forEach((baratija, i) => {
      const fila = Math.floor(i / POR_FILA);
      const enFila = Math.min(POR_FILA, todas.length - fila * POR_FILA);
      const x = width / 2 + ((i % POR_FILA) - (enFila - 1) / 2) * (ANCHO + 20);
      const y = 240 + fila * (ALTO + 20);
      if (coleccion.includes(baratija.id)) {
        fichaDeBaratija(this, x, y, baratija, ANCHO, ALTO);
      } else {
        this.fichaEnSombra(x, y, baratija.icono, DATOS_RAREZA[baratija.rareza].nombre);
      }
    });

    // Arriba a la derecha, para no tapar la última fila de baratijas.
    crearBotonRedondo(this, width - 60, 56, '←', 'Volver', () => this.scene.start('menu'));
  }

  // La silueta del icono en negro, sin nombre ni descripción.
  private fichaEnSombra(x: number, y: number, icono: string, rareza: string): void {
    this.add.rectangle(x, y, ANCHO, ALTO, COLORES.panel, 0.5).setStrokeStyle(2, COLORES.borde);
    this.add.text(x, y - 16, icono, estiloTexto(54)).setOrigin(0.5).setTint(0x000000).setAlpha(0.85);
    this.add.text(x, y + 44, '???', estiloTexto(20, COLORES.textoSuave)).setOrigin(0.5);
    this.add.text(x + ANCHO / 2 - 14, y + ALTO / 2 - 10, rareza, estiloTexto(15, COLORES.borde)).setOrigin(1, 1);
  }
}

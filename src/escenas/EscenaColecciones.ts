// La colección, desde el menú principal: todas las baratijas del juego,
// agrupadas por set (con sus bonos) y después las que no son de ningún set.
// Las que nunca se consiguieron se ven en sombra, sin nombre ni
// descripción; las conseguidas alguna vez (en cualquier ranura) se ven
// completas. Si no cabe todo, se desplaza con la rueda o arrastrando.

import Phaser from 'phaser';
import { CATALOGO, CONJUNTOS, DATOS_RAREZA, RAREZAS, cantidadDelBono, miembrosDe, type Baratija } from '../juego/baratijas.ts';
import { leerColeccion } from '../juego/guardado.ts';
import { crearBotonRedondo } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { fichaDeBaratija } from './inventario.ts';
import { almacen } from './sesion.ts';

const ANCHO = 300;
const ALTO = 170;
const POR_FILA = 3;

// De común a legendaria.
const porRareza = (a: Baratija, b: Baratija) => RAREZAS.indexOf(a.rareza) - RAREZAS.indexOf(b.rareza);

export class EscenaColecciones extends Phaser.Scene {
  private coleccion: string[] = [];

  constructor() {
    super('colecciones');
  }

  create(): void {
    const { width, height } = this.scale;
    this.coleccion = leerColeccion(almacen);
    const conseguidas = CATALOGO.filter((b) => this.coleccion.includes(b.id)).length;

    this.add.text(width / 2, 60, 'Colección de baratijas', estiloTexto(40)).setOrigin(0.5);
    this.add.text(width / 2, 105, `${conseguidas} de ${CATALOGO.length} descubiertas`, estiloTexto(20, COLORES.textoSuave)).setOrigin(0.5);

    let y = 150;
    for (const conjunto of CONJUNTOS) {
      const miembros = miembrosDe(conjunto).sort(porRareza);
      this.add.text(width / 2, y, conjunto.nombre, estiloTexto(26, COLORES.acento)).setOrigin(0.5, 0);
      y += 36;
      for (const bono of conjunto.bonos) {
        const cantidad = cantidadDelBono(conjunto, bono);
        const cuando = cantidad === miembros.length ? 'Set completo' : `Con ${cantidad}`;
        this.add
          .text(width / 2, y, `${cuando}: ${bono.descripcion}`, { ...estiloTexto(18, COLORES.textoSuave), align: 'center', wordWrap: { width: 900 } })
          .setOrigin(0.5, 0);
        y += 28;
      }
      y = this.grupo(miembros, y + 10) + 30;
    }
    const sueltas = CATALOGO.filter((b) => !b.conjunto).sort(porRareza);
    if (sueltas.length > 0) {
      this.add.text(width / 2, y, 'Sin set', estiloTexto(26, COLORES.textoSuave)).setOrigin(0.5, 0);
      y = this.grupo(sueltas, y + 46) + 30;
    }

    // Se desplaza solo si el contenido no cabe.
    const camara = this.cameras.main;
    camara.setBounds(0, 0, width, Math.max(height, y));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      camara.scrollY += dy;
    });
    this.input.on('pointermove', (puntero: Phaser.Input.Pointer) => {
      if (puntero.isDown) camara.scrollY -= puntero.y - puntero.prevPosition.y;
    });

    // Arriba a la derecha y siempre a la vista.
    crearBotonRedondo(this, width - 60, 56, '←', 'Volver', () => this.scene.start('menu')).setScrollFactor(0).setDepth(10);
  }

  // Las fichas en filas de POR_FILA desde `y` (el borde de arriba); devuelve
  // dónde termina la última fila.
  private grupo(baratijas: readonly Baratija[], y: number): number {
    const { width } = this.scale;
    baratijas.forEach((baratija, i) => {
      const fila = Math.floor(i / POR_FILA);
      const enFila = Math.min(POR_FILA, baratijas.length - fila * POR_FILA);
      const x = width / 2 + ((i % POR_FILA) - (enFila - 1) / 2) * (ANCHO + 20);
      const centro = y + ALTO / 2 + fila * (ALTO + 20);
      if (this.coleccion.includes(baratija.id)) {
        fichaDeBaratija(this, x, centro, baratija, ANCHO, ALTO);
      } else {
        this.fichaEnSombra(x, centro, baratija.icono, DATOS_RAREZA[baratija.rareza].nombre);
      }
    });
    const filas = Math.ceil(baratijas.length / POR_FILA);
    return y + filas * ALTO + (filas - 1) * 20;
  }

  // La silueta del icono en negro, sin nombre ni descripción.
  private fichaEnSombra(x: number, y: number, icono: string, rareza: string): void {
    this.add.rectangle(x, y, ANCHO, ALTO, COLORES.panel, 0.5).setStrokeStyle(2, COLORES.borde);
    this.add.text(x, y - 16, icono, estiloTexto(54)).setOrigin(0.5).setTint(0x000000).setAlpha(0.85);
    this.add.text(x, y + 44, '???', estiloTexto(20, COLORES.textoSuave)).setOrigin(0.5);
    this.add.text(x + ANCHO / 2 - 14, y + ALTO / 2 - 10, rareza, estiloTexto(15, COLORES.borde)).setOrigin(1, 1);
  }
}

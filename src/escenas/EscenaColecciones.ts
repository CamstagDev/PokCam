// La colección, desde el menú principal, con una pestaña por cada cosa que
// se colecciona:
//   Baratijas  todas las del juego, agrupadas por set (con sus bonos) y
//              después las que no son de ningún set.
//   Nodos      todos los tipos de nodo del mapa y qué hace cada uno.
// Lo que nunca se consiguió o visitó se ve en sombra, sin nombre ni
// descripción; lo conseguido alguna vez (en cualquier ranura) se ve
// completo. Si no cabe todo, se desplaza con la rueda o arrastrando; la
// barra de pestañas queda fija arriba.

import Phaser from 'phaser';
import { CATALOGO, CONJUNTOS, DATOS_RAREZA, RAREZAS, cantidadDelBono, miembrosDe, type Baratija } from '../juego/baratijas.ts';
import { leerColeccion, leerNodosVistos } from '../juego/guardado.ts';
import { DATOS_NODO, type TipoNodo } from '../mapa/mapa.ts';
import { crearBotonRedondo } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { fichaDeBaratija } from './inventario.ts';
import { almacen } from './sesion.ts';

const ANCHO = 300;
const ALTO = 170;
const POR_FILA = 3;
const ALTO_BARRA = 130; // la barra fija de pestañas y el conteo

type Pestana = 'baratijas' | 'nodos';
const PESTANAS: readonly { id: Pestana; nombre: string }[] = [
  { id: 'baratijas', nombre: 'Baratijas' },
  { id: 'nodos', nombre: 'Nodos' },
];

// De común a legendaria.
const porRareza = (a: Baratija, b: Baratija) => RAREZAS.indexOf(a.rareza) - RAREZAS.indexOf(b.rareza);

export class EscenaColecciones extends Phaser.Scene {
  private coleccion: string[] = [];
  private pestana: Pestana = 'baratijas';

  constructor() {
    super('colecciones');
  }

  init(datos: { pestana?: Pestana }): void {
    this.pestana = datos.pestana ?? 'baratijas';
  }

  create(): void {
    const { width, height } = this.scale;
    const y = this.pestana === 'baratijas' ? this.verBaratijas() : this.verNodos();
    this.barra();

    // Se desplaza solo si el contenido no cabe.
    const camara = this.cameras.main;
    camara.setBounds(0, 0, width, Math.max(height, y));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      camara.scrollY += dy;
    });
    this.input.on('pointermove', (puntero: Phaser.Input.Pointer) => {
      if (puntero.isDown) camara.scrollY -= puntero.y - puntero.prevPosition.y;
    });
  }

  // Las pestañas, el conteo de la pestaña abierta y el botón de volver, fijos
  // arriba sobre lo que se desplaza.
  private barra(): void {
    const { width } = this.scale;
    const fijos: Phaser.GameObjects.GameObject[] = [this.add.rectangle(0, 0, width, ALTO_BARRA, COLORES.fondo).setOrigin(0)];
    const ancho = 220;
    PESTANAS.forEach(({ id, nombre }, i) => {
      const x = width / 2 + (i - (PESTANAS.length - 1) / 2) * (ancho + 12);
      const abierta = id === this.pestana;
      const fondo = this.add.rectangle(x, 50, ancho, 52, abierta ? COLORES.acento : COLORES.panel).setStrokeStyle(2, abierta ? COLORES.acento : COLORES.borde);
      const texto = this.add.text(x, 50, nombre, estiloTexto(24, abierta ? COLORES.fondo : COLORES.texto)).setOrigin(0.5);
      if (!abierta) fondo.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.restart({ pestana: id }));
      fijos.push(fondo, texto);
    });
    const [vistas, total] = this.pestana === 'baratijas'
      ? [CATALOGO.filter((b) => this.coleccion.includes(b.id)).length, CATALOGO.length]
      : [this.nodosVistos().length, Object.keys(DATOS_NODO).length];
    fijos.push(this.add.text(width / 2, 102, `${vistas} de ${total} descubiertos`, estiloTexto(20, COLORES.textoSuave)).setOrigin(0.5));
    fijos.push(crearBotonRedondo(this, width - 60, 56, '←', 'Volver', () => this.scene.start('menu')));
    for (const objeto of fijos) (objeto as unknown as Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth).setScrollFactor(0).setDepth(10);
  }

  private nodosVistos(): TipoNodo[] {
    const vistos = leerNodosVistos(almacen);
    return (Object.keys(DATOS_NODO) as TipoNodo[]).filter((tipo) => tipo === 'inicio' || vistos.includes(tipo));
  }

  // Las fichas de los tipos de nodo; devuelve dónde termina la última fila.
  private verNodos(): number {
    const { width } = this.scale;
    const vistos = this.nodosVistos();
    const tipos = Object.keys(DATOS_NODO) as TipoNodo[];
    tipos.forEach((tipo, i) => {
      const fila = Math.floor(i / POR_FILA);
      const enFila = Math.min(POR_FILA, tipos.length - fila * POR_FILA);
      const x = width / 2 + ((i % POR_FILA) - (enFila - 1) / 2) * (ANCHO + 20);
      const y = ALTO_BARRA + 30 + ALTO / 2 + fila * (ALTO + 20);
      const { nombre, icono, descripcion } = DATOS_NODO[tipo];
      if (!vistos.includes(tipo)) {
        this.fichaEnSombra(x, y, icono, '');
        return;
      }
      this.add.rectangle(x, y, ANCHO, ALTO, COLORES.panel).setStrokeStyle(2, COLORES.borde);
      this.add.circle(x - ANCHO / 2 + 44, y - ALTO / 2 + 40, 26, COLORES.fondo).setStrokeStyle(2, COLORES.borde);
      this.add.text(x - ANCHO / 2 + 44, y - ALTO / 2 + 40, icono, estiloTexto(26)).setOrigin(0.5);
      const titulo = this.add.text(x - ANCHO / 2 + 84, y - ALTO / 2 + 40, nombre, estiloTexto(22)).setOrigin(0, 0.5);
      // Los nombres largos se achican para no salirse de la ficha.
      const libre = ANCHO - 104;
      if (titulo.width > libre) titulo.setScale(libre / titulo.width);
      this.add
        .text(x - ANCHO / 2 + 20, y - ALTO / 2 + 80, descripcion, { ...estiloTexto(16, COLORES.textoSuave), wordWrap: { width: ANCHO - 40 } })
        .setOrigin(0, 0);
    });
    const filas = Math.ceil(tipos.length / POR_FILA);
    return ALTO_BARRA + 30 + filas * (ALTO + 20) + 10;
  }

  // Las baratijas por set; devuelve dónde termina la última fila.
  private verBaratijas(): number {
    const { width } = this.scale;
    this.coleccion = leerColeccion(almacen);
    let y = ALTO_BARRA + 20;
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
    return y;
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

// El eliminador (nodo ✂ del mapa): dos servicios, cada uno una vez por
// visita.
//   Ruleta rusa  por COSTO_RULETA de oro, entran hasta 6 baratijas del
//                jugador al azar y la ruleta elimina una.
//   Eliminar     se elige una carta del mazo y se quita, por sus fichas ×
//                el nivel de riesgo.
// "Seguir" vuelve al mapa. La partida se guarda después de cada servicio.

import Phaser from 'phaser';
import { buscarBaratija } from '../juego/baratijas.ts';
import { PALOS, SIMBOLO_PALO, nombreRango, ordenarMano, type Carta } from '../juego/cartas.ts';
import {
  COSTO_RULETA,
  cerrarOferta,
  costoDeEliminar,
  eliminarCarta,
  girarRuleta,
  nivelDeRiesgo,
  puedeEliminarCarta,
  puedeGirarRuleta,
  type Partida,
  type Ruleta,
} from '../juego/partida.ts';
import { crearBoton } from './boton.ts';
import { abrirCapa } from './capa.ts';
import { confirmar } from './confirmar.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { mostrarBotonesInventario } from './inventario.ts';
import { mostrarCripto } from './cripto.ts';
import { mostrarOro } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { irAPartida, jugarPartida, partidaActual } from './sesion.ts';

const ANCHO_PANEL = 440;
const ALTO_PANEL = 300;

export class EscenaEliminador extends Phaser.Scene {
  constructor() {
    super('eliminador');
  }

  create(): void {
    const partida = partidaActual(this);
    const { width, height } = this.scale;
    mostrarOro(this, partida.oro);
    mostrarCripto(this, partida);
    mostrarRiesgo(this, nivelDeRiesgo(partida));
    mostrarBotonesInventario(this, () => partidaActual(this));
    const usados = partida.oferta?.usados ?? [];

    this.add.text(width / 2, 140, 'El eliminador', estiloTexto(40)).setOrigin(0.5);
    this.add.text(width / 2, 190, 'Cada servicio se puede usar una vez', estiloTexto(22, COLORES.textoSuave)).setOrigin(0.5);

    const y = height / 2 + 40;
    const sinBaratijas = partida.baratijas.length === 0;
    this.panel(
      width / 2 - ANCHO_PANEL / 2 - 30,
      y,
      '🔫 Ruleta rusa',
      `Entran hasta 6 de tus baratijas al azar y la ruleta elimina una.${sinBaratijas ? '\n\nNo tienes baratijas.' : ''}`,
      usados.includes('ruleta') ? 'Usada' : `Girar · ${COSTO_RULETA}`,
      puedeGirarRuleta(partida),
      () => this.girar(girarRuleta(partidaActual(this))),
    );
    this.panel(
      width / 2 + ANCHO_PANEL / 2 + 30,
      y,
      '✂ Eliminar',
      `Elige una carta de tu mazo y quítala. Cuesta sus fichas × el riesgo (${Math.max(1, nivelDeRiesgo(partida))}).`,
      usados.includes('eliminar') ? 'Usada' : 'Elegir carta',
      !usados.includes('eliminar') && partida.mazo.length > 1,
      () => this.verMazo(partidaActual(this)),
    );

    crearBoton(this, width - 150, height - 60, 'Seguir', COLORES.borde, () => {
      const cerrada = cerrarOferta(partidaActual(this));
      jugarPartida(this, cerrada);
      irAPartida(this, cerrada);
    }, 240);
  }

  private panel(x: number, y: number, titulo: string, texto: string, boton: string, activo: boolean, alTocar: () => void): void {
    this.add.rectangle(x, y, ANCHO_PANEL, ALTO_PANEL, COLORES.panel).setStrokeStyle(2, COLORES.borde);
    this.add.text(x, y - ALTO_PANEL / 2 + 40, titulo, estiloTexto(28)).setOrigin(0.5);
    this.add
      .text(x, y - ALTO_PANEL / 2 + 80, texto, { ...estiloTexto(19, COLORES.textoSuave), align: 'center', wordWrap: { width: ANCHO_PANEL - 60 } })
      .setOrigin(0.5, 0);
    crearBoton(this, x, y + ALTO_PANEL / 2 - 50, boton, COLORES.oro, alTocar, 240).activar(activo);
  }

  // Las baratijas que entraron en la ruleta; la marca salta de una a otra,
  // cada vez más lento, hasta parar en la eliminada. La partida ya quedó
  // guardada sin ella, así que salir a mitad de giro no la salva.
  private girar({ partida, mostradas, eliminada }: Ruleta): void {
    jugarPartida(this, partida);
    const { width, height } = this.scale;
    const capa = this.add.container(0, 0).setDepth(200);
    capa.add([
      this.add.rectangle(width / 2, height / 2, width, height, COLORES.fondo, 0.94).setInteractive(),
      this.add.text(width / 2, 140, 'Ruleta rusa', estiloTexto(40)).setOrigin(0.5),
    ]);
    const separacion = 170;
    const fichas = mostradas.map((id, i) => {
      const baratija = buscarBaratija(id);
      const x = width / 2 + (i - (mostradas.length - 1) / 2) * separacion;
      const fondo = this.add.rectangle(x, height / 2 - 20, 150, 150, COLORES.panel).setStrokeStyle(2, COLORES.borde);
      capa.add([
        fondo,
        this.add.text(x, height / 2 - 45, baratija.icono, estiloTexto(48)).setOrigin(0.5),
        this.add.text(x, height / 2 + 25, baratija.nombre, { ...estiloTexto(16), align: 'center', wordWrap: { width: 140 } }).setOrigin(0.5),
      ]);
      return fondo;
    });

    // Unas vueltas completas y después hasta la eliminada.
    const final = mostradas.indexOf(eliminada);
    const saltos = mostradas.length * 3 + final;
    let paso = 0;
    const marcar = (i: number, color: number) => fichas.forEach((f, j) => f.setStrokeStyle(j === i ? 4 : 2, j === i ? color : COLORES.borde));
    const saltar = () => {
      marcar(paso % mostradas.length, COLORES.oro);
      if (paso === saltos) {
        marcar(final, COLORES.multi);
        capa.add([
          this.add.text(width / 2, height / 2 + 120, `Se fue ${buscarBaratija(eliminada).nombre}`, estiloTexto(30, COLORES.multi)).setOrigin(0.5),
          crearBoton(this, width / 2, height - 80, 'Seguir', COLORES.borde, () => this.scene.restart()),
        ]);
        return;
      }
      paso++;
      this.time.delayedCall(50 + paso * paso * 0.6, saltar);
    };
    saltar();
  }

  // El mazo por palo, de mayor a menor; debajo de cada carta, lo que cuesta
  // eliminarla. Tocar una pide confirmación.
  private verMazo(partida: Partida): void {
    const { width } = this.scale;
    const capa = abrirCapa(this, 'Elige una carta para eliminar');
    const ordenadas = ordenarMano(partida.mazo, 'palo');
    const ancho = 62;
    const alto = 86;
    const separacion = ancho + 6;
    PALOS.forEach((palo, fila) => {
      const cartas = ordenadas.filter((c) => c.palo === palo);
      const inicio = width / 2 - ((cartas.length - 1) * separacion) / 2;
      cartas.forEach((carta, i) => {
        const x = inicio + i * separacion;
        const y = 150 + fila * (alto + 38);
        const costo = costoDeEliminar(partida, carta);
        const puede = puedeEliminarCarta(partida, carta.id);
        const objeto = this.carta(x, y, carta, ancho, alto).setAlpha(puede ? 1 : 0.4);
        capa.add([objeto, this.add.text(x, y + alto / 2 + 12, String(costo), estiloTexto(16, COLORES.oro)).setOrigin(0.5)]);
        if (!puede) return;
        objeto.setSize(ancho, alto).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          const nombre = `${nombreRango(carta.rango)}${SIMBOLO_PALO[carta.palo]}`;
          capa.destroy(); // la confirmación queda debajo de la capa
          confirmar(this, `¿Eliminar ${nombre} por ${costo} de oro?`, 'Eliminar', COLORES.multi, () => {
            jugarPartida(this, eliminarCarta(partidaActual(this), carta.id));
            this.scene.restart();
          });
        });
      });
    });
  }

  private carta(x: number, y: number, carta: Carta, ancho: number, alto: number): Phaser.GameObjects.Container {
    const roja = carta.palo === 'corazones' || carta.palo === 'diamantes';
    const color = roja ? COLORES.cartaRoja : COLORES.cartaNegra;
    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.carta).fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, 6);
    const rango = this.add.text(-ancho / 2 + 6, -alto / 2 + 4, nombreRango(carta.rango), estiloTexto(18, color));
    const simbolo = this.add.text(0, 10, SIMBOLO_PALO[carta.palo], estiloTexto(30, color)).setOrigin(0.5);
    return this.add.container(x, y, [fondo, rango, simbolo]);
  }
}

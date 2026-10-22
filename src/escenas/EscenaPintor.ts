// Gustavo el austriaco (el pintor, nodo 🖌 del mapa): hace un solo trabajo por visita, a elegir.
//   Pintura libre  muestra una carta del mazo al azar; si se paga, le pone
//                  un modificador al azar.
//   Alquiler       el modificador ya está a la vista; se elige a cuál de 6
//                  cartas del mazo ponérselo.
//   Personalizado  solo con Claire obscure: se elige el modificador y la
//                  carta, de todo el mazo.
// Si el modificador es cambiar de palo, el jugador elige el palo nuevo.
// Después del trabajo se ve cómo quedó la carta y se sigue al mapa.
// "Seguir" vuelve al mapa sin pintar nada.

import Phaser from 'phaser';
import { MODIFICADORES, NOMBRE_MODIFICADOR, PALOS, SIMBOLO_PALO, nombreDeCarta, ordenarMano, type Carta, type Modificador, type Palo } from '../juego/cartas.ts';
import {
  COSTO_PINTURA_LIBRE,
  alquilar,
  cartasEnAlquiler,
  cerrarOferta,
  costoDeAlquiler,
  costoDePersonalizado,
  modificadorLibre,
  nivelDeRiesgo,
  ofrecePersonalizado,
  personalizar,
  pintarLibre,
  puedeAlquilar,
  puedePersonalizar,
  puedePintarLibre,
  type Partida,
} from '../juego/partida.ts';
import { crearBoton } from './boton.ts';
import { abrirCapa } from './capa.ts';
import { dibujarCarta } from './carta.ts';
import { confirmar } from './confirmar.ts';
import { mostrarCripto } from './cripto.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { mostrarBotonesInventario } from './inventario.ts';
import { mostrarOro } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { irAPartida, jugarPartida, partidaActual } from './sesion.ts';

const ALTO_PANEL = 360;

const NOMBRE_PALO: Record<Palo, string> = { picas: 'Picas', corazones: 'Corazones', treboles: 'Tréboles', diamantes: 'Diamantes' };

export class EscenaPintor extends Phaser.Scene {
  constructor() {
    super('pintor');
  }

  create(): void {
    const partida = partidaActual(this);
    const { width, height } = this.scale;
    mostrarOro(this, partida.oro);
    mostrarCripto(this, partida);
    mostrarRiesgo(this, nivelDeRiesgo(partida));
    mostrarBotonesInventario(this, () => partidaActual(this));
    const oferta = partida.oferta;
    const usado = (oferta?.usados?.length ?? 0) > 0;

    this.add.text(width / 2, 140, 'Gustavo el austriaco', estiloTexto(40)).setOrigin(0.5);
    const subtitulo = usado ? 'El pintor ya hizo su trabajo en esta visita' : 'Elige uno de sus servicios';
    this.add.text(width / 2, 190, subtitulo, estiloTexto(22, COLORES.textoSuave)).setOrigin(0.5);

    const personalizado = ofrecePersonalizado(partida);
    const paneles = personalizado ? 3 : 2;
    const ancho = personalizado ? 380 : 440;
    const xDe = (i: number) => width / 2 + (i - (paneles - 1) / 2) * (ancho + 30);
    const y = height / 2 + 50;
    const arriba = y - ALTO_PANEL / 2;
    const abajo = y + ALTO_PANEL / 2;

    // Pintura libre: la carta a la vista; pagar es aceptar.
    const libre = partida.mazo.find((c) => c.id === oferta?.cartaLibre);
    let x = xDe(0);
    this.panel(x, y, ancho, '🖌 Pintura libre', 'Toma esta carta de tu mazo y le pone un modificador al azar.');
    if (libre) dibujarCarta(this, x, arriba + 190, libre, 76, 106);
    crearBoton(this, x, abajo - 44, `Pintar · ${COSTO_PINTURA_LIBRE}`, COLORES.oro, () => {
      const pintarCon = (palo?: Palo) => {
        const { partida: pintada, modificador } = pintarLibre(partidaActual(this), palo);
        this.terminar(pintada, oferta!.cartaLibre!, modificador);
      };
      // Al tocar Pintar ya se aceptó: si toca cambiar de palo, no hay vuelta atrás.
      if (modificadorLibre(partida) === 'palo') this.elegirPalo(libre!, `Cambiar de palo a ${nombreDeCarta(libre!)} por ${COSTO_PINTURA_LIBRE} de oro`, pintarCon, false);
      else pintarCon();
    }, 240).activar(puedePintarLibre(partida));

    // Alquiler de servicio: el modificador sorteado, en una de 6 cartas.
    const modificador = oferta?.modificador ?? 'multi';
    const costoAlquiler = costoDeAlquiler(partida);
    x = xDe(1);
    this.panel(x, y, ancho, '🏷 Alquiler de servicio', `Pones este modificador en la carta que elijas de 6 de tu mazo. Cuesta 100 × las modificaciones que ya tienen esas 6.`);
    this.add.text(x, arriba + 200, NOMBRE_MODIFICADOR[modificador], estiloTexto(28, COLORES.oro)).setOrigin(0.5);
    crearBoton(this, x, abajo - 44, `Elegir carta · ${costoAlquiler}`, COLORES.oro, () => this.verAlquiler(partidaActual(this)), 260).activar(
      cartasEnAlquiler(partida).some((c) => puedeAlquilar(partida, c.id)),
    );

    // Personalizado (con Claire obscure): un botón por modificador.
    if (personalizado) {
      const costo = costoDePersonalizado(partida);
      x = xDe(2);
      this.panel(x, y, ancho, '🎨 Personalizado', `Eliges el modificador y la carta, de todo tu mazo. Cuesta 100 × las modificaciones de tu mazo.`);
      const puede = partida.mazo.some((c) => puedePersonalizar(partida, c.id));
      MODIFICADORES.forEach((m, i) => {
        crearBoton(this, x, abajo - 44 - (MODIFICADORES.length - 1 - i) * 62, `${NOMBRE_MODIFICADOR[m]} · ${costo}`, COLORES.oro, () => this.verMazo(partidaActual(this), m), 300).activar(puede);
      });
    }

    crearBoton(this, width - 150, height - 60, 'Seguir', COLORES.borde, () => this.seguir(), 240);
  }

  private panel(x: number, y: number, ancho: number, titulo: string, texto: string): void {
    this.add.rectangle(x, y, ancho, ALTO_PANEL, COLORES.panel).setStrokeStyle(2, COLORES.borde);
    this.add.text(x, y - ALTO_PANEL / 2 + 36, titulo, estiloTexto(26)).setOrigin(0.5);
    this.add
      .text(x, y - ALTO_PANEL / 2 + 68, texto, { ...estiloTexto(18, COLORES.textoSuave), align: 'center', wordWrap: { width: ancho - 50 } })
      .setOrigin(0.5, 0);
  }

  // Las 6 cartas del alquiler; tocar una pide confirmación.
  private verAlquiler(partida: Partida): void {
    const { width, height } = this.scale;
    const modificador = partida.oferta!.modificador!;
    const capa = abrirCapa(this, `¿A qué carta le pones ${NOMBRE_MODIFICADOR[modificador]}?`);
    const cartas = cartasEnAlquiler(partida);
    const costo = costoDeAlquiler(partida);
    cartas.forEach((carta, i) => {
      const x = width / 2 + (i - (cartas.length - 1) / 2) * 170;
      const objeto = dibujarCarta(this, x, height / 2 - 20, carta, 110, 154);
      capa.add(objeto);
      objeto.setSize(110, 154).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        capa.destroy(); // la confirmación queda debajo de la capa
        this.preguntar(carta, modificador, costo, (palo) => this.terminar(alquilar(partidaActual(this), carta.id, palo), carta.id, modificador));
      });
    });
  }

  // Todo el mazo por palo, de mayor a menor; tocar una carta pide
  // confirmación.
  private verMazo(partida: Partida, modificador: Modificador): void {
    const { width } = this.scale;
    const capa = abrirCapa(this, `¿A qué carta le pones ${NOMBRE_MODIFICADOR[modificador]}?`);
    const ordenadas = ordenarMano(partida.mazo, 'palo');
    const costo = costoDePersonalizado(partida);
    const ancho = 62;
    const alto = 86;
    PALOS.forEach((palo, fila) => {
      const cartas = ordenadas.filter((c) => c.palo === palo);
      const inicio = width / 2 - ((cartas.length - 1) * (ancho + 6)) / 2;
      cartas.forEach((carta, i) => {
        const objeto = dibujarCarta(this, inicio + i * (ancho + 6), 150 + fila * (alto + 24), carta, ancho, alto);
        capa.add(objeto);
        objeto.setSize(ancho, alto).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          capa.destroy();
          this.preguntar(carta, modificador, costo, (palo) => this.terminar(personalizar(partidaActual(this), carta.id, modificador, palo), carta.id, modificador));
        });
      });
    });
  }

  // Confirma el trabajo; si es cambiar de palo, elegir el palo es la
  // confirmación.
  private preguntar(carta: Carta, modificador: Modificador, costo: number, alAceptar: (palo?: Palo) => void): void {
    if (modificador === 'palo') this.elegirPalo(carta, `Cambiar de palo a ${nombreDeCarta(carta)} por ${costo} de oro`, alAceptar, true);
    else confirmar(this, `¿${NOMBRE_MODIFICADOR[modificador]} a ${nombreDeCarta(carta)} por ${costo} de oro?`, 'Pintar', COLORES.oro, () => alAceptar());
  }

  // Un botón por cada palo que no es el de la carta, y Cancelar si se puede.
  private elegirPalo(carta: Carta, titulo: string, alElegir: (palo: Palo) => void, cancelable: boolean): void {
    const { width, height } = this.scale;
    const capa = this.add.container(0, 0).setDepth(200);
    capa.add([
      this.add.rectangle(width / 2, height / 2, width, height, COLORES.fondo, 0.94).setInteractive(),
      this.add.text(width / 2, 120, titulo, estiloTexto(32)).setOrigin(0.5),
      this.add.text(width / 2, 170, '¿A qué palo?', estiloTexto(22, COLORES.textoSuave)).setOrigin(0.5),
      dibujarCarta(this, width / 2, 300, carta, 100, 140),
    ]);
    const otros = PALOS.filter((p) => p !== carta.palo);
    otros.forEach((palo, i) => {
      const x = width / 2 + (i - (otros.length - 1) / 2) * 240;
      capa.add(crearBoton(this, x, 460, `${SIMBOLO_PALO[palo]} ${NOMBRE_PALO[palo]}`, COLORES.oro, () => {
        capa.destroy();
        alElegir(palo);
      }, 210));
    });
    if (cancelable) capa.add(crearBoton(this, width / 2, height - 80, 'Cancelar', COLORES.borde, () => capa.destroy(), 240));
  }

  // Guarda la partida y muestra cómo quedó la carta; de ahí se sigue al mapa.
  private terminar(partida: Partida, id: string, modificador: Modificador): void {
    jugarPartida(this, partida);
    const { width, height } = this.scale;
    const carta: Carta = partida.mazo.find((c) => c.id === id)!;
    const detalle = modificador === 'palo' ? `Ahora es ${nombreDeCarta(carta)}` : nombreDeCarta(carta);
    this.add.container(0, 0, [
      this.add.rectangle(width / 2, height / 2, width, height, COLORES.fondo, 0.94).setInteractive(),
      this.add.text(width / 2, 120, NOMBRE_MODIFICADOR[modificador], estiloTexto(40, COLORES.oro)).setOrigin(0.5),
      dibujarCarta(this, width / 2, height / 2, carta, 150, 210),
      this.add.text(width / 2, height / 2 + 150, detalle, estiloTexto(26, COLORES.textoSuave)).setOrigin(0.5),
      crearBoton(this, width / 2, height - 80, 'Seguir', COLORES.borde, () => this.seguir(), 240),
    ]).setDepth(200);
  }

  private seguir(): void {
    const cerrada = cerrarOferta(partidaActual(this));
    jugarPartida(this, cerrada);
    irAPartida(this, cerrada);
  }
}

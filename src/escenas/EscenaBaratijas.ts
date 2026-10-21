// Las dos pantallas de ofertas de baratijas, según partida.oferta:
//   'elite'     la recompensa de vencer a un élite: se elige 1 de 3, o se
//               pasa a cambio de oro.
//   'vendedor'  el vendedor de baratijas: se compran con oro las que
//               alcancen, y "Pasar" vuelve al mapa.
// Si una baratija recién conseguida pide un número, antes se muestra esa
// pregunta. La partida se guarda después de cada elección o compra.

import Phaser from 'phaser';
import { buscarBaratija, precioDe } from '../juego/baratijas.ts';
import { ORO_POR_PASAR, cerrarOferta, comprarBaratija, elegirBaratija, nivelDeRiesgo, puedeComprar, responderEleccion, type Partida } from '../juego/partida.ts';
import { crearBoton } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { fichaDeBaratija, mostrarBotonesInventario } from './inventario.ts';
import { mostrarOro } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { irAPartida, jugarPartida, partidaActual } from './sesion.ts';

const ANCHO = 300;
const ALTO = 190;

export class EscenaBaratijas extends Phaser.Scene {
  constructor() {
    super('baratijas');
  }

  create(): void {
    const partida = partidaActual(this);
    const { width, height } = this.scale;
    mostrarOro(this, partida.oro);
    mostrarRiesgo(this, nivelDeRiesgo(partida));
    mostrarBotonesInventario(this, () => partidaActual(this));
    if (partida.eleccion) {
      this.preguntar(partida);
      return;
    }
    const oferta = partida.oferta;
    if (!oferta) {
      this.scene.start('mapa');
      return;
    }
    const esElite = oferta.tipo === 'elite';

    this.add.text(width / 2, 140, esElite ? 'Elige una baratija' : 'Vendedor de baratijas', estiloTexto(40)).setOrigin(0.5);
    this.add
      .text(width / 2, 190, esElite ? 'Recompensa por vencer al élite' : 'Paga con oro lo que quieras llevarte', estiloTexto(22, COLORES.textoSuave))
      .setOrigin(0.5);
    if (oferta.baratijas.length === 0) {
      this.add.text(width / 2, height / 2, 'Ya no queda nada a la venta.', estiloTexto(26, COLORES.textoSuave)).setOrigin(0.5);
    }
    oferta.baratijas.forEach((id, i) => {
      const x = width / 2 + (i - (oferta.baratijas.length - 1) / 2) * (ANCHO + 40);
      const y = height / 2 + 20;
      const baratija = buscarBaratija(id);
      fichaDeBaratija(this, x, y, baratija, ANCHO, ALTO);
      if (esElite) {
        crearBoton(this, x, y + ALTO / 2 + 50, 'Elegir', COLORES.acento, () => this.guardarYSeguir(elegirBaratija(partida, id)));
      } else {
        const boton = crearBoton(this, x, y + ALTO / 2 + 50, `Comprar · ${precioDe(baratija)}`, COLORES.oro, () => {
          jugarPartida(this, comprarBaratija(partida, id));
          this.scene.restart();
        }, 220);
        boton.activar(puedeComprar(partida, id));
      }
    });

    const pasar = esElite ? `Pasar · +${ORO_POR_PASAR} oro` : 'Pasar';
    crearBoton(this, width - 150, height - 60, pasar, COLORES.borde, () => this.guardarYSeguir(cerrarOferta(partida)), 240);
  }

  // La baratija recién conseguida y un botón por cada número posible.
  private preguntar(partida: Partida): void {
    const { width, height } = this.scale;
    const { baratija: id, maximo } = partida.eleccion!;
    const baratija = buscarBaratija(id);
    this.add.text(width / 2, 140, baratija.pregunta?.texto ?? 'Elige un número', estiloTexto(32)).setOrigin(0.5);
    fichaDeBaratija(this, width / 2, height / 2 - 30, baratija, ANCHO, ALTO);
    const separacion = 80;
    for (let numero = 1; numero <= maximo; numero++) {
      const x = width / 2 + (numero - (maximo + 1) / 2) * separacion;
      crearBoton(this, x, height / 2 + 130, String(numero), COLORES.acento, () => this.guardarYSeguir(responderEleccion(partida, numero)), 64);
    }
  }

  private guardarYSeguir(partida: Partida): void {
    jugarPartida(this, partida);
    irAPartida(this, partida);
  }
}

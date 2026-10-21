// La tienda de cartas (nodo $ del mapa): 6 cartas al azar a la venta, cada
// una por 5 × el nivel de riesgo. Las compradas pasan al mazo. "Seguir"
// vuelve al mapa. La partida se guarda después de cada compra.

import Phaser from 'phaser';
import { cerrarOferta, comprarCarta, costoDeCarta, nivelDeRiesgo, puedeComprarCarta } from '../juego/partida.ts';
import { crearBoton } from './boton.ts';
import { dibujarCarta } from './carta.ts';
import { mostrarCripto } from './cripto.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { mostrarBotonesInventario } from './inventario.ts';
import { mostrarOro } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { irAPartida, jugarPartida, partidaActual } from './sesion.ts';

const ANCHO_CARTA = 110;
const ALTO_CARTA = 154;

export class EscenaTienda extends Phaser.Scene {
  constructor() {
    super('tienda');
  }

  create(): void {
    const partida = partidaActual(this);
    const { width, height } = this.scale;
    mostrarOro(this, partida.oro);
    mostrarCripto(this, partida);
    mostrarRiesgo(this, nivelDeRiesgo(partida));
    mostrarBotonesInventario(this, () => partidaActual(this));
    const cartas = partida.oferta?.cartas ?? [];
    const costo = costoDeCarta(partida);

    this.add.text(width / 2, 140, 'Tienda de cartas', estiloTexto(40)).setOrigin(0.5);
    this.add.text(width / 2, 190, `Cada carta cuesta ${costo} de oro y pasa a tu mazo`, estiloTexto(22, COLORES.textoSuave)).setOrigin(0.5);
    if (cartas.length === 0) {
      this.add.text(width / 2, height / 2, 'Ya no queda nada a la venta.', estiloTexto(26, COLORES.textoSuave)).setOrigin(0.5);
    }

    const separacion = 180;
    cartas.forEach((carta, i) => {
      const x = width / 2 + (i - (cartas.length - 1) / 2) * separacion;
      const y = height / 2;
      dibujarCarta(this, x, y, carta, ANCHO_CARTA, ALTO_CARTA);
      const boton = crearBoton(this, x, y + ALTO_CARTA / 2 + 50, `Comprar · ${costo}`, COLORES.oro, () => {
        jugarPartida(this, comprarCarta(partidaActual(this), carta.id));
        this.scene.restart();
      }, 160);
      boton.activar(puedeComprarCarta(partida, carta.id));
    });

    crearBoton(this, width - 150, height - 60, 'Seguir', COLORES.borde, () => {
      const cerrada = cerrarOferta(partidaActual(this));
      jugarPartida(this, cerrada);
      irAPartida(this, cerrada);
    }, 240);
  }
}

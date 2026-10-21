// La tienda de cartas (nodo $ del mapa): 6 cartas al azar a la venta, cada
// una por 5 × el nivel de riesgo. Las compradas pasan al mazo. "Seguir"
// vuelve al mapa. La partida se guarda después de cada compra.

import Phaser from 'phaser';
import { SIMBOLO_PALO, nombreRango, type Carta } from '../juego/cartas.ts';
import { cerrarOferta, comprarCarta, costoDeCarta, nivelDeRiesgo, puedeComprarCarta } from '../juego/partida.ts';
import { crearBoton } from './boton.ts';
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
      this.carta(x, y, carta);
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

  private carta(x: number, y: number, carta: Carta): void {
    const roja = carta.palo === 'corazones' || carta.palo === 'diamantes';
    const color = roja ? COLORES.cartaRoja : COLORES.cartaNegra;
    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.carta).fillRoundedRect(-ANCHO_CARTA / 2, -ALTO_CARTA / 2, ANCHO_CARTA, ALTO_CARTA, 10);
    fondo.lineStyle(2, COLORES.borde).strokeRoundedRect(-ANCHO_CARTA / 2, -ALTO_CARTA / 2, ANCHO_CARTA, ALTO_CARTA, 10);
    const rango = this.add.text(-ANCHO_CARTA / 2 + 10, -ALTO_CARTA / 2 + 6, nombreRango(carta.rango), estiloTexto(28, color));
    const palo = this.add.text(0, 12, SIMBOLO_PALO[carta.palo], estiloTexto(56, color)).setOrigin(0.5);
    this.add.container(x, y, [fondo, rango, palo]);
  }
}

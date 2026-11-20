// El evento (nodo ? del mapa): un regalo, sorteado al llegar.
//   El regalo de Raimundo  hay que elegir 1 de 9 cartas para el mazo; no
//                          se puede seguir sin elegir.
//   El regalo de Gustavo   ya duplicó las modificaciones de la carta más
//                          modificada y se ve cómo quedó; si no había
//                          ninguna, se ofendió y se fue.
// La partida se guarda al elegir la carta o al seguir.

import Phaser from 'phaser';
import { nombreDeCarta } from '../juego/cartas.ts';
import { cerrarOferta, elegirCartaDelRegalo, nivelDeRiesgo } from '../juego/partida.ts';
import { crearBoton } from './boton.ts';
import { dibujarCarta } from './carta.ts';
import { confirmar } from './confirmar.ts';
import { mostrarCripto } from './cripto.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { mostrarBotonesInventario } from './inventario.ts';
import { mostrarOro } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { irAPartida, jugarPartida, partidaActual } from './sesion.ts';
import { retratoJuntoA } from './pixel/texturas.ts';

const ANCHO_CARTA = 96;
const ALTO_CARTA = 134;

export class EscenaEvento extends Phaser.Scene {
  constructor() {
    super('evento');
  }

  create(): void {
    const partida = partidaActual(this);
    const { width, height } = this.scale;
    mostrarOro(this, partida.oro);
    mostrarCripto(this, partida);
    mostrarRiesgo(this, nivelDeRiesgo(partida));
    mostrarBotonesInventario(this, () => partidaActual(this));
    const oferta = partida.oferta;

    if (oferta?.evento === 'regaloRaimundo') {
      retratoJuntoA(this, this.add.text(width / 2, 140, 'El regalo de Raimundo', estiloTexto(40)).setOrigin(0.5), 'raimundo');
      this.add.text(width / 2, 190, 'Raimundo insiste: elige una de estas cartas para tu mazo', estiloTexto(22, COLORES.textoSuave)).setOrigin(0.5);
      const cartas = oferta.cartas ?? [];
      cartas.forEach((carta, i) => {
        const x = width / 2 + (i - (cartas.length - 1) / 2) * (ANCHO_CARTA + 22);
        const objeto = dibujarCarta(this, x, height / 2 + 20, carta, ANCHO_CARTA, ALTO_CARTA);
        objeto.setSize(ANCHO_CARTA, ALTO_CARTA).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          confirmar(this, `¿Agregar ${nombreDeCarta(carta)} a tu mazo?`, 'Agregar', COLORES.acento, () => {
            const con = elegirCartaDelRegalo(partidaActual(this), carta.id);
            jugarPartida(this, con);
            irAPartida(this, con);
          });
        });
      });
      return;
    }

    // El regalo de Gustavo.
    retratoJuntoA(this, this.add.text(width / 2, 140, 'El regalo de Gustavo', estiloTexto(40)).setOrigin(0.5), 'gustavo');
    const carta = partida.mazo.find((c) => c.id === oferta?.cartaLibre);
    if (carta) {
      this.add.text(width / 2, 190, `Duplicó las modificaciones de tu carta más modificada: ${nombreDeCarta(carta)}`, estiloTexto(22, COLORES.textoSuave)).setOrigin(0.5);
      dibujarCarta(this, width / 2, height / 2 + 30, carta, 150, 210);
    } else {
      this.add
        .text(width / 2, height / 2, 'Ninguna de tus cartas tiene modificaciones.\nGustavo se ofende y se va.', { ...estiloTexto(26, COLORES.textoSuave), align: 'center' })
        .setOrigin(0.5);
    }
    crearBoton(this, width - 150, height - 60, 'Seguir', COLORES.borde, () => {
      const cerrada = cerrarOferta(partidaActual(this));
      jugarPartida(this, cerrada);
      irAPartida(this, cerrada);
    }, 240);
  }
}

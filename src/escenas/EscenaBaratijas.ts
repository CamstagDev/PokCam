// Las dos pantallas de ofertas de baratijas, según partida.oferta:
//   'elite'     la recompensa de vencer a un élite: se elige 1 de 3 (o se
//               saltea).
//   'vendedor'  el vendedor de baratijas: se compran con oro las que
//               alcancen, y "Seguir" vuelve al mapa.
// La partida se guarda después de cada elección o compra.

import Phaser from 'phaser';
import { buscarBaratija } from '../juego/baratijas.ts';
import { cerrarOferta, comprarBaratija, elegirBaratija, nivelDeRiesgo, puedeComprar, type Partida } from '../juego/partida.ts';
import { crearBoton } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { fichaDeBaratija, mostrarBotonesInventario } from './inventario.ts';
import { mostrarOro } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { jugarPartida, partidaActual } from './sesion.ts';

const ANCHO = 300;
const ALTO = 190;

export class EscenaBaratijas extends Phaser.Scene {
  constructor() {
    super('baratijas');
  }

  create(): void {
    const partida = partidaActual(this);
    const oferta = partida.oferta;
    if (!oferta) {
      this.scene.start('mapa');
      return;
    }
    const { width, height } = this.scale;
    const esElite = oferta.tipo === 'elite';

    this.add.text(width / 2, 140, esElite ? 'Elige una baratija' : 'Vendedor de baratijas', estiloTexto(40)).setOrigin(0.5);
    this.add
      .text(width / 2, 190, esElite ? 'Recompensa por vencer al élite' : 'Paga con oro lo que quieras llevarte', estiloTexto(22, COLORES.textoSuave))
      .setOrigin(0.5);
    mostrarOro(this, partida.oro);
    mostrarRiesgo(this, nivelDeRiesgo(partida));
    mostrarBotonesInventario(this, () => partidaActual(this));

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
        const boton = crearBoton(this, x, y + ALTO / 2 + 50, `Comprar · ${baratija.precio}`, COLORES.oro, () => {
          jugarPartida(this, comprarBaratija(partida, id));
          this.scene.restart();
        }, 220);
        boton.activar(puedeComprar(partida, id));
      }
    });

    crearBoton(this, width - 140, height - 60, esElite ? 'Saltear' : 'Seguir', COLORES.borde, () =>
      this.guardarYSeguir(cerrarOferta(partida)),
    );
  }

  private guardarYSeguir(partida: Partida): void {
    jugarPartida(this, partida);
    this.scene.start('mapa');
  }
}

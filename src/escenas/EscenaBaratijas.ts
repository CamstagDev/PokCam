// Las dos pantallas de ofertas de baratijas, según partida.oferta:
//   'elite'     la recompensa de vencer a un élite: se elige 1 de 3, o se
//               pasa a cambio de oro.
//   'vendedor'  el vendedor de baratijas: se compran con oro las que
//               alcancen, se le venden las propias por la mitad, se
//               vuelve a tirar por otras, y "Pasar" vuelve al mapa.
// Si una baratija recién conseguida pide un número, antes se muestra esa
// pregunta. La partida se guarda después de cada elección o compra.

import Phaser from 'phaser';
import { DATOS_RAREZA, baratijasDe, buscarBaratija } from '../juego/baratijas.ts';
import {
  ORO_POR_PASAR,
  cerrarOferta,
  comprarBaratija,
  costoDeTirada,
  elegirBaratija,
  nivelDeRiesgo,
  precioDeBaratija,
  puedeComprar,
  puedePasarRecompensa,
  puedeVolverATirar,
  responderEleccion,
  puedeVenderBaratijas,
  valorAlVender,
  venderBaratija,
  volverATirar,
  type Partida,
} from '../juego/partida.ts';
import { abrirCapa } from './capa.ts';
import { crearBoton } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { COLOR_RAREZA, fichaDeBaratija, mostrarBotonesInventario } from './inventario.ts';
import { mostrarCripto } from './cripto.ts';
import { mostrarOro } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { irAPartida, jugarPartida, partidaActual } from './sesion.ts';
import { pixelArt, retratoJuntoA } from './pixel/texturas.ts';

const ANCHO = 300;
const ALTO = 190;

export class EscenaBaratijas extends Phaser.Scene {
  constructor() {
    super('baratijas');
  }

  create(datos: { vender?: boolean } = {}): void {
    const partida = partidaActual(this);
    const { width, height } = this.scale;
    mostrarOro(this, partida.oro);
    mostrarCripto(this, partida);
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

    const titulo = this.add.text(width / 2, 140, esElite ? 'Elige una baratija' : 'Raimundo el vendedor del mundo', estiloTexto(40)).setOrigin(0.5);
    if (!esElite) retratoJuntoA(this, titulo, 'raimundo');
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
        const boton = crearBoton(this, x, y + ALTO / 2 + 50, `Comprar · ${precioDeBaratija(partida, id)}`, COLORES.oro, () => {
          jugarPartida(this, comprarBaratija(partida, id));
          this.scene.restart();
        }, 220);
        boton.activar(puedeComprar(partida, id));
      }
    });

    if (!esElite) {
      // Vender solo aparece con el Bróker; si no, el botón de tirar va al centro.
      const vende = puedeVenderBaratijas(partida);
      if (vende) crearBoton(this, width / 2 - 150, height - 60, 'Vender baratijas', COLORES.borde, () => this.verVenta(partidaActual(this)), 260);
      const tirar = crearBoton(this, vende ? width / 2 + 150 : width / 2, height - 60, `Volver a tirar · ${costoDeTirada(partida)}`, COLORES.oro, () => {
        jugarPartida(this, volverATirar(partidaActual(this)));
        this.scene.restart();
      }, 280);
      tirar.activar(puedeVolverATirar(partida));
      if (datos.vender) this.verVenta(partida);
    }

    // La recompensa del élite solo se puede pasar con No gracias.
    if (!esElite || puedePasarRecompensa(partida)) {
      const pasar = esElite ? `Pasar · +${ORO_POR_PASAR} oro` : 'Pasar';
      crearBoton(this, width - 150, height - 60, pasar, COLORES.borde, () => this.guardarYSeguir(cerrarOferta(partida)), 240);
    }
  }

  // Las baratijas del jugador, cada una con lo que paga el vendedor por
  // ella. Después de vender, la escena vuelve con esta lista abierta.
  private verVenta(partida: Partida): void {
    const { width, height } = this.scale;
    const baratijas = baratijasDe(partida.baratijas);
    const capa = abrirCapa(this, 'Vender baratijas');
    if (baratijas.length === 0) {
      capa.add(this.add.text(width / 2, height / 2 - 40, 'No tienes baratijas para vender.', estiloTexto(26, COLORES.textoSuave)).setOrigin(0.5));
      return;
    }
    capa.add(this.add.text(width / 2, 105, 'El vendedor paga la mitad de su precio', estiloTexto(20, COLORES.textoSuave)).setOrigin(0.5));
    // En una columna, o en más si no caben.
    const porColumna = 7;
    const columnas = Math.ceil(baratijas.length / porColumna);
    const ancho = columnas > 2 ? 400 : columnas > 1 ? 580 : 640;
    baratijas.forEach((baratija, i) => {
      const columna = Math.floor(i / porColumna);
      const x = width / 2 + (columna - (columnas - 1) / 2) * (ancho + 20);
      const y = 160 + (i % porColumna) * 62;
      const color = COLOR_RAREZA[baratija.rareza];
      capa.add([
        this.add.rectangle(x, y, ancho, 54, COLORES.panel).setStrokeStyle(2, color),
        pixelArt(this, x - ancho / 2 + 14, y, 'baratija', baratija.id, 32).setOrigin(0, 0.5),
        this.add.text(x - ancho / 2 + 60, y - 10, baratija.nombre, estiloTexto(20)).setOrigin(0, 0.5),
        this.add.text(x - ancho / 2 + 60, y + 13, DATOS_RAREZA[baratija.rareza].nombre, estiloTexto(14, color)).setOrigin(0, 0.5),
        crearBoton(this, x + ancho / 2 - 100, y, `Vender · ${valorAlVender(partida, baratija.id)}`, COLORES.oro, () => {
          jugarPartida(this, venderBaratija(partidaActual(this), baratija.id));
          this.scene.restart({ vender: true });
        }, 180),
      ]);
    });
  }

  // La baratija recién conseguida y un botón por cada número posible.
  private preguntar(partida: Partida): void {
    const { width, height } = this.scale;
    const { baratija: id, maximo } = partida.eleccion!;
    const baratija = buscarBaratija(id);
    this.add.text(width / 2, 140, baratija.pregunta?.texto ?? 'Elige un número', estiloTexto(32)).setOrigin(0.5);
    fichaDeBaratija(this, width / 2, height / 2 - 30, baratija, ANCHO, ALTO);
    const opciones = baratija.pregunta?.opciones;
    if (opciones) {
      // Una fila de botones con nombre, de 5 en 5.
      const porFila = 5;
      for (let numero = 1; numero <= maximo; numero++) {
        const fila = Math.floor((numero - 1) / porFila);
        const enFila = Math.min(porFila, maximo - fila * porFila);
        const x = width / 2 + (((numero - 1) % porFila) - (enFila - 1) / 2) * 216;
        crearBoton(this, x, height / 2 + 110 + fila * 70, opciones[numero - 1] ?? String(numero), COLORES.acento, () => this.guardarYSeguir(responderEleccion(partida, numero)), 204);
      }
      return;
    }
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

// La mano negra (nodo ✋ del mapa): al llegar se sortean 3 manos de póker y
// se puede subir un nivel a una de ellas, una vez por visita. Cada ficha
// muestra la mano en su nivel y cómo queda en el siguiente. "Seguir" vuelve
// al mapa. La partida se guarda después de mejorar.

import Phaser from 'phaser';
import { datosDeMano } from '../juego/manos.ts';
import { cerrarOferta, costoDeMejorar, mejorarMano, nivelDeRiesgo, puedeMejorarMano } from '../juego/partida.ts';
import { crearBoton } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { mostrarBotonesInventario } from './inventario.ts';
import { mostrarCripto } from './cripto.ts';
import { mostrarOro } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { irAPartida, jugarPartida, partidaActual } from './sesion.ts';

const ANCHO = 300;
const ALTO = 230;

export class EscenaManoNegra extends Phaser.Scene {
  constructor() {
    super('manoNegra');
  }

  create(): void {
    const partida = partidaActual(this);
    const { width, height } = this.scale;
    mostrarOro(this, partida.oro);
    mostrarCripto(this, partida);
    mostrarRiesgo(this, nivelDeRiesgo(partida));
    mostrarBotonesInventario(this, () => partidaActual(this));
    const manos = partida.oferta?.manos ?? [];
    const usada = partida.oferta?.usados?.includes('mejorar') ?? false;
    const costo = costoDeMejorar(partida);

    this.add.text(width / 2, 140, 'La mano negra', estiloTexto(40)).setOrigin(0.5);
    const subtitulo = usada ? 'Ya mejoraste una mano en esta visita' : `Sube un nivel a una de estas manos por ${costo} de oro`;
    this.add.text(width / 2, 190, subtitulo, estiloTexto(22, COLORES.textoSuave)).setOrigin(0.5);

    manos.forEach((tipo, i) => {
      const x = width / 2 + (i - (manos.length - 1) / 2) * (ANCHO + 40);
      const y = height / 2 + 20;
      const nivel = partida.niveles[tipo];
      const ahora = datosDeMano(tipo, nivel);
      const despues = datosDeMano(tipo, nivel + 1);
      this.add.rectangle(x, y, ANCHO, ALTO, COLORES.panel).setStrokeStyle(2, COLORES.borde);
      this.add.text(x, y - 80, ahora.nombre, estiloTexto(26)).setOrigin(0.5);
      this.add.text(x, y - 42, `Nivel ${nivel} → ${nivel + 1}`, estiloTexto(20, COLORES.oro)).setOrigin(0.5);
      this.add.text(x, y + 2, `${ahora.fichas} × ${ahora.multi}`, estiloTexto(22, COLORES.textoSuave)).setOrigin(0.5);
      this.add.text(x, y + 36, `→ ${despues.fichas} × ${despues.multi}`, estiloTexto(24)).setOrigin(0.5);
      this.add.text(x, y + 72, 'fichas × multi', estiloTexto(15, COLORES.textoSuave)).setOrigin(0.5);
      const boton = crearBoton(this, x, y + ALTO / 2 + 50, usada ? 'Mejorar' : `Mejorar · ${costo}`, COLORES.oro, () => {
        jugarPartida(this, mejorarMano(partidaActual(this), tipo));
        this.scene.restart();
      }, 220);
      boton.activar(puedeMejorarMano(partida, tipo));
    });

    crearBoton(this, width - 150, height - 60, 'Seguir', COLORES.borde, () => {
      const cerrada = cerrarOferta(partidaActual(this));
      jugarPartida(this, cerrada);
      irAPartida(this, cerrada);
    }, 240);
  }
}

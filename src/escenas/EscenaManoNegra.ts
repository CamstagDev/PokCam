// Helman O'Grande (la mano negra, nodo ✋ del mapa): al llegar se sortean 3 manos de póker y
// se puede subir un nivel a una de ellas, una vez por visita. Cada ficha
// muestra la mano en su nivel y cómo queda en el siguiente. Al mejorar, la
// ficha se da vuelta y del otro lado está la mano en su nivel nuevo; un
// segundo después se sigue sola al mapa. "Seguir" vuelve al mapa sin
// mejorar. La partida se guarda después de mejorar.

import Phaser from 'phaser';
import { datosDeMano } from '../juego/manos.ts';
import { cerrarOferta, costoDeMejorar, mejorarMano, nivelDeRiesgo, puedeMejorarMano } from '../juego/partida.ts';
import { crearBoton, type Boton } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { mostrarBotonesInventario } from './inventario.ts';
import { mostrarCripto } from './cripto.ts';
import { mostrarOro } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { irAPartida, jugarPartida, partidaActual } from './sesion.ts';

const ANCHO = 300;
const ALTO = 230;
const MEDIA_VUELTA = 180; // ms de cada mitad del giro de la ficha
const ESPERA_AL_MEJORAR = 1000; // ms con la ficha nueva a la vista antes de seguir

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

    this.add.text(width / 2, 140, "Helman O'Grande", estiloTexto(40)).setOrigin(0.5);
    const subtitulo = usada ? 'Ya mejoraste una mano en esta visita' : `Sube un nivel a una de estas manos por ${costo} de oro`;
    this.add.text(width / 2, 190, subtitulo, estiloTexto(22, COLORES.textoSuave)).setOrigin(0.5);

    const botones: Boton[] = [];
    manos.forEach((tipo, i) => {
      const x = width / 2 + (i - (manos.length - 1) / 2) * (ANCHO + 40);
      const y = height / 2 + 20;
      const nivel = partida.niveles[tipo];
      const ahora = datosDeMano(tipo, nivel);
      const despues = datosDeMano(tipo, nivel + 1);
      const fondo = this.add.rectangle(0, 0, ANCHO, ALTO, COLORES.panel).setStrokeStyle(2, COLORES.borde);
      const frente = [
        this.add.text(0, -80, ahora.nombre, estiloTexto(26)).setOrigin(0.5),
        this.add.text(0, -42, `Nivel ${nivel} → ${nivel + 1}`, estiloTexto(20, COLORES.oro)).setOrigin(0.5),
        this.add.text(0, 2, `${ahora.fichas} × ${ahora.multi}`, estiloTexto(22, COLORES.textoSuave)).setOrigin(0.5),
        this.add.text(0, 36, `→ ${despues.fichas} × ${despues.multi}`, estiloTexto(24)).setOrigin(0.5),
        this.add.text(0, 72, 'fichas × multi', estiloTexto(15, COLORES.textoSuave)).setOrigin(0.5),
      ];
      const ficha = this.add.container(x, y, [fondo, ...frente]);
      const boton = crearBoton(this, x, y + ALTO / 2 + 50, usada ? 'Mejorar' : `Mejorar · ${costo}`, COLORES.oro, () => {
        jugarPartida(this, mejorarMano(partidaActual(this), tipo));
        for (const b of botones) b.activar(false);
        // Media vuelta hasta quedar de canto, se cambia lo que muestra y
        // termina de girar ya con la mano en su nivel nuevo.
        this.tweens.add({
          targets: ficha,
          scaleX: 0,
          duration: MEDIA_VUELTA,
          ease: 'Sine.easeIn',
          onComplete: () => {
            for (const t of frente) t.destroy();
            fondo.setStrokeStyle(3, COLORES.oro);
            ficha.add([
              this.add.text(0, -60, despues.nombre, estiloTexto(26)).setOrigin(0.5),
              this.add.text(0, -18, `Nivel ${nivel + 1}`, estiloTexto(24, COLORES.oro)).setOrigin(0.5),
              this.add.text(0, 30, `${despues.fichas} × ${despues.multi}`, estiloTexto(30)).setOrigin(0.5),
              this.add.text(0, 72, 'fichas × multi', estiloTexto(15, COLORES.textoSuave)).setOrigin(0.5),
            ]);
            this.tweens.add({
              targets: ficha,
              scaleX: 1,
              duration: MEDIA_VUELTA,
              ease: 'Sine.easeOut',
              onComplete: () => this.time.delayedCall(ESPERA_AL_MEJORAR, () => this.seguir()),
            });
          },
        });
      }, 220);
      boton.activar(puedeMejorarMano(partida, tipo));
      botones.push(boton);
    });

    botones.push(crearBoton(this, width - 150, height - 60, 'Seguir', COLORES.borde, () => this.seguir(), 240));
  }

  private seguir(): void {
    const cerrada = cerrarOferta(partidaActual(this));
    jugarPartida(this, cerrada);
    irAPartida(this, cerrada);
  }
}

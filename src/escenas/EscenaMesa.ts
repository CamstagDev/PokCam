// La mesa de un combate: la mano de 8 cartas abajo, se tocan de 1 a 5 para
// elegirlas y se juegan o se descartan. Arriba, cuánto falta para el
// objetivo. Las reglas están en juego/combate.ts; aquí solo se dibujan.

import Phaser from 'phaser';
import { crearAleatorio } from '../juego/aleatorio.ts';
import { SIMBOLO_PALO, nombreRango, type Carta } from '../juego/cartas.ts';
import { MAX_CARTAS_JUGADAS, crearCombate, descartar, jugar, type Combate } from '../juego/combate.ts';
import { MANOS, evaluarMano } from '../juego/manos.ts';
import { ganarCombate } from '../juego/partida.ts';
import type { TipoNodo } from '../mapa/mapa.ts';
import { crearBoton, type Boton } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { jugarPartida, partidaActual, terminarPartida } from './sesion.ts';

const OBJETIVOS: Partial<Record<TipoNodo, number>> = { combate: 300, elite: 500, jefe: 800 };

const ANCHO_CARTA = 110;
const ALTO_CARTA = 154;
const Y_CARTAS = 500;
const SUBIDA_ELEGIDA = 30;

export class EscenaMesa extends Phaser.Scene {
  private combate!: Combate;
  private tipo: TipoNodo = 'combate';
  private elegidas = new Set<string>();
  private cartas = new Map<string, Phaser.GameObjects.Container>();
  private marcador!: Phaser.GameObjects.Text;
  private jugada!: Phaser.GameObjects.Text;
  private botonJugar!: Boton;
  private botonDescartar!: Boton;

  constructor() {
    super('mesa');
  }

  init(datos: { tipo: TipoNodo }): void {
    this.tipo = datos.tipo;
    this.elegidas.clear();
    this.cartas.clear();
  }

  create(): void {
    const partida = partidaActual(this);
    const aleatorio = crearAleatorio(partida.mapa.semilla + partida.visitados.length);
    this.combate = crearCombate(aleatorio, { objetivo: OBJETIVOS[this.tipo] ?? 300 });

    const { width } = this.scale;
    this.marcador = this.add.text(40, 30, '', estiloTexto(24)).setLineSpacing(8);
    this.jugada = this.add.text(width / 2, 250, '', estiloTexto(34)).setOrigin(0.5);
    this.botonJugar = crearBoton(this, width / 2 - 120, 660, 'Jugar mano', COLORES.fichas, () => this.accion(jugar));
    this.botonDescartar = crearBoton(this, width / 2 + 120, 660, 'Descartar', COLORES.multi, () => this.accion(descartar));
    this.actualizar();
  }

  private accion(hacer: (combate: Combate, ids: string[]) => Combate): void {
    const ids = [...this.elegidas];
    for (const id of ids) this.cartas.get(id)?.destroy();
    for (const id of ids) this.cartas.delete(id);
    this.elegidas.clear();
    this.combate = hacer(this.combate, ids);
    this.actualizar();
    if (hacer === jugar) {
      this.tweens.add({ targets: this.jugada, scale: { from: 1.3, to: 1 }, duration: 250, ease: 'Back.easeOut' });
    }
    if (this.combate.estado !== 'jugando') this.terminar();
  }

  private actualizar(): void {
    const c = this.combate;
    this.marcador.setText([
      `Objetivo: ${c.objetivo}`,
      `Puntos: ${c.puntos}`,
      `Manos: ${c.manosRestantes}   Descartes: ${c.descartesRestantes}`,
    ]);
    // Con cartas elegidas se anticipa qué mano se jugaría (solo el nombre);
    // sin elegir, queda el resultado de la última jugada.
    if (this.elegidas.size > 0) {
      const cartas = c.mano.filter((carta) => this.elegidas.has(carta.id));
      this.jugada.setText(MANOS[evaluarMano(cartas).tipo].nombre);
    } else if (c.ultimaJugada) {
      const j = c.ultimaJugada;
      this.jugada.setText(`${MANOS[j.tipo].nombre}: ${j.fichas} × ${j.multi} = ${j.total}`);
    } else {
      this.jugada.setText('');
    }
    this.dibujarMano();
    const hayElegidas = this.elegidas.size > 0;
    this.botonJugar.activar(hayElegidas && c.estado === 'jugando');
    this.botonDescartar.activar(hayElegidas && c.descartesRestantes > 0 && c.estado === 'jugando');
  }

  // Las cartas que ya estaban se deslizan a su lugar nuevo; las recién
  // robadas entran desde la derecha.
  private dibujarMano(): void {
    const { width } = this.scale;
    const separacion = ANCHO_CARTA + 14;
    const inicio = width / 2 - ((this.combate.mano.length - 1) * separacion) / 2;
    this.combate.mano.forEach((carta, i) => {
      const x = inicio + i * separacion;
      const y = Y_CARTAS - (this.elegidas.has(carta.id) ? SUBIDA_ELEGIDA : 0);
      let objeto = this.cartas.get(carta.id);
      if (!objeto) {
        objeto = this.crearCarta(carta, width + ANCHO_CARTA, Y_CARTAS);
        this.cartas.set(carta.id, objeto);
      }
      this.tweens.add({ targets: objeto, x, y, duration: 220, ease: 'Cubic.easeOut' });
    });
  }

  private crearCarta(carta: Carta, x: number, y: number): Phaser.GameObjects.Container {
    const roja = carta.palo === 'corazones' || carta.palo === 'diamantes';
    const color = roja ? COLORES.cartaRoja : COLORES.cartaNegra;
    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.carta).fillRoundedRect(-ANCHO_CARTA / 2, -ALTO_CARTA / 2, ANCHO_CARTA, ALTO_CARTA, 10);
    fondo.lineStyle(2, COLORES.borde).strokeRoundedRect(-ANCHO_CARTA / 2, -ALTO_CARTA / 2, ANCHO_CARTA, ALTO_CARTA, 10);
    const rango = this.add.text(-ANCHO_CARTA / 2 + 10, -ALTO_CARTA / 2 + 6, nombreRango(carta.rango), estiloTexto(28, color));
    const palo = this.add.text(0, 12, SIMBOLO_PALO[carta.palo], estiloTexto(56, color)).setOrigin(0.5);

    const objeto = this.add.container(x, y, [fondo, rango, palo]);
    objeto.setSize(ANCHO_CARTA, ALTO_CARTA).setInteractive({ useHandCursor: true });
    objeto.on('pointerdown', () => this.alternar(carta.id));
    return objeto;
  }

  private alternar(id: string): void {
    if (this.combate.estado !== 'jugando') return;
    if (this.elegidas.has(id)) this.elegidas.delete(id);
    else if (this.elegidas.size < MAX_CARTAS_JUGADAS) this.elegidas.add(id);
    this.actualizar();
  }

  private terminar(): void {
    const { width, height } = this.scale;
    const gano = this.combate.estado === 'ganado';
    const finDePartida = !gano || this.tipo === 'jefe';
    const titulo = gano ? (this.tipo === 'jefe' ? '¡Venciste al jefe!' : '¡Combate ganado!') : 'Te quedaste sin manos';

    this.botonJugar.activar(false);
    this.botonDescartar.activar(false);
    // Ganado, el combate deja de estar pendiente; al terminar la partida
    // (derrota o jefe vencido) su ranura queda libre.
    if (finDePartida) terminarPartida(this);
    else jugarPartida(this, ganarCombate(partidaActual(this)));
    this.add.rectangle(width / 2, height / 2, width, height, COLORES.fondo, 0.85);
    this.add.text(width / 2, height / 2 - 60, titulo, estiloTexto(48, gano ? COLORES.acento : COLORES.multi)).setOrigin(0.5);
    crearBoton(this, width / 2, height / 2 + 40, finDePartida ? 'Menú principal' : 'Seguir', COLORES.acento, () =>
      this.scene.start(finDePartida ? 'menu' : 'mapa'),
    );
  }
}

// La mesa de un combate: la mano de 8 cartas abajo, se tocan de 1 a 5 para
// elegirlas y se juegan o se descartan. Entre los dos botones, otros dos
// redondos ordenan la mano por valor o por palo; el orden elegido se
// mantiene con las cartas que se roban después. Arriba, cuánto falta para el
// objetivo. Las reglas están en juego/combate.ts; aquí solo se dibujan.

import Phaser from 'phaser';
import { crearAleatorio } from '../juego/aleatorio.ts';
import { SIMBOLO_PALO, nombreRango, ordenarMano, type Carta, type Orden } from '../juego/cartas.ts';
import { MAX_CARTAS_JUGADAS, crearCombate, descartar, jugar, type Combate } from '../juego/combate.ts';
import { MANOS, evaluarMano } from '../juego/manos.ts';
import { enBancarrota, nivelDeRiesgo, objetivoDelCombate, resolverCombate } from '../juego/partida.ts';
import type { TipoNodo } from '../mapa/mapa.ts';
import { crearBoton, crearBotonRedondo, type Boton, type BotonRedondo } from './boton.ts';
import { confirmar } from './confirmar.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { mostrarBotonesInventario } from './inventario.ts';
import { mostrarOro, type Marcador } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { irAPartida, jugarPartida, partidaActual, terminarPartida } from './sesion.ts';

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
  private botonMenu!: Boton;
  private oro!: Marcador;
  private orden: Orden | null = null;
  private botonesOrden = new Map<Orden, BotonRedondo>();

  constructor() {
    super('mesa');
  }

  init(datos: { tipo: TipoNodo }): void {
    this.tipo = datos.tipo;
    this.elegidas.clear();
    this.cartas.clear();
    this.orden = null;
    this.botonesOrden.clear();
  }

  create(): void {
    const partida = partidaActual(this);
    // El oro entra en la semilla para que reintentar al jefe (con menos oro)
    // reparta otras cartas; continuar la misma partida reparte las mismas.
    const aleatorio = crearAleatorio(partida.mapa.semilla + partida.visitados.length + partida.oro);
    this.combate = crearCombate(aleatorio, { objetivo: objetivoDelCombate(partida), mazo: partida.mazo, baratijas: partida.baratijas });

    const { width } = this.scale;
    this.marcador = this.add.text(40, 30, '', estiloTexto(24)).setLineSpacing(8);
    this.jugada = this.add.text(width / 2, 250, '', estiloTexto(34)).setOrigin(0.5);
    this.botonJugar = crearBoton(this, width / 2 - 170, 660, 'Jugar mano', COLORES.fichas, () => this.accion(jugar));
    this.botonDescartar = crearBoton(this, width / 2 + 170, 660, 'Descartar', COLORES.multi, () => this.accion(descartar));
    this.botonesOrden.set('valor', crearBotonRedondo(this, width / 2 - 32, 652, 'A↓', 'Valor', () => this.ordenar('valor')));
    this.botonesOrden.set('palo', crearBotonRedondo(this, width / 2 + 32, 652, '♠♥', 'Palo', () => this.ordenar('palo')));
    // La partida ya está guardada con este combate pendiente: al continuar
    // se vuelve a él, pero desde el principio.
    this.botonMenu = crearBoton(this, width - 90, 50, 'Menú', COLORES.borde, () =>
      confirmar(this, '¿Salir al menú?\nAl continuar, este combate empieza de nuevo.', 'Salir', COLORES.multi, () =>
        this.scene.start('menu'),
      ), 130);
    this.oro = mostrarOro(this, partida.oro);
    mostrarRiesgo(this, nivelDeRiesgo(partida));
    mostrarBotonesInventario(this, () => partidaActual(this));
    this.actualizar();
  }

  private accion(hacer: (combate: Combate, ids: string[]) => Combate): void {
    const ids = [...this.elegidas];
    for (const id of ids) this.cartas.get(id)?.destroy();
    for (const id of ids) this.cartas.delete(id);
    this.elegidas.clear();
    this.combate = hacer(this.combate, ids);
    if (this.orden) this.combate = { ...this.combate, mano: ordenarMano(this.combate.mano, this.orden) };
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

  private ordenar(orden: Orden): void {
    if (this.combate.estado !== 'jugando') return;
    this.orden = orden;
    for (const [cual, boton] of this.botonesOrden) boton.marcar(cual === orden);
    this.combate = { ...this.combate, mano: ordenarMano(this.combate.mano, orden) };
    this.actualizar();
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
    const antes = partidaActual(this).oro;
    const partida = resolverCombate(partidaActual(this), gano);
    const quebrado = enBancarrota(partida);
    const jefeVencido = gano && this.tipo === 'jefe';
    const finDePartida = quebrado || jefeVencido;
    const titulo = jefeVencido ? '¡Venciste al jefe!' : gano ? '¡Combate ganado!' : quebrado ? 'Te quedaste sin oro' : 'Perdiste el combate';
    const diferencia = partida.oro - antes;

    this.botonJugar.activar(false);
    this.botonDescartar.activar(false);
    this.botonMenu.activar(false);
    // Al terminar la partida (bancarrota o jefe vencido) su ranura queda
    // libre; si no, se guarda con el oro nuevo.
    if (finDePartida) terminarPartida(this);
    else jugarPartida(this, partida);
    this.oro.cambiar(partida.oro);

    this.add.rectangle(width / 2, height / 2, width, height, COLORES.fondo, 0.85);
    this.add.text(width / 2, height / 2 - 80, titulo, estiloTexto(48, gano ? COLORES.acento : COLORES.multi)).setOrigin(0.5);
    const detalle = quebrado ? 'Fin de la partida' : `${diferencia > 0 ? '+' : '−'}${Math.abs(diferencia)} de oro`;
    this.add.text(width / 2, height / 2 - 20, detalle, estiloTexto(28, quebrado ? COLORES.textoSuave : COLORES.oro)).setOrigin(0.5);

    if (finDePartida) {
      crearBoton(this, width / 2, height / 2 + 60, 'Menú principal', COLORES.acento, () => this.scene.start('menu'));
    } else if (partida.combatePendiente) {
      crearBoton(this, width / 2, height / 2 + 60, 'Reintentar', COLORES.acento, () => this.scene.restart({ tipo: this.tipo }));
    } else {
      crearBoton(this, width / 2, height / 2 + 60, 'Seguir', COLORES.acento, () => irAPartida(this, partida));
    }
  }
}
